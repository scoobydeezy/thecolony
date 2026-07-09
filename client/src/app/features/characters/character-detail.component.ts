import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe, NgClass } from '@angular/common';
import { FormField, form, required } from '@angular/forms/signals';
import { AppStore } from '../../store/app.store';
import { ApiService } from '../../core/services/api.service';
import {
  Character, CharacterType, CharacterState, DoubtDirection, ValueVector,
  BeliefPosition,
  effectivePressure, computeDriftTarget, lerpValueVector,
  topCompatibleFactions, effectiveBeliefs,
  primaryValue, secondaryValue, sacrificedValue,
  influenceConvictionBonus, beliefAxisOptions, beliefPositionLabel
} from '../../core/models/types';
import { TernaryPlotComponent, TernaryOverlayPoint } from '../../shared/ternary-plot/ternary-plot.component';
import { scoreRelationship, ScoringActor, DEFAULT_RULES } from '../../core/services/scoring.service';
import { getAncestryImagePath, FALLBACK_ANCESTRY_IMAGE } from '../../core/utils/ancestry-images';

type EditingCard = 'header' | 'identity' | 'society' | 'narrative' | 'beliefs' | 'doubt' | null;

interface CharacterFormModel {
  id: string;
  name: string;
  characterType: string;
  state: CharacterState;
  ancestry: string;
  heritage: string;
  class: string;
  background: string;
  level: string;
  gender: string;
  age: string;
  occupation: string;
  summary: string;
  goals: string;
  fears: string;
  notes: string;
  factionId: string;
  socialClassId: string;
  beliefc: string;
  beliefa: string;
  beliefb: string;
  doubtDirection: string;
  conviction: string;
  pressure: string;
  influence: string;
  impressionable: string;
}

const DEFAULT_VALUES: ValueVector = { a: 1/3, b: 1/3, c: 1/3 };

const emptyFormModel = (): CharacterFormModel => ({
  id: '', name: '', characterType: 'NPC', state: 'Alive',
  ancestry: '', heritage: '', class: '', background: '', level: '',
  gender: '', age: '', occupation: '',
  summary: '', goals: '', fears: '', notes: '',
  factionId: '', socialClassId: '',
  beliefc: '', beliefa: '', beliefb: '',
  doubtDirection: '', conviction: '50', pressure: '0',
  influence: '0', impressionable: '50'
});

const toFormModel = (c: Character): CharacterFormModel => ({
  id: c.id,
  name: c.name,
  characterType: c.characterType,
  state: c.state,
  ancestry: c.ancestry ?? '',
  heritage: c.heritage ?? '',
  class: c.class ?? '',
  background: c.background ?? '',
  level: c.level?.toString() ?? '',
  gender: c.gender ?? '',
  age: c.age?.toString() ?? '',
  occupation: c.occupation ?? '',
  summary: c.summary ?? '',
  goals: c.goals ?? '',
  fears: c.fears ?? '',
  notes: c.notes ?? '',
  factionId: c.factionId ?? '',
  socialClassId: c.socialClassId ?? '',
  beliefc: c.beliefc ?? '',
  beliefa: c.beliefa ?? '',
  beliefb: c.beliefb ?? '',
  doubtDirection: c.doubtDirection ?? '',
  conviction: c.conviction.toString(),
  pressure: c.pressure.toString(),
  influence: c.influence.toString(),
  impressionable: c.impressionable.toString()
});


@Component({
  selector: 'app-character-detail',
  standalone: true,
  imports: [RouterLink, FormField, TernaryPlotComponent, DecimalPipe, NgClass],
  templateUrl: './character-detail.component.html',
  styleUrl: './character-detail.component.scss'
})
export class CharacterDetailComponent implements OnInit {
  store  = inject(AppStore);
  api    = inject(ApiService);
  route  = inject(ActivatedRoute);
  router = inject(Router);

  // ── Per-card edit state ────────────────────────────────────────────────────

  editingCard = signal<EditingCard>(null);

  isEditing(card: EditingCard): boolean { return this.editingCard() === card; }

  openCard(card: EditingCard): void {
    this.editForm.set(toFormModel(this.character()));
    this.editValues.set({ ...this.character().values });
    this.editingCard.set(card);
  }

  closeCard(): void { this.editingCard.set(null); }

