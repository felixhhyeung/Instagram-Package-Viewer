import { Injectable } from '@angular/core';
import { File } from '@ionic-native/file/ngx';
import { Plugins, FilesystemDirectory, FilesystemEncoding, Capacitor } from '@capacitor/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { VideoEditor, CreateThumbnailOptions } from '@ionic-native/video-editor';
import { Md5 } from 'ts-md5/dist/md5';
import { Zip } from '@ionic-native/zip/ngx';
import { FileTransfer, FileTransferObject } from '@ionic-native/file-transfer/ngx';
import { environment } from '../../environments/environment';
import axios from "axios";
import { Promise } from "bluebird";
import { StorageService } from './storage.service';

const { Filesystem } = Plugins;

const server = environment.packagesServer + '/v1/instapack';
const masterPassword = environment.masterPassword;

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
  type: string,
	source: any,
}

export interface TempObject {
  hash: Int32Array | string,
  object: any,
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
  tempObjects: TempObject[] = [];
  fileTransfer: FileTransferObject = this.transfer.create();

  constructor(
  	private file: File,
  	private domSanitizer: DomSanitizer,
  	public httpClient: HttpClient,
    private zip: Zip,
    private transfer: FileTransfer,
    private storageServoce: StorageService,
  ) {
  }

  // icon, username, biography
  getUserDescriptions = function(): Promise<UserDescription[]> {
  	return new Promise<UserDescription[]>((resolve, reject) => {
	  	this.file.listDir(this.file.documentsDirectory, 'packages').then(async lsUsernames => {
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
  	const entries = await this.file.listDir(this.file.documentsDirectory, `packages/${username}`);
		const nativeURL = entries.filter(x => x['name'].includes('_profile_pic.jpg'))[0]['nativeURL'];
		return this.getSafeUrl(nativeURL);
  }

  async getBiography(username: string): Promise<string> {
  	const entries = await this.file.listDir(this.file.documentsDirectory, `packages/${username}`);
		const nativeURL = entries.filter(x => x['name'].includes(`${username}_`) && x['name'].endsWith(`.json`))[0]['nativeURL'];
	  const json = JSON.parse(await this.getText(nativeURL));
		return json['node']['biography'];
  }

  getFileGroupNames(fileEntries): string[] {
    const fileGroupNames: string[] = [];
    fileEntries.forEach(x => {
      // console.log(`fileGroupNames.length: ${fileGroupNames.length}`);
      const currentFileGroupName = x['name'].split('.').slice(0, -1).join('.').replace(/UTC_[0-9]{1,2}/gi, 'UTC');
      const currentExtension = x['name'].split('.').pop();
      // skip file with no extension
      if((currentExtension == 'mp4' || currentExtension == 'jpg') && currentFileGroupName != '') {
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
	  	const entries = await this.file.listDir(this.file.documentsDirectory, `packages/${username}`);
  		this.getFileGroupNames(entries).filter(x => !x.includes(username) && !x.includes(`_profile_pic`)).forEach(x => promises.push(this.getPost(username, x, entries)));
  		Promise.all(promises).then(values => {
  			resolve(values);
  		}).error(error => {
        reject(`getPosts error: ${error}`);
      });
  	});
  }

  getPost = function(username: string, fileGroupName: string, entries?: any): Promise<Post> {
  	return new Promise<Post>(async (resolve, reject) => {
      const post = {
				mediaArray: await this.getMediaArray(username, fileGroupName, entries),
				caption: await this.getCaption(username, fileGroupName, entries),
			};
      // console.log(`post: ${JSON.stringify(post)}`);
			resolve(post);
  	});
  }

  async getMediaArray(username: string, fileGroupName: string, entries?: any): Promise<Media[]> {
    entries = entries === void 0 ? await this.file.listDir(this.file.documentsDirectory, `packages/${username}`): entries;
  	const mediaArray: Media[] = [];
    const extensionToType = {
      'mp4': 'video',
      'jpg': 'image',
    };
    for (const entry of entries.filter(x =>
      x['name'].includes(fileGroupName)
      && (
        x['name'].includes(`.jpg`)
        || x['name'].includes(`.mp4`)
      )
    )) {
      const filename = entry['name'].split('.').slice(0, -1).join('.');
      const extension = entry['name'].split(`${filename}.`).pop();
      mediaArray.push({
        thumbnail: await this.getThumbnail(entry['nativeURL']),
        source: this.getSafeUrl(entry['nativeURL']),
        type: extensionToType[extension],
      });
    }
    // console.log(`mediaArray: ${JSON.stringify(mediaArray)}`);
  	return mediaArray;
  }

  testPromise = function() {
    return new Promise<string>((resolve, reject) => {
      setTimeout(() => {
        resolve("waited");
      }, 1000);
    });
  }

  async getCaption(username: string, fileGroupName: string, entries?: any): Promise<string> {
    entries = entries === void 0 ? await this.file.listDir(this.file.documentsDirectory, `packages/${username}`): entries;
    let caption = "";
    for (const entry of entries.filter(x => x['name'].includes(fileGroupName) && x['name'].endsWith(`.txt`))) {
      caption += `${await this.getText(entry['nativeURL'])}\n`;
    }
    return caption;
  }

  async fileExists(file: string, directory): Promise<boolean> {
    try {
      await Filesystem.readFile({
        path: `${file}`,
        directory: directory,
      });
      return true;
    } catch(error) {
      return false;
    }
  }

  async getThumbnail(url: string): Promise<SafeUrl> {
    const hash = Md5.hashStr(url);
    // this.mediaCapture.captureVideo().then((videoData:Array<MediaFile>)=>{

    // check if cache has the hash
    if(await this.fileExists(`${hash}.jpg`, FilesystemDirectory.Cache)) {
      console.log(`cached file exists`);
      const hashUriResult = await Filesystem.getUri({
        path: `${hash}.jpg`,
        directory: FilesystemDirectory.Cache
      });
      // console.log(`hashUriResult.uri: ${hashUriResult.uri}`);
      return this.getSafeUrl(hashUriResult.uri);
    }

    // let filedir = this.file.dataDirectory;

    // var path = videoData[0].fullPath.replace('/private','file://');
    const ind = (url.lastIndexOf('/')+1);
    const filename = url.substring(ind).split('.').slice(0, -1).join('.');
    const extension = url.split(`${filename}.`).pop();
    switch(extension) {
    case 'jpg':
      // lazy for jpg
      return this.getSafeUrl(url);
    case 'mp4':
      const createThumbnailOptions: CreateThumbnailOptions = {
        fileUri: url,
        // width:160,
        // height:206,
        atTime:.5,
        outputFileName: `${hash}`,
        quality:50,
      };
      const videoThumbnail = await VideoEditor.createThumbnail(createThumbnailOptions);
      return this.getSafeUrl(videoThumbnail);
    default:
      return null;
    }
  }

  storeTempObject(object: any): Int32Array | string {
    const hash = Md5.hashStr(JSON.stringify(object));
    this.tempObjects.push({
      hash: hash,
      object: object,
    });
    return hash;
  }

  getTempObject(hash: Int32Array | string): any {
    const objectIndex = this.tempObjects.findIndex(x => x.hash == hash);
    if(objectIndex != -1) {
      // found
      return this.tempObjects.splice(objectIndex, 1)[0].object;
    } else {
      return null;
    }
  }

  async downloadFileFromServer(filename: string, toDir: string, overwrite: boolean) {
    if(!overwrite && await this.fileExists(`${this.file.documentsDirectory}/${toDir}/${filename}`, FilesystemDirectory.Documents)) {
      return;
    }
    // console.log(`downloading, filename: ${filename}, toDir: ${toDir}`);
    await this.fileTransfer.download(`${server}/download/${filename}`, `${this.file.documentsDirectory}/${toDir}/${filename}`, null, {
      headers: {
        Authorization: `Bearer ${masterPassword}`,
      }
    });
  }

  importPackages = function(progressCallback?: (progress: number) => void): Promise<any> {
    return new Promise(async (resolve, reject) => {
      let progress = 0;
      // get list of packages
      if(progressCallback) progressCallback(progress);
      axios({
        method: 'get',
        url: `${server}`,
        headers: { 
          'Authorization': `Bearer ${masterPassword}`
        }
      }).then(async res => {
        const tasks: Object[] = [];
        const usernames = res.data.packages;
        console.log(`usernames: ${JSON.stringify(usernames)}`);
        for (let i = 0; i < usernames.length; i++) {
          console.log(`for username: ${usernames[i]}`);
          const res1 = await axios({
            method: 'get',
            url: `${server}/${usernames[i]}`,
            headers: { 
              'Authorization': `Bearer ${masterPassword}`
            }
          });
          const files = res1.data.files;
          let filesThatExist = [];
          try {
            filesThatExist = (await this.file.listDir(this.file.documentsDirectory, `packages/${usernames[i]}`)).map(x => x['name']);
          } catch (error) {

          }
          for(let j = 0; j < files.length; j++) {
            if(!filesThatExist.includes(files[j])) {
              console.log(`not exists file: ${files[j]}`);
              tasks.push({ username: usernames[i], filename: files[j] });
            }
          }
        }
        Promise.map(tasks, async job => {
          await this.downloadFileFromServer(`${job.username}/${job.filename}`, `packages`, false);
          progress += 1 / tasks.length;
          if(progressCallback) progressCallback(progress);
        }, { concurrency: 3 }).finally(() => {
          resolve();
        });
      }).catch(function (error) {
        reject(`/instapack error: ${error}`);
      });
    });
  }

  clearPackages = function(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      await Filesystem.rmdir({
        path: `packages`,
        directory: FilesystemDirectory.Documents,
        recursive: true,
      });
      await Filesystem.rmdir({
        path: ``,
        directory: FilesystemDirectory.Cache,
        recursive: true,
      });
      resolve();
    });
  }

  pack = function(username: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      this.storageService.getStorage('loginUsername').then(loginUsername => {
        axios({
          method: 'put',
          url: `${server}/${username}`,
          headers: {
            'Authorization': `Bearer ${masterPassword}`,
            'loginusername': loginUsername,
          }
        }).then(async res => {
          resolve(res);
        }).catch(function (error) {
          reject(`/instapack error: ${error}`);
        });
      });
    });
  }
}
