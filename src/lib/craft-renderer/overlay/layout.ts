/**
 * Overlay layout utilities
 *
 * Provides responsive mode detection and layout constants for overlays.
 * Extracted from the original app-level layout module.
 */

import { useState, useEffect } from 'react'

/** Breakpoint for switching between modal and fullscreen overlay modes */
const MODAL_BREAKPOINT = 1200

/** Layout constants for overlay presentation */
export const OVERLAY_LAYOUT = {
  /** Max width for modal overlays */
  modalMaxWidth: 1100,
  /** Max height as viewport percentage for modal overlays */
  modalMaxHeightPercent: 85,
  /** CSS class for modal backdrop */
  modalBackdropClass: 'bg-black/50',
} as const

export type OverlayMode = 'modal' | 'fullscreen'

/**
 * Hook that returns the current overlay mode based on viewport width.
 * - >= 1200px: 'modal' (centered dialog with backdrop)
 * - < 1200px: 'fullscreen' (full viewport takeover)
 */
export function useOverlayMode(): OverlayMode {
  const [mode, setMode] = useState<OverlayMode>(
    typeof window !== 'undefined' && window.innerWidth >= MODAL_BREAKPOINT
      ? 'modal'
      : 'fullscreen'
  )

  useEffect(() => {
    const handleResize = () => {
      setMode(window.innerWidth >= MODAL_BREAKPOINT ? 'modal' : 'fullscreen')
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return mode
}