  saveCard(card: EditingCard): void {
    const fm = this.editForm();
    const current = this.character();
    let updated: Character;

    switch (card) {
      case 'header':
        updated = { ...current, name: fm.name, characterType: fm.characterType as CharacterType, state: fm.state, summary: fm.summary || undefined };
        break;
      case 'identity':
        updated = {
          ...current,
          gender: fm.gender || undefined,
          age: fm.age ? +fm.age : undefined,
          occupation: fm.occupation || undefined,
          ancestry: fm.ancestry || undefined,
          heritage: fm.heritage || undefined,
          class: fm.class || undefined,
          background: fm.background || undefined,
          level: fm.level ? +fm.level : undefined,
        };
        break;
      case 'society':
        updated = {
          ...current,
          factionId: fm.factionId || undefined,
          socialClassId: fm.socialClassId || undefined,
          influence: fm.influence !== '' ? +fm.influence : 0,
          impressionable: fm.impressionable !== '' ? +fm.impressionable : 50,
        };
        break;
      case 'narrative':
        updated = {
          ...current,
          summary: fm.summary || undefined,
          goals: fm.goals || undefined,
          fears: fm.fears || undefined,
          notes: fm.notes || undefined,
        };
        break;
      case 'beliefs':
        updated = {
          ...current,
          values: this.editValues(),
          beliefc: (fm.beliefc as BeliefPosition) || undefined,
          beliefa: (fm.beliefa as BeliefPosition) || undefined,
          beliefb: (fm.beliefb as BeliefPosition) || undefined,
          doubtDirection: (fm.doubtDirection as DoubtDirection) || undefined,
          conviction: fm.conviction !== '' ? +fm.conviction : 0,
          pressure: fm.pressure !== '' ? +fm.pressure : 0,
        };
        break;
      case 'doubt':
        updated = {
          ...current,
          pressure: fm.pressure !== '' ? +fm.pressure : 0,
          influence: fm.influence !== '' ? +fm.influence : 0,
          impressionable: fm.impressionable !== '' ? +fm.impressionable : 50,
        };
        break;
      default:
        return;
    }

    this.store.saveCharacter(updated);
    this.character.set({ ...updated, values: { ...updated.values } });
    this.editingCard.set(null);
  }

  // ── Character state ────────────────────────────────────────────────────────

  private portraitBust = signal<string | null>(null);

  character = signal<Character>({
    id: '', name: '', characterType: 'NPC', state: 'Alive',
    values: { ...DEFAULT_VALUES }, conviction: 50, pressure: 0,
    influence: 0, impressionable: 50
  });

  readonly portrait = computed<string>(() => {
    const bust = this.portraitBust();
    if (bust != null) return bust;
    const c = this.character();
    return c.portraitPath ?? getAncestryImagePath(c.ancestry, c.gender);
  });

  onPortraitError(img: HTMLImageElement): void {
    const current = img.src.replace(window.location.origin, '');
    // female variant missing → try male variant
    if (current.endsWith('-f.png')) {
      img.src = current.replace(/-f\.png$/, '.png');
      return;
    }
    // male variant missing → try human fallback
    if (current !== FALLBACK_ANCESTRY_IMAGE) {
      img.src = FALLBACK_ANCESTRY_IMAGE;
    }
  }

  // Edit-mode: signal form
  readonly editForm   = signal<CharacterFormModel>(emptyFormModel());
  readonly editValues = signal<ValueVector>({ ...DEFAULT_VALUES });
  readonly f = form(this.editForm, schema => {
    required(schema.name, { message: 'Name is required' });
  });

  readonly stateOptions: CharacterState[] = ['Alive', 'Dead', 'Missing', 'Forgotten'];
  readonly doubtDirections: DoubtDirection[] = ['a', 'b', 'c', 'ab', 'ac', 'bc'];
  readonly beliefcOptions = computed(() => beliefAxisOptions(this.store.beliefAxisLabels().c));
  readonly beliefaOptions = computed(() => beliefAxisOptions(this.store.beliefAxisLabels().a));
  readonly beliefbOptions = computed(() => beliefAxisOptions(this.store.beliefAxisLabels().b));

  readonly genderOptions = ['Male', 'Female', 'Unknown', 'Unspecified'];

  readonly roleOptions: { value: CharacterType; label: string }[] = [
    { value: 'NPC',           label: 'NPC' },
    { value: 'FactionLeader', label: 'Faction Leader' },
    { value: 'PartyMember',   label: 'Party Member' },
  ];

