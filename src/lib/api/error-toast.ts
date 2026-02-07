import { toast } from 'sonner'
import { getErrorMessage } from './response-handler'

export function showApiErrorToast(error: unknown, fallback = '请求失败') {
  if (
    error &&
    typeof error === 'object' &&
    'messageShown' in error &&
    (error as any).messageShown
  ) {
    return
  }

  const message = getErrorMessage(error, fallback)
  toast.error(message)

  if (error && typeof error === 'object') {
    ;(error as any).messageShown = true
  }
}
