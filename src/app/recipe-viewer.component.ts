import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';

import { RecipePayload } from './recipe.types';

@Component({
  selector: 'app-recipe-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recipe-viewer.component.html',
  styleUrls: ['./recipe-viewer.component.css']
})
export class RecipeViewerComponent implements OnChanges, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  @Input() recipe: RecipePayload | null = null;
  @Input() sourceUrl: string | null = null;

  private readonly recipeState = signal<RecipePayload | null>(null);
  private readonly sourceUrlState = signal<string | null>(null);

  protected readonly recipeSignal = this.recipeState.asReadonly();
  protected readonly sourceUrlSignal = this.sourceUrlState.asReadonly();

  protected readonly descriptionExpanded = signal(false);
  protected readonly descriptionOverflow = signal(false);

  protected readonly hasDescriptionOverflow = this.descriptionOverflow.asReadonly();
  protected readonly isDescriptionExpanded = this.descriptionExpanded.asReadonly();

  protected readonly viewCount = computed(() => {
    const value = this.recipeSignal()?.views;

    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(0, Math.trunc(value));
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return Math.max(0, Math.trunc(parsed));
      }
    }

    return null;
  });

  protected readonly recipeTypeLabel = computed(() => {
    const type = this.recipeSignal()?.type;
    if (typeof type !== 'string' || !type.trim()) {
      return null;
    }

    const normalized = type.trim().toLowerCase();
    const overrides: Record<string, string> = {
      url: 'URL',
      ai_generated: 'AI Generated',
      image_upload: 'Image Upload',
      user_input: 'User Input'
    };

    if (normalized in overrides) {
      return overrides[normalized];
    }

    return normalized
      .split('_')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  });

  protected readonly recipeTitle = computed(() => {
    const title = this.recipeSignal()?.title;
    return typeof title === 'string' && title.trim().length ? title.trim() : 'Untitled Recipe';
  });

  protected readonly description = computed(() => {
    const value = this.recipeSignal()?.description;
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  });

  protected readonly imageUrl = computed(() => {
    const recipe = this.recipeSignal();
    if (!recipe) {
      return null;
    }

    const candidates: unknown[] = [
      recipe.image,
      recipe.image_url,
      ...(Array.isArray(recipe.images) ? recipe.images : [])
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (trimmed) {
          return trimmed;
        }
      }
    }

    return null;
  });

  protected readonly ingredients = computed(() =>
    this.resolveList(['ingredients', 'ingredient_list', 'ingredientLines'])
  );

  protected readonly instructions = computed(() =>
    this.resolveList(['instructions', 'instructions_list', 'directions'])
  );

  @ViewChild('descriptionParagraph')
  private descriptionParagraph?: ElementRef<HTMLParagraphElement>;
  private descriptionOverflowTimeout: number | null = null;

  constructor() {
    effect(
      () => {
        const description = this.description();

        if (!this.isBrowser) {
          this.descriptionOverflow.set(false);
          return;
        }

        if (!description) {
          this.descriptionOverflow.set(false);
          return;
        }

        if (this.isDescriptionExpanded()) {
          return;
        }

        this.scheduleDescriptionMeasurement();
      },
      { allowSignalWrites: true }
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('recipe' in changes) {
      this.recipeState.set(this.recipe ?? null);
      this.descriptionExpanded.set(false);
      this.descriptionOverflow.set(false);
      if (this.isBrowser) {
        this.scheduleDescriptionMeasurement();
      }
    }

    if ('sourceUrl' in changes) {
      this.sourceUrlState.set(this.sourceUrl ?? null);
    }
  }

  ngOnDestroy(): void {
    if (this.descriptionOverflowTimeout !== null) {
      clearTimeout(this.descriptionOverflowTimeout);
      this.descriptionOverflowTimeout = null;
    }
  }

  protected toggleDescription(): void {
    if (!this.hasDescriptionOverflow()) {
      return;
    }

    this.descriptionExpanded.update((value) => !value);
  }

  protected printRecipe(): void {
    if (!this.isBrowser || !this.recipeSignal()) {
      return;
    }

    window.print();
  }

  private scheduleDescriptionMeasurement(): void {
    if (!this.isBrowser) {
      return;
    }

    if (this.descriptionOverflowTimeout !== null) {
      clearTimeout(this.descriptionOverflowTimeout);
    }

    this.descriptionOverflowTimeout = window.setTimeout(() => {
      this.descriptionOverflowTimeout = null;
      this.measureDescriptionOverflow();
    });
  }

  private measureDescriptionOverflow(): void {
    if (!this.isBrowser || this.isDescriptionExpanded()) {
      return;
    }

    const element = this.descriptionParagraph?.nativeElement;
    if (!element) {
      this.descriptionOverflow.set(false);
      return;
    }

    const overflow = element.scrollHeight - element.clientHeight > 1;
    this.descriptionOverflow.set(overflow);
  }

  private resolveList(keys: string[]): string[] {
    const recipe = this.recipeSignal();
    if (!recipe) {
      return [];
    }

    for (const key of keys) {
      const maybe = recipe[key];
      const list = this.toList(maybe);
      if (list.length) {
        return list;
      }
    }

    return [];
  }

  private toList(value: unknown): string[] {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter((entry) => entry.length > 0);
    }

    if (typeof value === 'string') {
      return value
        .split(/\r?\n+/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    }

    if (typeof value === 'object' && value !== null && 'list' in value) {
      return this.toList((value as { list?: unknown }).list);
    }

    return [];
  }
}
