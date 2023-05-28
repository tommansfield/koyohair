import { Component, OnInit } from '@angular/core';
import { ImageService } from '../image.service';

@Component({
  selector: 'app-gallery',
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.css'],
})
export class GalleryComponent implements OnInit {
  images: string[];

  constructor(private imageService: ImageService) {
  }

  ngOnInit(): void {
    this.getImages();
  }

  public fadeInImage(element: HTMLElement): void {
    setTimeout(() => {
      element.removeAttribute('loading');
    }, 200);
  }

  public fadeInVideo(element: HTMLElement): void {
    setTimeout(() => {
      console.log('video fadein');
      element.removeAttribute('loading');
    }, 200);
  }

  public isVideo(image: string) {
    return image.startsWith('https://video');
  }

  private getImages(): void {
    this.imageService.getImages().subscribe((res: any) => {
      this.images = res.data.map((image: any) => image.media_url);
    });
  }
}
