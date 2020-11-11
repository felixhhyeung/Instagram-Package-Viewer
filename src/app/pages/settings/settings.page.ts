import { Component, OnInit } from '@angular/core';
import { StorageService } from '../../services/storage.service'

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {
  loginUsername: string;
  constructor(
    private storageService: StorageService,
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.storageService.getStorage('loginUsername').then(value => {
      this.loginUsername = value;
    });
  }

  saveLoginUsername() {
    console.log(`saveLoginUsername()`);
    this.storageService.setStorage('loginUsername', this.loginUsername);
  }
}
