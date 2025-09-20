import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';

interface RecipePayload {
  title?: unknown;
  image?: unknown;
  image_url?: unknown;
  images?: unknown;
  [key: string]: unknown;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './app.html'
})
export class App {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly form = this.fb.nonNullable.group({
    url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/i)]]
  });

  private readonly recipeState = signal<RecipePayload | null>(null);
  private readonly sourceUrl = signal<string | null>(null);

  protected readonly recipe = this.recipeState.asReadonly();
  protected readonly recipeSource = this.sourceUrl.asReadonly();

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly recipeTitle = computed(() => {
    const title = this.recipe()?.title;
    return typeof title === 'string' && title.trim().length
      ? title.trim()
      : 'Untitled Recipe';
  });

  protected readonly imageUrl = computed(() => {
    const recipe = this.recipe();
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
      let message = 'Failed to parse recipe.';

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
      urlControl.enable({ emitEvent: false });
      this.isLoading.set(false);
    }
  }

  private resolveList(keys: string[]): string[] {
    const recipe = this.recipe();
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

  private populateFromQuery(): void {
    if (!isPlatformBrowser(this.platformId)) {
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
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.set('url', url);
    const updated = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', updated);
  }
}
