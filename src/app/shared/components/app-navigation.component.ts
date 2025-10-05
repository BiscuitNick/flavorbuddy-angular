import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './app-navigation.component.html',
  styleUrls: ['./app-navigation.component.css'],
})
export class AppNavigationComponent implements OnInit {
  private readonly document = inject(DOCUMENT, { optional: true });

  private readonly foodIcons: string[] = [
    '🍞',
    '🥐',
    '🥖',
    '🥨',
    '🥯',
    '🧇',
    '🥞',
    '🧀',
    '🍖',
    '🍗',
    '🥩',
    '🥓',
    '🍔',
    '🍟',
    '🍕',
    '🌭',
    '🥪',
    '🌮',
    '🌯',
    '🥙',
    '🧆',
    '🥚',
    '🍳',
    '🍱',
    '🍘',
    '🍙',
    '🍚',
    '🍛',
    '🍜',
    '🍝',
    // '🍠',
    '🍢',
    '🍣',
    '🍤',
    '🍥',
    '🥮',
    '🍡',
    '🥟',
    '🥠',
    '🥡',
    '🍴',
    '🥄',
    // '🔪',
    // '🏺',
    '🍽️',
    '🥢',
    '🧂',
  ];

  currentIcon = '🍕';

  ngOnInit(): void {
    this.updateFavicon(this.currentIcon);
  }

  onBrandClick(): void {
    if (this.foodIcons.length === 0) {
      return;
    }

    const nextIcon = this.getRandomIcon();
    this.currentIcon = nextIcon;
    this.updateFavicon(nextIcon);
  }

  private getRandomIcon(): string {
    if (this.foodIcons.length === 1) {
      return this.foodIcons[0];
    }

    let nextIcon = this.currentIcon;

    while (nextIcon === this.currentIcon) {
      const randomIndex = Math.floor(Math.random() * this.foodIcons.length);
      nextIcon = this.foodIcons[randomIndex];
    }

    return nextIcon;
  }

  private updateFavicon(icon: string): void {
    const doc = this.document;
    if (!doc) {
      return;
    }

    const head = doc.head ?? doc.getElementsByTagName('head')[0];
    if (!head) {
      return;
    }

    let link = head.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = doc.createElement('link');
      link.rel = 'icon';
      head.appendChild(link);
    }

    link.type = 'image/svg+xml';
    link.href = this.buildFaviconData(icon);
  }

  private buildFaviconData(icon: string): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${icon}</text></svg>`;
    const encoded = encodeURIComponent(svg);
    return `data:image/svg+xml,${encoded}`;
  }
}
