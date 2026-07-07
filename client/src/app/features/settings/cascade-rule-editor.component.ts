import { Component, inject, input, output, signal, effect, untracked } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { OrValueRowComponent } from './or-value-row.component';
import { AppStore } from '../../store/app.store';
import {
  CascadeRule, FactionTargetProp, CharacterTargetProp,
  FACTION_EFFECT_PROPS, CHARACTER_EFFECT_PROPS,
  FACTION_SUBTYPE_OPTIONS, CHARACTER_SUBTYPE_OPTIONS,
  GOAL_STATUS_OPTIONS, GOAL_PRIORITY_OPTIONS,
  EffectPropDescriptor, FactionGoal,
} from '../../core/models/types';

const FACTION_TARGET_PROPS: { value: FactionTargetProp; label: string }[] = [
  { value: 'momentum',   label: 'Momentum' },
  { value: 'baseLegitimacy', label: 'Base Legitimacy' },
];

const CHARACTER_TARGET_PROPS: { value: CharacterTargetProp; label: string }[] = [
  { value: 'pressure',       label: 'Pressure' },
  { value: 'conviction',     label: 'Conviction' },
  { value: 'influence',      label: 'Influence' },
  { value: 'impressionable', label: 'Impressionable' },
];

const FACTION_STREAK_PROPS = FACTION_EFFECT_PROPS.filter(d => d.inputType === 'delta' && !d.needsSecondaryTarget);
const CHARACTER_STREAK_PROPS = CHARACTER_EFFECT_PROPS.filter(d => d.inputType === 'delta');

const GOAL_STATUS_PROP: EffectPropDescriptor = {
  property: 'status', label: 'Status', inputType: 'select', selectOptions: GOAL_STATUS_OPTIONS,
};

@Component({
  selector: 'app-cascade-rule-editor',
  standalone: true,
  imports: [FormField, OrValueRowComponent],
  templateUrl: './cascade-rule-editor.component.html',
  styleUrl: './effects-tab.component.scss',
})
export class CascadeRuleEditorComponent {
  store = inject(AppStore);

  rule   = input.required<CascadeRule>();
  remove = output<void>();
  change = output<CascadeRule>();

  readonly ruleModel = signal<CascadeRule>({} as CascadeRule);
  readonly ruleForm  = form(this.ruleModel);

  readonly factionGoals     = this.store.factionGoals as () => FactionGoal[];
  readonly activeFactions   = this.store.allActiveFactions as () => { id: string; name: string }[];
  readonly factionSubtypeOptions   = FACTION_SUBTYPE_OPTIONS;
  readonly characterSubtypeOptions = CHARACTER_SUBTYPE_OPTIONS;
  readonly goalPriorityOptions     = GOAL_PRIORITY_OPTIONS;
  readonly factionTargetProps      = FACTION_TARGET_PROPS;
  readonly characterTargetProps    = CHARACTER_TARGET_PROPS;

  constructor() {
    // Sync input → local model only when parent sends a genuinely different value
    effect(() => {
      const incoming = this.rule();
      if (JSON.stringify(incoming) !== JSON.stringify(untracked(this.ruleModel)))
        this.ruleModel.set({ ...incoming });
    });
    // Emit upward only when local model differs from what the parent already has
    effect(() => {
      const current = this.ruleModel();
      if (JSON.stringify(current) !== JSON.stringify(untracked(this.rule)))
        this.change.emit(current);
    });
  }

  goalName(id: string): string {
    const g = this.store.factionGoals().find(g => g.id === id);
    if (!g) return id;
    const faction = this.store.factions().find(f => f.id === g.factionId);
    return faction ? `${faction.name}: ${g.title}` : g.title;
  }

  factionName(id: string): string {
    return this.store.factions().find(f => f.id === id)?.name ?? id;
  }

  sourceDescriptors(rule: CascadeRule): EffectPropDescriptor[] {
    if (rule.sourceEntityType === 'goal') return [GOAL_STATUS_PROP];
    if (rule.triggerType === 'event') {
      return rule.sourceEntityType === 'faction' ? FACTION_EFFECT_PROPS : CHARACTER_EFFECT_PROPS;
    }
    return rule.sourceEntityType === 'faction' ? FACTION_STREAK_PROPS : CHARACTER_STREAK_PROPS;
  }

  sourceDescriptor(rule: CascadeRule): EffectPropDescriptor | undefined {
    return this.sourceDescriptors(rule).find(d => d.property === rule.sourceProperty);
  }

  subtypeOptions(rule: CascadeRule) {
    if (rule.sourceEntityType === 'goal') return this.goalPriorityOptions;
    return rule.sourceEntityType === 'faction' ? this.factionSubtypeOptions : this.characterSubtypeOptions;
  }

  targetProps(rule: CascadeRule) {
    return rule.targetEntityType === 'faction' ? this.factionTargetProps : this.characterTargetProps;
  }

