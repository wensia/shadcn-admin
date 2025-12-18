/**
 * StyleProvider - 管理 UI 风格(Mira/Lyra)
 * 遵循 ThemeProvider 模式,使用 Cookie 持久化
 */

import { createContext, useContext, useEffect, useState } from 'react'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'

type Style = 'mira' | 'lyra' | 'maia'

const DEFAULT_STYLE = 'mira'
const STYLE_COOKIE_NAME = 'ui-style'
const STYLE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

type StyleProviderProps = {
  children: React.ReactNode
  defaultStyle?: Style
}

type StyleProviderState = {
  style: Style
  defaultStyle: Style
  setStyle: (style: Style) => void
  resetStyle: () => void
}

const initialState: StyleProviderState = {
  style: DEFAULT_STYLE,
  defaultStyle: DEFAULT_STYLE,
  setStyle: () => null,
  resetStyle: () => null,
}

const StyleContext = createContext<StyleProviderState>(initialState)

export function StyleProvider({
  children,
  defaultStyle = DEFAULT_STYLE,
}: StyleProviderProps) {
  const [style, _setStyle] = useState<Style>(
    () => (getCookie(STYLE_COOKIE_NAME) as Style) || defaultStyle
  )

  useEffect(() => {
    const root = document.documentElement

    // 应用 CSS 类
    root.classList.toggle('style-lyra', style === 'lyra')
    root.classList.toggle('style-maia', style === 'maia')

    // 应用等宽字体（仅 Lyra）
    if (style === 'lyra') {
      root.style.fontFamily = "'JetBrains Mono', 'Fira Code', 'Consolas', monospace"
    } else {
      root.style.fontFamily = ''
    }
  }, [style])

  const setStyle = (newStyle: Style) => {
    setCookie(STYLE_COOKIE_NAME, newStyle, STYLE_COOKIE_MAX_AGE)
    _setStyle(newStyle)
  }

  const resetStyle = () => {
    removeCookie(STYLE_COOKIE_NAME)
    _setStyle(defaultStyle)
  }

  const contextValue = {
    style,
    defaultStyle,
    setStyle,
    resetStyle,
  }

  return (
    <StyleContext.Provider value={contextValue}>
      {children}
    </StyleContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useStyle = () => {
  const context = useContext(StyleContext)

  if (!context) throw new Error('useStyle must be used within a StyleProvider')

  return context
}
