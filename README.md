# wechat-oauth-ts

> [微信公共平台 OAuth 接口消息服务中间件与 API SDK](https://github.com/node-webot/wechat-oauth) (TypeScript 版)

[![npm download][download-image]][download-url]
[![NPM version](https://badge.fury.io/js/wechat-oauth-ts.png)](http://badge.fury.io/js/wechat-oauth-ts)
[![Build Status](https://travis-ci.com/Jeff-Tian/wechat-oauth-ts.svg?branch=master)](https://travis-ci.com/Jeff-Tian/wechat-oauth-ts)
[![Dependencies Status](https://david-dm.org/Jeff-Tian/wechat-oauth-ts.png)](https://david-dm.org/jeff-tian/wechat-oauth-ts)
[![Coverage Status](https://coveralls.io/repos/github/Jeff-Tian/wechat-oauth-ts/badge.svg?branch=master)](https://coveralls.io/github/Jeff-Tian/wechat-oauth-ts?branch=master)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/Jeff-Tian/wechat-oauth-ts)

[download-image]: https://img.shields.io/npm/dm/wechat-oauth-ts.svg?style=flat-square
[download-url]: https://npmjs.org/package/wechat-oauth-ts

## 功能列表

- OAuth 授权
- 获取基本信息

OAuth2.0 网页授权，使用此接口须通过微信认证，如果用户在微信中（Web 微信除外）访问公众号的第三方网页，公众号开发者可以通过此接口获取当前用户基本信息（包括昵称、性别、城市、国家）。详见：[官方文档](http://mp.weixin.qq.com/wiki/index.php?title=%E7%BD%91%E9%A1%B5%E6%8E%88%E6%9D%83%E8%8E%B7%E5%8F%96%E7%94%A8%E6%88%B7%E5%9F%BA%E6%9C%AC%E4%BF%A1%E6%81%AF)

详细参见 [API 文档](http://doxmate.cool/node-webot/wechat-oauth/api.html)

## 安装

```shell
npm install wechat-oauth-ts
```

## 使用

### 初始化

引入 OAuth 并实例化

```typescript
import WechatOAuth from 'wechat-oauth-ts'
const authClient = new WechatOAuth('appid', 'appsecret')
```

以上即可满足单进程使用。 当多进程时，token 需要全局维护，以下为保存 token 的接口。

```typescript
import WechatOAuth from 'wechat-oauth-ts'

const oauthApi = new WechatOAuth(
  'appid',
  'secret',
  (openid, callback) => {
    // 传入一个根据openid获取对应的全局token的方法
    // 在getUser时会通过该方法来获取token
    fs.readFile(openid + ':access_token.txt', 'utf8', function(err, txt) {
      if (err) {
        return callback(err)
      }
      callback(null, JSON.parse(txt))
    })
  },
  (openid, token, callback) => {
    // 请将token存储到全局，跨进程、跨机器级别的全局，比如写到数据库、redis等
    // 这样才能在cluster模式及多机情况下使用，以下为写入到文件的示例
    // 持久化时请注意，每个openid都对应一个唯一的token!
    fs.writeFile(openid + ':access_token.txt', JSON.stringify(token), callback)
  },
)
```

附上全局维护 AccessToken 的示例代码：

Mongodb|mongoose

```typescript
const TokenSchema = new Schema({
  access_token: String,
  expires_in: Number,
  refresh_token: String,
  openid: String,
  scope: String,
  create_at: String,
})
```

自定义 getToken 方法

```typescript
TokenSchema.statics.getToken = function(openid, cb) {
  this.findOne({ openid: openid }, function(err, result) {
    if (err) throw err
    return cb(null, result)
  })
}
```

自定义 saveToken 方法

```typescript
TokenSchema.statics.setToken = function(openid, token, cb) {
  // 有则更新，无则添加
  var query = { openid: openid }
  var options = { upsert: true }
  this.update(query, token, options, function(err, result) {
    if (err) throw err
    return cb(null)
  })
}

mongoose.model('Token', 'TokenSchema')
```

初始化：

```typescript
var client = new WechatOAuth(
  appid,
  secret,
  function(openid, callback) {
    // 传入一个根据openid获取对应的全局token的方法
    // 在getUser时会通过该方法来获取token
    Token.getToken(openid, callback)
  },
  function(openid, token, callback) {
    // 持久化时请注意，每个openid都对应一个唯一的token!
    Token.setToken(openid, token, callback)
  },
)
```

MySQL:

建表 SQL

```sql
CREATE TABLE `token` (
  `access_token` varchar(200) COLLATE utf8_bin NOT NULL COMMENT '令牌',
  `expires_in` varchar(10) COLLATE utf8_bin NOT NULL COMMENT '有效期',
  `refresh_token` varchar(200) COLLATE utf8_bin NOT NULL COMMENT '刷新参数',
  `openid` varchar(50) COLLATE utf8_bin NOT NULL COMMENT '用户编号',
  `scope` varchar(50) COLLATE utf8_bin NOT NULL COMMENT '作用域',
  `create_at` varchar(20) COLLATE utf8_bin NOT NULL COMMENT '令牌建立时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='微信令牌表';
```

设置 openid 为唯一索引

```sql
ALTER TABLE `token`
  ADD UNIQUE KEY `openid` (`openid`);
```

使用示例：

```typescript
var client = new WechatOAuth(
  appid,
  secret,
  function(openid, callback) {
    var sql = 'SELECT * FROM token WHERE openid = ?'
    db.query(sql, [openid], function(err, result) {
      if (err) {
        return callback(err)
      }
      return callback(null, result[0])
    })
  },
  function(openid, token, callback) {
    var sql =
      'REPLACE INTO token(access_token, expires_in, refresh_token, openid, scope, create_at) VALUES(?, ?, ?, ?, ?, ?)'
    var fields = [token.access_token, token.expires_in, token.refresh_token, token.openid, token.scope, token.create_at]
    db.query(sql, fields, function(err, result) {
      return callback(err)
    })
  },
)
```

### 小程序初始化 (TODO)

使用小程序时，需要在初始化 OAuth 时指定 isMiniProgram 参数为 true

### 引导用户

生成引导用户点击的 URL。

```typescript
var url = client.getAuthorizeURL('redirectUrl', 'state', 'scope')
```

如果是 PC 上的网页，请使用以下方式生成

```typescript
var url = client.getAuthorizeURLForWebsite('redirectUrl')
```

### 获取 Openid 和 AccessToken

用户点击上步生成的 URL 后会被重定向到上步设置的 redirectUrl，并且会带有 code 参数，我们可以使用这个 code 换取 access_token 和用户的 openid

```typescript
client.getAccessToken('code', function(err, result) {
  var accessToken = result.data.access_token
  var openid = result.data.openid
})
```

### 获取客户端 AccessToken

```typescript
const result = await client.getClientAccessToken()

/*
{
  "access_token": "xxx",
  "created_at": 1562670918531,
  "expires_in": 7200
}
 */
```

### 获取用户信息

如果我们生成引导用户点击的 URL 中 scope 参数值为 snsapi_userinfo，接下来我们就可以使用 openid 换取用户详细信息（必须在 getAccessToken 方法执行完成之后）

```typescript
client.getUser(openid, function(err, result) {
  var userInfo = result
})
```

### 生成带参数的二维码

- 示例代码：
  ```typescript
  const result = await client.getQRCodeLink({
    expire_seconds: 604800,
    action_name: 'QR_SCENE',
    action_info: {
      scene: { scene_id: 123 },
    },
  })
  ```
- 实际案例：
  https://github.com/Jeff-Tian/alpha/blob/master/app/controller/wechat-dev.ts#L12

- 实际效果：
  ![生成的二维码](https://uniheart.herokuapp.com/wechat-dev/qr-code?select=passportWechat)

## 开发

1. 修改代码后跑

   ```shell
   npm test
   ```

   确保测试通过。

2. `git commit`
3. `npm version patch/minor/major`
4. `npm publish`
