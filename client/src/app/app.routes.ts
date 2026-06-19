import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'factions',
    loadComponent: () => import('./features/factions/factions.component').then(m => m.FactionsComponent)
  },
  {
    path: 'relationships',
    loadComponent: () => import('./features/relationships/relationships.component').then(m => m.RelationshipsComponent)
  },
  {
    path: 'party',
    loadComponent: () => import('./features/party/party.component').then(m => m.PartyComponent)
  },
  {
    path: 'session-log',
    loadComponent: () => import('./features/session-log/session-log.component').then(m => m.SessionLogComponent)
  },
  {
    path: 'sessions',
    loadComponent: () => import('./features/sessions/sessions.component').then(m => m.SessionsComponent)
  },
  {
    path: 'characters',
    loadComponent: () => import('./features/characters/characters.component').then(m => m.CharactersComponent)
  },
  {
    path: 'characters/:id',
    loadComponent: () => import('./features/characters/character-detail.component').then(m => m.CharacterDetailComponent)
  },
  { path: '**', redirectTo: '/dashboard' }
];
