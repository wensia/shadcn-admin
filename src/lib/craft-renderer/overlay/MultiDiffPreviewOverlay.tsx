/**
 * MultiDiffPreviewOverlay - Stub
 *
 * The original implementation depends on @pierre/diffs and code-viewer components
 * which are not available in this project. This is a simplified placeholder.
 * Multi-file diff viewing is not needed for the markdown editor use case.
 */

import type { ReactNode } from 'react'

export interface FileChange {
  id: string
  filePath: string
  toolType: 'Edit' | 'Write'
  original: string
  modified: string
  unifiedDiff?: string
  error?: string
}

export interface DiffViewerSettings {
  diffStyle: 'unified' | 'split'
  disableBackground: boolean
}

export interface MultiDiffPreviewOverlayProps {
  isOpen: boolean
  onClose: () => void
  changes: FileChange[]
  consolidated?: boolean
  focusedChangeId?: string
  theme?: 'light' | 'dark'
  embedded?: boolean
  diffViewerSettings?: Partial<DiffViewerSettings>
  onDiffViewerSettingsChange?: (settings: DiffViewerSettings) => void
}

export function MultiDiffPreviewOverlay(_props: MultiDiffPreviewOverlayProps) {
  // Stub - not implemented for this project
  return null
}
