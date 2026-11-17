import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormField, form, required } from '@angular/forms/signals';
import { AppStore } from '../../store/app.store';
import { ToastService, ImportTally } from '../../core/services/toast.service';
import { FactionInfluenceService } from '../../core/services/faction-influence.service';
import {
  Faction, GroupType, BeliefPosition,
  ValueVector, primaryValue, secondaryValue, sacrificedValue,
  beliefConflicts, BeliefConflicts, beliefPositionLabel, TERMINAL_GOAL_STATUSES,
} from '../../core/models/types';
import { TernaryPlotComponent, TernaryOverlayPoint } from '../../shared/ternary-plot/ternary-plot.component';
import { downloadCsv, parseCsv, csvHeaderMap } from '../../core/utils/csv-export';
import { oneOf, clampedInt, sanitizeValueVector } from '../../core/utils/validation';

interface AddFactionFormModel {
  name: string;
  represents: string;
  type: string;
}

const DEFAULT_VALUES: ValueVector = { a: 1/3, b: 1/3, c: 1/3 };

const emptyAddForm = (): AddFactionFormModel => ({ name: '', represents: '', type: 'Faction' });


@Component({
  selector: 'app-factions',
  standalone: true,
  imports: [FormField, TernaryPlotComponent],
  templateUrl: './factions.component.html',
  styleUrl: './factions.component.scss'
})
export class FactionsComponent {
  store     = inject(AppStore);
  private readonly toast = inject(ToastService);
  influence = inject(FactionInfluenceService);
  router    = inject(Router);

  showModal      = signal(false);
  filterType     = signal<'all' | 'Faction' | 'SocialClass'>('all');
  showGlobalView = signal(false);

  readonly globalViewOverlays = computed<TernaryOverlayPoint[]>(() =>
    this.displayFactions.map(f => ({
      values: f.values,
      label: f.name,
      color: f.type === 'SocialClass' ? '#7c3aed' : '#1d4ed8',
      labelColor: f.type === 'SocialClass' ? '#e9d5ff' : '#bfdbfe',
    }))
  );

  // ── Add faction form ────────────────────────────────────────────────────────