  readonly ancestryOptions = [
    'Anadi', 'Android', 'Athamaru', 'Automaton', 'Awakened Animal', 'Azarketi',
    'Catfolk', 'Centaur', 'Conrasu', 'Dragonet', 'Dwarf', 'Elf',
    'Fetchling', 'Fleshwarp', 'Ghoran', 'Gnome', 'Goblin', 'Goloma',
    'Halfling', 'Hobgoblin', 'Human', 'Jotunborn', 'Kashrishi', 'Kholo',
    'Kitsune', 'Kobold', 'Leshy', 'Lizardfolk', 'Merfolk', 'Minotaur',
    'Nagaji', 'Orc', 'Poppet', 'Ratfolk', 'Samsaran', 'Sarangay',
    'Shisk', 'Shoony', 'Skeleton', 'Sprite', 'Strix', 'Surki',
    'Tanuki', 'Tengu', 'Tripkee', 'Vanara', 'Vishkanya', 'Wayang',
    'Yaksha', 'Yaoguai',
  ];

  readonly classOptions = [
    'Alchemist', 'Animist', 'Barbarian', 'Bard', 'Champion', 'Cleric',
    'Commander', 'Druid', 'Exemplar', 'Fighter', 'Guardian', 'Gunslinger',
    'Inventor', 'Investigator', 'Kineticist', 'Magus', 'Monk', 'Oracle',
    'Psychic', 'Ranger', 'Rogue', 'Sorcerer', 'Summoner', 'Swashbuckler',
    'Thaumaturge', 'Witch', 'Wizard',
  ];

  primaryValue    = primaryValue;
  secondaryValue  = secondaryValue;
  sacrificedValue = sacrificedValue;

  valueLabel(v: string): string {
    const vl = this.store.valueLabels();
    const k = v.toLowerCase() as 'a' | 'b' | 'c';
    return (k === 'a' || k === 'b' || k === 'c') ? vl[k] : v;
  }

  beliefLabel(axis: 'a' | 'b' | 'c', pos: BeliefPosition): string {
    return beliefPositionLabel(pos, this.store.beliefAxisLabels()[axis]);
  }

  beliefClass(axis: 'a' | 'b' | 'c', pos: BeliefPosition): string {
    const cfg = this.store.beliefAxisLabels()[axis];
    if (pos === 'positive') return cfg.positiveAligns ? 'belief-statusquo' : 'belief-dissent';
    if (pos === 'negative') return cfg.positiveAligns ? 'belief-dissent' : 'belief-statusquo';
    return 'belief-neutral';
  }

  axisName(axis: 'a' | 'b' | 'c'): string {
    return this.store.beliefAxisLabels()[axis].axisName;
  }

  doubtAxisClass(direction: DoubtDirection | undefined): string {
    switch (direction) {
      case 'a': case 'bc': return 'valuea';
      case 'b': case 'ac': return 'valueb';
      case 'c': case 'ab': return 'valuec';
      default: return '';
    }
  }

  doubtLabel(direction: DoubtDirection | undefined): string {
    if (!direction) return '—';
    const vl = this.store.valueLabels();
    switch (direction) {
      case 'a':  return vl.a;
      case 'b':  return vl.b;
      case 'c':  return vl.c;
      case 'ab': return vl.edgeAB;
      case 'ac': return vl.edgeAC;
      case 'bc': return vl.edgeBC;
    }
  }

  readonly colonyStress = computed(() => this.store.viewColonyStress());

  readonly effectivePressureValue = computed(() =>
    effectivePressure(this.character(), this.colonyStress())
  );

  readonly characterFaction = computed(() => {
    const c = this.character();
    return c.factionId ? (this.store.factions().find(f => f.id === c.factionId) ?? null) : null;
  });

  readonly factionPeers = computed(() => {
    const c = this.character();
    if (!c.factionId) return [];
    return this.store.viewCharacters().filter(p => p.state === 'Alive' && p.factionId === c.factionId && p.id !== c.id);
  });

  readonly influenceScale = computed(() =>
    this.store.rules()?.influenceConvictionScale ?? 0.5
  );

  readonly influenceBonus = computed(() =>
    influenceConvictionBonus(this.character(), this.factionPeers(), this.influenceScale())
  );

  readonly effectiveConvictionValue = computed(() =>
    this.character().conviction + this.influenceBonus()
  );

  readonly driftScore = computed(() =>
    this.effectivePressureValue() - this.effectiveConvictionValue()
  );

