import axios from 'axios'
import * as querystring from 'querystring'
import { wrapper } from './util'

function getAuthorizeURL(parameters: {
  redirect: string
  scope?: string
  state?: string
  url: string
  appId: string
  href?: string
}) {
  const { redirect, scope, state, url, appId, href } = parameters
  const info: any = {
    appid: appId,
    redirect_uri: redirect,
    response_type: 'code',
    scope: scope || 'snsapi_base',
    state: state || '',
  }

  if (!!href) {
    info.href = href
  }

  return url + '?' + querystring.stringify(info) + '#wechat_redirect'
}

interface ILogger {
  warn: (...args) => void
  log: (...args) => void
  info: (...args) => void
  error: (...args) => void
}

interface IAccessToken {
  access_token: string
  created_at: number
  expires_in: number
  refresh_token: string
  openid: string
  scope: string
}

export class AccessToken implements IAccessToken {
  public readonly access_token: string
  public readonly created_at: number
  public readonly expires_in: number
  public readonly refresh_token: string
  public readonly openid: string
  public readonly scope: string

  constructor(data: IAccessToken) {
    this.access_token = data.access_token
    this.created_at = data.created_at
    this.expires_in = data.expires_in
    this.refresh_token = data.refresh_token
    this.openid = data.openid
    this.scope = data.scope

    Object.keys(data).map(k => (this[k] = data[k]))
  }

  public isValid() {
    const time = new Date().getTime()

    return !!this.access_token && time < this.created_at + this.expires_in * 1000
  }
}

export default class WechatOAuth {
  public readonly getToken: (openId: string) => any
  public readonly appId: string
  private readonly appSecret: string
  private readonly saveToken!: (openid: string, token: object) => void
  private readonly store: any
  private logger: ILogger

