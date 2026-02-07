
import { showApiErrorToast } from '@/lib/api/error-toast'
export function handleServerError(error: unknown) {
  // eslint-disable-next-line no-console
  console.log(error)

  showApiErrorToast(error, '请求失败')
}
