import { type ReactElement, type ReactNode } from 'react'
import { Toast } from '@douyinfe/semi-ui-19'

Toast.config({
  top: 16,
  left: 16,
  theme: 'normal',
  duration: 3,
})

type ToastId = string
type ToastContent = string | number | ReactElement
type ToastLevel = 'info' | 'success' | 'warning' | 'error'
type ToastValue<T> = ToastContent | ((value: T) => ToastContent)

type ToastMessageOptions = {
  description?: ReactNode
  duration?: number
}

type PromiseMessages<T> = {
  loading?: ToastContent
  success?: ToastValue<T>
  error?: ToastValue<unknown>
}

let toastPromiseId = 0

function resolveToastValue<T>(
  value: ToastValue<T> | undefined,
  payload: T,
  fallback: ToastContent
) {
  if (typeof value === 'function') {
    return value(payload)
  }

  return value ?? fallback
}

function normalizeToastInput(input: ToastContent | { content: ToastContent; id?: ToastId; duration?: number }) {
  if (typeof input === 'string') {
    return input
  }

  if (typeof input === 'number') {
    return { content: input }
  }

  if ('content' in input) {
    return input
  }

  return { content: input }
}

function showToast(level: ToastLevel, input: ToastContent | { content: ToastContent; id?: ToastId; duration?: number }) {
  return Toast[level](normalizeToastInput(input))
}

export const toast = {
  info(input: ToastContent | { content: ToastContent; id?: ToastId; duration?: number }) {
    return showToast('info', input)
  },

  success(input: ToastContent | { content: ToastContent; id?: ToastId; duration?: number }) {
    return showToast('success', input)
  },

  warning(input: ToastContent | { content: ToastContent; id?: ToastId; duration?: number }) {
    return showToast('warning', input)
  },

  error(input: ToastContent | { content: ToastContent; id?: ToastId; duration?: number }) {
    return showToast('error', input)
  },

  message(title: ToastContent, options: ToastMessageOptions = {}) {
    const { description, duration } = options

    return Toast.info({
      content: description ? (
        <div className='flex flex-col gap-2'>
          <div>{title}</div>
          <div>{description}</div>
        </div>
      ) : title,
      duration,
    })
  },

  promise<T>(promiseLike: Promise<T>, messages: PromiseMessages<T>) {
    const id = `toast-promise-${toastPromiseId++}`

    if (messages.loading) {
      Toast.info({
        id,
        content: messages.loading,
        duration: 0,
        showClose: false,
      })
    }

    return Promise.resolve(promiseLike)
      .then((value) => {
        const content = resolveToastValue(messages.success, value, '操作成功')

        if (messages.loading) {
          Toast.success({ id, content })
        } else {
          Toast.success({ content })
        }

        return value
      })
      .catch((error) => {
        const content = resolveToastValue(messages.error, error, '操作失败')

        if (messages.loading) {
          Toast.error({ id, content })
        } else {
          Toast.error({ content })
        }

        throw error
      })
  },

  dismiss(id?: ToastId) {
    if (typeof id !== 'undefined') {
      Toast.close(String(id))
      return
    }

    Toast.destroyAll()
  },
}
