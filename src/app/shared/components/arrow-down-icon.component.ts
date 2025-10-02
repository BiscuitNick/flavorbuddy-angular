import { Component, input } from '@angular/core';

@Component({
  selector: 'app-arrow-down-icon',
  standalone: true,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      [attr.aria-label]="ariaLabel()"
    >
      <path
        d="M12 5V19M12 19L19 12M12 19L5 12"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `,
})
export class ArrowDownIconComponent {
  size = input<number>(24);
  ariaLabel = input<string>('Arrow down');
}
