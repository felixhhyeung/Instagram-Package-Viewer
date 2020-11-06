import { Injectable } from '@angular/core';
import { File } from '@ionic-native/file/ngx';
import { Plugins, FilesystemDirectory, FilesystemEncoding, Capacitor } from '@capacitor/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { VideoEditor, CreateThumbnailOptions } from '@ionic-native/video-editor';
import { Md5 } from 'ts-md5/dist/md5';
import { Zip } from '@ionic-native/zip/ngx';
import { FileTransfer, FileUploadOptions, FileTransferObject } from '@ionic-native/file-transfer/ngx';
import { environment } from '../../environments/environment';

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
    console.log(`fileGroupNames: ${JSON.stringify(fileGroupNames)}`);
    return fileGroupNames;
  }

  getPosts = function(username: string) {
  	return new Promise<Post[]>(async (resolve, reject) => {
	  	const promises = [];
	  	const entries = await this.file.listDir(this.file.documentsDirectory, `packages/${username}`);
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

  async cachedFileExists(cachedFile: string): Promise<boolean> {
    try {
      await Filesystem.readFile({
        path: `${cachedFile}`,
        directory: FilesystemDirectory.Cache
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
    if(await this.cachedFileExists(`${hash}.jpg`)) {
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
        atTime:1,
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

  async downloadFileFromServer(filename: string) {
    const server = environment.packagesServer;
    await this.fileTransfer.download(`${server}/${filename}`, `${this.file.documentsDirectory}${filename}`);
    console.log('Download complete');
  }

  importPackages = function(progressCallback?: (progress: number) => void): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const zipFilenameExtension = `InstagramPackages.zip`;
      if(progressCallback) {
        progressCallback(0);
      }
      await this.downloadFileFromServer(zipFilenameExtension);
      if(progressCallback) {
        progressCallback(.5);
      }
      const destinationUriResult = await Filesystem.getUri({
        path: ``,
        directory: FilesystemDirectory.Documents,
      });
      // console.log(`destinationUriResult.uri: ${destinationUriResult.uri}`);
      this.zip.unzip(
        `${destinationUriResult.uri}/${zipFilenameExtension}`, `${destinationUriResult.uri}/packages`,
        (progress) => {
          // console.log('Unzipping, ' + Math.round((progress.loaded / progress.total) * 100) + '%')
          if(progressCallback) {
            // .5 to 1
            // console.log(`progressCallback(${progress.loaded / progress.total * .5 + .5})`);
            progressCallback(Math.round((progress.loaded / progress.total * .5 + .5) * 100) / 100);
          }
        }
      ).then((result) => {
        if(result === 0) {
          resolve();
        }
        if(result === -1) {
          console.log(`unzip failed`);
        }
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
      resolve();
    });
  }
}
