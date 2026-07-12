import { Component, Input } from '@angular/core';
import { GoalPriority } from '../../core/models/types';

// Fixed geometry: bar 20×4, gap 4, rx 1.5 → total height 20
const W = 20, H = 4, GAP = 4, RX = 0.5;
const Y1 = 16, Y2 = 8, Y3 = 0;

@Component({
  selector: 'app-priority-icon',
  standalone: true,
  template: `
    <svg width="22" height="22" viewBox="-1 -1 22 22"
         xmlns="http://www.w3.org/2000/svg" [attr.aria-label]="priority" role="img">
      <rect x="0" [attr.y]="Y3" [attr.width]="W" [attr.height]="H" [attr.rx]="RX"
            [attr.fill]="fill(3)" stroke="currentColor" stroke-width="1" />
      <rect x="0" [attr.y]="Y2" [attr.width]="W" [attr.height]="H" [attr.rx]="RX"
            [attr.fill]="fill(2)" stroke="currentColor" stroke-width="1" />
      <rect x="0" [attr.y]="Y1" [attr.width]="W" [attr.height]="H" [attr.rx]="RX"
            [attr.fill]="fill(1)" stroke="currentColor" stroke-width="1" />
    </svg>
  `,
  styles: [`:host { display: inline-flex; align-items: center; }`],
})
export class PriorityIconComponent {
  @Input() priority: GoalPriority = 'Minor';

  readonly W = W; readonly H = H; readonly RX = RX;
  readonly Y1 = Y1; readonly Y2 = Y2; readonly Y3 = Y3;

  fill(bar: 1 | 2 | 3): string {
    const filled = this.priority === 'Critical' ? 3
                 : this.priority === 'Major'    ? 2
                 :                                1;
    return bar <= filled ? 'currentColor' : 'transparent';
  }
}
