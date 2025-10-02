import { Routes } from '@angular/router';

import { RawRecipeConverterComponent } from './features/recipes/components/raw-recipe-converter.component';
import { SearchPageComponent } from './features/search/components/search-page.component';
import { UrlRecipePageComponent } from './features/recipes/components/url-recipe-page.component';

export const routes: Routes = [
  { path: '', component: UrlRecipePageComponent },
  { path: 'convert-text', component: RawRecipeConverterComponent },
  { path: 'search', component: SearchPageComponent },
  { path: '**', redirectTo: '' }
];
