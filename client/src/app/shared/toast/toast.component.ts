import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toasts',
  standalone: true,
  template: `
    <div class="toast-stack" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class.toast--warning]="t.kind === 'warning'" role="status">
          <i class="fa-solid" [class.fa-circle-check]="t.kind === 'success'" [class.fa-triangle-exclamation]="t.kind === 'warning'"></i>
          <div class="toast-body">
            <div class="toast-title">{{ t.title }}</div>
            <div class="toast-detail">{{ t.detail }}</div>
          </div>
          <button class="toast-close" type="button" aria-label="Dismiss" (click)="toast.dismiss(t.id)"><i class="fa-solid fa-xmark"></i></button>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-stack { position: fixed; right: 1rem; bottom: 1rem; z-index: 2000; display: flex; flex-direction: column; gap: 0.5rem; }
    .toast { display: flex; align-items: flex-start; gap: 0.6rem; min-width: 16rem; max-width: 26rem; padding: 0.6rem 0.75rem;
      background: var(--bg-card, #1e1e2a); border: 1px solid var(--color-success, #4ade80); border-radius: 6px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35); color: var(--text-primary); font-size: var(--text-size-body);
      animation: toast-in 0.15s ease-out;
      > i { color: var(--color-success, #4ade80); margin-top: 0.15rem; } }
    .toast--warning { border-color: #fbbf24; > i { color: #fbbf24; } }
    .toast-body { flex: 1; }
    .toast-title { font-weight: 600; }
    .toast-detail { color: var(--text-secondary); font-size: var(--text-size-meta); }
    .toast-close { background: none; border: none; color: var(--text-muted); cursor: pointer; }
    @keyframes toast-in { from { opacity: 0; transform: translateY(0.4rem); } to { opacity: 1; transform: none; } }
  `,
})
export class ToastsComponent {
  readonly toast = inject(ToastService);
}
