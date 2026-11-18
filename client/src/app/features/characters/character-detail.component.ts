import { InstabilityBadgeComponent } from '../../shared/instability-badge/instability-badge.component';
import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe, NgClass } from '@angular/common';
import { FormField, form, required } from '@angular/forms/signals';
import { AppStore } from '../../store/app.store';
import { ApiService } from '../../core/services/api.service';
import {
  Character, CharacterType, CharacterState, NarrativeTier, DoubtDirection, ValueVector,
  BeliefPosition, NARRATIVE_TIER_OPTIONS,
  CharacterNarrativeProfile, CharacterDetail, CharacterRelationship,
  NarrativeVisibility, RelationshipState,
  NARRATIVE_VISIBILITY_OPTIONS, RELATIONSHIP_STATE_OPTIONS,
  effectivePressure, computeDriftTarget, lerpValueVector,
  effectiveBeliefs,
  primaryValue, secondaryValue, sacrificedValue,
  influenceConvictionBonus, beliefAxisOptions, beliefPositionLabel
} from '../../core/models/types';
import { TernaryPlotComponent, TernaryOverlayPoint } from '../../shared/ternary-plot/ternary-plot.component';
import { scoreRelationship, ScoringActor, DEFAULT_RULES, topCompatibleFactions } from '../../core/services/scoring.service';
import { getAncestryImagePath, FALLBACK_ANCESTRY_IMAGE } from '../../core/utils/ancestry-images';
import { EditingCard, CharacterFormModel, toFormModel, applyCardEdit, baselineForSave } from './character-card-edit';


interface RelFormModel {
  relationshipType: string;
  targetCharacterId: string;
  summary: string;
  state: string;
  visibility: string;
}

interface DetailFormModel {
  heading: string;
  body: string;
  visibility: string;
}


const DEFAULT_VALUES: ValueVector = { a: 1/3, b: 1/3, c: 1/3 };

const emptyFormModel = (): CharacterFormModel => ({
  id: '', name: '', characterType: 'NPC', narrativeTier: 'Minor', state: 'Alive',
  ancestry: '', heritage: '', class: '', background: '', level: '',
  gender: '', pronouns: '', age: '', occupation: '', aliases: '',
  summary: '',
  factionId: '', socialClassId: '', locationId: '',
  beliefc: '', beliefa: '', beliefb: '',
  doubtDirection: '', conviction: '50', pressure: '0',
  influence: '0', impressionable: '50'
});



