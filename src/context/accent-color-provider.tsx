import { createContext, useContext, useEffect, useState } from 'react'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'

// 可选的主题色
export const ACCENT_COLORS = [
  { value: 'neutral', label: 'Neutral', description: 'Match base color', color: '#737373' },
  { value: 'amber', label: 'Amber', color: '#f59e0b' },
  { value: 'blue', label: 'Blue', color: '#3b82f6' },
  { value: 'cyan', label: 'Cyan', color: '#06b6d4' },
  { value: 'emerald', label: 'Emerald', color: '#10b981' },
  { value: 'fuchsia', label: 'Fuchsia', color: '#d946ef' },
  { value: 'green', label: 'Green', color: '#22c55e' },
  { value: 'indigo', label: 'Indigo', color: '#6366f1' },
  { value: 'lime', label: 'Lime', color: '#84cc16' },
  { value: 'orange', label: 'Orange', color: '#f97316' },
  { value: 'pink', label: 'Pink', color: '#ec4899' },
  { value: 'purple', label: 'Purple', color: '#a855f7' },
  { value: 'red', label: 'Red', color: '#ef4444' },
  { value: 'rose', label: 'Rose', color: '#f43f5e' },
  { value: 'sky', label: 'Sky', color: '#0ea5e9' },
  { value: 'teal', label: 'Teal', color: '#14b8a6' },
  { value: 'violet', label: 'Violet', color: '#8b5cf6' },
  { value: 'yellow', label: 'Yellow', color: '#eab308' },
] as const

export type AccentColor = typeof ACCENT_COLORS[number]['value']

const DEFAULT_ACCENT_COLOR: AccentColor = 'neutral'
const ACCENT_COLOR_COOKIE_NAME = 'vite-ui-accent-color'
const ACCENT_COLOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

type AccentColorProviderProps = {
  children: React.ReactNode
  defaultAccentColor?: AccentColor
  storageKey?: string
}

type AccentColorProviderState = {
  defaultAccentColor: AccentColor
  accentColor: AccentColor
  setAccentColor: (color: AccentColor) => void
  resetAccentColor: () => void
}

const initialState: AccentColorProviderState = {
  defaultAccentColor: DEFAULT_ACCENT_COLOR,
  accentColor: DEFAULT_ACCENT_COLOR,
  setAccentColor: () => null,
  resetAccentColor: () => null,
}

const AccentColorContext = createContext<AccentColorProviderState>(initialState)

export function AccentColorProvider({
  children,
  defaultAccentColor = DEFAULT_ACCENT_COLOR,
  storageKey = ACCENT_COLOR_COOKIE_NAME,
  ...props
}: AccentColorProviderProps) {
  const [accentColor, _setAccentColor] = useState<AccentColor>(
    () => (getCookie(storageKey) as AccentColor) || defaultAccentColor
  )

  useEffect(() => {
    const root = window.document.documentElement

    // 移除所有已有的颜色类
    ACCENT_COLORS.forEach(({ value }) => {
      root.classList.remove(`accent-${value}`)
    })

    // 添加当前颜色类
    if (accentColor !== 'neutral') {
      root.classList.add(`accent-${accentColor}`)
    }
  }, [accentColor])

  const setAccentColor = (color: AccentColor) => {
    setCookie(storageKey, color, ACCENT_COLOR_COOKIE_MAX_AGE)
    _setAccentColor(color)
  }

  const resetAccentColor = () => {
    removeCookie(storageKey)
    _setAccentColor(DEFAULT_ACCENT_COLOR)
  }

  const contextValue = {
    defaultAccentColor,
    accentColor,
    setAccentColor,
    resetAccentColor,
  }

  return (
    <AccentColorContext value={contextValue} {...props}>
      {children}
    </AccentColorContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAccentColor = () => {
  const context = useContext(AccentColorContext)

  if (!context) throw new Error('useAccentColor must be used within an AccentColorProvider')

  return context
}
