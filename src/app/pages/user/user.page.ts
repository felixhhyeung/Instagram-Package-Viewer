import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationExtras } from '@angular/router';
import { PackageService, UserDescription, Post, Media } from '../../services/package.service';
import { NavController } from '@ionic/angular';
import { ToastController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-user',
  templateUrl: './user.page.html',
  styleUrls: ['./user.page.scss'],
})
export class UserPage implements OnInit {
	username: string;
	userDescription: UserDescription;
	posts: Post[];
  constructor(
  	private activatedRoute: ActivatedRoute,
  	private packageService: PackageService,
    private navController: NavController,
    private toastController: ToastController,
    private alertController: AlertController,
  ) { }

  ngOnInit() {
  	this.username = this.activatedRoute.snapshot.paramMap.get('username');
  	this.packageService.getUserDescription(this.username).then(res => {
  		this.userDescription = res;
  	});
  	this.packageService.getPosts(this.username).then(res => {
  		// console.log(`posts: ${JSON.stringify(res)}`);
      // // You cannot serialise a SafeUrl
      // res[0].mediaArray[0] = JSON.parse(JSON.stringify(res[0].mediaArray[0]));
      this.posts = res;
      // console.log(`post 0: ${JSON.stringify(this.posts[1].mediaArray[0].thumbnail)}`);
  	});
  }

  viewPost(post: Post): void {
    const navigationExtras: NavigationExtras = {
      queryParams: {
        postHash: this.packageService.storeTempObject(post),
      }
    };
    this.navController.navigateForward(['post'], navigationExtras);
  }

  async toast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000
    });
    toast.present();
  }

  async alert(message: string, header?: string) {
    const alert = await this.alertController.create({
      // cssClass: 'my-custom-class',
      header: header === void 0 ? 'Alert': header,
      // subHeader: 'Subtitle',
      message: message,
      buttons: ['Dismiss']
    });
    await alert.present();
  }

  pack(username: string) {
    // console.log(`pack(${username})`);
    this.toast(`Packing ${username}.`);
    this.packageService.pack(username).then(res => {
      this.toast(`Packing ${username} success.`);
    }).catch(error => {
      this.alert(error, `Packing ${username} failed.`);
    });
  }
}
