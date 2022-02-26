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

  public ngOnInit(): void {
    this.isMenuOpen = false;
    this.facebookUrl = environment.facebookUrl;
    this.instagramUrl = environment.instagramUrl;
  }

  public openMenu() {
    if (!this.isMenuOpen) {
      this.isMenuOpen = true;
    }
  }

  public closeMenu() {
    this.isMenuOpen = false;
  }
}
