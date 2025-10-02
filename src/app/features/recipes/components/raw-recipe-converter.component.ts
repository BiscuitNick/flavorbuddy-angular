import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { RecipePayload } from '../models/recipe.types';
import { RecipeViewerComponent } from './recipe-viewer.component';
import { RecipeViewerSkeletonComponent } from './recipe-viewer-skeleton.component';

interface ConversionPayload {
  source_url: string | null;
  raw_text: string;
}

@Component({
  selector: 'app-raw-recipe-converter',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RecipeViewerComponent, RecipeViewerSkeletonComponent, RouterLink],
  templateUrl: './raw-recipe-converter.component.html',
  styleUrls: ['./raw-recipe-converter.component.css']
})
export class RawRecipeConverterComponent {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    sourceUrl: [''],
    rawText: ['', [Validators.required]]
  });

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  private readonly resultState = signal<RecipePayload | null>(null);
  private readonly submittedSource = signal<string | null>(null);

  protected readonly result = this.resultState.asReadonly();
  protected readonly displayedSource = this.submittedSource.asReadonly();

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { sourceUrl, rawText } = this.form.getRawValue();
    const trimmedText = rawText.trim();

    if (!trimmedText) {
      this.form.controls.rawText.setErrors({ required: true });
      this.form.controls.rawText.markAsTouched();
      return;
    }

    const trimmedSource = sourceUrl.trim();
    const payload: ConversionPayload = {
      source_url: trimmedSource.length ? trimmedSource : null,
      raw_text: trimmedText
    };

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.resultState.set(null);
    this.submittedSource.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<RecipePayload>(environment.convertRawRecipePath, payload)
      );
      this.resultState.set(response);

      const responseSource = this.extractSourceUrl(response);
      this.submittedSource.set(responseSource ?? payload.source_url);
    } catch (error) {
      const reason = this.extractErrorMessage(error);
      this.errorMessage.set(this.composeFriendlyError(reason));
    } finally {
      this.isLoading.set(false);
    }
  }

  protected clearResult(): void {
    this.resultState.set(null);
    this.errorMessage.set(null);
    this.submittedSource.set(null);
  }

  private extractSourceUrl(payload: RecipePayload | null): string | null {
    if (!payload) {
      return null;
    }

    const possible = payload['source_url'];
    if (typeof possible === 'string' && possible.trim()) {
      return possible.trim();
    }

    return null;
  }

  private extractErrorMessage(error: unknown): string | null {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string' && error.error.trim()) {
        return error.error.trim();
      }

      if (
        error.error &&
        typeof error.error === 'object' &&
        'error' in error.error &&
        typeof (error.error as { error?: unknown }).error === 'string'
      ) {
        const backend = ((error.error as { error?: unknown }).error as string).trim();
        if (backend) {
          return backend;
        }
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
    const guidance = 'Please tweak the text and try again.';
    const base = "We couldn't convert that recipe just yet.";

    if (!reason || reason.toLowerCase() === 'failed to convert recipe text.') {
      return `${base} ${guidance}`;
    }

    return `${base} Details: ${reason}`;
  }
}
