import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationExtras } from '@angular/router';
import { PackageService, UserDescription, Post } from '../../services/package.service';
import { NavController } from '@ionic/angular';

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
}
