/**
 * CodePreviewOverlay - Stub
 *
 * The original implementation depends on ShikiCodeViewer from code-viewer
 * which is not available in this project. This is a simplified placeholder.
 */

export interface CodePreviewOverlayProps {
  isOpen: boolean
  onClose: () => void
  content: string
  filePath: string
  language?: string
  mode?: 'read' | 'write'
  startLine?: number
  totalLines?: number
  numLines?: number
  theme?: 'light' | 'dark'
  error?: string
  embedded?: boolean
  command?: string
}

export function CodePreviewOverlay(_props: CodePreviewOverlayProps) {
  return null
}
