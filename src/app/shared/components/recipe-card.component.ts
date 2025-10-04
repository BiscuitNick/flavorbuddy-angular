import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface RecipeCardData {
  id: number;
  title: string;
  imageUrl: string | null;
  description: string;
  views: number;
  likes: number;
  dislikes: number;
  userLiked: boolean;
  userDisliked: boolean;
  userFavorited: boolean;
}

@Component({
  selector: 'app-recipe-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="recipe-card">
      <a [href]="recipeLink" class="card-link">
        <div class="card-image-container">
          @if (recipe.imageUrl) {
            <img [src]="recipe.imageUrl" [alt]="recipe.title" class="card-image" />
          } @else {
            <div class="card-image-placeholder">
              <span class="placeholder-text">{{ recipe.title.slice(0, 1) || '?' }}</span>
            </div>
          }
        </div>

        <div class="card-content">
          <h3 class="card-title">{{ recipe.title }}</h3>
          <p class="card-description">{{ recipe.description }}</p>
        </div>
      </a>
    </div>
  `,
  styles: [`
    .recipe-card {
      flex: 0 0 280px;
      width: 280px;
      height: 380px;
      background: white;
      border-radius: 12px;
      border: 2px solid #fed7aa;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .recipe-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(251, 146, 60, 0.2);
      border-color: #fdba74;
    }

    .card-link {
      display: flex;
      flex-direction: column;
      height: 100%;
      text-decoration: none;
      color: inherit;
    }

    .card-image-container {
      width: 100%;
      height: 200px;
      overflow: hidden;
      background: #fff7ed;
      border-bottom: 2px solid #fed7aa;
    }

    .card-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .card-image-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff7ed;
    }

    .placeholder-text {
      font-size: 48px;
      font-weight: 700;
      text-transform: uppercase;
      color: #fb923c;
      opacity: 0.5;
    }

    .card-content {
      flex: 1;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-height: 0;
    }

    .card-title {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      line-height: 1.3;
      color: #292524;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-description {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
      color: #57534e;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

  `]
})
export class RecipeCardComponent {
  @Input({ required: true }) recipe!: RecipeCardData;
  @Output() like = new EventEmitter<RecipeCardData>();
  @Output() dislike = new EventEmitter<RecipeCardData>();
  @Output() favorite = new EventEmitter<RecipeCardData>();

  get recipeLink(): string {
    return `/recipe?id=${this.recipe.id}`;
  }

  handleLike(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.like.emit(this.recipe);
  }

  handleDislike(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.dislike.emit(this.recipe);
  }

  handleFavorite(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.favorite.emit(this.recipe);
  }
}
