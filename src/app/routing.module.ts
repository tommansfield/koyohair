import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { GalleryComponent } from './gallery/gallery.component';
import { StylistsComponent } from './stylists/stylists.component';
import { PricesComponent } from './prices/prices.component';
import { ColourComponent } from './colour/colour.component';
import { InfoComponent } from './info/info.component';

const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'gallery', component: GalleryComponent },
  { path: 'stylists', component: StylistsComponent },
  { path: 'prices', component: PricesComponent },
  { path: 'colour', component: ColourComponent },
  { path: 'info', component: InfoComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
];

@NgModule({
  declarations: [],
  imports: [CommonModule, RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class RoutingModule {}
