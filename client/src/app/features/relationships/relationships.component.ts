import { Component, inject, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { AppStore } from '../../store/app.store';
import {
  Faction, RelationshipBreakdown, RulesConfig, RelationshipThreshold, RelationshipLabel
} from '../../core/models/types';
import { downloadCsv } from '../../core/utils/csv-export';

const LABELS: RelationshipLabel[] = ['Aligned', 'Cooperative', 'Friendly', 'Tolerated', 'Strained', 'Opposed', 'Hostile'];

@Component({
  selector: 'app-relationships',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './relationships.component.html',
  styleUrl: './relationships.component.scss'
})
export class RelationshipsComponent {
  store = inject(AppStore);

  // ── Matrix ────────────────────────────────────────────────────────────────
  selectedBreakdown = signal<RelationshipBreakdown | null>(null);
  factions = computed(() => this.store.activeFactions());

  // ── Rules editing ─────────────────────────────────────────────────────────
  rules = signal<RulesConfig | null>(null);
  private saveRules$ = new Subject<RulesConfig>();

  // ── Threshold editing ─────────────────────────────────────────────────────
  editingThresholds = signal(false);
  thresholdEdits = signal<RelationshipThreshold[]>([]);

  parsedThresholds = computed<RelationshipThreshold[]>(() => {
    try { return JSON.parse(this.rules()?.thresholdsJson ?? '[]'); }
    catch { return []; }
  });

  readonly labelOptions = LABELS;

  // ── Override modal ────────────────────────────────────────────────────────
  showOverrideModal = signal(false);
  overrideSourceId = signal('');
  overrideTargetId = signal('');
  overrideScoreBump = signal(0);
  overrideNotes = signal('');
  overrideEditId = signal<string | null>(null);

  constructor() {
    // Seed local rules copy from store once loaded
    effect(() => {
      const r = this.store.rules();
      if (r && !this.rules()) this.rules.set({ ...r });
    });

    // Debounced auto-save — 600ms after last change
    this.saveRules$.pipe(debounceTime(600)).subscribe(r => {
      this.store.saveRules(r);
    });
  }

  // ── Stress (lives in colonyState, edited here) ────────────────────────────
  get stress(): number {
    return this.store.colonyState()?.colonyStress ?? 0;
  }

  setStress(value: number): void {
    const cs = this.store.colonyState();
    if (!cs) return;
    this.store.saveColonyState({ ...cs, colonyStress: value });
  }

  // ── Rules field helpers ───────────────────────────────────────────────────
  setRule(key: keyof RulesConfig, raw: string): void {
    const value = parseFloat(raw);
    if (isNaN(value)) return;
    const updated = { ...this.rules()!, [key]: value };
    this.rules.set(updated);
    this.saveRules$.next(updated);
  }

  setRuleBool(key: 'positiveEnabled' | 'negativeEnabled', value: boolean): void {
    const updated = { ...this.rules()!, [key]: value };
    this.rules.set(updated);
    this.saveRules$.next(updated);
  }

  resetRules(): void {
    if (!confirm('Reset all rules to defaults?')) return;
    const defaults: RulesConfig = {
      ...this.rules()!,
      beliefMatch: 2.5,
      beliefConflict: -1.0,
      valueAlignmentScale: 5,
      valueConflictScale: 3,
      stressPositiveMultiplierPerPoint: 0.25,
      stressNegativeMultiplierPerPoint: 0.35,
      positiveEnabled: true,
      negativeEnabled: true,
    };
    this.rules.set(defaults);
    this.saveRules$.next(defaults);
  }

  // ── Threshold editing ─────────────────────────────────────────────────────
  openThresholds(): void {
    this.thresholdEdits.set(
      [...this.parsedThresholds()].sort((a, b) => b.minScore - a.minScore)
    );
    this.editingThresholds.set(true);
  }

  closeThresholds(): void {
    this.editingThresholds.set(false);
  }

  setThresholdScore(index: number, raw: string): void {
    const value = parseFloat(raw);
    if (isNaN(value)) return;
    this.thresholdEdits.update(ts => ts.map((t, i) => i === index ? { ...t, minScore: value } : t));
  }

  saveThresholds(): void {
    const updated = {
      ...this.rules()!,
      thresholdsJson: JSON.stringify(this.thresholdEdits())
    };
    this.rules.set(updated);
    this.store.saveRules(updated);
    this.editingThresholds.set(false);
  }

  // ── Matrix helpers ────────────────────────────────────────────────────────
  getRelationship(sourceId: string, targetId: string): RelationshipBreakdown | undefined {
    return this.store.relationships().find(
      r => r.sourceId === sourceId && r.targetId === targetId
    );
  }

  cellStyle(r: RelationshipBreakdown | undefined): string {
    if (!r) return 'cell-empty';
    return `cell-${r.label.toLowerCase()}`;
  }

  labelClass(label: string): string {
    return `badge badge-${label.toLowerCase()}`;
  }

  scoreClass(score: number): string {
    if (score >= 4) return 'score pos-high';
    if (score >= 2) return 'score pos-mid';
    if (score >= 0) return 'score neutral';
    if (score >= -3) return 'score neg-mid';
    return 'score neg-high';
  }

  openBreakdown(r: RelationshipBreakdown | undefined): void {
    if (r) this.selectedBreakdown.set(r);
  }

  closeBreakdown(): void {
    this.selectedBreakdown.set(null);
  }

  sourceName(id: string): string {
    if (id === 'darkwing') return 'Darkwing';
    return this.store.factions().find(f => f.id === id)?.name ?? id;
  }

  breakdownContribs(r: RelationshipBreakdown): Array<{ label: string; value: number }> {
    return [
      { label: 'Value Alignment',   value: r.contributions.valueAlignment },
      { label: 'Value Conflict',    value: r.contributions.valueConflict },
      { label: 'Ritual ' + (r.contributions.ritual >= 0 ? 'Alignment' : 'Conflict'),    value: r.contributions.ritual },
      { label: 'Knowledge ' + (r.contributions.knowledge >= 0 ? 'Alignment' : 'Conflict'), value: r.contributions.knowledge },
      { label: 'Change ' + (r.contributions.change >= 0 ? 'Alignment' : 'Conflict'),    value: r.contributions.change },
    ].filter(c => c.value !== 0);
  }

  // ── Override modal ────────────────────────────────────────────────────────
  openAddOverride(): void {
    this.overrideEditId.set(null);
    this.overrideSourceId.set('');
    this.overrideTargetId.set('');
    this.overrideScoreBump.set(0);
    this.overrideNotes.set('');
    this.showOverrideModal.set(true);
  }

  openEditOverride(id: string): void {
    const o = this.store.overrides().find(x => x.id === id);
    if (!o) return;
    this.overrideEditId.set(o.id);
    this.overrideSourceId.set(o.sourceId);
    this.overrideTargetId.set(o.targetId);
    this.overrideScoreBump.set(o.scoreBump);
    this.overrideNotes.set(o.notes ?? '');
    this.showOverrideModal.set(true);
  }

  saveOverride(): void {
    this.store.saveOverride({
      id: this.overrideEditId() ?? '',
      sourceId: this.overrideSourceId(),
      targetId: this.overrideTargetId(),
      scoreBump: this.overrideScoreBump(),
      notes: this.overrideNotes() || undefined
    });
    this.showOverrideModal.set(false);
  }

  deleteOverride(id: string): void {
    this.store.deleteOverride(id);
  }

  // ── CSV export ────────────────────────────────────────────────────────────
  exportCsv(): void {
    const factions = this.factions();
    const colHeaders = [...factions.map(f => f.name), 'Darkwing'];
    const header = ['From \\ To', ...colHeaders];
    const rows = factions.map(source => {
      const cells = factions.map(target => {
        if (source.id === target.id) return '—';
        const r = this.getRelationship(source.id, target.id);
        return r ? `${r.finalScore} (${r.label})` : '';
      });
      const dw = this.getRelationship(source.id, 'darkwing');
      cells.push(dw ? `${dw.finalScore} (${dw.label})` : '');
      return [source.name, ...cells];
    });
    downloadCsv([header, ...rows], 'relationships.csv');
  }
}
