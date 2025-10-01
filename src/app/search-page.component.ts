import { Component } from '@angular/core';

import { RecipesListComponent } from './recipes-list.component';

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [RecipesListComponent],
  template: '<app-recipes-list></app-recipes-list>',
})
export class SearchPageComponent {}