  constructor(
    appId: string,
    appSecret: string,
    saveToken?: (openid: string, token: object) => void,
    getToken?: (openId: string) => any,
    logger: ILogger = console,
  ) {
    this.appId = appId
    this.appSecret = appSecret
    this.store = {}
    this.logger = logger
    this.getToken = !getToken
      ? (openId: string) => {
          return this.store[openId]
        }
      : getToken

    if (!saveToken && (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod')) {
      this.logger.warn(`Please don't save oauth token into memory under production!`)
    }

    if (!saveToken) {
      this.saveToken = (openid: string, token: object) => {
        this.store[openid] = token
      }
    }
  }

  public getAuthorizeURL(redirect: string, state?: string, scope?: string, href?: string) {
    return getAuthorizeURL({
      redirect,
      scope,
      state,
      url: 'https://open.weixin.qq.com/connect/oauth2/authorize',
      appId: this.appId,
      href,
    })
  }

  public getAuthorizeURLForWebsite(redirect: string, state?: string, scope?: string, href?: string) {
    return getAuthorizeURL({
      redirect,
      scope: scope || 'snsapi_login',
      state,
      url: 'https://open.weixin.qq.com/connect/qrconnect',
      appId: this.appId,
      href,
    })
  }

  public async getAccessToken(code: string) {
    const url = 'https://api.weixin.qq.com/sns/oauth2/access_token'
    const info = {
      appid: this.appId,
      secret: this.appSecret,
      code,
      grant_type: 'authorization_code',
    }

    return this.processAccessToken(url, info)
  }

  public async getClientAccessToken() {
    const url = 'https://api.weixin.qq.com/cgi-bin/token'
    const info = {
      grant_type: 'client_credential',
      appid: this.appId,
      secret: this.appSecret,
    }

    return this.processAccessToken(url, info)
  }

  public async refreshAccessToken(refreshToken: string) {
    const url = 'https://api.weixin.qq.com/sns/oauth2/refresh_token'
    const info = {
      appid: this.appId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }

    return this.processAccessToken(url, info)
  }

  public async getUserByOpenIdAndAccessToken(openId: string, accessToken: string, lang: string = 'en') {
    const url = 'https://api.weixin.qq.com/sns/userinfo'
    const info = {
      access_token: accessToken,
      openid: openId,
      lang,
    }

    return wrapper(axios.get)(url + '?' + querystring.stringify(info))
  }

  public async getUserByOpenId(openId: string, lang = 'en') {
    const token = this.getToken(openId)
    if (!token) {
      const error = new Error(`No token for ${openId}, please authorize first.`)
      error.name = 'NoOAuthTokenError'

      throw error
    }

    const accessToken = new AccessToken(token)
    if (accessToken.isValid()) {
      return this.getUserByOpenIdAndAccessToken(openId, accessToken.access_token, lang)
    } else {
      const refreshedToken = await this.refreshAccessToken(accessToken.refresh_token)
      return this.getUserByOpenIdAndAccessToken(openId, refreshedToken.access_token, lang)
    }
  }

  public async getUserByCode(code: string, lang = 'en') {
    const accessToken = await this.getAccessToken(code)
    const openId = accessToken.openid
    return this.getUserByOpenId(openId, lang)
  }

  public async getQRCodeTicket(
    data: any = { expire_seconds: 604800, action_name: 'QR_SCENE', action_info: { scene: { scene_id: 123 } } },
    token?: string,
  ): Promise<{ ticket: string; expire_seconds: number; url: string }> {
    if (!token) {
      token = (await this.getClientAccessToken()).access_token
    }

    const url = 'https://api.weixin.qq.com/cgi-bin/qrcode/create'

    return await wrapper(axios.post)(url + '?' + querystring.stringify({ access_token: token }), data)
  }

  public async getQRCode(
    data: any = { expire_seconds: 604800, action_name: 'QR_SCENE', action_info: { scene: { scene_id: 123 } } },
    token?: string,
  ) {
    const ticketResult = await this.getQRCodeTicket(data, token)

    return await WechatOAuth.getQRCodeByTicket(ticketResult.ticket, true)
  }

  public async getQRCodeLink(
    data: any = { expire_seconds: 604800, action_name: 'QR_SCENE', action_info: { scene: { scene_id: 123 } } },
    token?: string,
  ) {
    const ticketResult = await this.getQRCodeTicket(data, token)

    return this.getQRCodeLinkByTicket(ticketResult.ticket)
  }

  public async getQRCodeLinkByTicket(ticket: string) {
    return (
      'https://mp.weixin.qq.com/cgi-bin/showqrcode' +
      '?' +
      querystring.stringify({
        ticket: encodeURIComponent(ticket),
      })
    )
  }

  public static async getQRCodeByTicket(ticket: string, raw = true) {
    const url = 'https://mp.weixin.qq.com/cgi-bin/showqrcode'

    return await wrapper(axios.get, raw)(
      url +
        '?' +
        querystring.stringify({
          ticket: encodeURIComponent(ticket),
        }),
      {
        headers: {
          Accept:
            'ext/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/png,image/jpg,*/*;q=0.8,application/signed-exchange;v=b3',
        },
      },
    )
  }

  public async code2Session(code: string) {
    const url = 'https://api.weixin.qq.com/sns/jscode2session'
    const info = {
      appid: this.appId,
      secret: this.appSecret,
      js_code: code,
      grant_type: 'authorization_code',
    }

    return await wrapper(axios.get)(url + '?' + querystring.stringify(info))
  }

  public async getJsApiTicket(accessToken?: string) {
    if (!accessToken) {
      accessToken = (await this.getClientAccessToken()).access_token
    }

    const url = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${accessToken}&type=jsapi`

    return await wrapper(axios.get)(url)
  }

  public async jsSDKSign(
    url: string,
    jsApiTicket?: string,
  ): Promise<{
    jsapi_ticket: string
    nonceStr: string
    signature: string
    timestamp: string
    url: string
  }> {
    if (!jsApiTicket) {
      jsApiTicket = await this.getJsApiTicket()
    }

    const sign = require('./sign')
    return { ...sign(jsApiTicket, url), jsapi_ticket: jsApiTicket }
  }

  private async processAccessToken(url: string, info) {
    const time = new Date().getTime()

    const tokenResult = await wrapper(axios.get)(url + '?' + querystring.stringify(info))

    const accessToken = new AccessToken({
      created_at: time,
      ...tokenResult,
    })

    try {
      this.saveToken(tokenResult.openid, accessToken)
    } catch (e) {
      this.logger.error(e)
    }

    return accessToken
  }
}
