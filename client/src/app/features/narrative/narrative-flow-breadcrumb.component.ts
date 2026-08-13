import { Component, inject } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { PathContextService } from './services/path-context.service';

/**
 * Bottom-center screen-space breadcrumb showing the current path context.
 * Each segment is clickable and navigates to that Origin Event.
 * Never displays "Base". Hidden when no PathSets have selections.
 */
@Component({
  selector: 'app-narrative-flow-breadcrumb',
  standalone: true,
  imports: [UpperCasePipe],
  templateUrl: './narrative-flow-breadcrumb.component.html',
  styleUrl: './narrative-flow-breadcrumb.component.scss'
})
export class NarrativeFlowBreadcrumbComponent {
  readonly pathCtx = inject(PathContextService);
}
