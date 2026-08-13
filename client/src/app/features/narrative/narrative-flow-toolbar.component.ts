import { Component, inject, input, output, signal, computed } from '@angular/core';
import { AppStore } from '../../store/app.store';
import { NarrativeConnectionService } from './services/narrative-connection.service';
import { NarrativeFocusService } from './services/narrative-focus.service';
import { NarrativeFilterService } from './services/narrative-filter.service';

/**
 * Floating toolbar rendered inside the canvas viewport.
 * Screen-space fixed — does not pan/zoom with the graph.
 *
 * Buttons (left→right): Snap | Fit | Undo | Redo | Search | Filter | Eraser | + Event
 * No global Connect button — connections originate from node hover handles.
 */
@Component({
  selector: 'app-narrative-flow-toolbar',
  standalone: true,
  templateUrl: './narrative-flow-toolbar.component.html',
  styleUrl: './narrative-flow-toolbar.component.scss'
})
export class NarrativeFlowToolbarComponent {
  readonly store     = inject(AppStore);
  readonly connSvc   = inject(NarrativeConnectionService);
  readonly focusSvc  = inject(NarrativeFocusService);
  readonly filterSvc = inject(NarrativeFilterService);

  eraseModeActive = input.required<boolean>();
  snapActive      = input.required<boolean>();
  canUndo         = input<boolean>(false);
  canRedo         = input<boolean>(false);

  fitView      = output<void>();
  addEvent     = output<void>();
  eraseToggle  = output<void>();
  snapToggle   = output<void>();
  undoAction   = output<void>();
  redoAction   = output<void>();
  filterToggle = output<void>();
  searchChange = output<string>();

  searchQuery = signal('');

  readonly pendingSourceTitle = computed<string>(() => {
    const edge = this.connSvc.pendingEdge();
    if (!edge) return '';
    return this.store.narrativeEvents().find(e => e.id === edge.sourceEventId)?.title ?? '';
  });

}
