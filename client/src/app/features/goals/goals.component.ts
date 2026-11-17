import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AppStore } from '../../store/app.store';
import { Faction, FactionGoal, GoalPriority, TERMINAL_GOAL_STATUSES } from '../../core/models/types';
import { computePowerBreakdown, PowerBreakdown } from '../../core/sim/power';
import { GOAL_CSV_HEADER, goalToCsvRow, goalFromCsvRow } from '../../core/utils/goal-csv';
import { downloadCsv, parseCsv, csvHeaderMap } from '../../core/utils/csv-export';
import { ToastService, ImportTally } from '../../core/services/toast.service';
import { GoalCardComponent } from './goal-card.component';
import { GoalEditorComponent } from './goal-editor.component';

type Show = 'active' | 'resolved' | 'all';
type GroupBy = 'faction' | 'target' | 'grid';
interface Group { key: string; title: string; link?: unknown[]; note?: string; contested: boolean; goals: FactionGoal[] }

const PRIORITY_ORDER: Record<GoalPriority, number> = { Critical: 0, Major: 1, Minor: 2 };

/**
 * Every faction's goals and assignments in one place, at the viewed point in history. Grouped by faction, or by
 * target, where several factions' goals on one Asset or Character show the contests the Faction Phase settles.
 */
@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [GoalCardComponent, GoalEditorComponent, RouterLink],
  templateUrl: './goals.component.html',
  styleUrl: './goals.component.scss',
})
export class GoalsComponent {
  readonly store = inject(AppStore);
  private readonly toast = inject(ToastService);

  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;   // ?faction=<id> (from a faction page), ?group=target|grid
  readonly show = signal<Show>('active');
  readonly groupBy = signal<GroupBy>((['target', 'grid'] as const).find(g => g === this.query.get('group')) ?? 'faction');
  readonly factionFilter = signal<string>(this.query.get('faction') ?? '');
  readonly typeFilter = signal<'' | 'Achieve' | 'Maintain'>('');
  readonly actFilter = signal<'' | '1' | '2' | '3'>('');
  readonly search = signal('');

  /** The editor: undefined = closed; null = a new goal (optionally in a grid slot). */
  readonly editing = signal<FactionGoal | null | undefined>(undefined);
  readonly newSlot = signal<{ factionId: string; priority: GoalPriority; earliestAct: number } | null>(null);
  readonly canAdd = computed(() => !this.store.isViewingSnapshot() && !this.store.isLive());
  readonly canEdit = computed(() => !this.store.isViewingSnapshot());

