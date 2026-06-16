import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { AppStore } from '../../store/app.store';
import { Character, CharacterType, driftScore, effectivePressure, influenceConvictionBonus } from '../../core/models/types';
import { downloadCsv, parseCsv, csvHeaderMap } from '../../core/utils/csv-export';
import { oneOf, clampedInt, sanitizeValueVector } from '../../core/utils/validation';

@Component({
  selector: 'app-characters',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './characters.component.html',
  styleUrl: './characters.component.scss'
})
export class CharactersComponent {
  store = inject(AppStore);

  filterType    = signal<'all' | CharacterType>('all');
  filterFaction = signal<string>('all');
  filterClass   = signal<string>('all');

  driftScore = driftScore;
  effectivePressure = effectivePressure;

  readonly colonyStress = computed(() => this.store.colonyState()?.colonyStress ?? 0);

  readonly displayCharacters = computed(() => {
    let chars = this.store.characters();
    const type    = this.filterType();
    const faction = this.filterFaction();
    const cls     = this.filterClass();

    if (type !== 'all')    chars = chars.filter(c => c.characterType === type);
    if (faction !== 'all') chars = chars.filter(c => (c.factionId ?? '') === faction);
    if (cls !== 'all')     chars = chars.filter(c => (c.socialClassId ?? '') === cls);

    return chars.sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly factionOptions = computed(() =>
    this.store.factions().filter(f => f.type === 'Faction' && f.active)
  );

  readonly socialClassOptions = computed(() =>
    this.store.factions().filter(f => f.type === 'SocialClass' && f.active)
  );

  factionName(id?: string): string {
    if (!id) return '—';
    return this.store.factions().find(f => f.id === id)?.name ?? id;
  }

  driftClass(score: number): string {
    if (score >= 30) return 'drift high';
    if (score >= 10) return 'drift mid';
    if (score >= -10) return 'drift neutral';
    return 'drift low';
  }

  convictionClass(c: number): string {
    if (c >= 70) return 'conviction high';
    if (c >= 40) return 'conviction mid';
    return 'conviction low';
  }

  pressureClass(p: number): string {
    if (p >= 100) return 'pressure max';
    if (p >= 70)  return 'pressure high';
    if (p >= 40)  return 'pressure mid';
    return 'pressure low';
  }

  formatPct(value: number): string {
    return value >= 100 ? 'MAX' : `${Math.round(value)}%`;
  }

  effectiveDriftScore(c: Character): number {
    const peers = this.store.characters().filter(p => p.factionId && p.factionId === c.factionId && p.id !== c.id);
    const scale = this.store.rules()?.influenceConvictionScale ?? 0.5;
    const effConv = c.conviction + influenceConvictionBonus(c, peers, scale);
    return effectivePressure(c, this.colonyStress()) - effConv;
  }

  typeLabel(t: CharacterType): string {
    if (t === 'PartyMember')   return 'Party';
    if (t === 'FactionLeader') return 'Leader';
    return 'NPC';
  }

  importCsv(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(reader.result as string);
      if (rows.length < 2) return;
      const h = csvHeaderMap(rows[0]);
      const get = (row: string[], col: string) => row[h.get(col) ?? -1] ?? '';

      for (const row of rows.slice(1)) {
        const character: Character = {
          id:            get(row, 'id'),
          name:          get(row, 'name'),
          characterType: oneOf(get(row, 'role'), ['NPC', 'PartyMember', 'FactionLeader'] as const) ?? 'NPC',
          factionId:     get(row, 'factionid')
                           || this.store.factions().find(f => f.type === 'Faction'     && f.name === get(row, 'faction'))?.id
                           || undefined,
          socialClassId: get(row, 'socialclassid')
                           || this.store.factions().find(f => f.type === 'SocialClass' && f.name === get(row, 'social class'))?.id
                           || undefined,
          ancestry:      get(row, 'ancestry')      || undefined,
          heritage:      get(row, 'heritage')      || undefined,
          class:         get(row, 'class')          || undefined,
          background:    get(row, 'background')    || undefined,
          level:         get(row, 'level')          ? Number(get(row, 'level'))  : undefined,
          gender:        get(row, 'gender')         || undefined,
          age:           get(row, 'age')            ? Number(get(row, 'age'))    : undefined,
          occupation:    get(row, 'occupation')     || undefined,
          ritual:        oneOf(get(row, 'ritual'),    ['Good', 'Neutral', 'Bad']              as const),
          knowledge:     oneOf(get(row, 'knowledge'), ['Hidden', 'Controlled', 'Revealed']   as const),
          change:        oneOf(get(row, 'change'),    ['Yes', 'No']                           as const),
          doubtDirection:oneOf(get(row, 'doubtdirection'), ['Truth', 'Stability', 'Agency']  as const),
          conviction:    clampedInt(get(row, 'conviction'),    0, 100, 50),
          pressure:      clampedInt(get(row, 'pressure'),      0, 100, 0),
          influence:     clampedInt(get(row, 'influence'),     0, 100, 0),
          impressionable:clampedInt(get(row, 'impressionable'),0, 100, 50),
          values: sanitizeValueVector(
            parseFloat(get(row, 'truth')),
            parseFloat(get(row, 'stability')),
            parseFloat(get(row, 'agency')),
          ),
          summary: get(row, 'summary') || undefined,
          goals:   get(row, 'goals')   || undefined,
          fears:   get(row, 'fears')   || undefined,
          notes:   get(row, 'notes')   || undefined,
        };
        this.store.saveCharacter(character);
      }
      // Reset the input so the same file can be re-imported if needed
      (event.target as HTMLInputElement).value = '';
    };
    reader.readAsText(file);
  }

  exportCsv(): void {
    const header = [
      'Id', 'Name', 'Role',
      'FactionId', 'Faction', 'SocialClassId', 'Social Class',
      'Ancestry', 'Heritage', 'Class', 'Background', 'Level',
      'Gender', 'Age', 'Occupation',
      'Ritual', 'Knowledge', 'Change',
      'DoubtDirection', 'Conviction', 'Pressure', 'Influence', 'Impressionable',
      'Truth', 'Stability', 'Agency',
      'Summary', 'Goals', 'Fears', 'Notes'
    ];
    const rows = this.store.characters().map(c => [
      c.id, c.name, c.characterType,
      c.factionId ?? '', this.factionName(c.factionId),
      c.socialClassId ?? '', this.factionName(c.socialClassId),
      c.ancestry ?? '', c.heritage ?? '', c.class ?? '', c.background ?? '', c.level ?? '',
      c.gender ?? '', c.age ?? '', c.occupation ?? '',
      c.ritual ?? '', c.knowledge ?? '', c.change ?? '',
      c.doubtDirection ?? '', c.conviction, c.pressure, c.influence, c.impressionable,
      c.values.truth.toFixed(4), c.values.stability.toFixed(4), c.values.agency.toFixed(4),
      c.summary ?? '', c.goals ?? '', c.fears ?? '', c.notes ?? ''
    ]);
    downloadCsv([header, ...rows], 'characters.csv');
  }

  delete(c: Character): void {
    if (confirm(`Delete ${c.name}?`)) {
      this.store.deleteCharacter(c.id);
    }
  }
}
