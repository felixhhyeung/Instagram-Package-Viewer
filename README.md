# Instagram Package Viewer

## Prerequisites
node(app tested in v15.0.0): https://nodejs.org/en/download/package-manager

nvm(if you encountered problems from the command `yarn`, it can let you select the version of node you want, `nvm use 14.5.0`): https://github.com/nvm-sh/nvm

yarn: https://classic.yarnpkg.com/en/docs/install/#mac-stable

ionic(as yarn global package): `yarn global add ionic`

## Install dependencies
```bash
yarn
```

## Dev
```bash
yarn dev
```

## Build
```bash
yarn build
```

## Add new page
```bash
ionic g page pages/mypage
```

## Known issue
- Build to android
	- If failed for Gradle version too old, go to `platforms/android/cordova/lib/builders/ProjectBuilder.js` and change the version to the suggested version in the error. [Ref](https://stackoverflow.com/questions/49321000/minimum-supported-gradle-version-is-4-1-current-version-is-3-3)