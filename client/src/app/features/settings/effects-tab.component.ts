import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppStore } from '../../store/app.store';
import {
  CascadeRule, DEFAULT_CASCADE_RULES,
  FactionTargetProp, CharacterTargetProp,
  FACTION_EFFECT_PROPS, CHARACTER_EFFECT_PROPS,
  FACTION_SUBTYPE_OPTIONS, CHARACTER_SUBTYPE_OPTIONS,
  EffectPropDescriptor,
} from '../../core/models/types';

const FACTION_TARGET_PROPS: { value: FactionTargetProp; label: string }[] = [
  { value: 'momentum',   label: 'Momentum' },
  { value: 'legitimacy', label: 'Legitimacy' },
];

const CHARACTER_TARGET_PROPS: { value: CharacterTargetProp; label: string }[] = [
  { value: 'pressure',      label: 'Pressure' },
  { value: 'conviction',    label: 'Conviction' },
  { value: 'influence',     label: 'Influence' },
  { value: 'impressionable', label: 'Impressionable' },
];

// Streak/threshold source props (numeric only — no state/factionChange)
const FACTION_STREAK_PROPS = FACTION_EFFECT_PROPS.filter(d => d.inputType === 'delta' && !d.needsSecondaryTarget);
const CHARACTER_STREAK_PROPS = CHARACTER_EFFECT_PROPS.filter(d => d.inputType === 'delta');

function newRule(): CascadeRule {
  return {
    id: crypto.randomUUID(),
    label: '',
    triggerType: 'streak',
    sourceEntityType: 'faction',
    sourceProperty: 'momentum',
    direction: 'negative',
    minConsecutiveWeeks: 2,
    effectType: 'multiplier',
    targetEntityType: 'faction',
    targetProperty: 'legitimacy',
    multiplier: 2,
  };
}

@Component({
  selector: 'app-effects-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './effects-tab.component.html',
  styleUrl: './effects-tab.component.scss'
})
export class EffectsTabComponent {
  store = inject(AppStore);

  rules = signal<CascadeRule[]>([]);
  saved = signal(false);

  readonly factionTargetProps = FACTION_TARGET_PROPS;
  readonly characterTargetProps = CHARACTER_TARGET_PROPS;
  readonly factionSubtypeOptions = FACTION_SUBTYPE_OPTIONS;
  readonly characterSubtypeOptions = CHARACTER_SUBTYPE_OPTIONS;

  constructor() {
    effect(() => {
      this.rules.set([...this.store.cascadeRules()]);
    });
  }

  // Source property descriptors for the current rule
  sourceDescriptors(rule: CascadeRule): EffectPropDescriptor[] {
    if (rule.triggerType === 'event') {
      return rule.sourceEntityType === 'faction' ? FACTION_EFFECT_PROPS : CHARACTER_EFFECT_PROPS;
    }
    return rule.sourceEntityType === 'faction' ? FACTION_STREAK_PROPS : CHARACTER_STREAK_PROPS;
  }

  // Descriptor for the currently-selected source property (used to show/hide value input)
  sourceDescriptor(rule: CascadeRule): EffectPropDescriptor | undefined {
    return this.sourceDescriptors(rule).find(d => d.property === rule.sourceProperty);
  }

  subtypeOptions(rule: CascadeRule) {
    return rule.sourceEntityType === 'faction' ? this.factionSubtypeOptions : this.characterSubtypeOptions;
  }

  targetProps(rule: CascadeRule) {
    return rule.targetEntityType === 'faction' ? this.factionTargetProps : this.characterTargetProps;
  }

  addRule(): void {
    this.rules.update(rs => [...rs, newRule()]);
  }

  removeRule(id: string): void {
    this.rules.update(rs => rs.filter(r => r.id !== id));
  }

  updateRule(id: string, patch: Partial<CascadeRule>): void {
    this.rules.update(rs => rs.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...patch };

      if (patch.triggerType === 'event') {
        // Switching to event: reset to first available source property and clear subtype/value
        const descs = updated.sourceEntityType === 'faction' ? FACTION_EFFECT_PROPS : CHARACTER_EFFECT_PROPS;
        updated.sourceProperty = descs[0]?.property ?? updated.sourceProperty;
        updated.sourceEntitySubtype = '';
        updated.sourcePropertyValue = undefined;
        updated.effectType = 'flat';
      } else if (patch.triggerType) {
        // Switching away from event: reset to first streak-eligible property
        const descs = updated.sourceEntityType === 'faction' ? FACTION_STREAK_PROPS : CHARACTER_STREAK_PROPS;
        const valid = descs.map(d => d.property);
        if (!valid.includes(updated.sourceProperty)) {
          updated.sourceProperty = descs[0]?.property ?? 'momentum';
        }
        updated.sourceEntitySubtype = undefined;
        updated.sourcePropertyValue = undefined;
      }

      // Changing entity type resets source property to the first valid option
      if (patch.sourceEntityType) {
        const isEvent = updated.triggerType === 'event';
        const descs = patch.sourceEntityType === 'faction'
          ? (isEvent ? FACTION_EFFECT_PROPS : FACTION_STREAK_PROPS)
          : (isEvent ? CHARACTER_EFFECT_PROPS : CHARACTER_STREAK_PROPS);
        updated.sourceProperty = descs[0]?.property ?? 'momentum';
        updated.sourceEntitySubtype = '';
        updated.sourcePropertyValue = undefined;
      }

      // Changing source property resets value list
      if (patch.sourceProperty) {
        updated.sourcePropertyValue = undefined;
      }

      // Changing target entity resets target property
      if (patch.targetEntityType) {
        updated.targetProperty = patch.targetEntityType === 'faction' ? 'legitimacy' : 'pressure';
      }

      return updated;
    }));
  }

  save(): void {
    const current = this.store.rules();
    if (!current) return;
    this.store.saveRules({ ...current, cascadeRulesJson: JSON.stringify(this.rules()) });
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 1500);
  }

  addPropertyValue(id: string): void {
    this.rules.update(rs => rs.map(r => {
      if (r.id !== id) return r;
      const opts = this.sourceDescriptor(r)?.selectOptions ?? [];
      const existing = r.sourcePropertyValue ?? [];
      const next = opts.find(o => !existing.includes(o.value))?.value;
      if (!next) return r;
      return { ...r, sourcePropertyValue: [...existing, next] };
    }));
  }

  setPropertyValue(id: string, index: number, value: string): void {
    this.rules.update(rs => rs.map(r => {
      if (r.id !== id) return r;
      const vals = [...(r.sourcePropertyValue ?? [])];
      vals[index] = value;
      return { ...r, sourcePropertyValue: vals };
    }));
  }

  removePropertyValue(id: string, index: number): void {
    this.rules.update(rs => rs.map(r => {
      if (r.id !== id) return r;
      const vals = (r.sourcePropertyValue ?? []).filter((_, i) => i !== index);
      return { ...r, sourcePropertyValue: vals.length ? vals : undefined };
    }));
  }

  resetToDefaults(): void {
    if (!confirm('Reset cascade rules to defaults?')) return;
    this.rules.set([...DEFAULT_CASCADE_RULES]);
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
