import { Routes } from '@angular/router';

import { RawRecipeConverterComponent } from './raw-recipe-converter.component';
import { SearchPageComponent } from './search-page.component';
import { UrlRecipePageComponent } from './url-recipe-page.component';

export const routes: Routes = [
  { path: '', component: UrlRecipePageComponent },
  { path: 'convert-text', component: RawRecipeConverterComponent },
  { path: 'search', component: SearchPageComponent },
  { path: '**', redirectTo: '' }
];
