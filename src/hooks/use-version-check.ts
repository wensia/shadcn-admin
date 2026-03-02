import { useEffect, useRef, useCallback } from 'react'

export function useVersionCheck(onNewVersion: () => void) {
  const hasNotified = useRef(false)

  const check = useCallback(async () => {
    if (import.meta.env.DEV || hasNotified.current) return
    try {
      const res = await fetch('/version.json', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (data.buildId && data.buildId !== __BUILD_ID__) {
        hasNotified.current = true
        onNewVersion()
      }
    } catch {
      // 网络错误静默忽略
    }
  }, [onNewVersion])

  useEffect(() => {
    if (import.meta.env.DEV) return

    const timer = setTimeout(check, 10_000)
    const interval = setInterval(check, 60_000)

    const onFocus = () => check()
    window.addEventListener('focus', onFocus)

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [check])
}
