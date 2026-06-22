import { Component, inject, signal, effect, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartData, ChartOptions } from 'chart.js';
import type { AnnotationOptions } from 'chartjs-plugin-annotation';
import { AppStore } from '../../store/app.store';
import { RulesConfig, RelationshipThreshold, RelationshipLabel } from '../../core/models/types';
import { scoreRelationship, ScoringActor } from '../../core/services/scoring.service';

const THRESHOLD_LABELS: RelationshipLabel[] = [
  'Aligned', 'Cooperative', 'Friendly', 'Tolerated', 'Strained', 'Opposed', 'Hostile'
];

const DEFAULT_THRESHOLDS: RelationshipThreshold[] = [
  { label: 'Aligned',     minScore: 80 },
  { label: 'Cooperative', minScore: 50 },
  { label: 'Friendly',    minScore: 20 },
  { label: 'Tolerated',   minScore: -10 },
  { label: 'Strained',    minScore: -30 },
  { label: 'Opposed',     minScore: -60 },
  { label: 'Hostile',     minScore: -100 },
];

// Five canonical faction pairs spanning the full relationship spectrum.
// Computed from seed data so the preview reflects actual game archetypes.
interface PreviewPair {
  label: string;
  color: string;
  src: Omit<ScoringActor, 'id'>;
  tgt: Omit<ScoringActor, 'id'>;
}

const PREVIEW_PAIRS: PreviewPair[] = [
  {
    label: 'Witnesses → Seekers',
    color: 'rgba(248,113,113,0.9)',   // red — strongly hostile, stress amplifies hard
    src: { values: { a: 0.60, b: 0.25, c: 0.15 }, beliefc: 'positive',  beliefa: 'positive',  beliefb: 'negative' },
    tgt: { values: { a: 0.15, b: 0.25, c: 0.60 }, beliefc: 'negative',  beliefa: 'negative',  beliefb: 'positive' },
  },
  {
    label: 'Keepers → Cult',
    color: 'rgba(251,146,60,0.9)',    // orange — negative, worsens under stress
    src: { values: { a: 0.25, b: 0.60, c: 0.15 }, beliefc: 'positive',  beliefa: 'negative',  beliefb: 'negative' },
    tgt: { values: { a: 0.60, b: 0.15, c: 0.25 }, beliefc: 'negative',  beliefa: 'neutral',   beliefb: 'positive' },
  },
  {
    label: 'Witnesses → Keepers',
    color: 'rgba(148,163,184,0.9)',   // slate — dead neutral, flat through all stress
    src: { values: { a: 0.60, b: 0.25, c: 0.15 }, beliefc: 'positive',  beliefa: 'positive',  beliefb: 'negative' },
    tgt: { values: { a: 0.25, b: 0.60, c: 0.15 }, beliefc: 'positive',  beliefa: 'negative',  beliefb: 'negative' },
  },
  {
    label: 'Aspis → Civilians',
    color: 'rgba(52,211,153,0.9)',    // green — mildly positive, smooth stress arc
    src: { values: { a: 0.15, b: 0.60, c: 0.25 } },
    tgt: { values: { a: 0.15, b: 0.60, c: 0.25 } },
  },
  {
    label: 'Keepers → Aspis',
    color: 'rgba(96,165,250,0.9)',    // blue — solidly positive, stress boost then fade
    src: { values: { a: 0.25, b: 0.60, c: 0.15 }, beliefc: 'positive',  beliefa: 'negative',  beliefb: 'negative' },
    tgt: { values: { a: 0.15, b: 0.60, c: 0.25 }, beliefc: 'neutral',   beliefa: 'negative',  beliefb: 'negative' },
  },
];

const STRESS_POINTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function previewScore(pair: PreviewPair, stress: number, rules: RulesConfig): number {
  const src: ScoringActor = { id: 'src', ...pair.src };
  const tgt: ScoringActor = { id: 'tgt', ...pair.tgt };
  return scoreRelationship(src, tgt, stress, 0, rules).finalScore;
}