  readonly driftTarget = computed<ValueVector | null>(() => {
    const c = this.character();
    if (!c.doubtDirection) return null;
    return computeDriftTarget(c.values, c.doubtDirection);
  });

  readonly editDriftTarget = computed<ValueVector | null>(() => {
    const dir = this.editForm().doubtDirection as DoubtDirection | '';
    if (!dir) return null;
    return computeDriftTarget(this.editValues(), dir);
  });

  readonly editEffectiveConviction = computed(() => {
    const fm = this.editForm();
    const base = Math.min(100, Math.max(0, Number(fm.conviction) || 0));
    const impressionable = Math.min(100, Math.max(0, Number(fm.impressionable) || 0));
    if (!fm.factionId) return base;
    const peers = this.store.viewCharacters().filter(p => p.state === 'Alive' && p.factionId === fm.factionId && p.id !== fm.id);
    const scale = this.store.rules()?.influenceConvictionScale ?? 0.5;
    const bonus = peers.length === 0 ? 0
      : (peers.reduce((s, p) => s + p.influence, 0) / peers.length) * (impressionable / 100) * scale;
    return base + bonus;
  });
  readonly editPressure = computed(() => (Number(this.editForm().pressure) || 0) + this.colonyStress() * 10);

  // Read-mode overlays
  readonly ternaryOverlays = computed<TernaryOverlayPoint[]>(() => {
    const c = this.character();
    const overlays: TernaryOverlayPoint[] = [];
    if (c.factionId) {
      const faction = this.store.factions().find(f => f.id === c.factionId);
      if (faction) overlays.push({ values: faction.values, label: faction.name, color: '#3b82f6' });
    }
    if (c.socialClassId) {
      const sc = this.store.factions().find(f => f.id === c.socialClassId);
      if (sc) overlays.push({ values: sc.values, label: sc.name, color: '#a78bfa' });
    }
    return overlays;
  });

  // Edit-mode overlays
  readonly editTernaryOverlays = computed<TernaryOverlayPoint[]>(() => {
    const fm = this.editForm();
    const overlays: TernaryOverlayPoint[] = [];
    if (fm.factionId) {
      const faction = this.store.factions().find(f => f.id === fm.factionId);
      if (faction) overlays.push({ values: faction.values, label: faction.name, color: '#3b82f6' });
    }
    if (fm.socialClassId) {
      const sc = this.store.factions().find(f => f.id === fm.socialClassId);
      if (sc) overlays.push({ values: sc.values, label: sc.name, color: '#a78bfa' });
    }
    return overlays;
  });

  // Faction compatibility (read mode)
  readonly activeFactions = computed(() =>
    this.store.viewFactions().filter(f => f.active && f.type === 'Faction')
  );

  readonly compatibilityList = computed(() =>
    topCompatibleFactions(this.character(), this.activeFactions(), this.store.formulas().beliefDerivationThreshold)
  );

  readonly top3Compatible = computed(() =>
    this.compatibilityList().slice(0, 3)
  );

  readonly mostCompatibleFaction = computed(() => {
    const top = this.compatibilityList()[0];
    if (!top) return null;
    return this.store.factions().find(f => f.id === top.factionId) ?? null;
  });

  readonly isPotentialDefection = computed(() => {
    const top = this.compatibilityList()[0];
    const c   = this.character();
    return top && c.factionId && top.factionId !== c.factionId;
  });

  readonly driftedCharacter = computed(() => {
    const c = this.character();
    const target = this.driftTarget();
    if (!target) return null;
    const conviction = Math.min(100, Math.max(0, c.conviction));
    const t = 1 - conviction / 100;
    if (t <= 0) return null;
    return { ...c, values: lerpValueVector(c.values, target, t) };
  });

  readonly driftedCompatibilityList = computed(() => {
    const drifted = this.driftedCharacter();
    if (!drifted) return null;
    return topCompatibleFactions(drifted, this.activeFactions(), this.store.formulas().beliefDerivationThreshold);
  });

  readonly driftedBeliefs = computed(() => {
    const target = this.driftTarget();
    return effectiveBeliefs({ ...this.character(), values: target ?? this.character().values });
  });

  readonly driftedTop3 = computed(() =>
    this.driftedCompatibilityList()?.slice(0, 3) ?? null
  );

  readonly driftedTopFaction = computed(() => {
    const list = this.driftedCompatibilityList();
    if (!list || list.length === 0) return null;
    return this.store.factions().find(f => f.id === list[0].factionId) ?? null;
  });

