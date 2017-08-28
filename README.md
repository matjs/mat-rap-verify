# mat-rap

[![npm version](https://badge.fury.io/js/mat-rap.svg)](http://badge.fury.io/js/mat-rap)

## Installation

```sh
npm install --save-dev mat-rap
```

## Usage

```javascript
var mat = require('mat')
var rap = require('mat-rap')

mat.task('default', function () {
  mat.use(rap({
    projectId: '123',
    ext: ['.json', '.do']
  }))
})
```

```sh
mat default
```

## Options

- `projectId`
  
  type: number

  Rap平台对应建立的项目id

- `ext`
  
  type: array

  调用的数据接口的后缀名，默认为`['.json']`