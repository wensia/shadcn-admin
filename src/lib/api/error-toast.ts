import { toast } from 'sonner'
import { ApiClientError, getErrorMessage } from './response-handler'

export function showApiErrorToast(error: unknown, fallback = '请求失败') {
  if (error instanceof ApiClientError && error.messageShown) {
    return
  }

  const message = getErrorMessage(error, fallback)
  toast.error(message)

  if (error instanceof ApiClientError) {
    error.messageShown = true
  }
}
