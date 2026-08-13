import { Component, inject } from '@angular/core';
import { NarrativeFocusService } from './services/narrative-focus.service';
import { AppStore } from '../../store/app.store';

/**
 * Floating overlay shown in isolate mode. Positioned absolute inside the canvas.
 */
@Component({
  selector: 'app-narrative-focus-overlay',
  standalone: true,
  templateUrl: './narrative-focus-overlay.component.html',
  styleUrl: './narrative-focus-overlay.component.scss'
})
export class NarrativeFocusOverlayComponent {
  readonly focusSvc = inject(NarrativeFocusService);
  private  store    = inject(AppStore);

  isolateLabel(): string {
    const id = this.focusSvc.focusedEntityId();
    if (!id) return '';
    return this.store.narrativeThreads().find(t => t.id === id)?.title
      ?? this.store.factions().find(f => f.id === id)?.name
      ?? this.store.characters().find(c => c.id === id)?.name
      ?? id;
  }
}
