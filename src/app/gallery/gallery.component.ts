import { Component, OnInit } from '@angular/core';
import { ImageService } from '../image.service';

@Component({
  selector: 'app-gallery',
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.css'],
})
export class GalleryComponent implements OnInit {
  images: string[];

  constructor(private imageService: ImageService) {}

  ngOnInit(): void {
    this.getImages();
  }

  private getImages(): void {
    this.imageService.getImages().subscribe((res: any) => {
      this.images = res.data.map((image: any) => image.media_url);
    });
  }

  public fadeInImage(element: HTMLElement): void {
    setTimeout(() => element.removeAttribute('loading'), 200);
  }
}
