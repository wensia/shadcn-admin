/* eslint-disable react-refresh/only-export-components */
/**
 * Semi Design 侧边栏状态 Context
 * 替代 shadcn SidebarProvider，保持 useSidebar() 接口兼容
 * 提供: state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { setCookie } from '@/lib/cookies'

const SIDEBAR_COOKIE_NAME = 'sidebar_state'
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_KEYBOARD_SHORTCUT = 'b'

type SidebarContextProps = {
  state: 'expanded' | 'collapsed'
  open: boolean
  setOpen: (open: boolean | ((prev: boolean) => boolean)) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = createContext<SidebarContextProps | null>(null)

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.')
  }
  return context
}

export function SidebarProvider({
  defaultOpen = true,
  children,
}: {
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = useState(false)
  const [open, _setOpen] = useState(defaultOpen)

  const setOpen = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      _setOpen((prev) => {
        const newValue = typeof value === 'function' ? value(prev) : value
        setCookie(SIDEBAR_COOKIE_NAME, String(newValue), SIDEBAR_COOKIE_MAX_AGE)
        return newValue
      })
    },
    []
  )

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setOpenMobile((prev) => !prev)
    } else {
      setOpen((prev) => !prev)
    }
  }, [isMobile, setOpen])

  // Ctrl+B 快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (e.metaKey || e.ctrlKey)
      ) {
        e.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSidebar])

  const state = open ? 'expanded' : 'collapsed'

  const value = useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
  )

  return <SidebarContext value={value}>{children}</SidebarContext>
}
