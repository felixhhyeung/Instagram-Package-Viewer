import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  constructor(
    private storage: Storage,
  ) { }

  getStorage = function(key: string) {
    return new Promise<string>((resolve, reject) => {
      this.storage.get(key)
        .then(val => {
          if(val && val != 'undefined') {
            // console.log(`val: ${val}`);
            resolve(val);
          } 
          else {
            reject();
          }
        });
    });
  }

  setStorage(key: string, value: string) {
    this.storage.set(key, value);
  }
}