@Component({
  selector: 'app-rules-tab',
  standalone: true,
  imports: [FormsModule, BaseChartDirective],
  templateUrl: './rules-tab.component.html',
  styleUrl: './rules-tab.component.scss'
})
export class RulesTabComponent {
  store = inject(AppStore);
  form = signal<RulesConfig | null>(null);
  saved = signal(false);
  thresholdLabels = THRESHOLD_LABELS;

  constructor() {
    effect(() => {
      const rules = this.store.rules();
      if (rules && !this.form()) {
        this.form.set({ ...rules });
      }
    });
  }

  get parsedThresholds(): RelationshipThreshold[] {
    const f = this.form();
    if (!f) return DEFAULT_THRESHOLDS;
    try {
      return JSON.parse(f.thresholdsJson);
    } catch {
      return DEFAULT_THRESHOLDS;
    }
  }

  thresholdMinScore(label: RelationshipLabel): number {
    return this.parsedThresholds.find(t => t.label === label)?.minScore ?? 0;
  }

  setThreshold(label: RelationshipLabel, value: string): void {
    const updated = this.parsedThresholds.map(t =>
      t.label === label ? { ...t, minScore: +value } : t
    );
    this.form.update(f => f ? { ...f, thresholdsJson: JSON.stringify(updated) } : f);
  }

  save(): void {
    const f = this.form();
    if (!f) return;
    this.store.saveRules(f);
    this.saved.set(true);
    setTimeout(() => {
      this.saved.set(false);
      this.store.loadRelationships(undefined);
    }, 1500);
  }

  reset(): void {
    if (!confirm('Reset all rules to default values?')) return;
    const defaults: Partial<RulesConfig> = {
      beliefMatch: 2.5,
      beliefConflict: -1.0,
      valueAlignmentScale: 5,
      valueConflictScale: 3,
      stressPositiveMultiplierPerPoint: 0.25,
      stressNegativeMultiplierPerPoint: 0.35,
      influenceConvictionScale: 0.5,
      thresholdsJson: JSON.stringify(DEFAULT_THRESHOLDS),
      stressWeightEnabled: false,
      stressWeightCurve: 'Linear',
      stressWeightIntensity: 0.5,
    };
    this.form.update(f => f ? { ...f, ...defaults } : f);
  }

  numField(key: keyof RulesConfig, value: string): void {
    this.form.update(f => f ? { ...f, [key]: +value } : f);
  }

  floatField(key: keyof RulesConfig, value: string): void {
    this.form.update(f => f ? { ...f, [key]: parseFloat(value) } : f);
  }

  boolField(key: keyof RulesConfig, value: boolean): void {
    this.form.update(f => f ? { ...f, [key]: value } : f);
  }

  strField(key: keyof RulesConfig, value: string): void {
    this.form.update(f => f ? { ...f, [key]: value } : f);
  }

  readonly previewChartData = computed((): ChartData<'line'> => {
    const rules = this.form() ?? this.store.rules();
    if (!rules) return { labels: [], datasets: [] };
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
    const rules = this.form() ?? this.store.rules();
    const annotations: Record<string, AnnotationOptions> = {};

    // Compute Y range from actual data so sentinel values like -999 don't blow the axis
    const allScores = rules
      ? PREVIEW_PAIRS.flatMap(pair => STRESS_POINTS.map(s => previewScore(pair, s, rules)))
      : [0];
    const dataPad = 1;
    const yMin = Math.floor(Math.min(...allScores)) - dataPad;
    const yMax = Math.ceil(Math.max(...allScores))  + dataPad;

    if (rules) {
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
      } catch { /* malformed thresholdsJson — skip annotations */ }
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
          title: { display: true, text: 'Colony Stress', color: textMuted, font: { size: 10 } },
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
