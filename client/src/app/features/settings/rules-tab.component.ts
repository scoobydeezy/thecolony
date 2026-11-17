import { Component, inject, signal, effect, computed } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartData, ChartOptions } from 'chart.js';
import type { AnnotationOptions } from 'chartjs-plugin-annotation';
import { AppStore } from '../../store/app.store';
import { RulesConfig, RelationshipThreshold, RelationshipLabel } from '../../core/models/types';
import { scoreRelationship, ScoringActor, DEFAULT_RULES } from '../../core/services/scoring.service';

const THRESHOLD_LABELS: RelationshipLabel[] = [
  'Aligned', 'Cooperative', 'Friendly', 'Tolerated', 'Strained', 'Opposed'
];

const DEFAULT_THRESHOLDS: RelationshipThreshold[] = [
  { label: 'Aligned',     minScore: 6  },
  { label: 'Cooperative', minScore: 4  },
  { label: 'Friendly',    minScore: 2  },
  { label: 'Tolerated',   minScore: -1 },
  { label: 'Strained',    minScore: -3 },
  { label: 'Opposed',     minScore: -6 },
];

interface PreviewPair {
  label: string;
  color: string;
  src: Omit<ScoringActor, 'id'>;
  tgt: Omit<ScoringActor, 'id'>;
}

// Archetypes that exercise each part of the formula (SCORING-AUDIT.md), not campaign factions.
const PURIST:   Omit<ScoringActor, 'id'> = { values: { a: 0.85, b: 0.10, c: 0.05 }, beliefa: 'positive', beliefb: 'neutral', beliefc: 'positive' };
const MODERATE: Omit<ScoringActor, 'id'> = { values: { a: 0.34, b: 0.33, c: 0.33 }, beliefa: 'neutral',  beliefb: 'neutral', beliefc: 'neutral' };
const PREVIEW_PAIRS: PreviewPair[] = [
  {
    label: 'Identical twins',
    color: 'rgba(52,211,153,0.9)',
    src: { values: { a: 0.60, b: 0.25, c: 0.15 }, beliefa: 'positive', beliefb: 'neutral', beliefc: 'positive' },
    tgt: { values: { a: 0.60, b: 0.25, c: 0.15 }, beliefa: 'positive', beliefb: 'neutral', beliefc: 'positive' },
  },
  {
    label: 'Close neighbours',
    color: 'rgba(96,165,250,0.9)',
    src: { values: { a: 0.60, b: 0.30, c: 0.10 }, beliefa: 'positive', beliefb: 'neutral', beliefc: 'positive' },
    tgt: { values: { a: 0.50, b: 0.40, c: 0.10 }, beliefa: 'positive', beliefb: 'neutral', beliefc: 'positive' },
  },
  {
    label: 'Shared values, opposed methods',
    color: 'rgba(167,139,250,0.9)',
    src: { values: { a: 0.60, b: 0.25, c: 0.15 }, beliefa: 'positive', beliefb: 'neutral',  beliefc: 'positive' },
    tgt: { values: { a: 0.60, b: 0.25, c: 0.15 }, beliefa: 'negative', beliefb: 'positive', beliefc: 'negative' },
  },
  { label: 'Moderate → Purist', color: 'rgba(148,163,184,0.9)', src: MODERATE, tgt: PURIST },
  { label: 'Purist → Moderate', color: 'rgba(251,146,60,0.9)',  src: PURIST,   tgt: MODERATE },
  {
    label: 'Opposed ideologies',
    color: 'rgba(248,113,113,0.9)',
    src: { values: { a: 0.80, b: 0.15, c: 0.05 }, beliefa: 'positive', beliefb: 'neutral',  beliefc: 'positive' },
    tgt: { values: { a: 0.05, b: 0.15, c: 0.80 }, beliefa: 'negative', beliefb: 'positive', beliefc: 'negative' },
  },
];

const STRESS_POINTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const DEFAULT_RULES_STUB: RulesConfig = { ...DEFAULT_RULES, id: '', thresholdsJson: JSON.stringify(DEFAULT_THRESHOLDS),
  valueLabelsJson: '{}', beliefAxisLabelsJson: '{}', cascadeRulesJson: '[]', formulasJson: '{}' };

function previewScore(pair: PreviewPair, stress: number, rules: RulesConfig): number {
  const src: ScoringActor = { id: 'src', ...pair.src };
  const tgt: ScoringActor = { id: 'tgt', ...pair.tgt };
  return scoreRelationship(src, tgt, stress, 0, rules).finalScore;
}

@Component({
  selector: 'app-rules-tab',
  standalone: true,
  imports: [FormField, BaseChartDirective],
  templateUrl: './rules-tab.component.html',
  styleUrl: './rules-tab.component.scss'
})
export class RulesTabComponent {
  store = inject(AppStore);
  saved = signal(false);
  thresholdLabels = THRESHOLD_LABELS;
  readonly defaults = DEFAULT_RULES;

  readonly rulesModel = signal<RulesConfig>({ ...DEFAULT_RULES_STUB });
  readonly rulesForm  = form(this.rulesModel);

  constructor() {
    effect(() => {
      const rules = this.store.rules();
      if (rules && !this.rulesModel().id) {
        this.rulesModel.set({ ...DEFAULT_RULES, ...rules });   // fills formula fields missing from an older payload
      }
    });
  }

  get parsedThresholds(): RelationshipThreshold[] {
    try { return JSON.parse(this.rulesModel().thresholdsJson); }
    catch { return DEFAULT_THRESHOLDS; }
  }

