import { Component, OnInit } from '@angular/core';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-prices',
  templateUrl: './prices.component.html',
  styleUrls: ['./prices.component.css'],
})
export class PricesComponent implements OnInit {
  public booksyUrl: string;

  public ngOnInit(): void {
    this.booksyUrl = environment.booksyUrl;
  }
}
