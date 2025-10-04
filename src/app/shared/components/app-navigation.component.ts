import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './app-navigation.component.html',
  styleUrls: ['./app-navigation.component.css'],
})
export class AppNavigationComponent {
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

  currentIcon = '🍳';

  onBrandClick(): void {
    if (this.foodIcons.length === 0) {
      return;
    }

    const nextIcon = this.getRandomIcon();
    this.currentIcon = nextIcon;
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
}
