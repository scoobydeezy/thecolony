import { Component, computed, inject, input, output } from '@angular/core';
import { AppStore } from '../../store/app.store';
import { AdvanceEffect, AdvanceTargetType, ADVANCE_PROPERTIES, ADVANCE_TARGET_TYPES, advanceEffectIssue } from '../../core/sim/advance-effects';

/**
 * §18.11 An editable list of goal advance Effects (at Progressing or at Accomplished). Each row: what it changes
 * (type + entity), which property, and the value or the change. A new row starts on the goal's own target, if any.
 */
@Component({
  selector: 'app-advance-effects-editor',
  standalone: true,
  template: `
    @for (e of effects(); track $index; let i = $index) {
      <div class="ae-row">
        <select class="form-input ae-type" [value]="e.targetType" (change)="setType(i, $any($event.target).value)" aria-label="Changes a">
          @for (t of types; track t.value) { <option [value]="t.value" [selected]="t.value === e.targetType">{{ t.label }}</option> }
        </select>
        <select class="form-input ae-entity" [value]="e.targetId" (change)="set(i, { targetId: $any($event.target).value })" aria-label="Which">
          <option value="">— Choose —</option>
          @for (o of entities()[e.targetType]; track o.id) { <option [value]="o.id" [selected]="o.id === e.targetId">{{ o.name }}</option> }
        </select>
        @if (props(e).length > 1) {
          <select class="form-input" [value]="e.property" (change)="setProperty(i, $any($event.target).value)" aria-label="Property">
            @for (p of props(e); track p.property) { <option [value]="p.property" [selected]="p.property === e.property">{{ p.label }}</option> }
          </select>
        }
        @switch (valueKind(e)) {
          @case ('delta') {
            <input class="form-input ae-delta" type="number" step="1" [value]="e.delta" (input)="set(i, { delta: Math.trunc(+$any($event.target).value || 0) })"
                   aria-label="Change (members)" title="Members gained (+) or lost (−)" />
          }
          @case ('faction') {
            <select class="form-input" [value]="e.value ?? ''" (change)="set(i, { value: $any($event.target).value })" aria-label="Controller">
              <option value="" [selected]="!e.value">no one</option>
              @for (f of entities().faction; track f.id) { <option [value]="f.id" [selected]="f.id === e.value">{{ f.name }}</option> }
            </select>
          }
          @case ('location') {
            <select class="form-input" [value]="e.value ?? ''" (change)="set(i, { value: $any($event.target).value })" aria-label="Location">
              <option value="">— Location —</option>
              @for (l of entities().location; track l.id) { <option [value]="l.id" [selected]="l.id === e.value">{{ l.name }}</option> }
            </select>
          }
          @default {
            <select class="form-input" [value]="e.value ?? ''" (change)="set(i, { value: $any($event.target).value })" aria-label="Value">
              <option value="">— Value —</option>
              @for (o of options(e); track o.value) { <option [value]="o.value" [selected]="o.value === e.value">{{ o.label }}</option> }
            </select>
          }
        }
        <button type="button" class="ae-remove" (click)="remove(i)" title="Remove this Effect" aria-label="Remove Effect"><i class="fa-solid fa-xmark"></i></button>
        @if (issue(e); as why) { <span class="ae-issue">{{ why }}</span> }
      </div>
    }
    <button type="button" class="btn btn-secondary btn-sm" (click)="add()">+ Effect</button>
  `,
  styles: `
    // the form fields' look (the goal editor's .form-input is scoped to that component, so it is repeated here)
    .form-input { background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; padding: 0.4rem 0.6rem;
      font-size: var(--text-size-body); font-family: inherit; color: var(--text-primary); &:focus { outline: none; border-color: var(--accent); } }
    // one line per Effect: the kind at a fixed width, the other fields sharing the rest
    .ae-row { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin-bottom: 0.4rem;
      .form-input { flex: 1 1 0; min-width: 0; } }
    .ae-type { flex: 0 0 9.75rem !important; }
    .ae-entity { flex: 2 1 0 !important; }
    .ae-delta { flex: 0 0 5.5rem !important; }
    .ae-remove { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.3rem; &:hover { color: var(--text-primary); } }
    .ae-issue { flex-basis: 100%; font-size: var(--text-size-meta); color: #fbbf24; }
    .ae-remove { flex: 0 0 auto; }
  `,
})
export class AdvanceEffectsEditorComponent {
  private readonly store = inject(AppStore);
  readonly effects = input.required<AdvanceEffect[]>();
  /** The goal's own target, offered as the default for a new row. */
  readonly defaultTarget = input<{ type: AdvanceTargetType; id: string } | null>(null);
  readonly changed = output<AdvanceEffect[]>();
  readonly types = ADVANCE_TARGET_TYPES;
  readonly Math = Math;
  readonly issue = advanceEffectIssue;

  readonly entities = computed((): Record<AdvanceTargetType, { id: string; name: string }[]> => ({
    asset: this.store.assets().map(a => ({ id: a.id, name: a.name })).sort((a, b) => a.name.localeCompare(b.name)),
    character: this.store.characters().map(c => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name)),
    faction: this.store.factions().filter(f => f.active).map(f => ({ id: f.id, name: f.name })),
    location: this.store.locations().map(l => ({ id: l.id, name: l.name })).sort((a, b) => a.name.localeCompare(b.name)),
  }));

  props(e: AdvanceEffect) { return ADVANCE_PROPERTIES[e.targetType]; }
  private prop(e: AdvanceEffect) { return this.props(e).find(p => p.property === e.property) ?? this.props(e)[0]; }
  options(e: AdvanceEffect) { return this.prop(e).options ?? []; }
  valueKind(e: AdvanceEffect): 'delta' | 'faction' | 'location' | 'options' {
    if (this.prop(e).kind === 'delta') return 'delta';
    return e.property === 'controllingFactionId' ? 'faction' : e.property === 'locationChange' ? 'location' : 'options';
  }

  private emit(list: AdvanceEffect[]): void { this.changed.emit(list); }
  private fresh(type: AdvanceTargetType, id = ''): AdvanceEffect {
    const p = ADVANCE_PROPERTIES[type][0];
    return p.kind === 'delta' ? { targetType: type, targetId: id, property: p.property, delta: 0 }
                              : { targetType: type, targetId: id, property: p.property, delta: 0, value: '' };
  }
  add(): void { const d = this.defaultTarget(); this.emit([...this.effects(), d ? this.fresh(d.type, d.id) : this.fresh('asset')]); }
  remove(i: number): void { this.emit(this.effects().filter((_, k) => k !== i)); }
  set(i: number, patch: Partial<AdvanceEffect>): void { this.emit(this.effects().map((e, k) => k === i ? { ...e, ...patch } : e)); }
  setType(i: number, type: AdvanceTargetType): void { this.emit(this.effects().map((e, k) => k === i ? this.fresh(type) : e)); }
  setProperty(i: number, property: string): void {
    const kind = ADVANCE_PROPERTIES[this.effects()[i].targetType].find(p => p.property === property)?.kind;
    this.set(i, kind === 'delta' ? { property, delta: 0, value: undefined } : { property, delta: 0, value: '' });
  }
}
