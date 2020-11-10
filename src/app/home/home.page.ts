import { Component, NgZone } from '@angular/core';
import { PackageService } from '../services/package.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  userDescriptions;
  importProgress: number;
  constructor(
  	private packageService: PackageService,
    private router: Router,
    private ngZone: NgZone,
  ) {
    this.load();
  }

  load() {
    this.packageService.getUserDescriptions().then(res => {
      // console.log(`res: ${JSON.stringify(res)}`);
      this.userDescriptions = res;
    });
  }

  openUser(username: string): void {
    this.router.navigateByUrl(`/user/${username}`);
  }

  importPackages() {
    this.importProgress = 0;
    this.packageService.importPackages((progress) => {
      if(progress > this.importProgress) {
        this.ngZone.run(() => {
          this.importProgress = progress;
        });
      }
    }).error(error => {
      console.log(`error: ${error}`);
    }).finally(() => {
      this.load();
      this.importProgress = null;
    });
  }

  clearPackages() {
    this.packageService.clearPackages().finally(() => {
      this.load();
    });
  }
}
