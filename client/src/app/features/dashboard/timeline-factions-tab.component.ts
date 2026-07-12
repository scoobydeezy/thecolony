import { Component, inject, input, signal, computed, ElementRef } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartData, ChartOptions } from 'chart.js';
import type { AnnotationOptions } from 'chartjs-plugin-annotation';
import { AppStore } from '../../store/app.store';
import { TimelineService, FactionMetric } from '../../core/services/timeline.service';

@Component({
  selector: 'app-timeline-factions-tab',
  standalone: true,
  imports: [BaseChartDirective],
  templateUrl: './timeline-factions-tab.component.html',
  styleUrl: './timeline-factions-tab.component.scss',
})
export class TimelineFactionsTabComponent {
  private store = inject(AppStore);
  private timeline = inject(TimelineService);
  private elRef = inject(ElementRef);

  selectedMetric = signal<FactionMetric>('momentum');
  showEvents = input(true);
  markerTooltip = signal<{ x: number; y: number; lines: string[]; flip: boolean } | null>(null);

  readonly metrics: { value: FactionMetric; label: string }[] = [
    { value: 'momentum', label: 'Momentum' },
    { value: 'legitimacy', label: 'Legitimacy' },
    { value: 'effectivePower', label: 'Effective Power' },
    { value: 'membership', label: 'Membership' },
    { value: 'influence', label: 'Influence' },
  ];

  private dataset = computed(() => this.timeline.factionsDataset(this.selectedMetric()));

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

  readonly chartOptions = computed((): ChartOptions<'line'> => {
    const annotations: Record<string, AnnotationOptions> = {};

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
