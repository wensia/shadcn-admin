/**
 * TerminalPreviewOverlay - Stub
 *
 * The original implementation depends on TerminalOutput from terminal
 * which is not available in this project. This is a simplified placeholder.
 */

export type ToolType = 'bash' | 'grep' | 'glob'

export interface TerminalPreviewOverlayProps {
  isOpen: boolean
  onClose: () => void
  command: string
  output: string
  exitCode?: number
  toolType?: ToolType
  description?: string
  theme?: 'light' | 'dark'
  error?: string
  embedded?: boolean
}

export function TerminalPreviewOverlay(_props: TerminalPreviewOverlayProps) {
  return null
}
