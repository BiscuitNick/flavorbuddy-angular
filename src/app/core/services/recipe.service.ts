import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RecipePayload } from '../../features/recipes/models/recipe.types';

interface LikeDislikeResponse {
  action: string;
  recipe_id: number;
  likes: number;
  dislikes: number;
  user_liked: boolean;
  user_disliked: boolean;
  user_favorited: boolean;
}

interface FavoriteResponse {
  action: string;
  recipe_id: number;
  user_favorited: boolean;
  user_liked: boolean;
  user_disliked: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private readonly http = inject(HttpClient);

  getRecipeById(recipeId: number, userId?: string): Observable<RecipePayload> {
    let params = new HttpParams().set('id', recipeId.toString());
    if (userId) {
      params = params.set('user_id', userId);
    }
    return this.http.get<RecipePayload>(environment.recipeByIdPath, { params });
  }

  likeRecipe(recipeId: number, userId: string): Observable<LikeDislikeResponse> {
    return this.http.post<LikeDislikeResponse>(environment.likeRecipePath, {
      recipe_id: recipeId,
      user_id: userId
    });
  }

  dislikeRecipe(recipeId: number, userId: string): Observable<LikeDislikeResponse> {
    return this.http.post<LikeDislikeResponse>(environment.dislikeRecipePath, {
      recipe_id: recipeId,
      user_id: userId
    });
  }

  favoriteRecipe(recipeId: number, userId: string): Observable<FavoriteResponse> {
    return this.http.post<FavoriteResponse>(environment.favoriteRecipePath, {
      recipe_id: recipeId,
      user_id: userId
    });
  }

  deleteRecipe(recipeId: number): Observable<{ message: string; recipe_id: number }> {
    const params = new HttpParams().set('id', recipeId.toString());
    return this.http.delete<{ message: string; recipe_id: number }>(environment.deleteRecipePath, { params });
  }

  getUserId(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    let userId = localStorage.getItem('flavorbuddy_user_id');
    if (!userId) {
      userId = this.generateUserId();
      localStorage.setItem('flavorbuddy_user_id', userId);
    }
    return userId;
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}
