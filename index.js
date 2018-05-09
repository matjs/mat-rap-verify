const { URLSearchParams } = require('url');
const coRequest = require('co-request')
const co = require('co')
const chalk = require('chalk')
const diff = require('deep-diff').diff

//rap接口校验
module.exports = function (opts) {
  return function* (next) {
    let rapVersion = opts.rapVersion || '2' 
    if (rapVersion != '2') { //rap1不校验
      return yield next
    }

    const me = this
    const methodOrigin = me.request.method

    //formData: post/json参数
    //resBody: 接口返回的数据/buffer
    this.getParsedBody = (formData, resBody) => {
      co(function* () {

        let rapUrl = `https://rap2api.alibaba-inc.com/interface/get?repositoryId=${opts.projectId}&method=${methodOrigin}&url=${me.path}`
        let res = yield coRequest(rapUrl)
        let rapApi

        try {
          rapApi = JSON.parse(res.body.toString())
        } catch (error) {
          console.log(`${chalk.red(` ✗ 没有找到该接口在RAP上的配置:`)} at ${chalk.grey(me.path)}`)
          return
        }

        let _resBody
        try {
          _resBody = JSON.parse(resBody.toString())
        } catch (error) {
          //兼容jsonp格式，如 jsonp18({"data":1})
          let resBodyStr = /.*\(?(\{(?:.|\s)*\})\)?/.exec(resBody.toString())[1]
          _resBody = JSON.parse(resBodyStr)
        }

        let params = new URLSearchParams(me.search)
        let rapApiData = rapApi.data

        //校验请求里的参数是否与rap上填写的一致
        //参数只校验一层，无须递归
        checkParams.call(me, opts, rapApiData, formData, _resBody, params)

        //递归校验真实接口返回里跟rap上定义的是否一致
        checkResponse.call(me, opts, rapApiData, formData, _resBody, params)

      })
    }

    yield next
  }
}


/**
 * 校验请求里的参数是否与rap上填写的一致
 */
function checkParams(opts, rapApiData, formData, resBody, params) {
  formData = formData || {}
  let missingParams = [] //缺少的参数
  let redundanceParams = [] //冗余的参数
  let me = this
  let rapApiDataReqParams = {}

  //将urlParams合并到formData
  params.forEach((v, k) => {
    formData[k] = v
  })

  //找缺少的入参
  rapApiData.requestProperties.forEach((param) => {
    rapApiDataReqParams[param.name] = true
    //formdata/url里找参数
    if (formData && formData[param.name]) {
      return
    }
    missingParams.push(param.name)
  })

  //查找冗余的入参
  for (let key in formData) {
    if (rapApiDataReqParams[key]) {
      break
    }
    redundanceParams.push(key)
  }

  if (missingParams.length || redundanceParams.length) {
    console.log(chalk.red(`\n✗ 检测到有与rap上入参不匹配的接口：`))
    console.log(`  接口    ：${chalk.green(me.path)}`)
    missingParams.forEach((param) => {
      console.log(`  缺少入参：${chalk.magenta(param)}`)
    })
    redundanceParams.forEach((param) => {
      console.log(`  冗余入参：${chalk.cyan(param)}`)
    })
    console.log(chalk.grey(`  接口详情：https://rap2.alibaba-inc.com/repository/editor?id=${rapApiData.repositoryId}&mod=${rapApiData.moduleId}&itf=${rapApiData.id}\n`))
  }

}

/**
 * 递归校验真实接口返回里跟rap上定义的是否一致
 */
function checkResponse(opts, rapApiData, formData, resBody, params) {
  let me = this
  let rapDataObj = rapDataConvertToObj(rapApiData.responseProperties)//rap数据转为object
  let missingKeys = [] //缺失的键值
  let redundancyKeys = [] //冗余的键值
  let diffs = diff(rapDataObj, resBody) //差异对比结果
  let pathMap = {}

  diffs.forEach(function (item) {
    //数组的path里会带上数字索引值，去掉该值
    for (let i = 0; i < item.path.length; i++) {
      if (typeof item.path[i] === 'number') {
        item.path.splice(i, 1)
        i--
      }
    }

    let path = item.path.join('.')
    if (!pathMap[path]) {
      if (item.kind === 'D') {//缺失的值
        missingKeys.push(path)
      } else if (item.kind === 'N') { //冗余的值
        redundancyKeys.push(path)
      }
    }

    pathMap[path] = true
  })

  //非rap模拟接口时才校验
  if (!opts.isRap) {
    if (missingKeys.length || redundancyKeys.length) {
      console.log(chalk.red(`\n✗ 检测到有与rap上定义的响应数据不匹配的接口：`))
      console.log(`  接口    ：${chalk.green(me.path)}`)
      missingKeys.forEach(function (resPath) {
        console.log(`  缺少键值：${chalk.magenta(resPath)}`)
      })
      redundancyKeys.forEach(function (resPath) {
        console.log(`  冗余键值：${chalk.cyan(resPath)}`)
      })
      console.log(chalk.grey(`  接口详情：https://rap2.alibaba-inc.com/repository/editor?id=${rapApiData.repositoryId}&mod=${rapApiData.moduleId}&itf=${rapApiData.id}\n`))
    }
  }

}


/**
 * 将rap的完整数据转化为object对象
 */
function rapDataConvertToObj(rp) {
  let obj = {}

  //递归解析成object
  function convertToObj(_rp, _obj) {
    _rp.forEach(function (item) {
      if (item.type === 'Object') {
        _obj[item.name] = {}
        convertToObj(item.children, _obj[item.name])
      } else if (item.type === 'Array') {
        _obj[item.name] = [{}]
        convertToObj(item.children, _obj[item.name][0])
      } else {
        _obj[item.name] = true //随便设个值占位
      }
    })
  }

  convertToObj(rp, obj)
  return obj
}
