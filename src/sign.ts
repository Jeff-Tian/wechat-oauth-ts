import { configure, getLogger } from 'log4js'
configure({
  appenders: { cheese: { type: 'file', filename: 'logs/common.log' } },
  categories: { default: { appenders: ['cheese'], level: 'debug' } },
})

const logger = getLogger('default')

var createNonceStr = function() {
  return Math.random()
    .toString(36)
    .substr(2, 15)
}

var createTimestamp = function() {
  return parseInt(String(new Date().getTime() / 1000)) + ''
}

var raw = function(args) {
  var keys = Object.keys(args)
  keys = keys.sort()
  var newArgs = {}
  keys.forEach(function(key) {
    newArgs[key.toLowerCase()] = args[key]
  })

  var string = ''
  for (var k in newArgs) {
    string += '&' + k + '=' + newArgs[k]
  }
  string = string.substr(1)
  return string
}

const fundebug = require('fundebug-nodejs')
fundebug.apikey = 'a652f655e6a914002af501ca24fc08932ab91eaa80b53fe1ed74d3fffd788609'

/**
 * @synopsis 签名算法
 *
 * @param jsapi_ticket 用于签名的 jsapi_ticket
 * @param url 用于签名的 url ，注意必须动态获取，不能 hardcode
 *
 * @returns
 */
const sign = function(jsapi_ticket, url) {
  let ret = {
    jsapi_ticket,
    nonceStr: createNonceStr(),
    timestamp: createTimestamp(),
    url,
    signature: '',
  }
  var string = raw(ret)
  const jsSHA = require('jssha')
  const shaObj = new jsSHA(string, 'TEXT')
  ret.signature = shaObj.getHash('SHA-1', 'HEX')

  fundebug.notify('signing', 'Signing', { args: { jsapi_ticket, url }, return: ret })
  logger.debug('signing: ', { args: { jsapi_ticket, url }, return: ret })

  return ret
}

module.exports = sign
