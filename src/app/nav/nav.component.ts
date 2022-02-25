import { Component, OnInit } from '@angular/core';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.css'],
})
export class NavComponent implements OnInit {
  public isMenuOpen: boolean;
  public facebookUrl: string;
  public instagramUrl: string;

  constructor() {
    this.isMenuOpen = false;
    this.facebookUrl = environment.facebookUrl;
    this.instagramUrl = environment.instagramUrl;
  }

  ngOnInit(): void {}

  public openMenu() {
    if (!this.isMenuOpen) {
      this.isMenuOpen = true;
    }
  }

  public closeMenu() {
    this.isMenuOpen = false;
  }
}
