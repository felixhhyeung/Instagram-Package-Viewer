import { Injectable } from '@angular/core';
import { File } from '@ionic-native/file/ngx';
import { Plugins, FilesystemDirectory, FilesystemEncoding, Capacitor } from '@capacitor/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

const { Filesystem } = Plugins;

export interface UserDescription {
	icon: SafeUrl,
	username: any,
	biography: any,
}

export interface Post {
	mediaArray: Media[],
	caption: string,
}

export interface Media {
	thumbnail: SafeUrl,
	source: any,
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
  getUserDescriptions = function(): Promise<UserDescription[]> {
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

  getUserDescription = function(username): Promise<UserDescription> {
  	return new Promise<UserDescription>(async (resolve, reject) => {
	  	const userDescription = {
				icon: await this.getIcon(username),
				username: username,
				biography: await this.getBiography(username),
			};
			resolve(userDescription);
  	});
  }

  getSafeUrl(url: string): SafeUrl {
  	// console.log(`url: ${url}`);
  	return this.domSanitizer.bypassSecurityTrustUrl(Capacitor.convertFileSrc(url));
  }

  async getIcon(username: string): Promise<SafeUrl> {
  	const entries = await this.file.listDir(this.file.applicationDirectory, `public/assets/packages/${username}`);
		const nativeURL = entries.filter(x => x['name'].includes('_profile_pic.jpg'))[0]['nativeURL'];
		return this.getSafeUrl(nativeURL);
  }

  async getBiography(username: string): Promise<string> {
  	const entries = await this.file.listDir(this.file.applicationDirectory, `public/assets/packages/${username}`);
		const nativeURL = entries.filter(x => x['name'].includes(`${username}_`))[0]['nativeURL'];
		// console.log(`nativeURL: ${nativeURL}`);
		const servingURL = Capacitor.convertFileSrc(nativeURL);
		let contents = await Filesystem.readFile({
	    path: nativeURL,
	    directory: FilesystemDirectory.Documents,
	    encoding: FilesystemEncoding.UTF8
	  });
	  let json = JSON.parse(contents['data']);
		return json['node']['biography'];
  }

  getPosts = function(username: string) {
  	return new Promise<Post[]>(async (resolve, reject) => {
	  	const promises = [];
	  	const entries = await this.file.listDir(this.file.applicationDirectory, `public/assets/packages/${username}`);
  		entries.filter(x => x['name'].includes(`.jpg`)).forEach(x => {
  			promises.push(this.getPost(username, x['name'].split('.').slice(0, -1).join('.')));
  		});
  		Promise.all(promises).then(values => {
  			resolve(values);
  		});
  	});
  }

  getPost = function(username: string, fileGroupName: string): Promise<Post> {
  	return new Promise<Post>(async (resolve, reject) => {
	  	const post = {
				mediaArray: await this.getMediaArray(username, fileGroupName),
				caption: await this.getCaption(username, fileGroupName),
			};
			resolve(post);
  	});
  }

  async getMediaArray(username: string, fileGroupName: string): Promise<Media[]> {
  	const entries = await this.file.listDir(this.file.applicationDirectory, `public/assets/packages/${username}`);
  	const mediaArray: Media[] = [];
  	entries.filter(x => x['name'].includes(fileGroupName) && x['name'].includes(`.jpg`)).forEach(x => {
  		mediaArray.push({
  			thumbnail: this.getSafeUrl(x['nativeURL']),
  			source: null,
  		});
  	});
  	return mediaArray;
  }

  async getCaption(username: string, fileGroupName: string): Promise<string> {
  	return 'my caption';
  }
}
