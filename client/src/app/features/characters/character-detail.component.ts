import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormField, form, required } from '@angular/forms/signals';
import { AppStore } from '../../store/app.store';
import {
  Character, CharacterType, DoubtDirection, ValueVector,
  RitualPosition, KnowledgePosition, ChangePosition,
  effectivePressure, computeDriftTarget, lerpValueVector,
  topCompatibleFactions, effectiveBeliefs,
  primaryValue, secondaryValue, sacrificedValue,
  influenceConvictionBonus
} from '../../core/models/types';
import { TernaryPlotComponent, TernaryOverlayPoint } from '../../shared/ternary-plot/ternary-plot.component';

interface CharacterFormModel {
  id: string;
  name: string;
  characterType: string;
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
  ritual: string;
  knowledge: string;
  change: string;
  doubtDirection: string;
  conviction: string;
  pressure: string;
  influence: string;
  impressionable: string;
}

const DEFAULT_VALUES: ValueVector = { truth: 1/3, stability: 1/3, agency: 1/3 };

const emptyFormModel = (): CharacterFormModel => ({
  id: '', name: '', characterType: 'NPC',
  ancestry: '', heritage: '', class: '', background: '', level: '',
  gender: '', age: '', occupation: '',
  summary: '', goals: '', fears: '', notes: '',
  factionId: '', socialClassId: '',
  ritual: '', knowledge: '', change: '',
  doubtDirection: '', conviction: '50', pressure: '0',
  influence: '0', impressionable: '50'
});

const toFormModel = (c: Character): CharacterFormModel => ({
  id: c.id,
  name: c.name,
  characterType: c.characterType,
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
  ritual: c.ritual ?? '',
  knowledge: c.knowledge ?? '',
  change: c.change ?? '',
  doubtDirection: c.doubtDirection ?? '',
  conviction: c.conviction.toString(),
  pressure: c.pressure.toString(),
  influence: c.influence.toString(),
  impressionable: c.impressionable.toString()
});

const fromFormModel = (fm: CharacterFormModel, values: ValueVector): Character => ({
  id: fm.id,
  name: fm.name,
  characterType: fm.characterType as CharacterType,
  ancestry: fm.ancestry || undefined,
  heritage: fm.heritage || undefined,
  class: fm.class || undefined,
  background: fm.background || undefined,
  level: fm.level ? +fm.level : undefined,
  gender: fm.gender || undefined,
  age: fm.age ? +fm.age : undefined,
  occupation: fm.occupation || undefined,
  summary: fm.summary || undefined,
  goals: fm.goals || undefined,
  fears: fm.fears || undefined,
  notes: fm.notes || undefined,
  factionId: fm.factionId || undefined,
  socialClassId: fm.socialClassId || undefined,
  ritual: (fm.ritual as RitualPosition) || undefined,
  knowledge: (fm.knowledge as KnowledgePosition) || undefined,
  change: (fm.change as ChangePosition) || undefined,
  values,
  doubtDirection: (fm.doubtDirection as DoubtDirection) || undefined,
  conviction: fm.conviction !== '' ? +fm.conviction : 0,
  pressure: fm.pressure !== '' ? +fm.pressure : 0,
  influence: fm.influence !== '' ? +fm.influence : 0,
  impressionable: fm.impressionable !== '' ? +fm.impressionable : 50
});

@Component({
  selector: 'app-character-detail',
  standalone: true,
  imports: [RouterLink, FormField, TernaryPlotComponent, DecimalPipe],
  templateUrl: './character-detail.component.html',
  styleUrl: './character-detail.component.scss'
})
export class CharacterDetailComponent implements OnInit {
  store  = inject(AppStore);
  route  = inject(ActivatedRoute);
  router = inject(Router);

  isNew    = false;
  editMode = signal(false);

  // Read-mode: the saved character
  character = signal<Character>({
    id: '', name: '', characterType: 'NPC',
    values: { ...DEFAULT_VALUES }, conviction: 50, pressure: 0,
    influence: 0, impressionable: 50
  });

  // Edit-mode: signal form
  readonly editForm   = signal<CharacterFormModel>(emptyFormModel());
  readonly editValues = signal<ValueVector>({ ...DEFAULT_VALUES });
  readonly f = form(this.editForm, schema => {
    required(schema.name, { message: 'Name is required' });
  });

  readonly doubtDirections: DoubtDirection[] = ['Truth', 'Stability', 'Agency'];
  readonly ritualOptions:    RitualPosition[]    = ['Good', 'Neutral', 'Bad'];
  readonly knowledgeOptions: KnowledgePosition[] = ['Hidden', 'Controlled', 'Revealed'];
  readonly changeOptions:    ChangePosition[]    = ['Yes', 'No'];

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