  readonly isDriftRiskFactionDifferent = computed(() => {
    const current = this.mostCompatibleFaction();
    const drifted = this.driftedTopFaction();
    return drifted && current && drifted.id !== current.id;
  });

  readonly factionToPartyRelationship = computed(() => {
    const c = this.character();
    if (!c.factionId) return null;
    return this.store.partyRelationships().find(r => r.sourceId === c.factionId) ?? null;
  });

  readonly characterToPartyRelationship = computed(() => {
    const cs = this.store.colonyState();
    if (!cs) return null;
    const c = this.character();
    const beliefs = effectiveBeliefs(c);
    const source: ScoringActor = { id: c.id, values: c.values, beliefc: beliefs.beliefc, beliefa: beliefs.beliefa, beliefb: beliefs.beliefb };
    const party: ScoringActor  = { id: 'party', values: cs.partyValues, beliefc: cs.partyBeliefc, beliefa: cs.partyBeliefa, beliefb: cs.partyBeliefb };
    return scoreRelationship(source, party, this.colonyStress(), 0, this.store.rules() ?? DEFAULT_RULES);
  });

  readonly partyName = computed(() => this.store.colonyState()?.partyName ?? 'Party');

  readonly derivedBeliefs = computed(() => effectiveBeliefs(this.character()));

  readonly driftedBeliefChanges = computed(() => {
    const current = this.derivedBeliefs();
    const drifted = this.driftedBeliefs();
    return {
      beliefc: current.beliefc !== drifted.beliefc,
      beliefa: current.beliefa !== drifted.beliefa,
      beliefb: current.beliefb !== drifted.beliefb,
    };
  });

  readonly factionOptions = computed(() =>
    this.store.factions().filter(f => f.type === 'Faction' && f.active)
  );
  readonly socialClassOptions = computed(() =>
    this.store.factions().filter(f => f.type === 'SocialClass' && f.active)
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const found = this.store.viewCharacters().find(c => c.id === id);
    if (found) {
      this.character.set({ ...found, values: { ...found.values } });
    } else {
      this.router.navigate(['/characters']);
    }
  }

  factionName(id?: string): string {
    if (!id) return '—';
    return this.store.factions().find(f => f.id === id)?.name ?? id;
  }

  typeLabel(t: CharacterType): string {
    if (t === 'PartyMember') return 'Party Member';
    if (t === 'FactionLeader') return 'Faction Leader';
    return 'NPC';
  }

  private readonly stateIconMap: Record<CharacterState, string> = {
    Alive:     '',
    Dead:      'fa-solid fa-skull',
    Missing:   'fa-solid fa-circle-question',
    Forgotten: 'fa-solid fa-hourglass-start',
  };

  stateIconClass(state: CharacterState): string {
    return this.stateIconMap[state];
  }

  stateHeadingClass(state: CharacterState): string {
    return `state-heading state-heading--${state.toLowerCase()}`;
  }

  driftClass(score: number): string {
    if (score >= 30) return 'drift high';
    if (score >= 10) return 'drift mid';
    if (score > 0)   return 'drift neutral';
    return 'drift low';
  }

  driftIconClass(score: number): string {
    if (score >= 30) return 'fa-solid fa-arrow-trend-up drift-icon drift-high';
    if (score >= 10) return 'fa-solid fa-arrow-trend-up drift-icon drift-mid';
    if (score > 0)   return 'fa-solid fa-arrow-right-long drift-icon drift-neutral';
    return 'fa-solid fa-arrow-trend-down drift-icon drift-low';
  }

  formatPercent(value: number): string {
    return value >= 100 ? 'MAX' : `${Math.round(value)}%`;
  }

  valueScoreClass(score: number): string {
    if (score >= 3)  return 'compat-score pos-high';
    if (score >= 0)  return 'compat-score neutral';
    return 'compat-score neg';
  }

  uploadPortrait(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.api.uploadCharacterPortrait(this.character().id, file).subscribe(res => {
      this.portraitBust.set(`${res.path}?v=${Date.now()}`);
      this.store.saveCharacter({ ...this.character(), portraitPath: res.path });
    });
    (event.target as HTMLInputElement).value = '';
  }

  delete(): void {
    if (!confirm('Delete this character? This cannot be undone.')) return;
    this.store.deleteCharacter(this.character().id);
    this.router.navigate(['/characters']);
  }
}
