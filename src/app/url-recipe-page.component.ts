import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../environments/environment';
import { RecipePayload } from './recipe.types';
import { RecipeViewerComponent } from './recipe-viewer.component';
import { RecipeViewerSkeletonComponent } from './recipe-viewer-skeleton.component';
import { RecipesListComponent } from './recipes-list.component';

@Component({
  selector: 'app-url-recipe-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RecipeViewerComponent,
    RecipeViewerSkeletonComponent,
    RecipesListComponent,
    RouterLink,
  ],
  templateUrl: './url-recipe-page.component.html',
})
export class UrlRecipePageComponent {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

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

  constructor() {
    this.populateFromQuery();
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
    this.updateQueryParam(url);
    await this.fetchRecipe(url);
  }

  private async fetchRecipe(url: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.recipeState.set(null);
    this.sourceUrl.set(null);

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

  private populateFromQuery(): void {
    if (!this.isBrowser) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const recipeUrl = params.get('url');
    if (recipeUrl) {
      this.form.setValue({ url: recipeUrl });
      void this.fetchRecipe(recipeUrl);
    }
  }

  private updateQueryParam(url: string): void {
    if (!this.isBrowser) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.set('url', url);
    const updated = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', updated);
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
    const guidance = 'Please confirm the recipe link is correct and try again.';
    const base = "We couldn't load that recipe.";

    if (reason?.toLowerCase().includes('website') || reason?.toLowerCase().includes('forbidden')) {
      return `We couldn't load that recipe. The website is not supported. Try pasting content into our raw text converter.`;
    }

    if (!reason || reason?.toLowerCase() === 'failed to parse recipe.') {
      return `${base} ${guidance}`;
    }

    return `${base} Details: ${reason}`;
  }
}
