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

Array.prototype.sortedInsert = sortedInsert;

declare global {
  interface Array<T> {
    sortedInsert(element: T, comparator: any): number;
  }
}

function sortedInsert<T>(element: T, comparatorFn: any): number {
    const insertionIndex: number = findInsertionIndex(this, element, comparatorFn);
    this.splice(insertionIndex, 0, element);
    return insertionIndex;
}

function findInsertionIndex<T>(arr: T[], element: T, comparatorFn: any): number {
  if (arr.length === 0) {
    return 0;
  }

  let low: number = 0;
  let high: number = arr.length - 1;

  while (low <= high) {
    const mid: number = Math.floor(low + (high - low) / 2);
    const comparison: number = comparatorFn(element, arr[mid]);
    if (comparison === 0) {
      return mid;
    } else if (comparison < 0) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return low;
}

@Injectable({
  providedIn: 'root'
})

export class PackageService {

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

  async getText(url: string): Promise<string> {
    let contents = await Filesystem.readFile({
      path: url,
      directory: FilesystemDirectory.Documents,
      encoding: FilesystemEncoding.UTF8
    });
    return contents['data'];
  }

  async getIcon(username: string): Promise<SafeUrl> {
  	const entries = await this.file.listDir(this.file.applicationDirectory, `public/assets/packages/${username}`);
		const nativeURL = entries.filter(x => x['name'].includes('_profile_pic.jpg'))[0]['nativeURL'];
		return this.getSafeUrl(nativeURL);
  }

  async getBiography(username: string): Promise<string> {
  	const entries = await this.file.listDir(this.file.applicationDirectory, `public/assets/packages/${username}`);
		const nativeURL = entries.filter(x => x['name'].includes(`${username}_`))[0]['nativeURL'];
	  const json = JSON.parse(await this.getText(nativeURL));
		return json['node']['biography'];
  }

  getFileGroupNames(fileEntries): string[] {
    const fileGroupNames: string[] = [];
    fileEntries.forEach(x => {
      // console.log(`fileGroupNames.length: ${fileGroupNames.length}`);
      const currentFileGroupName = x['name'].split('.').slice(0, -1).join('.');
      // skip file with no extension
      if(currentFileGroupName != '') {
        const leFileGroupNameIndex = fileGroupNames.findIndex(y => currentFileGroupName.includes(y));
        const geFileGroupNameIndex = fileGroupNames.findIndex(y => y.includes(currentFileGroupName));
        if(leFileGroupNameIndex != -1) {
          // le found
          if(geFileGroupNameIndex != -1) {
            // eq, do nothing
          } else {
            // lt, do nothing
          }
        } else {
          // le not found
          if(geFileGroupNameIndex != -1) {
            // gt found, replace
            // console.log(`found geFileGroupNameIndex, replaced ${fileGroupNames[geFileGroupNameIndex]} by ${currentFileGroupName}`);
            fileGroupNames[geFileGroupNameIndex] = currentFileGroupName;
          } else {
            // not found, sorted insert
            // console.log(`not found, insert: ${currentFileGroupName}`);
            fileGroupNames.sortedInsert(currentFileGroupName, (a, b) => b.localeCompare(a));
            // fileGroupNames.push(currentFileGroupName);
          }
        }
      }
    });
    // console.log(`fileGroupNames: ${JSON.stringify(fileGroupNames)}`);
    return fileGroupNames;
  }

  getPosts = function(username: string) {
  	return new Promise<Post[]>(async (resolve, reject) => {
	  	const promises = [];
	  	const entries = await this.file.listDir(this.file.applicationDirectory, `public/assets/packages/${username}`);
  		this.getFileGroupNames(entries).filter(x => !x.includes(username) && !x.includes(`_profile_pic`)).forEach(x => promises.push(this.getPost(username, x, entries)));
  		Promise.all(promises).then(values => {
  			resolve(values);
  		});
  	});
  }

  getPost = function(username: string, fileGroupName: string, entries?: any): Promise<Post> {
  	return new Promise<Post>(async (resolve, reject) => {
	  	const post = {
				mediaArray: await this.getMediaArray(username, fileGroupName, entries),
				caption: await this.getCaption(username, fileGroupName, entries),
			};
			resolve(post);
  	});
  }

  async getMediaArray(username: string, fileGroupName: string, entries?: any): Promise<Media[]> {
  	entries = entries === void 0 ? await this.file.listDir(this.file.applicationDirectory, `public/assets/packages/${username}`): entries;
  	const mediaArray: Media[] = [];
  	entries.filter(x => x['name'].includes(fileGroupName) && x['name'].includes(`.jpg`)).forEach(x => {
  		mediaArray.push({
  			thumbnail: this.getSafeUrl(x['nativeURL']),
  			source: this.getSafeUrl(x['nativeURL']),
  		});
  	});
    // console.log(`mediaArray.length: ${mediaArray.length}`);
  	return mediaArray;
  }

  async getCaption(username: string, fileGroupName: string, entries?: any): Promise<string> {
  	  entries = entries === void 0 ? await this.file.listDir(this.file.applicationDirectory, `public/assets/packages/${username}`): entries;
      let caption = "";
      entries.filter(x => x['name'].includes(fileGroupName) && x['name'].includes(`.txt`)).forEach(x => {
        caption += `${this.getText(x['nativeURL'])}\n`;
      });
      // console.log(`caption: ${caption}`);
      return caption;
  }
}
