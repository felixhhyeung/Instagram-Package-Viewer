import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from "@angular/router";
import { PackageService, Post, Media } from '../../services/package.service';

@Component({
  selector: 'app-post',
  templateUrl: './post.page.html',
  styleUrls: ['./post.page.scss'],
})
export class PostPage implements OnInit {
  post: Post;
  constructor(
  	private activatedRoute: ActivatedRoute,
  	private packageService: PackageService,
  ) { }

  ngOnInit() {
  	this.activatedRoute.queryParams.subscribe(params => {
	    this.post = this.packageService.getTempObject(params["postHash"]);
	    console.log(`this.post: ${JSON.stringify(this.post)}`);
  	});
  }
  mediaOnClick(media: Media) {
    
  }
}
