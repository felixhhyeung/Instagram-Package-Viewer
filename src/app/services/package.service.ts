import { Injectable } from '@angular/core';
import { File } from '@ionic-native/file/ngx';
import { Plugins, FilesystemDirectory, FilesystemEncoding, Capacitor } from '@capacitor/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

const { Filesystem } = Plugins;

interface UserDescription {
	icon: any,
	username: any,
	biography: any,
}

@Injectable({
  providedIn: 'root'
})

export class PackageService {
  // usernames;

  constructor(
  	private file: File,
  	private domSanitizer: DomSanitizer,
  	public httpClient: HttpClient,
  ) {
  	// // this.file.checkDir(this.file.dataDirectory, '').then(_ => console.log('Directory exists')).catch(error => console.log(`Directory does not exist, error: ${error}`));
  	// this.file.listDir(this.file.applicationDirectory, 'public/assets/packages').then(lsUsernames => {
  	// 	// console.log(`result: ${JSON.stringify(result)}`);
  	// 	lsUsernames.forEach(x => {
  	// 		x['name']
  	// 	});
  	// });
  }

  // icon, username, biography
  getUserDescriptions = function() {
  	return new Promise<UserDescription[]>((resolve, reject) => {
	  	this.file.listDir(this.file.applicationDirectory, 'public/assets/packages').then(async lsUsernames => {
				let userDescriptions: UserDescription[] = [];
				await lsUsernames.forEach(async lsUsername => {
					const username = lsUsername['name'];
					userDescriptions.push({
						icon: await this.getIcon(username),
						username: username,
						biography: await this.getBiography(username),
					});
				});
				resolve(userDescriptions);
			});
  	});
  }
  async getIcon(username: string): Promise<SafeUrl> {
  	const entries = await this.file.listDir(this.file.applicationDirectory, `public/assets/packages/${username}`);
		const nativeURL = entries.filter(x => x['name'].includes('_profile_pic.jpg'))[0]['nativeURL'];
		return this.domSanitizer.bypassSecurityTrustUrl(Capacitor.convertFileSrc(nativeURL));
  }
  async getBiography(username: string): Promise<string> {
  	const entries = await this.file.listDir(this.file.applicationDirectory, `public/assets/packages/${username}`);
		const nativeURL = entries.filter(x => x['name'].includes(`${username}_`))[0]['nativeURL'];
		console.log(`nativeURL: ${nativeURL}`);
		const servingURL = Capacitor.convertFileSrc(nativeURL);
		let contents = await Filesystem.readFile({
	    path: nativeURL,
	    directory: FilesystemDirectory.Documents,
	    encoding: FilesystemEncoding.UTF8
	  });
	  let json = JSON.parse(contents['data']);
		return json['node']['biography'];
  }
}
