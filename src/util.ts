class WechatAPIError extends Error {
  public code!: string
  public meta!: object

  constructor(msg: string) {
    super(msg)

    this.name = 'WechatAPIError'
  }
}

export const wrapper = (requestFunc: (url: string, options?: object) => Promise<any>) => {
  return async (url: string, options?: object) => {
    try {
      const { data } = await requestFunc(url, options)

      if (data.errcode) {
        const error = new WechatAPIError(data.errmsg)
        error.code = data.errcode
        error.meta = { url, options }

        throw error
      }

      return data
    } catch (err) {
      if (!(err instanceof WechatAPIError)) {
        err.name = 'WechatAPI' + err.name
      }

      throw err
    }
  }
}
