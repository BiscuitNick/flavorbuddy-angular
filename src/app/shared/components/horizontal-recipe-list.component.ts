import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
} from '@angular/core';
import { RecipeCardComponent, RecipeCardData } from './recipe-card.component';

@Component({
  selector: 'app-horizontal-recipe-list',
  standalone: true,
  imports: [CommonModule, RecipeCardComponent],
  template: `
    <div class="horizontal-recipe-list">
      @if (title) {
        <div class="list-header">
          <h2 class="list-title">{{ title }}</h2>
          @if (subtitle) {
            <p class="list-subtitle">{{ subtitle }}</p>
          }
        </div>
      }

      <div
        #scrollContainer
        class="list-scroll-container"
        (mouseenter)="handlePointerEnter()"
        (mouseleave)="handlePointerLeave()"
        (touchstart)="handleTouchStart()"
        (touchend)="resumeAutoScroll()"
        (scroll)="onUserScroll()"
      >
        @if (recipes.length === 0) {
          <div class="empty-state">
            <span class="empty-icon">🍽️</span>
            <p class="empty-message">{{ emptyMessage || 'No recipes to display' }}</p>
          </div>
        } @else {
          <div #scrollContent class="list-content">
            @for (recipe of carouselRecipes; track $index) {
              <app-recipe-card
                [recipe]="recipe"
                (like)="onLike($event)"
                (dislike)="onDislike($event)"
                (favorite)="onFavorite($event)"
              />
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .horizontal-recipe-list {
      width: 100%;
      margin-bottom: 32px;
    }

    .list-header {
      margin-bottom: 8px;
      padding: 0;
    }

    .list-title {
      margin: 0 0 2px 0;
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
      text-align: left;
    }

    .list-subtitle {
      margin: 0;
      font-size: 14px;
      color: #666;
      text-align: left;
    }

    .list-scroll-container {
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      scrollbar-color: transparent transparent;
      scroll-behavior: auto;
      position: relative;
    }

    .list-scroll-container::-webkit-scrollbar {
      height: 0;
      width: 0;
    }

    .list-scroll-container::-webkit-scrollbar-track {
      background: transparent;
    }

    .list-scroll-container::-webkit-scrollbar-thumb {
      background: transparent;
    }

    .list-scroll-container::-webkit-scrollbar-thumb:hover {
      background: transparent;
    }

    .list-content {
      display: flex;
      gap: 16px;
      padding: 16px;
      min-width: min-content;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 16px;
      text-align: center;
      width: 100%;
      min-height: 300px;
    }

    .empty-icon {
      font-size: 64px;
      opacity: 0.3;
      margin-bottom: 16px;
    }

    .empty-message {
      font-size: 16px;
      color: #666;
      margin: 0;
    }
  `],
})
export class HorizontalRecipeListComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() recipes: RecipeCardData[] = [];
  @Input() emptyMessage?: string;
  @Output() like = new EventEmitter<RecipeCardData>();
  @Output() dislike = new EventEmitter<RecipeCardData>();
  @Output() favorite = new EventEmitter<RecipeCardData>();

  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  protected carouselRecipes: RecipeCardData[] = [];

  private readonly scrollSpeed = 0.6; // pixels per frame
  private readonly resumeDelay = 2500;
  private animationFrameId: number | null = null;
  private resumeTimeoutId: number | null = null;
  private programmaticScrollResetId: number | null = null;
  private loopWidth = 0;
  private isPaused = false;
  private viewInitialized = false;
  private isProgrammaticScroll = false;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.updateCarousel();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('recipes' in changes && this.viewInitialized) {
      this.updateCarousel();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoScroll();
  }

  onLike(recipe: RecipeCardData): void {
    this.like.emit(recipe);
  }

  onDislike(recipe: RecipeCardData): void {
    this.dislike.emit(recipe);
  }

  onFavorite(recipe: RecipeCardData): void {
    this.favorite.emit(recipe);
  }

  handlePointerEnter(): void {
    this.pauseAutoScroll();
  }

  handlePointerLeave(): void {
    this.resumeAutoScroll();
  }

  handleTouchStart(): void {
    this.pauseAutoScroll(true);
  }

  onUserScroll(): void {
    if (this.isProgrammaticScroll) {
      return;
    }
    this.pauseAutoScroll(true);
  }

  resumeAutoScroll(): void {
    this.isPaused = false;
    this.clearResumeTimeout();
    this.startAutoScroll();
  }

  private pauseAutoScroll(shouldResumeLater = false): void {
    this.isPaused = true;
    if (shouldResumeLater) {
      this.scheduleResume();
    } else {
      this.clearResumeTimeout();
    }
  }

  private scheduleResume(): void {
    this.clearResumeTimeout();
    this.resumeTimeoutId = window.setTimeout(() => {
      this.isPaused = false;
      this.startAutoScroll();
    }, this.resumeDelay);
  }

  private clearResumeTimeout(): void {
    if (this.resumeTimeoutId !== null) {
      clearTimeout(this.resumeTimeoutId);
      this.resumeTimeoutId = null;
    }
  }

  private updateCarousel(): void {
    this.stopAutoScroll();

    if (!this.recipes.length) {
      this.carouselRecipes = [];
      this.loopWidth = 0;
      return;
    }

    this.carouselRecipes = [...this.recipes, ...this.recipes];
    this.cdr.detectChanges();

    requestAnimationFrame(() => {
      if (!this.scrollContainer) {
        return;
      }

      const container = this.scrollContainer.nativeElement;
      container.scrollLeft = 0;

      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;

      if (scrollWidth <= clientWidth) {
        this.loopWidth = 0;
        return;
      }

      this.loopWidth = scrollWidth / 2;
      this.isPaused = false;
      this.startAutoScroll();
    });
  }

  private startAutoScroll(): void {
    if (!this.scrollContainer || this.loopWidth <= 0) {
      return;
    }

    if (this.animationFrameId !== null) {
      return;
    }

    const animate = () => {
      if (!this.scrollContainer) {
        this.animationFrameId = null;
        return;
      }

      const container = this.scrollContainer.nativeElement;

      if (!this.isPaused) {
        this.isProgrammaticScroll = true;
        container.scrollLeft += this.scrollSpeed;

        if (container.scrollLeft >= this.loopWidth) {
          container.scrollLeft -= this.loopWidth;
        }

        if (this.programmaticScrollResetId !== null) {
          cancelAnimationFrame(this.programmaticScrollResetId);
        }

        this.programmaticScrollResetId = requestAnimationFrame(() => {
          this.isProgrammaticScroll = false;
          this.programmaticScrollResetId = null;
        });
      }

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private stopAutoScroll(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.programmaticScrollResetId !== null) {
      cancelAnimationFrame(this.programmaticScrollResetId);
      this.programmaticScrollResetId = null;
    }

    this.isProgrammaticScroll = false;
    this.clearResumeTimeout();
  }
}
