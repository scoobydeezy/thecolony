import { Component, input, output, signal, effect, untracked } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';

@Component({
  selector: 'app-or-value-row',
  standalone: true,
  imports: [FormField],
  styleUrl: './or-value-row.component.scss',
  template: `
    @if (index() > 0) { <span class="or-label">OR</span> }
    <select [formField]="rowForm.v">
      @for (opt of options(); track opt.value) {
        <option [value]="opt.value">{{ opt.label }}</option>
      }
    </select>
    <button class="remove-val-btn" type="button" (click)="remove.emit()" title="Remove">✕</button>
  `,
})
export class OrValueRowComponent {
  index   = input.required<number>();
  value   = input.required<string>();
  options = input.required<{ value: string; label: string }[]>();
  remove      = output<void>();
  valueChange = output<string>();

  readonly rowModel = signal<{ v: string }>({ v: '' });
  readonly rowForm  = form(this.rowModel);

  constructor() {
    effect(() => {
      const incoming = this.value();
      if (incoming !== untracked(this.rowModel).v)
        this.rowModel.set({ v: incoming });
    });
    effect(() => {
      const current = this.rowModel().v;
      if (current !== untracked(this.value))
        this.valueChange.emit(current);
    });
  }
}