@Component({
  selector: 'app-character-detail',
  standalone: true,
  imports: [InstabilityBadgeComponent, RouterLink, FormField, TernaryPlotComponent, DecimalPipe, NgClass],
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
    const source = baselineForSave(this.store.characters(), this.characterId()) ?? this.character();
    this.editForm.set(toFormModel(source));
    this.editValues.set({ ...source.values });
    this.editingCard.set(card);
  }

  closeCard(): void { this.editingCard.set(null); }

  saveCard(card: EditingCard): void {
    // D9: start from the baseline record, not the (possibly snapshot-projected) view.
    const base = baselineForSave(this.store.characters(), this.characterId());
    if (!base) return;
    const updated = applyCardEdit(base, card, this.editForm(), this.editValues());
    if (!updated) return;
    this.store.saveCharacter(updated);
    this.editingCard.set(null);
  }

  // ── Character state ────────────────────────────────────────────────────────

  private portraitBust = signal<string | null>(null);

  // D9: the displayed character follows the viewing context (baseline / current / session).
  readonly characterId = signal('');
  readonly character = computed<Character>(() =>
    this.store.viewCharacters().find(c => c.id === this.characterId()) ?? {
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

  readonly narrativeTierOptions = NARRATIVE_TIER_OPTIONS;
  readonly stateOptions: CharacterState[] = ['Alive', 'Dead', 'Missing', 'Forgotten'];
  readonly doubtDirections: DoubtDirection[] = ['a', 'b', 'c', 'ab', 'ac', 'bc'];
  readonly beliefcOptions = computed(() => beliefAxisOptions(this.store.beliefAxisLabels().c));
  readonly beliefaOptions = computed(() => beliefAxisOptions(this.store.beliefAxisLabels().a));
  readonly beliefbOptions = computed(() => beliefAxisOptions(this.store.beliefAxisLabels().b));

  readonly genderOptions = ['Male', 'Female', 'Unknown', 'Unspecified'];

  readonly roleOptions: { value: CharacterType; label: string }[] = [
    { value: 'NPC',          label: 'NPC' },
    { value: 'PartyMember',  label: 'Party Member' },
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
    effectivePressure(this.character(), this.colonyStress(), this.store.formulas().stressPressureCoefficient)
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
    topCompatibleFactions(this.character(), this.activeFactions(), this.store.formulas().beliefDerivationThreshold, this.store.beliefAxisLabels(), this.store.rules() ?? DEFAULT_RULES)
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
    return topCompatibleFactions(drifted, this.activeFactions(), this.store.formulas().beliefDerivationThreshold, this.store.beliefAxisLabels(), this.store.rules() ?? DEFAULT_RULES);
  });

  readonly driftedBeliefs = computed(() => {
    const target = this.driftTarget();
    return effectiveBeliefs({ ...this.character(), values: target ?? this.character().values }, this.store.formulas().beliefDerivationThreshold, this.store.beliefAxisLabels());
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
    const beliefs = effectiveBeliefs(c, this.store.formulas().beliefDerivationThreshold, this.store.beliefAxisLabels());
    const source: ScoringActor = { id: c.id, values: c.values, beliefc: beliefs.beliefc, beliefa: beliefs.beliefa, beliefb: beliefs.beliefb };
    const party: ScoringActor  = { id: 'party', values: cs.partyValues, beliefc: cs.partyBeliefc, beliefa: cs.partyBeliefa, beliefb: cs.partyBeliefb };
    return scoreRelationship(source, party, this.colonyStress(), 0, this.store.rules() ?? DEFAULT_RULES);
  });

  readonly partyName = computed(() => this.store.colonyState()?.partyName ?? 'Party');

  readonly championGoals = computed(() =>
    this.store.viewGoals().filter(g => g.championId === this.character().id)
  );

  readonly derivedBeliefs = computed(() => effectiveBeliefs(this.character(), this.store.formulas().beliefDerivationThreshold, this.store.beliefAxisLabels()));

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
      this.characterId.set(found.id);
      this.loadNarrativeData(found.id);
      this.store.setNarrativeFocus({ type: 'Character', id: found.id, name: found.name });
    } else {
      this.router.navigate(['/characters']);
    }
  }

  // ── Narrative Profile ──────────────────────────────────────────────────────

  narrativeProfile = signal<CharacterNarrativeProfile | null>(null);
  editingProfile = signal(false);
  profileForm = signal<Partial<CharacterNarrativeProfile>>({});

  openProfileEdit(): void {
    this.profileForm.set({ ...(this.narrativeProfile() ?? { characterId: this.character().id }) });
    this.editingProfile.set(true);
  }
  closeProfileEdit(): void { this.editingProfile.set(false); }

  saveProfile(): void {
    const form = { ...this.profileForm(), characterId: this.character().id } as CharacterNarrativeProfile;
    this.api.upsertNarrativeProfile(form).subscribe({
      next: (saved) => { this.narrativeProfile.set(saved); this.editingProfile.set(false); },
    });
  }

  // ── Character Details ──────────────────────────────────────────────────────

  characterDetails = signal<CharacterDetail[]>([]);
  private editingDetailSrc = signal<CharacterDetail | null>(null);
  editingDetailId = signal<string | 'new' | null>(null);
  readonly detailFormModel = signal<DetailFormModel>({ heading: '', body: '', visibility: 'GMOnly' });
  readonly df = form(this.detailFormModel);

  readonly visibilityOptions = NARRATIVE_VISIBILITY_OPTIONS;

  openDetailEdit(detail?: CharacterDetail): void {
    if (detail) {
      this.editingDetailSrc.set(detail);
      this.detailFormModel.set({ heading: detail.heading, body: detail.body ?? '', visibility: detail.visibility });
      this.editingDetailId.set(detail.id);
    } else {
      this.editingDetailSrc.set(null);
      this.detailFormModel.set({ heading: '', body: '', visibility: 'GMOnly' });
      this.editingDetailId.set('new');
    }
  }

  closeDetailEdit(): void { this.editingDetailId.set(null); }

  saveDetail(): void {
    const fm = this.detailFormModel();
    const src = this.editingDetailSrc();
    const charId = this.character().id;
    const isNew = this.editingDetailId() === 'new';
    const key = fm.heading ? fm.heading.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '';
    const payload: CharacterDetail = {
      ...(src ?? {} as CharacterDetail),
      heading: fm.heading,
      body: fm.body || undefined,
      visibility: fm.visibility as NarrativeVisibility,
      key: src?.key || key,
      sortOrder: src?.sortOrder ?? this.characterDetails().length,
    };
    const obs$ = isNew
      ? this.api.createCharacterDetail(charId, payload)
      : this.api.updateCharacterDetail(charId, payload);
    obs$.subscribe({
      next: (saved) => {
        if (isNew) {
          this.characterDetails.update(d => [...d, saved]);
        } else {
          this.characterDetails.update(d => d.map(x => x.id === saved.id ? saved : x));
        }
        this.editingDetailId.set(null);
      },
    });
  }

  deleteDetail(id: string): void {
    this.api.deleteCharacterDetail(this.character().id, id).subscribe({
      next: () => this.characterDetails.update(d => d.filter(x => x.id !== id)),
    });
  }

  // ── Character Relationships ────────────────────────────────────────────────

  characterRelationships = signal<CharacterRelationship[]>([]);
  private editingRelSrc = signal<CharacterRelationship | null>(null);
  editingRelId = signal<string | 'new' | null>(null);
  readonly relFormModel = signal<RelFormModel>({ relationshipType: '', targetCharacterId: '', summary: '', state: 'Active', visibility: 'GMOnly' });
  readonly rf = form(this.relFormModel);

  readonly relationshipStateOptions = RELATIONSHIP_STATE_OPTIONS;

  openRelEdit(rel?: CharacterRelationship): void {
    if (rel) {
      this.editingRelSrc.set(rel);
      this.relFormModel.set({
        relationshipType: rel.relationshipType ?? '',
        targetCharacterId: rel.targetCharacterId ?? '',
        summary: rel.summary ?? '',
        state: rel.state,
        visibility: rel.visibility,
      });
      this.editingRelId.set(rel.id);
    } else {
      this.editingRelSrc.set(null);
      this.relFormModel.set({ relationshipType: '', targetCharacterId: '', summary: '', state: 'Active', visibility: 'GMOnly' });
      this.editingRelId.set('new');
    }
  }

  closeRelEdit(): void { this.editingRelId.set(null); }

  saveRel(): void {
    const fm = this.relFormModel();
    const src = this.editingRelSrc();
    const charId = this.character().id;
    const isNew = this.editingRelId() === 'new';
    const payload: CharacterRelationship = {
      ...(src ?? {} as CharacterRelationship),
      relationshipType: fm.relationshipType,
      targetCharacterId: fm.targetCharacterId || undefined,
      summary: fm.summary || undefined,
      state: fm.state as RelationshipState,
      visibility: fm.visibility as NarrativeVisibility,
      sortOrder: src?.sortOrder ?? this.characterRelationships().length,
    };
    const obs$ = isNew
      ? this.api.createCharacterRelationship(charId, payload)
      : this.api.updateCharacterRelationship(charId, payload);
    obs$.subscribe({
      next: (saved) => {
        if (isNew) {
          this.characterRelationships.update(r => [...r, saved]);
        } else {
          // The id comes from the two characters and the type (ADVENTURE-BOOK-PLAN.md §15), so an edit can change it.
          this.characterRelationships.update(r => r.map(x => x.id === src?.id ? saved : x));
        }
        this.editingRelId.set(null);
      },
    });
  }

  deleteRel(id: string): void {
    this.api.deleteCharacterRelationship(this.character().id, id).subscribe({
      next: () => this.characterRelationships.update(r => r.filter(x => x.id !== id)),
    });
  }

  resolveTargetName(rel: CharacterRelationship): string {
    if (!rel.targetCharacterId) return '—';
    return this.store.viewCharacters().find(c => c.id === rel.targetCharacterId)?.name ?? rel.targetCharacterId;
  }

  targetCharacterOptions(): { value: string; label: string }[] {
    return this.store.viewCharacters()
      .filter(c => c.id !== this.character().id)
      .map(c => ({ value: c.id, label: c.name }));
  }

  private loadNarrativeData(characterId: string): void {
    this.api.getNarrativeProfile(characterId).subscribe({
      next: (p) => this.narrativeProfile.set(p),
      error: () => {},
    });
    this.api.getCharacterDetails(characterId).subscribe({
      next: (d) => this.characterDetails.set(d),
      error: () => {},
    });
    this.api.getCharacterRelationships(characterId).subscribe({
      next: (r) => this.characterRelationships.set(r),
      error: () => {},
    });
  }

  factionName(id?: string): string {
    if (!id) return '—';
    return this.store.factions().find(f => f.id === id)?.name ?? id;
  }

  typeLabel(t: CharacterType): string {
    if (t === 'PartyMember') return 'Party Member';
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
      // D9: patch the baseline record, not the projected view.
      const base = baselineForSave(this.store.characters(), this.characterId());
      if (base) this.store.saveCharacter({ ...base, portraitPath: res.path });
    });
    (event.target as HTMLInputElement).value = '';
  }

  delete(): void {
    if (!confirm('Delete this character? This cannot be undone.')) return;
    this.store.deleteCharacter(this.character().id);
    this.router.navigate(['/characters']);
  }
}
