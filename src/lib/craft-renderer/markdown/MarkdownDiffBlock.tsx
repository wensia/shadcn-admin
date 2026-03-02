/**
 * MarkdownDiffBlock - Renders diff code blocks with syntax highlighting
 *
 * When the markdown viewer encounters a ```diff code block, this component
 * renders it with color-coded additions/deletions using the CodeBlock component.
 *
 * Falls back to the regular CodeBlock if rendering fails.
 */

import { cn } from '../utils'
import { CodeBlock } from './CodeBlock'

export interface MarkdownDiffBlockProps {
  /** Raw diff text from the markdown code block */
  code: string
  className?: string
}

export function MarkdownDiffBlock({ code, className }: MarkdownDiffBlockProps) {
  return <CodeBlock code={code} language="diff" mode="full" className={className} />
}
