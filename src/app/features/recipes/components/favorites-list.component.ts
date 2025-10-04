import { Component } from '@angular/core';

import { RecipesListComponent } from './recipes-list.component';

@Component({
  selector: 'app-favorites-list',
  standalone: true,
  imports: [RecipesListComponent],
  template: `
    <div class="min-h-screen flex flex-col gap-8">
      <app-recipes-list class="flex-1" mode="favorites"></app-recipes-list>
    </div>
  `,
})
export class FavoritesListComponent {}
