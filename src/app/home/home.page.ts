import { Component } from '@angular/core';
import { PackageService } from '../services/package.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  userDescriptions;

  constructor(
  	private packageService: PackageService,
    private router: Router,
  ) {
  	// this.userDescriptions = this.packageService.getUserDescriptions();
  	this.packageService.getUserDescriptions().then(res => {
  		// console.log(`res: ${JSON.stringify(res)}`);
  		this.userDescriptions = res;
  	});
  }

  openUser(username: string): void {
    this.router.navigateByUrl(`/user/${username}`);
  }
}
