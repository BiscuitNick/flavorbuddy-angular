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
  signal,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { RecipePayload } from '../models/recipe.types';
import { RecipeService } from '../../../core/services/recipe.service';
import { ArrowUpIconComponent } from '../../../shared/components/arrow-up-icon.component';
import { ArrowDownIconComponent } from '../../../shared/components/arrow-down-icon.component';
import { HorizontalRecipeListComponent } from '../../../shared/components/horizontal-recipe-list.component';
import { RecipeCardData } from '../../../shared/components/recipe-card.component';

@Component({
  selector: 'app-recipe-viewer',
  standalone: true,
  imports: [CommonModule, RouterModule, ArrowUpIconComponent, ArrowDownIconComponent, HorizontalRecipeListComponent],
  templateUrl: './recipe-viewer.component.html',
  styleUrls: ['./recipe-viewer.component.css'],
})
export class RecipeViewerComponent implements OnChanges, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly recipeService = inject(RecipeService);
  private readonly router = inject(Router);

  @Input() recipe: RecipePayload | null = null;
  @Input() sourceUrl: string | null = null;
  @Input() showConversionWidget: 'url' | 'text' | null = null;

  private readonly recipeState = signal<RecipePayload | null>(null);
  private readonly sourceUrlState = signal<string | null>(null);

  protected readonly recipeSignal = this.recipeState.asReadonly();
  protected readonly sourceUrlSignal = this.sourceUrlState.asReadonly();

  protected readonly descriptionExpanded = signal(false);
  protected readonly descriptionOverflow = signal(false);

  protected readonly hasDescriptionOverflow = this.descriptionOverflow.asReadonly();
  protected readonly isDescriptionExpanded = this.descriptionExpanded.asReadonly();

  protected readonly isLiking = signal(false);
  protected readonly isDisliking = signal(false);
  protected readonly isFavoriting = signal(false);
  protected readonly isDeleting = signal(false);

  protected readonly relatedRecipes = signal<RecipeCardData[]>([]);
  protected readonly isLoadingRelated = signal(false);

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
      user_input: 'User Input',
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
      ...(Array.isArray(recipe.images) ? recipe.images : []),
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

  protected readonly recipeId = computed(() => {
    const value = this.recipeSignal()?.id;
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

  protected readonly canDeleteRecipe = computed(() => {
    if (this.recipeId() === null) {
      return false;
    }

    if (!this.isBrowser) {
      return false;
    }

    const hostname = window.location.hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  });

  protected readonly likes = computed(() => {
    const value = this.recipeSignal()?.likes;
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(0, Math.trunc(value));
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return Math.max(0, Math.trunc(parsed));
      }
    }
    return 0;
  });

  protected readonly dislikes = computed(() => {
    const value = this.recipeSignal()?.dislikes;
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(0, Math.trunc(value));
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return Math.max(0, Math.trunc(parsed));
      }
    }
    return 0;
  });

  protected readonly userLiked = computed(() => {
    return this.recipeSignal()?.user_liked === true;
  });

  protected readonly userDisliked = computed(() => {
    return this.recipeSignal()?.user_disliked === true;
  });

  protected readonly userFavorited = computed(() => {
    return this.recipeSignal()?.user_favorited === true;
  });

  protected readonly totalScore = computed(() => {
    return this.likes() - this.dislikes();
  });

  protected readonly hasValidContent = computed(() => {
    const ingredientsList = this.ingredients();
    const instructionsList = this.instructions();
    return ingredientsList.length > 0 && instructionsList.length > 0;
  });

  protected readonly missingContentMessage = computed(() => {
    const ingredientsList = this.ingredients();
    const instructionsList = this.instructions();

    if (ingredientsList.length === 0 && instructionsList.length === 0) {
      return 'This recipe is missing both ingredients and directions.';
    }
    if (ingredientsList.length === 0) {
      return 'This recipe is missing ingredients.';
    }
    if (instructionsList.length === 0) {
      return 'This recipe is missing directions.';
    }
    return null;
  });

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
        const recipeId = this.recipe?.id;
        if (typeof recipeId === 'number' && Number.isFinite(recipeId)) {
          void this.loadRelatedRecipes(recipeId);
        }
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

  protected async handleLike(): Promise<void> {
    const recipeId = this.recipeId();
    if (recipeId === null || this.isLiking() || this.isDisliking()) {
      return;
    }

    this.isLiking.set(true);

    try {
      const userId = this.recipeService.getUserId();
      const response = await firstValueFrom(this.recipeService.likeRecipe(recipeId, userId));

      // Update local state
      const currentRecipe = this.recipeState();
      if (currentRecipe) {
        this.recipeState.set({
          ...currentRecipe,
          likes: response.likes,
          dislikes: response.dislikes,
          user_liked: response.user_liked,
          user_disliked: response.user_disliked,
          user_favorited: response.user_favorited,
        });
      }
    } catch (error) {
      console.error('Failed to like recipe:', error);
    } finally {
      this.isLiking.set(false);
    }
  }

  protected async handleDislike(): Promise<void> {
    const recipeId = this.recipeId();
    if (recipeId === null || this.isLiking() || this.isDisliking()) {
      return;
    }

    this.isDisliking.set(true);

    try {
      const userId = this.recipeService.getUserId();
      const response = await firstValueFrom(this.recipeService.dislikeRecipe(recipeId, userId));

      // Update local state
      const currentRecipe = this.recipeState();
      if (currentRecipe) {
        this.recipeState.set({
          ...currentRecipe,
          likes: response.likes,
          dislikes: response.dislikes,
          user_liked: response.user_liked,
          user_disliked: response.user_disliked,
          user_favorited: response.user_favorited,
        });
      }
    } catch (error) {
      console.error('Failed to dislike recipe:', error);
    } finally {
      this.isDisliking.set(false);
    }
  }

  protected async handleFavorite(): Promise<void> {
    const recipeId = this.recipeId();
    if (recipeId === null || this.isFavoriting()) {
      return;
    }

    this.isFavoriting.set(true);

    try {
      const userId = this.recipeService.getUserId();
      const response = await firstValueFrom(this.recipeService.favoriteRecipe(recipeId, userId));

      // Update local state
      const currentRecipe = this.recipeState();
      if (currentRecipe) {
        this.recipeState.set({
          ...currentRecipe,
          user_favorited: response.user_favorited,
          user_liked: response.user_liked,
          user_disliked: response.user_disliked,
        });
      }
    } catch (error) {
      console.error('Failed to favorite recipe:', error);
    } finally {
      this.isFavoriting.set(false);
    }
  }

  protected async handleDelete(): Promise<void> {
    const recipeId = this.recipeId();
    if (recipeId === null || this.isDeleting()) {
      return;
    }

    if (this.isBrowser) {
      const title = this.recipeTitle();
      if (!confirm(`Are you sure you want to delete "${title}"?`)) {
        return;
      }
    }

    this.isDeleting.set(true);

    try {
      await firstValueFrom(this.recipeService.deleteRecipe(recipeId));
      this.recipeState.set(null);
      this.sourceUrlState.set(null);

      if (this.isBrowser) {
        await this.router.navigate(['/search']);
      }
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      if (this.isBrowser) {
        alert('Failed to delete recipe. Please try again.');
      }
    } finally {
      this.isDeleting.set(false);
    }
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

  private async loadRelatedRecipes(recipeId: number): Promise<void> {
    this.isLoadingRelated.set(true);
    this.relatedRecipes.set([]);

    try {
      const userId = this.recipeService.getUserId();
      const response = await firstValueFrom(
        this.recipeService.getRelatedRecipes(recipeId, 10, userId)
      );

      this.relatedRecipes.set(
        response.results.map((recipe) => ({
          id: recipe.id,
          title: recipe.title?.trim() || 'Untitled Recipe',
          imageUrl: this.normalizeImage(recipe.image),
          description: this.extractDescription(recipe),
          views: this.coerceNumber(recipe.views),
          likes: this.coerceNumber(recipe.likes),
          dislikes: this.coerceNumber(recipe.dislikes),
          userLiked: recipe.user_liked === true,
          userDisliked: recipe.user_disliked === true,
          userFavorited: recipe.user_favorited === true,
        }))
      );
    } catch (error) {
      console.error('Failed to load related recipes:', error);
    } finally {
      this.isLoadingRelated.set(false);
    }
  }

  protected async handleRelatedLike(recipe: RecipeCardData): Promise<void> {
    try {
      const userId = this.recipeService.getUserId();
      const response = await firstValueFrom(
        this.recipeService.likeRecipe(recipe.id, userId)
      );

      this.relatedRecipes.update((recipes) =>
        recipes.map((r) =>
          r.id === recipe.id
            ? {
                ...r,
                likes: response.likes,
                dislikes: response.dislikes,
                userLiked: response.user_liked,
                userDisliked: response.user_disliked,
              }
            : r
        )
      );
    } catch (error) {
      console.error('Failed to like recipe:', error);
    }
  }

  protected async handleRelatedDislike(recipe: RecipeCardData): Promise<void> {
    try {
      const userId = this.recipeService.getUserId();
      const response = await firstValueFrom(
        this.recipeService.dislikeRecipe(recipe.id, userId)
      );

      this.relatedRecipes.update((recipes) =>
        recipes.map((r) =>
          r.id === recipe.id
            ? {
                ...r,
                likes: response.likes,
                dislikes: response.dislikes,
                userLiked: response.user_liked,
                userDisliked: response.user_disliked,
              }
            : r
        )
      );
    } catch (error) {
      console.error('Failed to dislike recipe:', error);
    }
  }

  protected async handleRelatedFavorite(recipe: RecipeCardData): Promise<void> {
    try {
      const userId = this.recipeService.getUserId();
      const response = await firstValueFrom(
        this.recipeService.favoriteRecipe(recipe.id, userId)
      );

      this.relatedRecipes.update((recipes) =>
        recipes.map((r) =>
          r.id === recipe.id
            ? { ...r, userFavorited: response.user_favorited }
            : r
        )
      );
    } catch (error) {
      console.error('Failed to favorite recipe:', error);
    }
  }

  private normalizeImage(value: unknown): string | null {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
    }
    return null;
  }

  private coerceNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(0, Math.trunc(value));
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return Math.max(0, Math.trunc(parsed));
      }
    }

    return 0;
  }

  private extractDescription(recipe: any): string {
    let description = '';

    const directDescription =
      typeof recipe.description === 'string' ? recipe.description.trim() : '';
    if (directDescription) {
      description = directDescription;
    } else if (
      Array.isArray(recipe.instructions) &&
      recipe.instructions.length > 0
    ) {
      const first = recipe.instructions[0];
      if (typeof first === 'string') {
        description = first.trim();
      }
    } else if (
      Array.isArray(recipe.ingredients) &&
      recipe.ingredients.length > 0
    ) {
      const ingredients = recipe.ingredients
        .filter((i: any): i is string => typeof i === 'string')
        .map((i: string) => i.trim())
        .filter((i: string) => i.length > 0)
        .slice(0, 3);
      description = ingredients.join(', ');
    } else {
      description = 'No description available.';
    }

    return description.length > 100
      ? description.slice(0, 100) + '...'
      : description;
  }
}
