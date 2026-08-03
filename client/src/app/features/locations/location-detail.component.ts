import { Component, inject, computed, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AppStore } from '../../store/app.store';
import { Location, LocationState, LOCATION_STATE_OPTIONS } from '../../core/models/types';
import { FormField, form } from '@angular/forms/signals';

interface LocationFormModel {
  id: string;
  name: string;
  description: string;
  parentLocationId: string;
  state: LocationState;
}

@Component({
  selector: 'app-location-detail',
  standalone: true,
  imports: [RouterLink, FormField],
  templateUrl: './location-detail.component.html',
  styleUrl: './location-detail.component.scss',
})
export class LocationDetailComponent {
  private route = inject(ActivatedRoute);
  store = inject(AppStore);

  readonly stateOptions = LOCATION_STATE_OPTIONS;
  readonly isEditing = signal(false);
  readonly editForm = signal<LocationFormModel>({ id: '', name: '', description: '', parentLocationId: '', state: 'Active' });
  readonly f = form(this.editForm);

  // ── Derived from route ────────────────────────────────────────────────────

  readonly locationId = computed(() => this.route.snapshot.paramMap.get('id') ?? '');

  readonly location = computed((): Location | undefined =>
    this.store.viewLocations().find(l => l.id === this.locationId())
  );

  readonly parentLocation = computed(() => {
    const pid = this.location()?.parentLocationId;
    return pid ? this.store.locations().find(l => l.id === pid) : undefined;
  });

  readonly childLocations = computed(() =>
    this.store.viewLocations()
      .filter(l => l.parentLocationId === this.locationId())
      .sort((a, b) => a.name.localeCompare(b.name))
  );

  readonly linkedMaps = computed(() =>
    this.store.colonyMaps().filter(m => m.locationId === this.locationId())
  );

  readonly charactersHere = computed(() => {
    const id = this.locationId();
    const snap = this.store.activeSnapshot();
    if (snap) {
      return this.store.viewCharacters().filter(c => snap.characterLocations[c.id] === id);
    }
    return this.store.characters().filter(c => c.locationId === id);
  });

  readonly assetsHere = computed(() => {
    const id = this.locationId();
    const snap = this.store.activeSnapshot();
    if (snap) {
      return this.store.viewAssets().filter(a => snap.assetLocations[a.id] === id);
    }
    return this.store.assets().filter(a => a.locationId === id);
  });

  readonly parentOptions = computed(() =>
    this.store.locations()
      .filter(l => l.id !== this.locationId())
      .sort((a, b) => a.name.localeCompare(b.name))
  );

  // ── Edit ──────────────────────────────────────────────────────────────────

  startEdit(): void {
    const loc = this.location();
    if (!loc) return;
    this.editForm.set({
      id: loc.id,
      name: loc.name,
      description: loc.description ?? '',
      parentLocationId: loc.parentLocationId ?? '',
      state: loc.state,
    });
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
  }

  save(): void {
    const fm = this.editForm();
    if (!fm.name.trim()) return;
    this.store.saveLocation({
      id: fm.id,
      campaignId: '',
      name: fm.name.trim(),
      description: fm.description.trim() || undefined,
      parentLocationId: fm.parentLocationId || undefined,
      state: fm.state,
    });
    this.isEditing.set(false);
  }

  // ── Maps ──────────────────────────────────────────────────────────────────

  readonly showMapModal = signal(false);
  readonly mapForm = signal({ name: '', imageWidth: '2000', imageHeight: '2000' });

  openAddMap(): void {
    this.mapForm.set({ name: '', imageWidth: '2000', imageHeight: '2000' });
    this.showMapModal.set(true);
  }

  closeMapModal(): void {
    this.showMapModal.set(false);
  }

  saveMap(): void {
    const fm = this.mapForm();
    if (!fm.name.trim()) return;
    this.store.saveColonyMap({
      id: '',
      campaignId: '',
      name: fm.name.trim(),
      locationId: this.locationId(),
      imageWidth: parseInt(fm.imageWidth) || 2000,
      imageHeight: parseInt(fm.imageHeight) || 2000,
      isHero: false,
    });
    this.showMapModal.set(false);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  factionName(id: string | undefined): string {
    if (!id) return '—';
    return this.store.factions().find(f => f.id === id)?.name ?? '—';
  }

  stateClass(state: LocationState): string {
    const map: Record<LocationState, string> = {
      Active:    'state-active',
      Abandoned: 'state-abandoned',
      Ruined:    'state-ruined',
      Unknown:   'state-unknown',
    };
    return map[state];
  }
}