  thresholdMinScore(label: RelationshipLabel): number {
    return this.parsedThresholds.find(t => t.label === label)?.minScore ?? 0;
  }

  setThreshold(label: RelationshipLabel, value: string): void {
    const updated = this.parsedThresholds.map(t =>
      t.label === label ? { ...t, minScore: +value } : t
    );
    this.rulesModel.update(f => ({ ...f, thresholdsJson: JSON.stringify(updated) }));
  }

  save(): void {
    const f = this.rulesModel();
    if (!f.id) return;
    this.store.saveRules(f);
    this.saved.set(true);
    setTimeout(() => {
      this.saved.set(false);
      this.store.loadRelationships(undefined);
    }, 1500);
  }

  reset(): void {
    if (!confirm('Reset all rules to default values?')) return;
    this.rulesModel.update(f => ({
      ...f,
      beliefMatch: DEFAULT_RULES.beliefMatch,
      beliefConflict: DEFAULT_RULES.beliefConflict,
      beliefAdjacent: DEFAULT_RULES.beliefAdjacent,
      beliefWeightBlend: DEFAULT_RULES.beliefWeightBlend,
      valueSimilarityScale: DEFAULT_RULES.valueSimilarityScale,
      valueOppositionScale: DEFAULT_RULES.valueOppositionScale,
      stressPositiveMultiplierPerPoint: 0.25,
      stressNegativeMultiplierPerPoint: 0.2,
      influenceConvictionScale: 0.5,
      thresholdsJson: JSON.stringify(DEFAULT_THRESHOLDS),
      stressWeightEnabled: true,
      stressWeightCurve: 'Cubic',
      stressWeightIntensity: 0.7,
    }));
  }

  readonly previewChartData = computed((): ChartData<'line'> => {
    const rules = this.rulesModel();
    if (!rules.id) return { labels: [], datasets: [] };
    return {
      labels: STRESS_POINTS.map(String),
      datasets: PREVIEW_PAIRS.map(pair => ({
        label: pair.label,
        data: STRESS_POINTS.map(s => previewScore(pair, s, rules)),
        borderColor: pair.color,
        backgroundColor: 'transparent',
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 4,
        spanGaps: true,
      })),
    };
  });

  readonly previewChartOptions = computed((): ChartOptions<'line'> => {
    const rules = this.rulesModel();
    const annotations: Record<string, AnnotationOptions> = {};

    const allScores = rules.id
      ? PREVIEW_PAIRS.flatMap(pair => STRESS_POINTS.map(s => previewScore(pair, s, rules)))
      : [0];
    const dataPad = 1;
    const yMin = Math.floor(Math.min(...allScores)) - dataPad;
    const yMax = Math.ceil(Math.max(...allScores))  + dataPad;

    if (rules.id) {
      try {
        const thresholds: RelationshipThreshold[] = JSON.parse(rules.thresholdsJson);
        const sorted = [...thresholds].sort((a, b) => b.minScore - a.minScore);
        const THRESHOLD_COLORS: Record<string, string> = {
          Aligned:     'rgba(52,211,153,0.35)',
          Cooperative: 'rgba(96,165,250,0.30)',
          Friendly:    'rgba(147,197,253,0.25)',
          Tolerated:   'rgba(148,163,184,0.20)',
          Strained:    'rgba(251,191,36,0.25)',
          Opposed:     'rgba(251,146,60,0.30)',
          Hostile:     'rgba(248,113,113,0.35)',
        };
        sorted
          .filter(t => t.minScore >= yMin && t.minScore <= yMax)
          .forEach(t => {
            annotations[`thresh_${t.label}`] = {
              type: 'line',
              yMin: t.minScore, yMax: t.minScore,
              borderColor: THRESHOLD_COLORS[t.label] ?? 'rgba(255,255,255,0.15)',
              borderWidth: 1,
              borderDash: [4, 3],
              label: {
                display: true,
                content: t.label,
                position: 'end',
                color: 'rgba(255,255,255,0.4)',
                font: { size: 9 },
                backgroundColor: 'transparent',
                padding: 2,
              },
            };
          });
      } catch { /* malformed thresholdsJson */ }
    }

    const textMuted = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#9ca3af';
    const textSecondary = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#d1d5db';

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textSecondary,
            usePointStyle: true,
            pointStyle: 'circle',
            pointStyleWidth: 8,
            boxHeight: 6,
            font: { size: 10 },
            generateLabels: (chart) => {
              const items = Chart.defaults.plugins.legend.labels.generateLabels(chart);
              return items.map(item => ({ ...item, fillStyle: item.strokeStyle }));
            },
          },
        },
        tooltip: {
          usePointStyle: true,
          boxWidth: 6,
          boxHeight: 6,
          callbacks: {
            title: (items) => `Stress ${items[0]?.label ?? ''}`,
            labelColor: (item) => {
              const color = item.dataset.borderColor as string;
              return { borderColor: color, backgroundColor: color };
            },
          },
        },
        annotation: { annotations },
      },
      scales: {
        x: {
          title: { display: true, text: 'Global Stress', color: textMuted, font: { size: 10 } },
          ticks: { color: textMuted, font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,0.05)' },
        },
        y: {
          min: yMin,
          max: yMax,
          title: { display: true, text: 'Relationship Score', color: textMuted, font: { size: 10 } },
          ticks: { color: textMuted, font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,0.05)' },
        },
      },
    };
  });
}
