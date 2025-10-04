import { Component } from '@angular/core';

import { RecipesListComponent } from '../../recipes/components/recipes-list.component';

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [RecipesListComponent],
  template: `
    <div class="min-h-screen flex flex-col gap-8">
      <app-recipes-list class="flex-1"></app-recipes-list>
    </div>
  `,
})
export class SearchPageComponent {}
