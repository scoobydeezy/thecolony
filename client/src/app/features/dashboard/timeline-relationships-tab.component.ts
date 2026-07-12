import { Component, inject, input, signal, computed, ElementRef } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartData, ChartOptions } from 'chart.js';
import type { AnnotationOptions } from 'chartjs-plugin-annotation';
import { AppStore } from '../../store/app.store';
import { TimelineService } from '../../core/services/timeline.service';
import { RelationshipThreshold } from '../../core/models/types';

@Component({
  selector: 'app-timeline-relationships-tab',
  standalone: true,
  imports: [BaseChartDirective],
  templateUrl: './timeline-relationships-tab.component.html',
  styleUrl: './timeline-relationships-tab.component.scss',
})
export class TimelineRelationshipsTabComponent {
  private store = inject(AppStore);
  private timeline = inject(TimelineService);
  private elRef = inject(ElementRef);

  markerTooltip = signal<{ x: number; y: number; lines: string[]; flip: boolean } | null>(null);

  readonly activeFactions = computed(() =>
    this.store.factions().filter(f => f.active && f.type === 'Faction')
  );

  readonly partyName = computed(() => this.store.colonyState()?.partyName ?? 'Party');

  selectedFactionId = signal<string>('');
  showEvents = input(true);

  readonly resolvedFactionId = computed(() => {
    const id = this.selectedFactionId();
    if (id) return id;
    return this.activeFactions()[0]?.id ?? '';
  });

  private dataset = computed(() => {
    const fid = this.resolvedFactionId();
    if (!fid) return { labels: [], series: [], eventMarkers: [] };
    return this.timeline.relationshipsDataset(fid);
  });

  private selectedSessionIndex = computed(() => {
    const ctx = this.store.viewingContext();
    if (ctx === 'baseline' || ctx === 'current') return -1;
    return this.store.colonySnapshots().findIndex(s => s.sessionId === ctx);
  });

  readonly chartData = computed((): ChartData<'line'> => ({
    labels: this.dataset().labels,
    datasets: this.dataset().series.map(s => ({
      label: s.label,
      data: s.data,
      borderColor: s.color,
      backgroundColor: 'transparent',
      tension: 0.3,
      pointRadius: 3,
      pointHoverRadius: 5,
      spanGaps: true,
    })),
  }));

  private readonly thresholdAnnotations = computed((): Record<string, AnnotationOptions> => {
    const rules = this.store.rules();
    if (!rules) return {};

    const allScores = this.dataset().series.flatMap(s => s.data).filter((v): v is number => v != null);
    if (allScores.length === 0) return {};
    const yMin = Math.min(...allScores) - 1;
    const yMax = Math.max(...allScores) + 1;

    const THRESHOLD_COLORS: Record<string, string> = {
      Aligned:     'rgba(52,211,153,0.35)',
      Cooperative: 'rgba(96,165,250,0.30)',
      Friendly:    'rgba(147,197,253,0.25)',
      Tolerated:   'rgba(148,163,184,0.20)',
      Strained:    'rgba(251,191,36,0.25)',
      Opposed:     'rgba(251,146,60,0.30)',
      Hostile:     'rgba(248,113,113,0.35)',
    };

    const result: Record<string, AnnotationOptions> = {};
    try {
      const thresholds: RelationshipThreshold[] = JSON.parse(rules.thresholdsJson);
      thresholds
        .filter(t => t.minScore >= yMin && t.minScore <= yMax)
        .forEach(t => {
          result[`thresh_${t.label}`] = {
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
    return result;
  });

  readonly chartOptions = computed((): ChartOptions<'line'> => {
    const annotations: Record<string, AnnotationOptions> = { ...this.thresholdAnnotations() };

    if (this.showEvents()) {
      this.dataset().eventMarkers.forEach(m => {
        const lines = m.events.flatMap(e => e.tooltip.split('\n'));
        annotations[`event_${m.sessionIndex}`] = {
          type: 'line',
          xMin: m.sessionIndex, xMax: m.sessionIndex,
          borderColor: 'rgba(251,191,36,0.5)',
          borderWidth: 1,
          borderDash: [4, 3],
          label: {
            display: true,
            content: m.events.map(e => e.icon),
            position: 'start',
            color: 'rgba(255,255,255,0.85)',
            font: { size: 11, family: '"Font Awesome 6 Pro"', weight: 900 },
            backgroundColor: 'transparent',
          },
          enter: (_, event) => {
            const rect = (this.elRef.nativeElement as HTMLElement)
              .querySelector('.chart-wrap')!.getBoundingClientRect();
            const x = (event.native as MouseEvent).clientX - rect.left;
            const y = (event.native as MouseEvent).clientY - rect.top;
            this.markerTooltip.set({ x, y, lines, flip: x > rect.width / 2 });
          },
          leave: () => { this.markerTooltip.set(null); },
        };
      });
    }

    const selIdx = this.selectedSessionIndex();
    if (selIdx >= 0) {
      annotations['selectedSession'] = {
        type: 'box',
        xMin: selIdx - 0.4, xMax: selIdx + 0.4,
        backgroundColor: 'rgba(96,165,250,0.12)',
        borderColor: 'rgba(96,165,250,0.4)',
        borderWidth: 1,
      };
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
            font: { size: 11 },
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
            labelColor: (item) => {
              const color = item.dataset.borderColor as string;
              return { borderColor: color, backgroundColor: color };
            },
            title: (items) => {
              const idx = items[0]?.dataIndex ?? -1;
              const snap = this.store.colonySnapshots()[idx];
              const session = snap ? this.store.sessions().find(s => s.id === snap.sessionId) : null;
              return session ? `Session ${session.number}: ${session.title}` : (items[0]?.label ?? '');
            },
          },
        },
        annotation: { annotations },
      },
      scales: {
        x: {
          ticks: { color: textMuted, font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.05)' },
        },
        y: {
          ticks: { color: textMuted, font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.05)' },
        },
      },
    };
  });
}
