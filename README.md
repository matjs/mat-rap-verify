# mat-rap-verify

[![npm version](https://badge.fury.io/js/mat-rap-verify.svg)](http://badge.fury.io/js/mat-rap-verify)

## Installation

```sh
npm install --save-dev mat-rap-verify
```

## Usage

```javascript
var mat = require('mat')
var rap = require('mat-rap')
var rapVerify = require('mat-rap-verify')

mat.url([/api\//, /api2\//])
  .use(rapVerify({
      projectId: matProjectId,
      rapVersion: rapVersion,
      isRap: true
  }))
  .use(rap({
      rapVersion: rapVersion,
      projectId: matProjectId
  }))
```


## Options

- `projectId`
  
  type: number

  Rap平台对应建立的项目id

- `rapVersion`
  
  type: string

  rap平台的版本，默认为`1`

- `isRap`
  
  type: boolean

  是否为rap模式，默认为`false`