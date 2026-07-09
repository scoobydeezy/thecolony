import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe, NgClass } from '@angular/common';
import { FormField, form, required } from '@angular/forms/signals';
import { AppStore } from '../../store/app.store';
import { Character, CharacterType, CharacterState, ValueVector, driftScore, effectivePressure, influenceConvictionBonus } from '../../core/models/types';
import { downloadCsv, parseCsv, csvHeaderMap } from '../../core/utils/csv-export';
import { oneOf, clampedInt, sanitizeValueVector } from '../../core/utils/validation';

interface AddCharacterFormModel {
  name: string;
  characterType: string;
  state: string;
  summary: string;
}

const DEFAULT_VALUES: ValueVector = { a: 1/3, b: 1/3, c: 1/3 };
const emptyAddForm = (): AddCharacterFormModel => ({ name: '', characterType: 'NPC', state: 'Alive', summary: '' });

@Component({
  selector: 'app-characters',
  standalone: true,
  imports: [RouterLink, DecimalPipe, NgClass, FormField],
  templateUrl: './characters.component.html',
  styleUrl: './characters.component.scss'
})
export class CharactersComponent {
  store  = inject(AppStore);
  router = inject(Router);

  // ── Add character modal ─────────────────────────────────────────────────────

  showModal = signal(false);

  readonly editForm = signal<AddCharacterFormModel>(emptyAddForm());
  readonly f = form(this.editForm, schema => {
    required(schema.name, { message: 'Name is required' });
  });

  openAdd(): void {
    this.editForm.set(emptyAddForm());
    this.showModal.set(true);
  }

  close(): void { this.showModal.set(false); }

  save(): void {
    const fm = this.editForm();
    if (!fm.name.trim()) return;
    const newChar: Character = {
      id: '',
      name: fm.name.trim(),
      characterType: fm.characterType as CharacterType,
      state: fm.state as CharacterState,
      summary: fm.summary || undefined,
      values: { ...DEFAULT_VALUES },
      conviction: 50, pressure: 0, influence: 0, impressionable: 50,
    };
    this.store.saveCharacter(newChar);
    this.showModal.set(false);
  }

  // ── Filters ─────────────────────────────────────────────────────────────────

  filterType    = signal<'all' | CharacterType>('all');
  filterFaction = signal<string>('all');
  filterClass   = signal<string>('all');

  driftScore = driftScore;
  effectivePressure = effectivePressure;

  readonly colonyStress = computed(() => this.store.viewColonyStress());

  readonly displayCharacters = computed(() => {
    let chars = this.store.viewCharacters();
    const type    = this.filterType();
    const faction = this.filterFaction();
    const cls     = this.filterClass();

    if (type !== 'all')    chars = chars.filter(c => c.characterType === type);
    if (faction !== 'all') chars = chars.filter(c => (c.factionId ?? '') === faction);
    if (cls !== 'all')     chars = chars.filter(c => (c.socialClassId ?? '') === cls);

    return chars.sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly factionOptions = computed(() =>
    this.store.viewFactions().filter(f => f.type === 'Faction' && f.active)
  );

  readonly socialClassOptions = computed(() =>
    this.store.viewFactions().filter(f => f.type === 'SocialClass' && f.active)
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
    const peers = this.store.viewCharacters().filter(p => p.state === 'Alive' && p.factionId && p.factionId === c.factionId && p.id !== c.id);
    const scale = this.store.rules()?.influenceConvictionScale ?? 0.5;
    const effConv = c.conviction + influenceConvictionBonus(c, peers, scale);
    return effectivePressure(c, this.colonyStress()) - effConv;
  }

  private readonly stateIconMap: Record<CharacterState, string> = {
    Alive:     '',
    Dead:      'fa-solid fa-skull',
    Missing:   'fa-solid fa-circle-question',
    Forgotten: 'fa-solid fa-hourglass-start',
  };

  stateIconClass(state: CharacterState): string {
    const icon = this.stateIconMap[state];
    return icon ? `state-icon ${icon} state-icon--${state.toLowerCase()}` : '';
  }

  private luminance(hex: string): number {
    const c = hex.replace('#', '');
    const r = parseInt(c.slice(0, 2), 16) / 255;
    const g = parseInt(c.slice(2, 4), 16) / 255;
    const b = parseInt(c.slice(4, 6), 16) / 255;
    const linearize = (v: number) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
  }

  factionFlair(factionId?: string): { name: string; bg: string; iconColor: string; textColor: string; iconPath?: string; bannerShape: string } | null {
    if (!factionId) return null;
    const f = this.store.factions().find(f => f.id === factionId);
    if (!f) return null;
    const bg = f.secondaryColor || '#000000';
    const textColor = this.luminance(bg) > 0.35 ? '#0f172a' : '#e2e8f0';
    return {
      name:        f.name,
      bg,
      textColor,
      iconColor:   f.primaryColor   || '#ffffff',
      iconPath:    f.iconPath       || undefined,
      bannerShape: f.bannerShape    || 'centered-triangle',
    };
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
          beliefc: oneOf(get(row, 'beliefc'), ['positive', 'neutral', 'negative'] as const),
          beliefa: oneOf(get(row, 'beliefa'), ['positive', 'neutral', 'negative'] as const),
          beliefb: oneOf(get(row, 'beliefb'), ['positive', 'negative']             as const),
          doubtDirection:oneOf(get(row, 'doubtdirection'), ['a', 'b', 'c']  as const),
          state:         oneOf(get(row, 'state'), ['Alive', 'Dead', 'Missing', 'Forgotten'] as const) ?? 'Alive' as CharacterState,
          conviction:    clampedInt(get(row, 'conviction'),    0, 100, 50),
          pressure:      clampedInt(get(row, 'pressure'),      0, 100, 0),
          influence:     clampedInt(get(row, 'influence'),     0, 100, 0),
          impressionable:clampedInt(get(row, 'impressionable'),0, 100, 50),
          values: sanitizeValueVector(
            parseFloat(get(row, 'valuea')),
            parseFloat(get(row, 'valueb')),
            parseFloat(get(row, 'valuec')),
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
      'Id', 'Name', 'Role', 'State',
      'FactionId', 'Faction', 'SocialClassId', 'Social Class',
      'Ancestry', 'Heritage', 'Class', 'Background', 'Level',
      'Gender', 'Age', 'Occupation',
      'BeliefC', 'BeliefA', 'BeliefB',
      'DoubtDirection', 'Conviction', 'Pressure', 'Influence', 'Impressionable',
      'ValueA', 'ValueB', 'ValueC',
      'Summary', 'Goals', 'Fears', 'Notes'
    ];
    const rows = this.store.characters().map(c => [
      c.id, c.name, c.characterType, c.state,
      c.factionId ?? '', this.factionName(c.factionId),
      c.socialClassId ?? '', this.factionName(c.socialClassId),
      c.ancestry ?? '', c.heritage ?? '', c.class ?? '', c.background ?? '', c.level ?? '',
      c.gender ?? '', c.age ?? '', c.occupation ?? '',
      c.beliefc ?? '', c.beliefa ?? '', c.beliefb ?? '',
      c.doubtDirection ?? '', c.conviction, c.pressure, c.influence, c.impressionable,
      c.values.a.toFixed(4), c.values.b.toFixed(4), c.values.c.toFixed(4),
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