  patch(p: Partial<CascadeRule>): void {
    this.ruleModel.update(r => {
      const updated = { ...r, ...p };

      if (p.triggerType === 'event') {
        const descs = updated.sourceEntityType === 'faction' ? FACTION_EFFECT_PROPS : CHARACTER_EFFECT_PROPS;
        updated.sourceProperty = descs[0]?.property ?? updated.sourceProperty;
        updated.sourceEntitySubtype = '';
        updated.sourcePropertyValue = undefined;
        updated.effectType = 'flat';
      } else if (p.triggerType) {
        const descs = updated.sourceEntityType === 'faction' ? FACTION_STREAK_PROPS : CHARACTER_STREAK_PROPS;
        const valid = descs.map(d => d.property);
        if (!valid.includes(updated.sourceProperty)) {
          updated.sourceProperty = descs[0]?.property ?? 'momentum';
        }
        updated.sourceEntitySubtype = undefined;
        updated.sourcePropertyValue = undefined;
      }

      if (p.sourceEntityType) {
        if (p.sourceEntityType === 'goal') {
          updated.triggerType = 'event';
          updated.sourceProperty = 'status';
          updated.effectType = 'flat';
          updated.sourceEntityId = '';
          updated.sourceEntitySubtype = '';
          updated.sourcePropertyValue = undefined;
          updated.targetEntityId = undefined;
        } else {
          const isEvent = updated.triggerType === 'event';
          const descs = p.sourceEntityType === 'faction'
            ? (isEvent ? FACTION_EFFECT_PROPS : FACTION_STREAK_PROPS)
            : (isEvent ? CHARACTER_EFFECT_PROPS : CHARACTER_STREAK_PROPS);
          updated.sourceProperty = descs[0]?.property ?? 'momentum';
          updated.sourceEntitySubtype = '';
          updated.sourcePropertyValue = undefined;
        }
      }

      if ('sourceEntityId' in p && r.sourceEntityType === 'goal' && p.sourceEntityId) {
        updated.sourceEntitySubtype = '';
        updated.sourcePropertyValue = undefined;
        updated.targetEntityId = undefined;
      }

      if (p.sourceProperty) updated.sourcePropertyValue = undefined;

      if (p.targetEntityType) {
        updated.targetProperty = p.targetEntityType === 'faction' ? 'baseLegitimacy' : 'pressure';
      }

      return updated;
    });
  }

  addPropertyValue(): void {
    const rule = this.ruleModel();
    const opts = this.sourceDescriptor(rule)?.selectOptions ?? [];
    const existing = rule.sourcePropertyValue ?? [];
    const next = opts.find(o => !existing.includes(o.value))?.value;
    if (!next) return;
    this.ruleModel.update(r => ({ ...r, sourcePropertyValue: [...(r.sourcePropertyValue ?? []), next] }));
  }

  setPropertyValue(index: number, value: string): void {
    this.ruleModel.update(r => {
      const vals = [...(r.sourcePropertyValue ?? [])];
      vals[index] = value;
      return { ...r, sourcePropertyValue: vals };
    });
  }

  removePropertyValue(index: number): void {
    this.ruleModel.update(r => {
      const vals = (r.sourcePropertyValue ?? []).filter((_, i) => i !== index);
      return { ...r, sourcePropertyValue: vals.length ? vals : undefined };
    });
  }

  rulePreview(rule: CascadeRule): string {
    const tgtEntity = rule.targetEntityType === 'faction' ? 'faction' : 'character';
    const effectDesc = rule.effectType === 'flat'
      ? `${tgtEntity} ${rule.targetProperty} ${(rule.flatDelta ?? 0) >= 0 ? '+' : ''}${rule.flatDelta ?? 0}`
      : `${tgtEntity} ${rule.targetProperty} change × ${rule.multiplier ?? 1}`;

    if (rule.triggerType === 'streak') {
      const dir = rule.direction ?? 'either';
      const weeks = rule.minConsecutiveWeeks ?? 1;
      const dirLabel = dir === 'either' ? 'same-direction' : dir;
      return `After ${weeks}+ ${dirLabel} ${rule.sourceEntityType} ${rule.sourceProperty} sessions: ${effectDesc}`;
    } else if (rule.triggerType === 'event') {
      if (rule.sourceEntityType === 'goal') {
        const goalPart = rule.sourceEntityId
          ? `"${this.goalName(rule.sourceEntityId)}"`
          : rule.targetEntityId
            ? `any goal of ${this.factionName(rule.targetEntityId)}`
            : 'any goal';
        const priorityPart = !rule.sourceEntityId && rule.sourceEntitySubtype ? ` (${rule.sourceEntitySubtype})` : '';
        const valLabel = rule.sourcePropertyValue?.length ? ` → ${rule.sourcePropertyValue.join(' | ')}` : '';
        return `When ${goalPart}${priorityPart} status${valLabel}: ${effectDesc}`;
      }
      const subtype = rule.sourceEntitySubtype ? `${rule.sourceEntitySubtype} ` : '';
      const propLabel = this.sourceDescriptor(rule)?.label ?? rule.sourceProperty;
      const valLabel = rule.sourcePropertyValue?.length ? ` → ${rule.sourcePropertyValue.join(' | ')}` : '';
      return `When ${subtype}${rule.sourceEntityType} ${propLabel}${valLabel}: ${effectDesc}`;
    } else {
      const op = rule.thresholdOperator === 'lt' ? '<' : '>';
      const tv = rule.thresholdValue ?? 0;
      return `When ${rule.sourceEntityType} ${rule.sourceProperty} ${op} ${tv}: ${effectDesc} per session`;
    }
  }
}
