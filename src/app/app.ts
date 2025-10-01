import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AppNavigationComponent } from './app-navigation.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AppNavigationComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {}
