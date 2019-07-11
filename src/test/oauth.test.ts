import assert = require('assert')
import WechatOAuth, { AccessToken } from '../index'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import * as TypeMoq from 'typemoq'
import { WechatAPIError } from '../util'

describe('smoke', () => {
  it('works', () => {
    assert(true)
  })
})

describe('wechat oauth', () => {
  const config = {
    appid: 'wxc9135aade4e81d57',
    appsecret: '0461795e98b8ffde5a212b5098f1b9b6',
  }

  const auth = new WechatOAuth('appid', 'appsecret')

  describe('getAuthorizeURL', () => {
    it('should ok', () => {
      const url = auth.getAuthorizeURL('http://diveintonode.org/')
      assert(
        url ===
          'https://open.weixin.qq.com/connect/oauth2/authorize?appid=appid&redirect_uri=http%3A%2F%2Fdiveintonode.org%2F&response_type=code&scope=snsapi_base&state=#wechat_redirect',
      )
    })

    it('should ok with state', () => {
      const url = auth.getAuthorizeURL('http://diveintonode.org/', 'hehe')
      assert(
        url ===
          'https://open.weixin.qq.com/connect/oauth2/authorize?appid=appid&redirect_uri=http%3A%2F%2Fdiveintonode.org%2F&response_type=code&scope=snsapi_base&state=hehe#wechat_redirect',
      )
    })

    it('should ok with state and scope', () => {
      const url = auth.getAuthorizeURL('http://diveintonode.org/', 'hehe', 'snsapi_userinfo')
      assert(
        url ===
          'https://open.weixin.qq.com/connect/oauth2/authorize?appid=appid&redirect_uri=http%3A%2F%2Fdiveintonode.org%2F&response_type=code&scope=snsapi_userinfo&state=hehe#wechat_redirect',
      )
    })
  })

  describe('getAuthorizeURLForWebsite', () => {
    it('should ok', () => {
      const url = auth.getAuthorizeURLForWebsite('http://diveintonode.org/')
      assert(
        url ===
          'https://open.weixin.qq.com/connect/qrconnect?appid=appid&redirect_uri=http%3A%2F%2Fdiveintonode.org%2F&response_type=code&scope=snsapi_login&state=#wechat_redirect',
      )
    })

    it('should ok with state', () => {
      const url = auth.getAuthorizeURLForWebsite('http://diveintonode.org/', 'hehe')

      assert(
        url ===
          'https://open.weixin.qq.com/connect/qrconnect?appid=appid&redirect_uri=http%3A%2F%2Fdiveintonode.org%2F&response_type=code&scope=snsapi_login&state=hehe#wechat_redirect',
      )
    })

    it('should ok with state and scope', () => {
      const url = auth.getAuthorizeURLForWebsite('http://diveintonode.org/', 'hehe', 'snsapi_userinfo')

      assert(
        url ===
          'https://open.weixin.qq.com/connect/qrconnect?appid=appid&redirect_uri=http%3A%2F%2Fdiveintonode.org%2F&response_type=code&scope=snsapi_userinfo&state=hehe#wechat_redirect',
      )
    })
  })

  describe('getAccessToken', () => {
    const api = new WechatOAuth(config.appid, config.appsecret)

    it('should invalid', async () => {
      try {
        await api.getAccessToken('code')
      } catch (error) {
        assert(error.name === 'WechatAPIError')
        assert(error.message.startsWith('invalid code'))
      }
    })

    describe('should ok', () => {
      let mock: MockAdapter

      before(() => {
        mock = new MockAdapter(axios)
        mock.onGet(/.+/).replyOnce(200, {
          access_token: 'ACCESS_TOKEN',
          expires_in: 7200,
          refresh_token: 'REFRESH_TOKEN',
          openid: 'OPENID',
          scope: 'SCOPE',
        })
      })

      after(() => {
        mock.restore()
      })

      it('should ok', async () => {
        const result = await api.getAccessToken('code')

        const keys = ['access_token', 'expires_in', 'refresh_token', 'openid', 'scope', 'created_at']

        keys.map(k => assert(Object.keys(result).includes(k)))
      })
    })

    describe('should not ok', () => {
      let mock: MockAdapter
      before(() => {
        mock = new MockAdapter(axios)
        mock.onGet(/.+/).replyOnce(() => {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve([
                200,
                {
                  access_token: 'ACCESS_TOKEN',
                  expires_in: 0.1,
                  refresh_token: 'REFRESH_TOKEN',
                  open_id: 'OPENID',
                  scope: 'SCOPE',
                },
              ])
            }, 100)
          })
        })
      })

      after(() => {
        mock.restore()
      })

      it('should not ok', async () => {
        const token = await api.getAccessToken('code')

        assert(token.isValid() === false)
      })
    })
  })

  describe('getClientAccessToken', function() {
    const api = new WechatOAuth(config.appid, config.appsecret)

    describe('should ok', () => {
      let mock: MockAdapter

      before(() => {
        mock = new MockAdapter(axios)
        mock.onGet(/.+/).replyOnce(200, {
          access_token: 'ACCESS_TOKEN',
          expires_in: 7200,
        })
      })

      after(() => {
        mock.restore()
      })

      it('should ok', async () => {
        const result = await api.getClientAccessToken()

        const keys = ['access_token', 'expires_in']

        keys.map(k => assert(Object.keys(result).includes(k)))
      })
    })
  })

  // describe('should ok', () => {})

  describe('refreshAccessToken', () => {
    const api = new WechatOAuth('appid', 'secret')

    it('should invalid', async () => {
      try {
        const result = await api.refreshAccessToken('refresh_token')
        assert(result === undefined)
      } catch (ex) {
        assert(ex.name === 'WechatAPIError')
        assert(ex.message.startsWith('invalid appid'))
      }
    })

    describe('should ok', () => {
      let mock: MockAdapter
      before(() => {
        mock = new MockAdapter(axios)
        mock.onGet(/.+/).replyOnce(200, {
          access_token: 'ACCESS_TOKEN',
          expires_in: 7200,
          refresh_token: 'REFRESH_TOKEN',
          openid: 'OPENID',
          scope: 'SCOPE',
        })
      })
      after(() => {
        mock.restore()
      })

      it('should ok', async () => {
        const result = await api.refreshAccessToken('refresh_token')

        const keys = ['access_token', 'expires_in', 'refresh_token', 'openid', 'scope', 'created_at']

        keys.map(k => assert(Object.keys(result).includes(k)))
      })
    })
  })

  describe('getUser', () => {
    it('should invalid', async () => {
      const api = new WechatOAuth('appid', 'secret')

      try {
        await api.getUserByOpenIdAndAccessToken('openid', 'access_token')
      } catch (ex) {
        assert(ex.name === 'WechatAPIError')
        assert(ex.message.startsWith('invalid credential, access_token is invalid or not latest'))
      }
    })

    describe('mock get user ok', () => {
      const api = new WechatOAuth('appid', 'secret')

      let mock: MockAdapter
      before(() => {
        mock = new MockAdapter(axios)
        mock.onGet(/.+/).replyOnce(200, {
          openid: 'OPENID',
          nickname: 'NICKNAME',
          sex: '1',
          province: 'PROVINCE',
          city: 'CITY',
          country: 'COUNTRY',
          headimgurl:
            'http://wx.qlogo.cn/mmopen/g3MonUZtNHkdmzicIlibx6iaFqAc56vxLSUfpb6n5WKSYVY0ChQKkiaJSgQ1dZuTOgvLLrhJbERQQ4eMsv84eavHiaiceqxibJxCfHe/46',
          privilege: ['PRIVILEGE1', 'PRIVILEGE2'],
        })
      })
      after(() => {
        mock.restore()
      })

      it('should ok', async () => {
        const res = await api.getUserByOpenIdAndAccessToken('openid', 'access_token')
        const keys = ['openid', 'nickname', 'sex', 'province', 'city', 'country', 'headimgurl', 'privilege']

        keys.map(k => assert(Object.keys(res).includes(k)))
      })
    })
  })

  const expectedKeys = ['openid', 'nickname', 'sex', 'province', 'city', 'country', 'headimgurl', 'privilege']
  describe('getUserInformation', () => {
    it('can not get token', async () => {
      const api = new WechatOAuth('appid', 'secret')
      try {
        await api.getUserByOpenId('openid')
        assert(false)
      } catch (error) {
        assert(error.message === 'No token for openid, please authorize first.')
      }
    })

    describe('mock get token error', () => {
      const api = new WechatOAuth('appid', 'secret', undefined, () => {
        throw new Error('get token error')
      })

      it('should error', async () => {
        try {
          await api.getUserByOpenId('openid')
          assert(false)
        } catch (error) {
          assert(error.message === 'get token error')
        }
      })
    })

    describe('mock get null data', () => {
      const api = new WechatOAuth('appid', 'secret', undefined, () => null)

      it('should error', async () => {
        try {
          await api.getUserByOpenId('openid')
          assert(false)
        } catch (error) {
          assert(error.message === 'No token for openid, please authorize first.')
        }
      })
    })

    describe('mock get valid token', () => {
      const api = new WechatOAuth('appid', 'secret', undefined, () => ({
        access_token: 'access_token',
        created_at: new Date().getTime(),
        expires_in: 60,
      }))

      const mock = TypeMoq.Mock.ofInstance(api)

      before(() => {
        mock
          .setup(x =>
            x.getUserByOpenIdAndAccessToken(
              TypeMoq.It.isAnyString(),
              TypeMoq.It.isAnyString(),
              TypeMoq.It.isAnyString(),
            ),
          )
          .returns(async () => ({
            openid: 'OPENID',
            nickname: 'NICKNAME',
            sex: '1',
            province: 'PROVINCE',
            city: 'CITY',
            country: 'COUNTRY',
            headimgurl:
              'http://wx.qlogo.cn/mmopen/g3MonUZtNHkdmzicIlibx6iaFqAc56vxLSUfpb6n5WKSYVY0ChQKkiaJSgQ1dZuTOgvLLrhJbERQQ4eMsv84eavHiaiceqxibJxCfHe/46',
            privilege: ['PRIVILEGE1', 'PRIVILEGE2'],
          }))
      })

      it('should ok with openid', async () => {
        const res = await mock.target.getUserByOpenId('openid')
        expectedKeys.map(k => assert(Object.keys(res).includes(k)))
      })

      it('should ok with lang', async () => {
        const res = await mock.target.getUserByOpenId('openid', 'en')
        expectedKeys.map(k => assert(Object.keys(res).includes(k)))
      })
    })

    describe('mock get invalid token', () => {
      const api = new WechatOAuth('appid', 'secret')

      const mock = TypeMoq.Mock.ofInstance(api)

      before(() => {
        mock.setup(x => x.getToken(TypeMoq.It.isAnyString())).returns(async () => ({
          access_token: 'access_token',
          created_at: new Date().getTime() - 70 * 1000,
          expires_in: 60,
        }))
      })

      it('should error', async () => {
        try {
          await mock.target.getUserByOpenId('openid')
          assert(false)
        } catch (ex) {
          assert(ex.name === 'WechatAPIError')
          assert(ex.message.startsWith('refresh_token missing'))
        }
      })
    })

    describe('mock get invalid token and valid refresh_token', () => {
      const api = new WechatOAuth('appid', 'secret')
      const mock = TypeMoq.Mock.ofInstance(api)

      before(() => {
        mock.setup(x => x.getToken(TypeMoq.It.isAnyString())).returns(async () => ({
          access_token: 'access_token',
          created_at: new Date().getTime() - 70 * 1000,
          expires_in: 60,
        }))

        mock.setup(x => x.refreshAccessToken(TypeMoq.It.isAnyString())).returns(
          async () =>
            new AccessToken({
              access_token: 'ACCESS_TOKEN',
              expires_in: 7200,
              refresh_token: 'REFRESH_TOKEN',
              openid: 'OPENID',
              scope: 'SCOPE',
              created_at: new Date().getTime(),
            }),
        )

        mock
          .setup(x => x.getUserByOpenIdAndAccessToken(TypeMoq.It.isAnyString(), TypeMoq.It.isAnyString()))
          .returns(async () => ({
            openid: 'OPENID',
            nickname: 'NICKNAME',
            sex: '1',
            province: 'PROVINCE',
            city: 'CITY',
            country: 'COUNTRY',
            headimgurl:
              'http://wx.qlogo.cn/mmopen/g3MonUZtNHkdmzicIlibx6iaFqAc56vxLSUfpb6n5WKSYVY0ChQKkiaJSgQ1dZuTOgvLLrhJbERQQ4eMsv84eavHiaiceqxibJxCfHe/46',
            privilege: ['PRIVILEGE1', 'PRIVILEGE2'],
          }))
      })

      it('should ok', async () => {
        const res = await mock.target.getUserByOpenId('openid')

        expectedKeys.map(k => assert(Object.keys(res).includes(k)))
      })
    })
  })

  describe('getUserByCode', () => {
    const api = new WechatOAuth('appid', 'secret')
    const mock = TypeMoq.Mock.ofInstance(api)
    let mockAdapter
    before(() => {
      mockAdapter = new MockAdapter(axios)

      mockAdapter.onGet(/.+/).replyOnce(200, {
        access_token: 'ACCESS_TOKEN',
        expires_in: 7200,
        refresh_token: 'REFRESH_TOKEN',
        openid: 'OPENID',
        scope: 'SCOPE',
      })

      mock
        .setup(x =>
          x.getUserByOpenIdAndAccessToken(TypeMoq.It.isAnyString(), TypeMoq.It.isAnyString(), TypeMoq.It.isAnyString()),
        )
        .returns(async () => ({
          openid: 'OPENID',
          nickname: 'NICKNAME',
          sex: '1',
          province: 'PROVINCE',
          city: 'CITY',
          country: 'COUNTRY',
          headimgurl:
            'http://wx.qlogo.cn/mmopen/g3MonUZtNHkdmzicIlibx6iaFqAc56vxLSUfpb6n5WKSYVY0ChQKkiaJSgQ1dZuTOgvLLrhJbERQQ4eMsv84eavHiaiceqxibJxCfHe/46',
          privilege: ['PRIVILEGE1', 'PRIVILEGE2'],
        }))
    })

    after(() => {
      mockAdapter.restore()
    })

    it('should ok with getUserByCode', async () => {
      const res = await mock.target.getUserByCode('code')
      expectedKeys.map(k => assert(Object.keys(res).includes(k)))
    })
  })

  describe('getQRCode', () => {
    it('should invalid', async () => {
      const api = new WechatOAuth('appid', 'secret')
      try {
        await api.getQRCode()
        assert.fail('should invalid')
      } catch (ex) {
        assert.ok(ex instanceof WechatAPIError)
      }
    })

    it('should invalid appsecret', async () => {
      const api = new WechatOAuth('wxbf55a374f85ce4b1', 'secret')
      try {
        await api.getQRCode()
        assert.fail('should invalid')
      } catch (ex) {
        assert.ok(ex instanceof WechatAPIError)
        assert.ok(ex.message.startsWith('invalid appsecret'))
      }
    })

    it('should ok', async () => {
      const api = new WechatOAuth(process.env.wechatAppId!, process.env.wechatAppSecret!)
      const res = await api.getQRCode()
      console.log('res = ', res)
      assert.ok(res.data)
    })
  })
})
