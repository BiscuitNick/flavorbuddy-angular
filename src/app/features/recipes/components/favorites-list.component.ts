import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Component, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, firstValueFrom, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { RecipesListSkeletonComponent } from './recipes-list-skeleton.component';
import { RecipeService } from '../../../core/services/recipe.service';
import { ArrowUpIconComponent } from '../../../shared/components/arrow-up-icon.component';
import { ArrowDownIconComponent } from '../../../shared/components/arrow-down-icon.component';

interface RecipeSummary {
  id: number;
  title: string;
  author: string;
  source_url: string | null;
  description: unknown;
  image: unknown;
  ingredients: unknown;
  instructions: unknown;
  total_time: unknown;
  yields: unknown;
  created_at: string;
  updated_at: string;
  views: unknown;
  likes: unknown;
  dislikes: unknown;
  user_liked: unknown;
  user_disliked: unknown;
  user_favorited: unknown;
  type: string;
}

interface PaginationPayload {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

interface RecipesResponse {
  query: string;
  results: RecipeSummary[];
  pagination: PaginationPayload;
}

interface RecipeCard {
  id: number;
  title: string;
  sourceUrl: string;
  imageUrl: string | null;
  description: string;
  views: number;
  likes: number;
  dislikes: number;
  userLiked: boolean;
  userDisliked: boolean;
  userFavorited: boolean;
  type: string;
  hasSourceUrl: boolean;
}

@Component({
  selector: 'app-favorites-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RecipesListSkeletonComponent, ArrowUpIconComponent, ArrowDownIconComponent],
  templateUrl: './favorites-list.component.html',
  styleUrls: ['./recipes-list.component.css'],
})
export class FavoritesListComponent {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly recipeService = inject(RecipeService);

  private readonly pageSize = 10;
  private readonly page = signal(1);

  protected readonly searchControl = this.fb.nonNullable.control('');

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly cards = signal<RecipeCard[]>([]);
  private readonly meta = signal<PaginationPayload | null>(null);
  protected readonly processingRecipeId = signal<number | null>(null);
  protected readonly favoritingRecipeId = signal<number | null>(null);

  protected readonly pagination = computed(
    () =>
      this.meta() ?? {
        page: this.page(),
        page_size: this.pageSize,
        total_items: 0,
        total_pages: 0,
        has_next: false,
        has_previous: false,
      }
  );

  protected readonly hasResults = computed(() => this.cards().length > 0);
  protected readonly totalPages = computed(() => {
    const pagination = this.pagination();
    return pagination.total_pages > 0 ? pagination.total_pages : 1;
  });

  constructor() {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(1000),
        map((value) => value.trim()),
        distinctUntilChanged(),
        takeUntilDestroyed()
      )
      .subscribe((term) => {
        if (term !== this.searchControl.value) {
          this.searchControl.setValue(term, { emitEvent: false });
        }
        this.updateQueryParam(term);
        this.loadRecipesForPage(1);
      });

    if (this.isBrowser) {
      this.populateFromQuery();
      this.loadRecipesForPage(1);
    }
  }

  protected goToPrevious(): void {
    const pagination = this.pagination();
    if (this.isLoading() || !pagination.has_previous) {
      return;
    }

    this.loadRecipesForPage(Math.max(1, pagination.page - 1));
  }

  protected goToNext(): void {
    const pagination = this.pagination();
    if (this.isLoading() || !pagination.has_next) {
      return;
    }

    this.loadRecipesForPage(pagination.page + 1);
  }

  protected recipeLink(recipe: RecipeCard): string {
    return `/recipe?url=${recipe.sourceUrl.replace(/%2F/g, '/')}`;
  }

  protected formatTypeLabel(type: string): string {
    if (!type) {
      return 'Unknown';
    }

    const normalized = type.toLowerCase();
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
  }

  protected async handleLike(recipe: RecipeCard, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (this.processingRecipeId() !== null) {
      return;
    }

    this.processingRecipeId.set(recipe.id);

    try {
      const userId = this.recipeService.getUserId();
      const response = await firstValueFrom(
        this.recipeService.likeRecipe(recipe.id, userId)
      );

      this.cards.update((cards) =>
        cards.map((card) =>
          card.id === recipe.id
            ? {
                ...card,
                likes: response.likes,
                dislikes: response.dislikes,
                userLiked: response.user_liked,
                userDisliked: response.user_disliked,
              }
            : card
        )
      );
    } catch (error) {
      console.error('Failed to like recipe:', error);
    } finally {
      this.processingRecipeId.set(null);
    }
  }

  protected async handleDislike(recipe: RecipeCard, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (this.processingRecipeId() !== null) {
      return;
    }

    this.processingRecipeId.set(recipe.id);

    try {
      const userId = this.recipeService.getUserId();
      const response = await firstValueFrom(
        this.recipeService.dislikeRecipe(recipe.id, userId)
      );

      this.cards.update((cards) =>
        cards.map((card) =>
          card.id === recipe.id
            ? {
                ...card,
                likes: response.likes,
                dislikes: response.dislikes,
                userLiked: response.user_liked,
                userDisliked: response.user_disliked,
              }
            : card
        )
      );
    } catch (error) {
      console.error('Failed to dislike recipe:', error);
    } finally {
      this.processingRecipeId.set(null);
    }
  }

