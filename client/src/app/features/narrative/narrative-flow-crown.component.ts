import { Component, inject, input, computed } from '@angular/core';
import { PathContextService } from './services/path-context.service';
import { AppStore } from '../../store/app.store';
import { NarrativePath } from '../../core/models/types';

/**
 * Per-event Crown — renders above an Origin Event node in scene space.
 * Shows the active Path name and a native select to switch paths.
 * Positioned by the parent Flow canvas (absolute, scene-relative).
 */
@Component({
  selector: 'app-narrative-flow-crown',
  standalone: true,
  templateUrl: './narrative-flow-crown.component.html',
  styleUrl: './narrative-flow-crown.component.scss'
})
export class NarrativeFlowCrownComponent {
  private readonly pathCtx = inject(PathContextService);
  private readonly store   = inject(AppStore);

  originEventId = input.required<string>();

  readonly pathSet = computed(() => this.pathCtx.pathSetForOriginEvent(this.originEventId()));

  readonly paths = computed<NarrativePath[]>(() => {
    const ps = this.pathSet();
    if (!ps) return [];
    return this.pathCtx.pathsForSet(ps.id);
  });

  readonly selectedPathId = computed<string | undefined>(() => {
    const ps = this.pathSet();
    if (!ps) return undefined;
    return this.pathCtx.selectedPathIdFor(ps.id);
  });

  readonly isLocked = computed(() => this.pathCtx.editingLocked());

  onPathChange(event: Event): void {
    const ps = this.pathSet();
    if (!ps) return;
    const pathId = (event.target as HTMLSelectElement).value;
    this.pathCtx.selectPath(ps.id, pathId);
  }
}