  readonly factions = computed(() => this.store.factions().filter(f => f.active && f.type === 'Faction')
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)));
  private factionName(id: string): string { return this.store.factions().find(f => f.id === id)?.name ?? id; }

  readonly filtered = computed((): FactionGoal[] => {
    const show = this.show(), fac = this.factionFilter(), type = this.typeFilter(), act = this.actFilter();
    const q = this.search().trim().toLowerCase();
    return this.store.viewGoals().filter(g => {
      const resolved = TERMINAL_GOAL_STATUSES.includes(g.status);
      if (show === 'active' && resolved) return false;
      if (show === 'resolved' && !resolved) return false;
      if (fac && g.factionId !== fac) return false;
      if (type && g.conditionType !== type) return false;
      if (act && String(g.earliestAct ?? 2) !== act) return false;
      if (q && !g.title.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.title.localeCompare(b.title));
  });

  /** Header counts over the active goals (all factions, whatever the filters). */
  readonly counts = computed(() => {
    const active = this.store.viewGoals().filter(g => !TERMINAL_GOAL_STATUSES.includes(g.status)), ga = this.store.viewGoalAssessments();
    const achieve = active.filter(g => g.conditionType === 'Achieve');
    return {
      planning: achieve.filter(g => g.status === 'Plotting').length,
      progressing: achieve.filter(g => g.status === 'Progressing').length,
      ready: achieve.filter(g => ga.get(g.id)?.ready).length,
      dormant: achieve.filter(g => ga.get(g.id)?.dormant).length,
      maintain: active.filter(g => g.conditionType === 'Maintain').length,
      resolved: this.store.viewGoals().length - active.length,
    };
  });

  readonly groups = computed((): Group[] => {
    const goals = this.filtered();
    if (this.groupBy() === 'faction') {
      const ids = [...new Set(goals.map(g => g.factionId))]
        .sort((a, b) => this.factions().findIndex(f => f.id === a) - this.factions().findIndex(f => f.id === b));
      return ids.map(id => ({ key: id, title: this.factionName(id), link: ['/factions', id], contested: false, goals: goals.filter(g => g.factionId === id) }));
    }
    const byTarget = new Map<string, FactionGoal[]>();
    for (const g of goals) {
      const key = g.targetEntityId && g.targetEntityType !== 'Faction' ? `${g.targetEntityType}:${g.targetEntityId}` : '';
      byTarget.set(key, [...(byTarget.get(key) ?? []), g]);
    }
    const groups = [...byTarget.entries()].filter(([k]) => k).map(([key, gs]): Group => {
      const [type, id] = key.split(':');
      const name = type === 'Asset' ? this.store.assets().find(a => a.id === id)?.name ?? `⚠ missing Asset ${id}`
                                    : this.store.characters().find(c => c.id === id)?.name ?? id;
      const factions = new Set(gs.map(g => g.factionId));
      const holder = type === 'Asset' ? this.store.viewAssets().find(a => a.id === id)?.controllingFactionId : undefined;
      return { key, title: name, contested: factions.size > 1, goals: gs,
               link: type === 'Character' ? ['/characters', id] : undefined,
               note: [type, type === 'Asset' ? `held by ${holder ? this.factionName(holder) : 'no one'}` : '',
                      factions.size > 1 ? `${factions.size} factions` : ''].filter(Boolean).join(' · ') };
    }).sort((a, b) => Number(b.contested) - Number(a.contested) || b.goals.length - a.goals.length || a.title.localeCompare(b.title));
    const none = byTarget.get('');
    if (none?.length) groups.push({ key: 'none', title: 'No target', note: 'narrative goals and legacy targets', contested: false, goals: none });
    return groups;
  });

  openAdd(): void { this.newSlot.set(null); this.editing.set(null); }
  addInSlot(factionId: string, priority: GoalPriority, earliestAct: number): void {
    if (!this.canAdd()) return;
    this.newSlot.set({ factionId, priority, earliestAct }); this.editing.set(null);
  }

  // ── Planning grid: per faction, goals and assignments by Earliest Act (columns) × Priority (rows), one slot each ──
  readonly ACTS = [1, 2, 3] as const;
  readonly PRIORITIES: GoalPriority[] = ['Critical', 'Major', 'Minor'];
  readonly grids = computed(() => {
    // §18.12: Maintain assignments share Power with goals, so they always show and fill their slot, in their Earliest Act
    const fac = this.factionFilter(), q = this.search().trim().toLowerCase();
    const visible = this.store.viewGoals().filter(g => !q || g.title.toLowerCase().includes(q));
    const factions = new Map(this.store.viewFactions().map(f => [f.id, f]));
    return this.factions().filter(f => !fac || f.id === fac).map(f => {
      const mine = visible.filter(g => g.factionId === f.id);
      const slotAct = (g: FactionGoal) => g.earliestAct ?? 2;
      const byTitle = (a: FactionGoal, b: FactionGoal) => a.title.localeCompare(b.title);
      const cells = this.PRIORITIES.map(priority => this.ACTS.map(act => {
        const here = mine.filter(g => g.priority === priority && slotAct(g) === act);
        return { priority, act, count: here.length, goals: here.filter(g => g.conditionType === 'Achieve').sort(byTitle),
                 maintain: here.filter(g => g.conditionType === 'Maintain').sort(byTitle) };
      }));
      const projected = factions.get(f.id) ?? f;
      return { faction: f, flair: this.flair(f), total: mine.length, cells,
               power: computePowerBreakdown(projected, this.store.viewCharacters(), this.store.viewAssets(), this.store.formulas()) };
    });
  });
  /** The faction's banner, as on the Assets page: its secondary colour, shape, and icon in its primary colour. */
  private flair(f: Faction) {
    return { bg: f.secondaryColor || '#1e293b', iconColor: f.primaryColor || '#ffffff', iconPath: f.iconPath || undefined,
             shape: f.bannerShape || 'centered-triangle' };
  }
  powerTitle(p: PowerBreakdown): string {
    return `Power ${p.power}: ` + [`People ${p.people.score}/${p.people.threshold}`, `Holdings ${p.holdings.score}/${p.holdings.threshold}`,
                                   `Mandate ${p.mandate.score}/${p.mandate.threshold}`].join(' · ');
  }
  isResolved(g: FactionGoal): boolean { return TERMINAL_GOAL_STATUSES.includes(g.status); }
  goalTitle(g: FactionGoal): string {
    const a = this.store.viewGoalAssessments().get(g.id);
    return [g.title, g.status === 'Plotting' ? 'Planning' : g.status, a?.dormant ? `Dormant: ${a.dormant}` : '', a?.ready ? 'Ready to Resolve' : '']
      .filter(Boolean).join(' · ');
  }
  openEdit(g: FactionGoal): void { this.editing.set(this.store.factionGoals().find(x => x.id === g.id) ?? g); }

  // ── CSV (moved from the Factions page) ──────────────────────────────────
  exportCsv(): void {
    const name = (list: { id: string; name: string }[], id: string) => list.find(x => x.id === id)?.name ?? id;
    const names = {
      faction: (id: string) => name(this.store.factions(), id),
      character: (id: string) => name(this.store.characters(), id),
      entity: (type: string | undefined, id: string) => type === 'Character' ? name(this.store.characters(), id)
        : type === 'Asset' ? name(this.store.assets(), id) : name(this.store.factions(), id),
    };
    downloadCsv([GOAL_CSV_HEADER, ...this.store.factionGoals().map(g => goalToCsvRow(g, names))], 'faction-goals.csv');
  }

  importCsv(event: Event): void {
    const input = event.target as HTMLInputElement, file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      input.value = '';
      const rows = parseCsv(reader.result as string);
      if (rows.length < 2) return;
      const h = csvHeaderMap(rows[0]);
      if (!h.has('conditiontype')) { alert('Unrecognized file format. Expected a faction goals export.'); return; }
      const get = (row: string[], col: string) => row[h.get(col) ?? -1] ?? '';
      const factionIds = new Set(this.store.factions().map(f => f.id));
      const existingById = new Map(this.store.factionGoals().map(g => [g.id, g]));
      const tally = new ImportTally();
      for (const row of rows.slice(1)) {
        if (!factionIds.has(get(row, 'factionid'))) { tally.count('skipped'); continue; }
        const goal = goalFromCsvRow(col => get(row, col), col => h.has(col), existingById.get(get(row, 'id')), this.store.activeCampaign()!.id);
        if (goal.status === 'Retired') goal.championId = undefined;   // ruling: a retired goal's champion is unassigned
        tally.track(existingById.has(goal.id) ? 'replaced' : 'added', this.store.saveFactionGoal(goal));
      }
      tally.report(this.toast, 'Faction goals');
    };
    reader.readAsText(file);
  }
}
