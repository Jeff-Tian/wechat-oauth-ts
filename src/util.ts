class WechatAPIError extends Error {
  public code!: string
  public meta!: object

  constructor(msg: string) {
    super(msg)

    this.name = 'WechatAPIError'
  }
}

export const wrapper = (requestFunc: (url: string, options?: object) => Promise<any>, raw = false) => {
  return async (url: string, options?: object) => {
    try {
      const res = await requestFunc(url, options)

      if (res.data.errcode) {
        const error = new WechatAPIError(res.data.errmsg)
        error.code = res.data.errcode
        error.meta = { url, options }

        throw error
      }

      return raw ? res : res.data
    } catch (err) {
      if (!(err instanceof WechatAPIError)) {
        err.name = 'WechatAPI' + err.name
      }

      throw err
    }
  }
}
