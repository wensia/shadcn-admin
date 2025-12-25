/**
 * StyleProvider - 固定使用 Lyra 风格
 */

import { createContext, useContext } from 'react'

type Style = 'lyra'

type StyleProviderProps = {
  children: React.ReactNode
}

type StyleProviderState = {
  style: Style
}

const StyleContext = createContext<StyleProviderState>({ style: 'lyra' })

export function StyleProvider({ children }: StyleProviderProps) {
  // 固定为 Lyra 风格，等宽字体已在 index.css 中全局设置
  return (
    <StyleContext.Provider value={{ style: 'lyra' }}>
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
