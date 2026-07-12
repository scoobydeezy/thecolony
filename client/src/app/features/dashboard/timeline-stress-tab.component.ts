import { Component, inject, input, signal, computed, ElementRef } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import type { AnnotationOptions } from 'chartjs-plugin-annotation';
import { AppStore } from '../../store/app.store';
import { TimelineService } from '../../core/services/timeline.service';

@Component({
  selector: 'app-timeline-stress-tab',
  standalone: true,
  imports: [BaseChartDirective],
  templateUrl: './timeline-stress-tab.component.html',
  styleUrl: './timeline-stress-tab.component.scss',
})
export class TimelineStressTabComponent {
  private store = inject(AppStore);
  private timeline = inject(TimelineService);
  private elRef = inject(ElementRef);

  showEvents = input(true);
  markerTooltip = signal<{ x: number; y: number; lines: string[]; flip: boolean } | null>(null);

  private dataset = computed(() => this.timeline.stressDataset());

  private selectedSessionIndex = computed(() => {
    const ctx = this.store.viewingContext();
    if (ctx === 'baseline' || ctx === 'current') return -1;
    const snaps = this.store.colonySnapshots();
    return snaps.findIndex(s => s.sessionId === ctx);
  });

  readonly chartData = computed((): ChartData<'line'> => ({
    labels: this.dataset().labels,
    datasets: this.dataset().series.map(s => ({
      label: s.label,
      data: s.data,
      borderColor: s.color,
      backgroundColor: 'rgba(96,165,250,0.08)',
      fill: true,
      tension: 0.3,
      pointRadius: 4,
      pointHoverRadius: 6,
      spanGaps: true,
    })),
  }));

  readonly chartOptions = computed((): ChartOptions<'line'> => {
    const annotations: Record<string, AnnotationOptions> = {};

    // Stress threshold bands
    annotations['lowBand'] = {
      type: 'box', yMin: 0, yMax: 3,
      backgroundColor: 'rgba(34,197,94,0.04)',
      borderWidth: 0,
    };
    annotations['midBand'] = {
      type: 'box', yMin: 3, yMax: 7,
      backgroundColor: 'rgba(251,191,36,0.04)',
      borderWidth: 0,
    };
    annotations['highBand'] = {
      type: 'box', yMin: 7, yMax: 10,
      backgroundColor: 'rgba(239,68,68,0.06)',
      borderWidth: 0,
    };

    if (this.showEvents()) {
      this.dataset().eventMarkers.forEach(m => {
        const lines = m.events.flatMap(e => e.tooltip.split('\n'));
        annotations[`event_${m.sessionIndex}`] = {
          type: 'line',
          xMin: m.sessionIndex, xMax: m.sessionIndex,
          borderColor: 'rgba(251,191,36,0.6)',
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

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
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
              const sessions = this.store.sessions().sort((a, b) => a.number - b.number);
              const snap = this.store.colonySnapshots()[idx];
              const session = snap ? sessions.find(s => s.id === snap.sessionId) : null;
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
          min: 0, max: 10,
          ticks: { color: textMuted, stepSize: 2, font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.05)' },
        },
      },
    };
  });
}