  readonly editForm = signal<AddFactionFormModel>(emptyAddForm());
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
    this.store.saveFaction({
      id: '',
      name: fm.name.trim(),
      represents: fm.represents,
      type: fm.type as GroupType,
      coreTenet: '', certainOf: '', rightAbout: '', afraidOf: '', wrongAbout: '',
      values: { ...DEFAULT_VALUES },
      active: true, sortOrder: 0, momentum: 0, momentumTier: 0, powerModifier: 0, factionSize: 0,
    });
    this.showModal.set(false);
  }

  // ── Card display helpers ────────────────────────────────────────────────────

  readonly TYPE_ICONS: Record<GroupType, string> = {
    SocialClass: 'fa-duotone fa-users',
    Faction:     'fa-duotone fa-sitemap',
  };

  primaryValue    = primaryValue;
  secondaryValue  = secondaryValue;
  sacrificedValue = sacrificedValue;

  valueLabel(v: string): string {
    const vl = this.store.valueLabels();
    const key = v.toLowerCase() as keyof typeof vl;
    return (key === 'a' || key === 'b' || key === 'c') ? vl[key] : v;
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

  beliefConflictsComputed(values: ValueVector, beliefc: BeliefPosition | undefined, beliefa: BeliefPosition | undefined, beliefb: BeliefPosition | undefined): BeliefConflicts {
    return beliefConflicts(values, beliefc, beliefa, beliefb, this.store.beliefAxisLabels());
  }

  axisName(axis: 'a' | 'b' | 'c'): string {
    return this.store.beliefAxisLabels()[axis].axisName;
  }

  typeLabel(t: string): string {
    return t === 'Faction' ? 'Faction' : 'Social Class';
  }

  factionMemberCount(f: Faction): number {
    return this.store.viewCharacters().filter(c => c.factionId === f.id || c.socialClassId === f.id).length;
  }

  /** §18.8: Faction Size is the recorded total membership (named characters are part of it, not added to it). */
  factionTotalMemberCount(f: Faction): number { return f.factionSize ?? 0; }

  // D4/M2: Power (1–3 cards) and its reasons come from the single Power breakdown.
  private powerOf(f: Faction) {
    return this.influence.breakdown(f, this.store.viewCharacters(), this.store.viewAssets(), this.store.formulas());
  }

  factionEffectivePower(f: Faction): number {
    return this.powerOf(f).power;
  }

  factionPowerReasons(f: Faction): string {
    const r = this.powerOf(f).reasons;
    return r.length ? `Base card + ${r.join(' + ')}` : 'Base card only';
  }

  factionGoalCount(f: Faction): number {
    return this.store.viewGoals().filter(g => g.factionId === f.id && !TERMINAL_GOAL_STATUSES.includes(g.status)).length;   // Retired is terminal too
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  openDetail(faction: Faction): void {
    this.router.navigate(['/factions', faction.id]);
  }

  // ── Drag-to-reorder ─────────────────────────────────────────────────────────

  private dragSourceId: string | null = null;
  readonly dragOverId = signal<string | null>(null);

  get displayFactions(): Faction[] {
    const type = this.filterType();
    return this.store.viewFactions().filter(f => type === 'all' || f.type === type);
  }

  onDragStart(id: string): void { this.dragSourceId = id; }

  onDragOver(event: DragEvent, id: string): void {
    event.preventDefault();
    if (id !== this.dragSourceId) this.dragOverId.set(id);
  }

  onDragLeave(id: string): void {
    if (this.dragOverId() === id) this.dragOverId.set(null);
  }

  onDrop(targetId: string): void {
    this.dragOverId.set(null);
    const srcId = this.dragSourceId;
    this.dragSourceId = null;
    if (!srcId || srcId === targetId) return;
    const list = [...this.displayFactions];
    const srcIdx = list.findIndex(f => f.id === srcId);
    const tgtIdx = list.findIndex(f => f.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;
    list.splice(srcIdx, 1);
    list.splice(tgtIdx, 0, this.store.factions().find(f => f.id === srcId)!);
    this.store.reorderFactions(list.map(f => f.id));
  }

  onDragEnd(): void {
    this.dragSourceId = null;
    this.dragOverId.set(null);
  }

  // ── CSV import / export ─────────────────────────────────────────────────────

  importCsv(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(reader.result as string);
      if (rows.length < 2) return;
      const h = csvHeaderMap(rows[0]);
      const get = (row: string[], col: string) => row[h.get(col) ?? -1] ?? '';

      if (h.has('narrativetier') || h.has('characterid')) {
        alert(`Wrong file: this looks like a characters export. Import it from the Characters page instead.`);
        (event.target as HTMLInputElement).value = '';
        return;
      }

      if (h.has('keystone')) {
        alert(`Wrong file: this looks like an assets export. Import it from the Assets page instead.`);
        (event.target as HTMLInputElement).value = '';
        return;
      }

      if (h.has('conditiontype')) {
        alert(`Wrong file: this looks like a faction goals export. Import it from the Goals page instead.`);
        (event.target as HTMLInputElement).value = '';
        return;
      }

      if (h.has('bannershape')) {
        // Factions file
        const vl = this.store.valueLabels();
        const bl = this.store.beliefAxisLabels();
        // Try fixed key first (old exports), then display name (new exports)
        const getCol = (row: string[], fixed: string, display: string) =>
          get(row, fixed) || get(row, display.toLowerCase());
        const existingById = new Map(this.store.factions().map(f => [f.id, f]));
        const tally = new ImportTally();
        for (const row of rows.slice(1)) {
          const id = get(row, 'id');
          const existing = existingById.get(id);
          const faction: Faction = {
            // Preserve fields not present in the CSV (e.g. iconPath set via the UI)
            ...existing,
            id,
            name:           get(row, 'name'),
            type:           oneOf(get(row, 'type'), ['Faction', 'SocialClass'] as const) ?? 'Faction',
            active:         get(row, 'active') !== 'false',
            sortOrder:      clampedInt(get(row, 'sortorder'), 0, 99999, 0),
            represents:     get(row, 'represents'),
            coreTenet:      get(row, 'coretenet'),
            focus:          get(row, 'focus')      || undefined,
            certainOf:      get(row, 'certainof'),
            rightAbout:     get(row, 'rightabout'),
            afraidOf:       get(row, 'afraidof'),
            wrongAbout:     get(row, 'wrongabout'),
            response:       get(row, 'response')   || undefined,
            summary:        get(row, 'summary')    || undefined,
            motto:          get(row, 'motto')      || undefined,
            origin:         get(row, 'origin')     || undefined,
            foundedAs:      get(row, 'foundedas')  || undefined,
            became:         get(row, 'became')     || undefined,
            publicFace:     get(row, 'publicface') || undefined,
            selfImage:      get(row, 'selfimage')  || undefined,
            history:        get(row, 'history')    || undefined,
            beliefc: oneOf(getCol(row, 'beliefc', bl.c.axisName), ['positive', 'neutral', 'negative'] as const),
            beliefa: oneOf(getCol(row, 'beliefa', bl.a.axisName), ['positive', 'neutral', 'negative'] as const),
            beliefb: oneOf(getCol(row, 'beliefb', bl.b.axisName), ['positive', 'negative']             as const),
            values: sanitizeValueVector(
              parseFloat(getCol(row, 'valuea', vl.a)),
              parseFloat(getCol(row, 'valueb', vl.b)),
              parseFloat(getCol(row, 'valuec', vl.c)),
            ),
            notes:          get(row, 'notes')         || undefined,
            primaryColor:   get(row, 'primarycolor')  || undefined,
            secondaryColor: get(row, 'secondarycolor') || undefined,
            bannerShape:    (get(row, 'bannershape')   || undefined) as import('../../core/models/types').BannerShape | undefined,
            momentum:              parseInt(get(row, 'momentum'))              || 0,
            momentumTier:          Math.max(-2, Math.min(2, parseInt(get(row, 'momentumtier')) || 0)),
            powerModifier:         parseInt(get(row, 'powermodifier'))         || 0,
            // a file without the column keeps the faction's value (older exports omitted it, and importing them reset it to 0)
            // §18.8: a file without the column keeps the faction's value. 'AdditionalMemberCount' (unnamed members, exported
            // before the rename) is not read as a total: it meant something else.
            factionSize: h.has('factionsize') ? Math.max(0, parseInt(get(row, 'factionsize')) || 0) : existing?.factionSize ?? 0,
            leaderId:              get(row, 'leaderid') || undefined,
          };
          tally.track(existing ? 'replaced' : 'added', this.store.saveFaction(faction));
        }
        tally.report(this.toast, 'Factions');
      } else {
        alert(`Unrecognized file format. Expected a factions export.`);
      }
      (event.target as HTMLInputElement).value = '';
    };
    reader.readAsText(file);
  }

  exportCsv(): void {
    const factions = this.store.factions();
    const vl = this.store.valueLabels();
    const bl = this.store.beliefAxisLabels();
    const factionHeader = [
      'Id', 'Name', 'Type', 'Active', 'SortOrder',
      'Represents', 'CoreTenet', 'Focus', 'CertainOf', 'RightAbout',
      'AfraidOf', 'WrongAbout', 'Response', 'Summary', 'Motto',
      'Origin', 'FoundedAs', 'Became', 'PublicFace', 'SelfImage', 'History',
      bl.c.axisName, bl.a.axisName, bl.b.axisName,
      vl.a, vl.b, vl.c,
      'Momentum', 'MomentumTier', 'PowerModifier',
      'Notes', 'PrimaryColor', 'SecondaryColor', 'BannerShape', 'LeaderId', 'FactionSize'
    ];
    const factionRows = factions.map(f => [
      f.id, f.name, f.type, f.active ? 'true' : 'false', f.sortOrder,
      f.represents, f.coreTenet, f.focus ?? '', f.certainOf, f.rightAbout,
      f.afraidOf, f.wrongAbout, f.response ?? '', f.summary ?? '', f.motto ?? '',
      f.origin ?? '', f.foundedAs ?? '', f.became ?? '', f.publicFace ?? '', f.selfImage ?? '', f.history ?? '',
      f.beliefc ?? '', f.beliefa ?? '', f.beliefb ?? '',
      f.values.a.toFixed(4), f.values.b.toFixed(4), f.values.c.toFixed(4),
      f.momentum, f.momentumTier ?? 0, f.powerModifier,
      f.notes ?? '', f.primaryColor ?? '', f.secondaryColor ?? '', f.bannerShape ?? '',
      f.leaderId ?? '', f.factionSize ?? 0
    ]);
    downloadCsv([factionHeader, ...factionRows], 'factions.csv');   // goals export from the Goals page
  }
}