  protected async handleFavorite(recipe: RecipeCard, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (this.favoritingRecipeId() !== null) {
      return;
    }

    this.favoritingRecipeId.set(recipe.id);

    try {
      const userId = this.recipeService.getUserId();
      const response = await firstValueFrom(
        this.recipeService.favoriteRecipe(recipe.id, userId)
      );

      // If unfavorited, remove from list
      if (!response.user_favorited) {
        this.cards.update((cards) => cards.filter((card) => card.id !== recipe.id));
        // Adjust pagination count
        this.meta.update((meta) => {
          if (!meta) return meta;
          return {
            ...meta,
            total_items: Math.max(0, meta.total_items - 1),
          };
        });
      } else {
        // Update the card in the list
        this.cards.update((cards) =>
          cards.map((card) =>
            card.id === recipe.id
              ? {
                  ...card,
                  userFavorited: response.user_favorited,
                  userLiked: response.user_liked,
                  userDisliked: response.user_disliked,
                }
              : card
          )
        );
      }
    } catch (error) {
      console.error('Failed to favorite recipe:', error);
    } finally {
      this.favoritingRecipeId.set(null);
    }
  }

  private loadRecipesForPage(page: number): void {
    this.page.set(page);
    void this.loadRecipes();
  }

  private async loadRecipes(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const query = this.currentQuery();
    const userId = this.recipeService.getUserId();

    let params = new HttpParams()
      .set('page', this.page().toString())
      .set('page_size', this.pageSize.toString())
      .set('user_id', userId);

    if (query) {
      params = params.set('q', query);
    }

    try {
      const response = await firstValueFrom(
        this.http.get<RecipesResponse>(environment.favoritedRecipesPath, { params })
      );

      this.cards.set(response.results.map((recipe) => this.toCard(recipe)));

      if (response.pagination.total_items === 0 && response.pagination.page !== 1) {
        const normalized = {
          ...response.pagination,
          page: 1,
          has_previous: false,
          has_next: false,
        } satisfies PaginationPayload;
        this.meta.set(normalized);
        this.page.set(1);
      } else {
        this.meta.set(response.pagination);
        this.page.set(response.pagination.page);
      }
    } catch (error) {
      let message = 'Failed to load favorite recipes.';

      if (error instanceof HttpErrorResponse) {
        const backendError =
          typeof error.error === 'object' && error.error !== null && 'error' in error.error
            ? (error.error as { error?: unknown }).error
            : error.error;

        if (typeof backendError === 'string' && backendError.trim()) {
          message = backendError.trim();
        } else if (error.message) {
          message = error.message;
        }
      } else if (error instanceof Error && error.message) {
        message = error.message;
      }

      this.errorMessage.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  private currentQuery(): string {
    const raw = this.searchControl.value;
    return typeof raw === 'string' ? raw.trim() : '';
  }

  private populateFromQuery(): void {
    if (!this.isBrowser) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    if (query) {
      this.searchControl.setValue(query, { emitEvent: false });
    }
  }

  private updateQueryParam(query: string): void {
    if (!this.isBrowser) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (query) {
      params.set('q', query);
    } else {
      params.delete('q');
    }

    const search = params.toString();
    const updated = search ? `${window.location.pathname}?${search}` : window.location.pathname;
    window.history.replaceState({}, '', updated);
  }

  private toCard(recipe: RecipeSummary): RecipeCard {
    const rawSource = typeof recipe.source_url === 'string' ? recipe.source_url : '';
    const trimmedSource = rawSource.trim();

    return {
      id: recipe.id,
      title: recipe.title?.trim() || 'Untitled Recipe',
      sourceUrl: trimmedSource,
      imageUrl: this.normalizeImage(recipe.image),
      description: this.extractDescription(recipe),
      views: this.coerceViews(recipe.views),
      likes: this.coerceNumber(recipe.likes),
      dislikes: this.coerceNumber(recipe.dislikes),
      userLiked: recipe.user_liked === true,
      userDisliked: recipe.user_disliked === true,
      userFavorited: recipe.user_favorited === true,
      type: typeof recipe.type === 'string' ? recipe.type : '',
      hasSourceUrl: trimmedSource.length > 0,
    };
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

  private normalizeImage(value: unknown): string | null {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
    }
    return null;
  }

  private extractDescription(recipe: RecipeSummary): string {
    let description = '';

    const directDescription = this.coerceDescription(recipe.description);
    if (directDescription) {
      description = directDescription;
    } else {
      const instructions = this.coerceStringList(recipe.instructions);
      if (instructions.length) {
        description = instructions[0];
      } else {
        const ingredients = this.coerceStringList(recipe.ingredients);
        if (ingredients.length) {
          description = ingredients.slice(0, 3).join(', ');
        } else {
          const yields = typeof recipe.yields === 'string' ? recipe.yields.trim() : '';
          if (yields) {
            description = `Yields ${yields}`;
          } else {
            const totalMinutes = this.coerceMinutes(recipe.total_time);
            if (totalMinutes !== null) {
              description = `Ready in about ${totalMinutes} minute${totalMinutes === 1 ? '' : 's'}`;
            } else {
              if (recipe.author && recipe.author.trim()) {
                description = `By ${recipe.author.trim()}`;
              } else {
                if (recipe.type) {
                  const label = this.formatTypeLabel(recipe.type);
                  if (label !== 'Unknown') {
                    description = label;
                  } else {
                    description = 'No description available.';
                  }
                } else {
                  description = 'No description available.';
                }
              }
            }
          }
        }
      }
    }

    return description.length > 192 ? description.slice(0, 192) + ' ...' : description;
  }

  private coerceDescription(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private coerceStringList(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry): entry is string => entry.length > 0);
  }

  private coerceViews(value: unknown): number {
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

  private coerceMinutes(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      const clamped = Math.max(0, Math.trunc(value));
      return clamped > 0 ? clamped : null;
    }

    if (typeof value === 'string') {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) {
        const clamped = Math.max(0, Math.trunc(parsed));
        return clamped > 0 ? clamped : null;
      }
    }

    return null;
  }
}
