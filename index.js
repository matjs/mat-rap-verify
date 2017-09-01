const { URLSearchParams } = require('url');
const coRequest = require('co-request')
const co = require('co')
const chalk = require('chalk')

//rap接口校验
function rapVerify(opts) {
  return function* (next) {

    if (opts.rapVersion != '2') { //rap1不校验
      return yield next
    }

    const me = this

    //formData: post/json参数
    //resBody: 接口返回的数据
    this.getParsedBody = function (formData, resBody) {
      co(function* () {

        let rapUrl = `https://rap2api.alibaba-inc.com/interface/get?repositoryId=${opts.projectId}&method=${me.request.method}&url=${me.path}`
        let res = yield coRequest(rapUrl)

        try {
          let rapApi = JSON.parse(res.body.toString())
          let params = new URLSearchParams(me.search)

          //校验请求里的参数是否与rap上填写的一致
          rapApi.data.requestProperties.forEach(function (param) {
            //post里找form data
            if (formData && formData[param.name]) {
              return
            }

            //url里的search找query
            if (params.get(param.name)) {
              return
            }

            console.log(`${chalk.red(` ✗ missing request param: ${param.name}`)} at ${chalk.grey(me.path)}`)
          })


          //递归校验真实接口返回里跟rap上定义的是否一致
          function responseKeyVerify(responseProperties, resObj, resPath) {
            responseProperties.forEach(function (property) {
              let _resPath = property.name
              if (resPath !== '') {
                _resPath = resPath + '.' + property.name
              }

              if (resObj[property.name] === undefined) {
                console.log(`${chalk.red(` ✗ missing response key: ${_resPath}`)} at ${chalk.grey(me.path)}`)
                return
              }

              if (property.children && property.children.length) {

                let _resObj = {}

                if (property.type === 'Array') {
                  _resObj = resObj[property.name][0] //数组取第一个对象
                } else {
                  _resObj = resObj[property.name]
                }

                responseKeyVerify(property.children, _resObj, _resPath)
              }
            })
          }

          //非rap模拟接口时才校验
          if (!opts.isRap) {
            responseKeyVerify(rapApi.data.responseProperties, resBody, '')
          }
        } catch (error) {
          console.log(`${chalk.red(` ✗ this rap api is not defined:`)} at ${chalk.grey(me.path)}`)
        }

      })
    }

    yield next
  }
}

module.exports = rapVerify