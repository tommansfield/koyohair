import { Component } from '@angular/core';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.css'],
})
export class InfoComponent {
  public lat: number = 50.2627395;
  public lng: number = -5.0496735;
  public zoom: number = 16;
  public label: string = 'Koyo';
}
