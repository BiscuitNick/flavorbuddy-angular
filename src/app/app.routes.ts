import { Routes } from '@angular/router';

import { RawRecipeConverterComponent } from './raw-recipe-converter.component';
import { UrlRecipePageComponent } from './url-recipe-page.component';

export const routes: Routes = [
  { path: '', component: UrlRecipePageComponent },
  { path: 'convert-text', component: RawRecipeConverterComponent },
  { path: '**', redirectTo: '' }
];