  readonly colonyStress = computed(() => this.store.colonyState()?.colonyStress ?? 0);

  readonly effectivePressureValue = computed(() =>
    effectivePressure(this.character(), this.colonyStress())
  );

  readonly factionPeers = computed(() => {
    const c = this.character();
    if (!c.factionId) return [];
    return this.store.characters().filter(p => p.factionId === c.factionId && p.id !== c.id);
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

  readonly editConviction = computed(() => Math.min(100, Math.max(0, Number(this.editForm().conviction) || 0)));

  readonly editEffectiveConviction = computed(() => {
    const fm = this.editForm();
    const base = Math.min(100, Math.max(0, Number(fm.conviction) || 0));
    const impressionable = Math.min(100, Math.max(0, Number(fm.impressionable) || 0));
    if (!fm.factionId) return base;
    const peers = this.store.characters().filter(p => p.factionId === fm.factionId && p.id !== fm.id);
    const scale = this.store.rules()?.influenceConvictionScale ?? 0.5;
    const bonus = peers.length === 0 ? 0
      : (peers.reduce((s, p) => s + p.influence, 0) / peers.length) * (impressionable / 100) * scale;
    return base + bonus;
  });
  readonly editPressure   = computed(() => (Number(this.editForm().pressure) || 0) + this.colonyStress() * 10);

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

  // Edit-mode overlays (react to editForm's faction/class selection)
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
    this.store.factions().filter(f => f.active && f.type === 'Faction')
  );

  readonly compatibilityList = computed(() =>
    topCompatibleFactions(this.character(), this.activeFactions())
  );

  readonly top3Compatible = computed(() =>
    this.compatibilityList().slice(0, 3)
  );

  readonly mostCompatibleFaction = computed(() => {
    const top = this.compatibilityList()[0];
    if (!top) return null;
    return this.store.factions().find(f => f.id === top.factionId) ?? null;
  });

  readonly currentFactionCompatibility = computed(() => {
    const c = this.character();
    if (!c.factionId) return null;
    return this.compatibilityList().find(x => x.factionId === c.factionId) ?? null;
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

    return {
      ...c,
      values: lerpValueVector(c.values, target, t),
    };
  });

  readonly driftedCompatibilityList = computed(() => {
    const drifted = this.driftedCharacter();

    if (!drifted) return null;

    return topCompatibleFactions(drifted, this.activeFactions());
  });

  readonly driftedBeliefs = computed(() => {
    const target = this.driftTarget();

    return effectiveBeliefs({
      ...this.character(),
      values: target ?? this.character().values
    });
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

  readonly derivedBeliefs = computed(() => effectiveBeliefs(this.character()));

  readonly driftedBeliefChanges = computed(() => {
  const current = this.derivedBeliefs();
  const drifted = this.driftedBeliefs();

  return {
    ritual: current.ritual !== drifted.ritual,
    knowledge: current.knowledge !== drifted.knowledge,
    change: current.change !== drifted.change,
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
    if (id === 'new') {
      this.isNew = true;
      this.editMode.set(true);
      this.editForm.set(emptyFormModel());
      this.editValues.set({ ...DEFAULT_VALUES });
    } else {
      const found = this.store.characters().find(c => c.id === id);
      if (found) {
        this.character.set({ ...found, values: { ...found.values } });
      }
    }
  }

  enterEditMode(): void {
    this.editForm.set(toFormModel(this.character()));
    this.editValues.set({ ...this.character().values });
    this.editMode.set(true);
  }

  factionName(id?: string): string {
    if (!id) return '—';
    return this.store.factions().find(f => f.id === id)?.name ?? id;
  }

  driftClass(score: number): string {
    if (score >= 30) return 'drift high';
    if (score >= 10) return 'drift mid';
    if (score > 0)   return 'drift neutral';
    return 'drift low';
  }

  formatPercent(value: number): string {
    return value >= 100 ? 'MAX' : `${Math.round(value)}%`;
  }

  valueScoreClass(score: number): string {
    if (score >= 3)  return 'compat-score pos-high';
    if (score >= 0)  return 'compat-score neutral';
    return 'compat-score neg';
  }

  save(): void {
    const fm = this.editForm();
    if (!fm.name.trim()) return;
    const c = fromFormModel(fm, this.editValues());
    this.store.saveCharacter(c);
    this.character.set({ ...c, values: { ...c.values } });
    if (this.isNew) {
      this.router.navigate(['/characters']);
    } else {
      this.editMode.set(false);
    }
  }

  cancel(): void {
    if (this.isNew) {
      this.router.navigate(['/characters']);
    } else {
      this.editMode.set(false);
    }
  }
}
