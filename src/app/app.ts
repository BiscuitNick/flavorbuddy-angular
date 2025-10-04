import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AppNavigationComponent } from './shared/components/app-navigation.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AppNavigationComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  readonly currentYear = new Date().getFullYear();
}
