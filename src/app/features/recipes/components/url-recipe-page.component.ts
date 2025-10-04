import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Component, PLATFORM_ID, computed, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { RecipePayload } from '../models/recipe.types';
import { RecipeService } from '../../../core/services/recipe.service';
import { RecipeViewerComponent } from './recipe-viewer.component';
import { RecipeViewerSkeletonComponent } from './recipe-viewer-skeleton.component';
import { HorizontalRecipeListComponent } from '../../../shared/components/horizontal-recipe-list.component';
import { RecipeCardData } from '../../../shared/components/recipe-card.component';

@Component({
  selector: 'app-url-recipe-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RecipeViewerComponent,
    RecipeViewerSkeletonComponent,
    HorizontalRecipeListComponent,
    RouterLink,
  ],
  templateUrl: './url-recipe-page.component.html',
})
export class UrlRecipePageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly recipeService = inject(RecipeService);

  protected readonly form = this.fb.nonNullable.group({
    url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/i)]],
  });

  private readonly recipeState = signal<RecipePayload | null>(null);
  private readonly sourceUrl = signal<string | null>(null);

  protected readonly recipe = this.recipeState.asReadonly();
  protected readonly recipeSource = this.sourceUrl.asReadonly();

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly hasRecipe = computed(() => this.recipe() !== null);

  protected readonly recentRecipes = signal<RecipeCardData[]>([]);
  protected readonly isLoadingRecent = signal(false);
  protected readonly relatedRecipes = signal<RecipeCardData[]>([]);
  protected readonly isLoadingRelated = signal(false);
  protected readonly relatedSectionTitle = signal('Related Recipes');
  protected readonly relatedSubtitle = computed(() =>
    this.relatedSectionTitle() === 'Recent Recipes'
      ? 'Check out recently added recipes'
      : 'Recipes you might also enjoy'
  );

  constructor() {
    this.populateFromQuery();
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      void this.loadRecentRecipes();
    }
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const url = this.form.controls.url.value.trim();
    if (!url) {
      return;
    }

    this.form.controls.url.setValue(url, { emitEvent: false });

    const currentPath = this.isBrowser ? window.location.pathname : '/';
    if (currentPath === '/') {
      await this.router.navigate(['/recipe'], { queryParams: { url } });
    } else {
      await this.fetchRecipe(url);
      await this.router.navigate(['/recipe'], { queryParams: { url }, replaceUrl: true });
    }
  }

  private async fetchRecipe(url: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.recipeState.set(null);
    this.sourceUrl.set(null);
    this.relatedRecipes.set([]);
    this.relatedSectionTitle.set('Related Recipes');

    const urlControl = this.form.controls.url;
    urlControl.disable({ emitEvent: false });

    try {
      const params = new HttpParams().set('url', url);
      const payload = await firstValueFrom(
        this.http.get<RecipePayload>(environment.apiPath, { params })
      );
      this.recipeState.set(payload);
      this.sourceUrl.set(url);
    } catch (error) {
      const reason = this.extractErrorMessage(error);
      this.errorMessage.set(this.composeFriendlyError(reason));
    } finally {
      urlControl.enable({ emitEvent: false });
      this.isLoading.set(false);
    }
  }

  private async fetchRecipeById(id: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.recipeState.set(null);
    this.sourceUrl.set(null);
    this.relatedRecipes.set([]);
    this.relatedSectionTitle.set('Related Recipes');

    const urlControl = this.form.controls.url;
    urlControl.disable({ emitEvent: false });

    let resolvedSourceUrl: string | null = null;

    try {
      const recipeId = parseInt(id, 10);
      if (isNaN(recipeId)) {
        throw new Error('Invalid recipe ID');
      }

      const userId = this.recipeService.getUserId();
      const payload = await firstValueFrom(this.recipeService.getRecipeById(recipeId, userId));
      this.recipeState.set(payload);
      if (typeof payload.source_url === 'string' && payload.source_url.trim()) {
        resolvedSourceUrl = payload.source_url.trim();
      }

      await this.loadRelatedRecipes(recipeId);
    } catch (error) {
      const reason = this.extractErrorMessage(error);
      this.errorMessage.set(this.composeFriendlyError(reason));
      this.relatedRecipes.set([]);
      this.relatedSectionTitle.set('Related Recipes');
    } finally {
      urlControl.enable({ emitEvent: false });
      urlControl.setValue(resolvedSourceUrl ?? '', { emitEvent: false });
      this.sourceUrl.set(resolvedSourceUrl);
      this.isLoading.set(false);
    }
  }

  private populateFromQuery(): void {
    if (!this.isBrowser) {
      return;
    }

    const currentPath = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const recipeUrl = params.get('url');
    const recipeId = params.get('id');

    // Only fetch recipe if we're on /recipe route
    if (currentPath === '/recipe') {
      if (recipeId) {
        // Fetch by ID
        void this.fetchRecipeById(recipeId);
      } else if (recipeUrl) {
        // Fetch by URL
        this.form.setValue({ url: recipeUrl });
        void this.fetchRecipe(recipeUrl);
      }
    }
  }

  private extractErrorMessage(error: unknown): string | null {
    if (error instanceof HttpErrorResponse) {
      const backendError =
        typeof error.error === 'object' && error.error !== null && 'error' in error.error
          ? (error.error as { error?: unknown }).error
          : error.error;

      if (typeof backendError === 'string' && backendError.trim()) {
        return backendError.trim();
      }

      if (typeof error.message === 'string' && error.message.trim()) {
        return error.message.trim();
      }
    }

    if (error instanceof Error && typeof error.message === 'string' && error.message.trim()) {
      return error.message.trim();
    }

    if (typeof error === 'string' && error.trim()) {
      return error.trim();
    }

    return null;
  }

  private composeFriendlyError(reason: string | null): string {
    const guidance =
      'Please confirm the recipe link is correct and try again. Or try using the Convert Text tool.';
    const base = 'No recipe found.';

    if (reason?.toLowerCase().includes('website') || reason?.toLowerCase().includes('forbidden')) {
      return `We couldn't load that recipe. The website is not supported. Try pasting content into Convert Text.`;
    }

    if (!reason || reason?.toLowerCase() === 'failed to parse recipe.') {
      return `${base} ${guidance}`;
    }

    return `${base} ${guidance}`;
  }

  private async loadRecentRecipes(): Promise<void> {
    this.isLoadingRecent.set(true);
    try {
      const userId = this.recipeService.getUserId();
      const response = await firstValueFrom(this.recipeService.getRecentRecipes(10, userId));

      this.recentRecipes.set(response.results.map(recipe => this.mapToRecipeCard(recipe)));
    } catch (error) {
      console.error('Failed to load recent recipes:', error);
    } finally {
      this.isLoadingRecent.set(false);
    }
  }

  protected async handleLike(recipe: RecipeCardData): Promise<void> {
    try {
      const userId = this.recipeService.getUserId();
      const response = await firstValueFrom(
        this.recipeService.likeRecipe(recipe.id, userId)
      );

      const updateRecipeList = (recipes: RecipeCardData[]) =>
        recipes.map(r =>
          r.id === recipe.id
            ? {
                ...r,
                likes: response.likes,
                dislikes: response.dislikes,
                userLiked: response.user_liked,
                userDisliked: response.user_disliked
              }
            : r
        );

      this.recentRecipes.update(updateRecipeList);
      this.relatedRecipes.update(updateRecipeList);
    } catch (error) {
      console.error('Failed to like recipe:', error);
    }
  }

  protected async handleDislike(recipe: RecipeCardData): Promise<void> {
    try {
      const userId = this.recipeService.getUserId();
      const response = await firstValueFrom(
        this.recipeService.dislikeRecipe(recipe.id, userId)
      );

      const updateRecipeList = (recipes: RecipeCardData[]) =>
        recipes.map(r =>
          r.id === recipe.id
            ? {
                ...r,
                likes: response.likes,
                dislikes: response.dislikes,
                userLiked: response.user_liked,
                userDisliked: response.user_disliked
              }
            : r
        );

      this.recentRecipes.update(updateRecipeList);
      this.relatedRecipes.update(updateRecipeList);
    } catch (error) {
      console.error('Failed to dislike recipe:', error);
    }
  }

  protected async handleFavorite(recipe: RecipeCardData): Promise<void> {
    try {
      const userId = this.recipeService.getUserId();
      const response = await firstValueFrom(
        this.recipeService.favoriteRecipe(recipe.id, userId)
      );

      const updateRecipeList = (recipes: RecipeCardData[]) =>
        recipes.map(r =>
          r.id === recipe.id
            ? {
                ...r,
                userFavorited: response.user_favorited,
                userLiked: response.user_liked,
                userDisliked: response.user_disliked
              }
            : r
        );

      this.recentRecipes.update(updateRecipeList);
      this.relatedRecipes.update(updateRecipeList);
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

    const directDescription = typeof recipe.description === 'string' ? recipe.description.trim() : '';
    if (directDescription) {
      description = directDescription;
    } else if (Array.isArray(recipe.instructions) && recipe.instructions.length > 0) {
      const first = recipe.instructions[0];
      if (typeof first === 'string') {
        description = first.trim();
      }
    } else if (Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
      const ingredients = recipe.ingredients
        .filter((i: any): i is string => typeof i === 'string')
        .map((i: string) => i.trim())
        .filter((i: string) => i.length > 0)
        .slice(0, 3);
      description = ingredients.join(', ');
    } else {
      description = 'No description available.';
    }

    return description;
  }

  private mapToRecipeCard(recipe: any): RecipeCardData {
    return {
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
    };
  }

  private async loadRelatedRecipes(recipeId: number): Promise<void> {
    this.isLoadingRelated.set(true);
    this.relatedRecipes.set([]);
    this.relatedSectionTitle.set('Related Recipes');

    try {
      const userId = this.recipeService.getUserId();
      const response = await firstValueFrom(
        this.recipeService.getRelatedRecipes(recipeId, 10, userId)
      );

      let results = Array.isArray(response.results) ? response.results : [];
      let usedFallback = false;

      if (results.length === 0) {
        const recentResponse = await firstValueFrom(
          this.recipeService.getRecentRecipes(10, userId)
        );
        results = recentResponse.results.filter((recipe) => recipe.id !== recipeId);
        usedFallback = true;
      }

      const mapped = results
        .filter((recipe) => recipe.id !== recipeId)
        .map((recipe) => this.mapToRecipeCard(recipe));

      if (mapped.length > 0) {
        this.relatedSectionTitle.set(usedFallback ? 'Recent Recipes' : 'Related Recipes');
        this.relatedRecipes.set(mapped);
      } else {
        this.relatedRecipes.set([]);
        this.relatedSectionTitle.set('Related Recipes');
      }
    } catch (error) {
      console.error('Failed to load related recipes:', error);
      this.relatedRecipes.set([]);
      this.relatedSectionTitle.set('Related Recipes');
    } finally {
      this.isLoadingRelated.set(false);
    }
  }
}
