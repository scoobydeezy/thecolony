import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ValuesTabComponent } from '../../features/settings/values-tab.component';
import { RulesTabComponent } from '../../features/settings/rules-tab.component';
import { EffectsTabComponent } from '../../features/settings/effects-tab.component';
import { FormulasTabComponent } from '../../features/settings/formulas-tab.component';

export type SettingsTab = 'labels' | 'rules' | 'effects' | 'formulas';

@Component({
  selector: 'app-settings-drawer',
  standalone: true,
  imports: [CommonModule, ValuesTabComponent, RulesTabComponent, EffectsTabComponent, FormulasTabComponent],
  templateUrl: './settings-drawer.component.html',
  styleUrl: './settings-drawer.component.scss'
})
export class SettingsDrawerComponent {
  open = input.required<boolean>();
  closed = output<void>();

  activeTab = signal<SettingsTab>('labels');

  readonly tabs: { id: SettingsTab; label: string }[] = [
    { id: 'labels',   label: 'Values' },
    { id: 'rules',    label: 'Relationship Rules' },
    { id: 'effects',  label: 'Session Effects' },
    { id: 'formulas', label: 'Formulas' },
  ];

  selectTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
  }

  close(): void {
    this.closed.emit();
  }
}
