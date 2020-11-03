import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PackageService, UserDescription, Post } from '../../services/package.service';

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
  ) { }

  ngOnInit() {
  	this.username = this.activatedRoute.snapshot.paramMap.get('username');
  	this.packageService.getUserDescription(this.username).then(res => {
  		this.userDescription = res;
  	});
  	this.packageService.getPosts(this.username).then(res => {
  		this.posts = res;
  	});
  }

}
