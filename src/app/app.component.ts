import { Component, OnInit } from '@angular/core';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: 'AIzaSyBEGaZHpQBolBfIov_JHC1I0DuPWgFIfOI',
  authDomain: 'koyohair-7040f.firebaseapp.com',
  projectId: 'koyohair-7040f',
  storageBucket: 'koyohair-7040f.appspot.com',
  messagingSenderId: '978092193256',
  appId: '1:978092193256:web:abd50474493279dc0c205d',
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  public ngOnInit(): void {
    const app = initializeApp(firebaseConfig);
  }
}
