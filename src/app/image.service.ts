import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { first, Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ImageService {
  constructor(private http: HttpClient) {
  }

  public getImages(): Observable<any> {
    const baseURL = environment.instagramApiUrl;
    const accessToken = environment.instagramApiToken;
    const params = new HttpParams()
      .set('fields', 'media_url')
      .set('access_token', accessToken);
    const url = `${baseURL}?${params.toString()}`;
    return this.http.get<any>(url).pipe(first());
  }
}
