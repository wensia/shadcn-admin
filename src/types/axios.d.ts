import 'axios'

declare module 'axios' {
  interface AxiosRequestConfig<D = any> {
    _silentBusinessError?: boolean
  }

  interface InternalAxiosRequestConfig<D = any> {
    _silentBusinessError?: boolean
  }
}
