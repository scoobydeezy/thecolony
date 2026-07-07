import { Component, inject, signal, computed } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { AppStore } from '../../store/app.store';
import { RelationshipBreakdown } from '../../core/models/types';
import { downloadCsv } from '../../core/utils/csv-export';

interface OverrideFormModel {
  id: string;
  sourceId: string;
  targetId: string;
  scoreBump: string;
  notes: string;
}

const emptyOverrideForm = (): OverrideFormModel =>
  ({ id: '', sourceId: '', targetId: '', scoreBump: '0', notes: '' });

@Component({
  selector: 'app-relationships',
  standalone: true,
  imports: [FormField],
  templateUrl: './relationships.component.html',
  styleUrl: './relationships.component.scss'
})
export class RelationshipsComponent {
  store = inject(AppStore);

  // ── Matrix ────────────────────────────────────────────────────────────────
  selectedBreakdown = signal<RelationshipBreakdown | null>(null);
  factions = computed(() => this.store.viewFactions().filter(f => f.active && f.type === 'Faction'));

  // ── Override modal ────────────────────────────────────────────────────────
  showOverrideModal = signal(false);
  readonly overrideForm = signal<OverrideFormModel>(emptyOverrideForm());
  readonly fo = form(this.overrideForm);

  // ── Stress ────────────────────────────────────────────────────────────────
  get stress(): number {
    return this.store.viewColonyStress();
  }

  setStress(value: number): void {
    const cs = this.store.colonyState();
    if (!cs) return;
    this.store.saveColonyState({ ...cs, colonyStress: value });
  }

  // ── Matrix helpers ────────────────────────────────────────────────────────
  getRelationship(sourceId: string, targetId: string): RelationshipBreakdown | undefined {
    return this.store.viewRelationships().find(
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
    if (id === 'party') return this.store.colonyState()?.partyName ?? 'Party';
    return this.store.factions().find(f => f.id === id)?.name ?? id;
  }

  breakdownContribs(r: RelationshipBreakdown): Array<{ label: string; value: number }> {
    const bl = this.store.beliefAxisLabels();
    return [
      { label: 'Value Alignment',   value: r.contributions.valueAlignment },
      { label: 'Value Conflict',    value: r.contributions.valueConflict },
      { label: bl.c.axisName + ' ' + (r.contributions.beliefc >= 0 ? 'Alignment' : 'Conflict'), value: r.contributions.beliefc },
      { label: bl.a.axisName + ' ' + (r.contributions.beliefa >= 0 ? 'Alignment' : 'Conflict'), value: r.contributions.beliefa },
      { label: bl.b.axisName + ' ' + (r.contributions.beliefb >= 0 ? 'Alignment' : 'Conflict'), value: r.contributions.beliefb },
    ].filter(c => c.value !== 0);
  }

  // ── Override modal ────────────────────────────────────────────────────────
  openAddOverride(): void {
    this.overrideForm.set(emptyOverrideForm());
    this.showOverrideModal.set(true);
  }

  openEditOverride(id: string): void {
    const o = this.store.overrides().find(x => x.id === id);
    if (!o) return;
    this.overrideForm.set({ id: o.id, sourceId: o.sourceId, targetId: o.targetId, scoreBump: o.scoreBump.toString(), notes: o.notes ?? '' });
    this.showOverrideModal.set(true);
  }

  saveOverride(): void {
    const fm = this.overrideForm();
    this.store.saveOverride({
      id: fm.id,
      sourceId: fm.sourceId,
      targetId: fm.targetId,
      scoreBump: parseInt(fm.scoreBump, 10) || 0,
      notes: fm.notes || undefined,
    });
    this.showOverrideModal.set(false);
  }

  deleteOverride(id: string): void {
    this.store.deleteOverride(id);
  }

  // ── CSV export ────────────────────────────────────────────────────────────
  exportCsv(): void {
    const factions = this.factions();
    const partyName = this.store.colonyState()?.partyName ?? 'Party';
    const colHeaders = [...factions.map(f => f.name), partyName];
    const header = ['From \\ To', ...colHeaders];
    const rows = factions.map(source => {
      const cells = factions.map(target => {
        if (source.id === target.id) return '—';
        const r = this.getRelationship(source.id, target.id);
        return r ? `${r.finalScore} (${r.label})` : '';
      });
      const dw = this.getRelationship(source.id, 'party');
      cells.push(dw ? `${dw.finalScore} (${dw.label})` : '');
      return [source.name, ...cells];
    });
    downloadCsv([header, ...rows], 'relationships.csv');
  }
}
