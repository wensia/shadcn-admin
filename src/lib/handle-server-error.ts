import { showApiErrorToast } from '@/lib/api/error-toast'

export function handleServerError(error: unknown) {
  console.log(error) // eslint-disable-line no-console
  showApiErrorToast(error, '请求失败')
}
