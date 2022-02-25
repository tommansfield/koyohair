import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RoutingModule } from './routing.module';
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app.component';
import { NavComponent } from './nav/nav.component';
import { HomeComponent } from './home/home.component';
import { GalleryComponent } from './gallery/gallery.component';
import { StylistsComponent } from './stylists/stylists.component';
import { PricesComponent } from './prices/prices.component';
import { ColourComponent } from './colour/colour.component';
import { InfoComponent } from './info/info.component';
import { LazyLoadImageModule } from 'ng-lazyload-image';

@NgModule({
  declarations: [
    AppComponent,
    NavComponent,
    HomeComponent,
    GalleryComponent,
    StylistsComponent,
    PricesComponent,
    ColourComponent,
    InfoComponent,
  ],
  imports: [
    BrowserModule,
    RoutingModule,
    HttpClientModule,
    LazyLoadImageModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
