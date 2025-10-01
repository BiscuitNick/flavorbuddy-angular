import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-recipe-viewer-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recipe-viewer-skeleton.component.html',
  styleUrls: ['./recipe-viewer-skeleton.component.css'],
  host: {
    class: 'print-hidden',
    'aria-live': 'polite',
    role: 'status',
    'aria-label': 'Loading recipe',
    'aria-busy': 'true'
  }
})
export class RecipeViewerSkeletonComponent {}
