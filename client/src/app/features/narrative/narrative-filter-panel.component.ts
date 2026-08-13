import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStore } from '../../store/app.store';
import { NarrativeFilterService } from './services/narrative-filter.service';

@Component({
  selector: 'app-narrative-filter-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './narrative-filter-panel.component.html',
  styleUrl: './narrative-filter-panel.component.scss',
})
export class NarrativeFilterPanelComponent {
  readonly store     = inject(AppStore);
  readonly filterSvc = inject(NarrativeFilterService);

  readonly threads    = computed(() => this.store.narrativeThreads());
  readonly characters = computed(() => this.store.characters());
  readonly assets     = computed(() => this.store.assets());

  isThreadSelected(id: string):    boolean { return this.filterSvc.threadIds().includes(id); }
  isCharacterSelected(id: string): boolean { return this.filterSvc.characterIds().includes(id); }
  isAssetSelected(id: string):     boolean { return this.filterSvc.assetIds().includes(id); }

  toggleThread(id: string): void {
    this.filterSvc.threadIds.update(ids =>
      ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
    );
  }

  toggleCharacter(id: string): void {
    this.filterSvc.characterIds.update(ids =>
      ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
    );
  }

  toggleAsset(id: string): void {
    this.filterSvc.assetIds.update(ids =>
      ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
    );
  }

  onThreadChange(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (id && !this.isThreadSelected(id)) this.toggleThread(id);
    (event.target as HTMLSelectElement).value = '';
  }

  onCharacterChange(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (id && !this.isCharacterSelected(id)) this.toggleCharacter(id);
    (event.target as HTMLSelectElement).value = '';
  }

  onAssetChange(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (id && !this.isAssetSelected(id)) this.toggleAsset(id);
    (event.target as HTMLSelectElement).value = '';
  }

  threadName(id: string): string {
    return this.store.narrativeThreads().find(t => t.id === id)?.title ?? id;
  }

  characterName(id: string): string {
    return this.store.characters().find(c => c.id === id)?.name ?? id;
  }

  assetName(id: string): string {
    return this.store.assets().find(a => a.id === id)?.name ?? id;
  }
}
