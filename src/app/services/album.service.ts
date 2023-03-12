import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { FTP } from '@awesome-cordova-plugins/ftp/ngx';

const ftpServerUsername = environment.ftpServer.username;
const ftpServerPassword = environment.ftpServer.password;

@Injectable({
  providedIn: 'root'
})
export class AlbumService {

  constructor(
    private fTP: FTP,
  ) { }

  connect = function(): Promise<void> {
  	return new Promise<void>((resolve, reject) => {
	  	this.fTP
        .connect('moon', ftpServerUsername, ftpServerPassword)
        .then(resolve);
  	});
  }

  ls = function(): Promise<String[]> {
  	return new Promise<String[]>((resolve, reject) => {
	  	this.fTP.ls('/', (fileList) => {
        console.info("fTP: ls fileList=" + fileList);
        resolve(fileList);
      }, (error) => {
        console.error("fTP: ls error=" + error);
        // reject(error);
      });
  	});
  }

  disconnect = function(): Promise<void> {
  	return new Promise<void>((resolve, reject) => {
	  	this.fTP
        .disconnect()
        .then(resolve);
  	});
  }

}
