import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AppStore } from './store/app.store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  store = inject(AppStore);

  readonly partyName = computed(() => this.store.colonyState()?.partyName || 'Party');

  ngOnInit() {
    this.store.loadFactions(undefined);
    this.store.loadColonyState(undefined);
    this.store.loadRelationships(undefined);
    this.store.loadOverrides(undefined);
    this.store.loadRules(undefined);
    this.store.loadSessionLog(undefined);
    this.store.loadCharacters(undefined);
  }

  stressClass(): string {
    const s = this.store.colonyState()?.colonyStress ?? 0;
    if (s <= 3) return 'stress-value stress-low';
    if (s <= 6) return 'stress-value stress-mid';
    return 'stress-value stress-high';
  }
}
