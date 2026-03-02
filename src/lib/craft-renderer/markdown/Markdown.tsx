import * as React from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import { cn } from '../utils'
import { CodeBlock, InlineCode } from './CodeBlock'
import { MarkdownDiffBlock } from './MarkdownDiffBlock'
import { MarkdownJsonBlock } from './MarkdownJsonBlock'
import { MarkdownMermaidBlock } from './MarkdownMermaidBlock'
import { MarkdownDatatableBlock } from './MarkdownDatatableBlock'
import { MarkdownSpreadsheetBlock } from './MarkdownSpreadsheetBlock'
import { MarkdownInsightBlock } from './MarkdownInsightBlock'
import { preprocessLinks } from './linkify'
import remarkCollapsibleSections from './remarkCollapsibleSections'
import { CollapsibleSection } from './CollapsibleSection'
import { useCollapsibleMarkdown } from './CollapsibleMarkdownContext'
import { ResizableImage } from './components/ResizableImage'
import { wrapWithSafeProxy } from './safe-components'

/**
 * Render modes for markdown content:
 *
 * - 'terminal': Raw output with minimal formatting, control chars visible
 *   Best for: Debug output, raw logs, when you want to see exactly what's there
 *
 * - 'minimal': Clean rendering with syntax highlighting but no extra chrome
 *   Best for: Chat messages, inline content, when you want readability without clutter
 *
 * - 'full': Rich rendering with beautiful tables, styled code blocks, proper typography
 *   Best for: Documentation, long-form content, when presentation matters
 */
export type RenderMode = 'terminal' | 'minimal' | 'full'

export interface MarkdownProps {
  children: string
  /**
   * Render mode controlling formatting level
   * @default 'minimal'
   */
  mode?: RenderMode
  className?: string
  /**
   * Message ID for memoization (optional)
   * When provided, memoizes parsed blocks to avoid re-parsing during streaming
   */
  id?: string
  /**
   * Callback when a URL is clicked
   */
  onUrlClick?: (url: string) => void
  /**
   * Callback when a file path is clicked
   */
  onFileClick?: (path: string) => void
  /**
   * Callback when a task list checkbox is toggled
   */
  onCheckboxToggle?: (index: number) => void
  /**
   * Callback when an image is resized
   */
  onImageResize?: (src: string, width: number) => void
  /**
   * Enable collapsible headings
   * Requires wrapping in CollapsibleMarkdownProvider
   * @default false
   */
  collapsible?: boolean
  /**
   * Hide expand button on first mermaid block (when message starts with mermaid)
   * Used in chat to avoid overlap with TurnCard's fullscreen button
   * @default true
   */
  hideFirstMermaidExpand?: boolean
}

/** Context for collapsible sections */
interface CollapsibleContext {
  collapsedSections: Set<string>
  toggleSection: (id: string) => void
}

// File path detection regex - matches paths starting with /, ~/, or ./
const FILE_PATH_REGEX = /^(?:\/|~\/|\.\/)[\w\-./@]+\.(?:ts|tsx|js|jsx|mjs|cjs|md|json|yaml|yml|py|go|rs|css|scss|less|html|htm|txt|log|sh|bash|zsh|swift|kt|java|c|cpp|h|hpp|rb|php|xml|toml|ini|cfg|conf|env|sql|graphql|vue|svelte|astro|prisma)$/i

/**
 * Create custom components based on render mode.
 *
 * @param firstMermaidCodeRef - Ref holding the code of the first mermaid block
 *   when the markdown message starts with a mermaid fence. Used to hide the
 *   inline expand button on that block (TurnCard's own fullscreen button
 *   occupies the same top-right position). A ref is used so the closure can
 *   read the latest value without adding content to the memo deps — that would
 *   cause component re-mounting on every streaming update.
 * @param hideFirstMermaidExpand - Whether to hide the expand button on the first
 *   mermaid block when the message starts with a mermaid fence. Defaults to true.
 */
function createComponents(
  mode: RenderMode,
  onUrlClick?: (url: string) => void,
  onFileClick?: (path: string) => void,
  collapsibleContext?: CollapsibleContext | null,
  firstMermaidCodeRef?: React.RefObject<string | null>,
  hideFirstMermaidExpand: boolean = true,
  onCheckboxToggle?: (index: number) => void,
  onImageResize?: (src: string, width: number) => void,
): Partial<Components> {
  const baseComponents: Partial<Components> = {
    // Section wrapper for collapsible headings
    div: ({ node, children, ...props }) => {
      const sectionId = (props as Record<string, unknown>)['data-section-id'] as string | undefined
      const headingLevel = (props as Record<string, unknown>)['data-heading-level'] as number | undefined

      // If this is a collapsible section div and we have context
      if (sectionId && headingLevel && collapsibleContext) {
        return (
          <CollapsibleSection
            sectionId={sectionId}
            headingLevel={headingLevel}
            isCollapsed={collapsibleContext.collapsedSections.has(sectionId)}
            onToggle={collapsibleContext.toggleSection}
          >
            {children}
          </CollapsibleSection>
        )
      }

      // Regular div
      return <div {...props}>{children}</div>
    },
    // Links: Make clickable with callbacks
    a: ({ href, children }) => {
      const handleClick = (e: React.MouseEvent) => {
        e.preventDefault()
        if (href) {
          // Check if it's a file path
          if (FILE_PATH_REGEX.test(href) && onFileClick) {
            onFileClick(href)
          } else if (onUrlClick) {
            onUrlClick(href)
          }
        }
      }

      return (
        <a
          href={href}
          onClick={handleClick}
          className="text-foreground hover:underline cursor-pointer"
        >
          {children}
        </a>
      )
    },
  }

  // Terminal mode: minimal formatting
  if (mode === 'terminal') {
    return {
      ...baseComponents,
      // No special code handling - just monospace
      code: ({ children }) => (
        <code className="font-mono">{children}</code>
      ),
      pre: ({ children }) => (
        <pre className="font-mono whitespace-pre-wrap my-2">{children}</pre>
      ),
      // Minimal paragraph spacing
      p: ({ children }) => <p className="my-1">{children}</p>,
      // Simple lists
      ul: ({ children }) => <ul className="list-disc list-inside my-1">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal list-inside my-1">{children}</ol>,
      li: ({ children }) => <li className="my-0.5">{children}</li>,
      // Plain tables
      table: ({ children }) => (
        <table className="my-2 font-mono text-sm">{children}</table>
      ),
      th: ({ children }) => <th className="text-left pr-4">{children}</th>,
      td: ({ children }) => <td className="pr-4">{children}</td>,
    }
  }

  // Minimal mode: clean with syntax highlighting
  if (mode === 'minimal') {
    return {
      ...baseComponents,
      // Inline code
      code: ({ className, children, ...props }) => {
        const match = /language-(\w+)/.exec(className || '')
        const isBlock = 'node' in props && props.node?.position?.start.line !== props.node?.position?.end.line

        // Block code
        if (match || isBlock) {
          const code = String(children).replace(/\n$/, '')
          if (match?.[1] === 'diff') {
            return <MarkdownDiffBlock code={code} className="my-1" />
          }
          if (match?.[1] === 'json') {
            return <MarkdownJsonBlock code={code} className="my-1" />
          }
          if (match?.[1] === 'datatable') {
            return <MarkdownDatatableBlock code={code} className="my-1" />
          }
          if (match?.[1] === 'spreadsheet') {
            return <MarkdownSpreadsheetBlock code={code} className="my-1" />
          }
          if (match?.[1] === 'insight') {
            return <MarkdownInsightBlock code={code} className="my-1" />
          }
          if (match?.[1] === 'mermaid') {
            const isFirstBlock = hideFirstMermaidExpand &&
                                firstMermaidCodeRef?.current != null &&
                                code === firstMermaidCodeRef.current
            return <MarkdownMermaidBlock code={code} className="my-1" showExpandButton={!isFirstBlock} />
          }
          return <CodeBlock code={code} language={match?.[1]} mode="full" className="my-1" />
        }

        // Inline code
        return <InlineCode>{children}</InlineCode>
      },
      pre: ({ children }) => <>{children}</>,
      // Comfortable paragraph spacing
      p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
      // Styled lists - ul uses tighter spacing, ol uses standard for number alignment
      ul: ({ children, className }) => {
        const isTaskList = className?.includes('contains-task-list')
        return (
          <ul className={isTaskList
            ? 'my-2 space-y-1 list-none ps-[2px]'
            : 'my-2 space-y-1 ps-[16px] pe-2 list-disc marker:text-[var(--md-bullets)]'
          }>
            {children}
          </ul>
        )
      },
      ol: ({ children }) => (
        <ol className="my-2 space-y-1 pl-6 list-decimal">{children}</ol>
      ),
      li: ({ children, className }) => {
        if (className?.includes('task-list-item')) {
          // Unwrap <p> to prevent block-level line breaks in task items
          const unwrapped = React.Children.map(children, (child) =>
            React.isValidElement(child) && child.type === 'p'
              ? child.props.children
              : child,
          )
          return <li>{unwrapped}</li>
        }
        return <li>{children}</li>
      },
      // Clean tables
      table: ({ children }) => (
        <div className="my-3 overflow-x-auto">
          <table className="min-w-full text-sm">{children}</table>
        </div>
      ),
      thead: ({ children }) => <thead className="border-b">{children}</thead>,
      th: ({ children }) => (
        <th className="text-left py-2 px-3 font-semibold text-muted-foreground">{children}</th>
      ),
      td: ({ children }) => (
        <td className="py-2 px-3 border-b border-border/50">{children}</td>
      ),
      // Headings - H1/H2 same size, differentiated by weight
      h1: ({ children, id }) => <h1 id={id} className="font-sans text-[16px] font-bold mt-5 mb-3">{children}</h1>,
      h2: ({ children, id }) => <h2 id={id} className="font-sans text-[16px] font-semibold mt-4 mb-3">{children}</h2>,
      h3: ({ children, id }) => <h3 id={id} className="font-sans text-[15px] font-semibold mt-4 mb-2">{children}</h3>,
      // Blockquotes
      blockquote: ({ children }) => (
        <blockquote className="border-l-2 border-muted-foreground/30 pl-3 my-2 text-muted-foreground italic">
          {children}
        </blockquote>
      ),
      // Task lists (GFM)
      input: ({ type, checked }) => {
        if (type === 'checkbox') {
          const handleClick = onCheckboxToggle
            ? (e: React.MouseEvent<HTMLSpanElement>) => {
                const container = (e.currentTarget as HTMLElement).closest('.markdown-content')
                if (!container) return
                const all = container.querySelectorAll('[role="checkbox"]')
                const idx = Array.from(all).indexOf(e.currentTarget)
                if (idx >= 0) onCheckboxToggle(idx)
              }
            : undefined
          return (
            <span
              role="checkbox"
              aria-checked={!!checked}
              onClick={handleClick}
              className={`mr-2 inline-flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded align-text-bottom border-2 transition-colors ${
                onCheckboxToggle ? 'cursor-pointer' : ''
              } ${
                checked
                  ? 'border-primary bg-primary text-white'
                  : 'border-muted-foreground/40'
              }`}
            >
              {checked && (
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 6l2.5 2.5 4.5-4.5" />
                </svg>
              )}
            </span>
          )
        }
        return <input type={type} />
      },
      // Horizontal rules
      hr: () => <hr className="my-4 border-border" />,
      // Strong/emphasis
      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
      em: ({ children }) => <em className="italic">{children}</em>,
      // Mark tag — badge-style label
      mark: ({ children }) => (
        <mark className="bg-primary/10 text-primary font-medium text-[0.9em] px-1.5 py-0.5 rounded-[4px]"
              style={{ textDecoration: 'none' }}>
          {children}
        </mark>
      ),
      // Resizable images
      img: ({ src, alt, width }) => {
        if (!src) return null
        return (
          <ResizableImage
            src={src}
            alt={alt || ''}
            width={typeof width === 'string' ? parseInt(width, 10) || undefined : (width as number | undefined)}
            onResize={onImageResize}
          />
        )
      },
    }
  }

  // Full mode: rich styling
  return {
    ...baseComponents,
    // Full code blocks with copy button
    code: ({ className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '')
      const isBlock = 'node' in props && props.node?.position?.start.line !== props.node?.position?.end.line

      if (match || isBlock) {
        const code = String(children).replace(/\n$/, '')
        // Diff code blocks → pierre/diffs for a proper diff viewer
        if (match?.[1] === 'diff') {
          return <MarkdownDiffBlock code={code} className="my-1" />
        }
        // JSON code blocks → interactive tree viewer
        if (match?.[1] === 'json') {
          return <MarkdownJsonBlock code={code} className="my-1" />
        }
        // Datatable code blocks → sortable/filterable data table
        if (match?.[1] === 'datatable') {
          return <MarkdownDatatableBlock code={code} className="my-1" />
        }
        // Spreadsheet code blocks → Excel-style grid
        if (match?.[1] === 'spreadsheet') {
          return <MarkdownSpreadsheetBlock code={code} className="my-1" />
        }
        // Insight code blocks → DISC 行为洞察卡片
        if (match?.[1] === 'insight') {
          return <MarkdownInsightBlock code={code} className="my-1" />
        }
        // Mermaid code blocks → zinc-styled SVG diagram.
        // (Same first-block detection as minimal mode — see comment above.)
        if (match?.[1] === 'mermaid') {
          const isFirstBlock = hideFirstMermaidExpand &&
                              firstMermaidCodeRef?.current != null &&
                              code === firstMermaidCodeRef.current
          return <MarkdownMermaidBlock code={code} className="my-1" showExpandButton={!isFirstBlock} />
        }
        return <CodeBlock code={code} language={match?.[1]} mode="full" className="my-1" />
      }

      return <InlineCode>{children}</InlineCode>
    },
    pre: ({ children }) => <>{children}</>,
    // Rich paragraph spacing
    p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
    // Styled lists - ul uses tighter spacing, ol uses standard for number alignment
    ul: ({ children, className }) => {
      const isTaskList = className?.includes('contains-task-list')
      return (
        <ul className={isTaskList
          ? 'my-3 space-y-1.5 list-none ps-[2px]'
          : 'my-3 space-y-1.5 ps-[16px] pe-2 list-disc marker:text-[var(--md-bullets)]'
        }>
          {children}
        </ul>
      )
    },
    ol: ({ children }) => (
      <ol className="my-3 space-y-1.5 pl-6 list-decimal">{children}</ol>
    ),
    li: ({ children, className }) => {
      if (className?.includes('task-list-item')) {
        const unwrapped = React.Children.map(children, (child) =>
          React.isValidElement(child) && child.type === 'p'
            ? child.props.children
            : child,
        )
        return <li className="leading-relaxed">{unwrapped}</li>
      }
      return <li className="leading-relaxed">{children}</li>
    },
    // Beautiful tables
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto rounded-md border">
        <table className="min-w-full divide-y divide-border">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
    tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
    th: ({ children }) => (
      <th className="text-left py-3 px-4 font-semibold text-sm">{children}</th>
    ),
    td: ({ children }) => (
      <td className="py-3 px-4 text-sm">{children}</td>
    ),
    tr: ({ children }) => (
      <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
    ),
    // Rich headings - H1/H2 same size, differentiated by weight
    h1: ({ children, id }) => (
      <h1 id={id} className="font-sans text-[16px] font-bold mt-7 mb-4">{children}</h1>
    ),
    h2: ({ children, id }) => (
      <h2 id={id} className="font-sans text-[16px] font-semibold mt-6 mb-3 flex items-center gap-2"><span className="w-[3px] h-[1em] rounded-full bg-primary inline-block shrink-0" />{children}</h2>
    ),
    h3: ({ children, id }) => (
      <h3 id={id} className="font-sans text-[15px] font-semibold mt-5 mb-3">{children}</h3>
    ),
    h4: ({ children, id }) => (
      <h4 id={id} className="text-[14px] font-semibold mt-3 mb-1">{children}</h4>
    ),
    // Styled blockquotes — compact inner <p> margins so single-line quotes stay slim
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary/40 bg-muted/30 pl-4 pr-3 py-1.5 my-2 rounded-r-md [&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&>p]:my-1">
        {children}
      </blockquote>
    ),
    // Task lists (GFM)
    input: ({ type, checked }) => {
      if (type === 'checkbox') {
        const handleClick = onCheckboxToggle
          ? (e: React.MouseEvent<HTMLSpanElement>) => {
              const container = (e.currentTarget as HTMLElement).closest('.markdown-content')
              if (!container) return
              const all = container.querySelectorAll('[role="checkbox"]')
              const idx = Array.from(all).indexOf(e.currentTarget)
              if (idx >= 0) onCheckboxToggle(idx)
            }
          : undefined
        return (
          <span
            role="checkbox"
            aria-checked={!!checked}
            onClick={handleClick}
            className={`mr-2 inline-flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded align-text-bottom border-2 transition-colors ${
              onCheckboxToggle ? 'cursor-pointer' : ''
            } ${
              checked
                ? 'border-primary bg-primary text-white'
                : 'border-muted-foreground/40'
            }`}
          >
            {checked && (
              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 6l2.5 2.5 4.5-4.5" />
              </svg>
            )}
          </span>
        )
      }
      return <input type={type} />
    },
    // Horizontal rules
    hr: () => <hr className="my-6 border-border" />,
    // Strong/emphasis — bold words get subtle highlight for visual weight
    strong: ({ children }) => <strong className="font-semibold text-primary/90">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    del: ({ children }) => <del className="line-through text-muted-foreground">{children}</del>,
    // Mark tag — badge-style label
    mark: ({ children }) => (
      <mark className="bg-primary/10 text-primary font-medium text-[0.9em] px-1.5 py-0.5 rounded-[4px]"
            style={{ textDecoration: 'none' }}>
        {children}
      </mark>
    ),
    // Resizable images
    img: ({ src, alt, width }) => {
      if (!src) return null
      return (
        <ResizableImage
          src={src}
          alt={alt || ''}
          width={typeof width === 'string' ? parseInt(width, 10) || undefined : (width as number | undefined)}
          onResize={onImageResize}
        />
      )
    },
    // Handle unknown <markdown> tags that may come through rehype-raw
    // Type assertion needed because 'markdown' is not a standard HTML element
    markdown: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  } as Partial<Components>
}

/**
 * Markdown - Customizable markdown renderer with multiple render modes
 *
 * Features:
 * - Three render modes: terminal, minimal, full
 * - Syntax highlighting via Shiki
 * - GFM support (tables, task lists, strikethrough)
 * - Clickable links and file paths
 * - Memoization for streaming performance
 */
export function Markdown({
  children,
  mode = 'minimal',
  className,
  id,
  onUrlClick,
  onFileClick,
  onCheckboxToggle,
  onImageResize,
  collapsible = false,
  hideFirstMermaidExpand = true,
}: MarkdownProps) {
  // Get collapsible context if enabled
  const collapsibleContext = useCollapsibleMarkdown()

  // Extract the first mermaid code block's content when the message starts
  // with a mermaid fence. Stored in a ref so createComponents can read it
  // without adding `children` to the memo deps (which would remount all
  // components on every streaming update, breaking internal state).
  const firstMermaidCodeRef = React.useRef<string | null>(null)
  const trimmed = children.trimStart()
  if (trimmed.startsWith('```mermaid')) {
    const m = trimmed.match(/^```mermaid\n([\s\S]*?)```/)
    firstMermaidCodeRef.current = m?.[1] ? m[1].replace(/\n$/, '') : null
  } else {
    firstMermaidCodeRef.current = null
  }

  const components = React.useMemo(
    () => wrapWithSafeProxy(createComponents(mode, onUrlClick, onFileClick, collapsible ? collapsibleContext : null, firstMermaidCodeRef, hideFirstMermaidExpand, onCheckboxToggle, onImageResize)),
    [mode, onUrlClick, onFileClick, collapsible, collapsibleContext, hideFirstMermaidExpand, onCheckboxToggle, onImageResize]
  )

  // Preprocess to convert raw URLs and file paths to markdown links
  const processedContent = React.useMemo(
    () => preprocessLinks(children),
    [children]
  )

  // Conditionally include the collapsible sections plugin
  const remarkPlugins = React.useMemo(
    () => collapsible ? [remarkGfm, remarkBreaks, remarkCollapsibleSections] : [remarkGfm, remarkBreaks],
    [collapsible]
  )

  return (
    <div className={cn('markdown-content', className)}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={[rehypeRaw, rehypeSlug]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}

/**
 * MemoizedMarkdown - Optimized for streaming scenarios
 *
 * Splits content into blocks and memoizes each block separately,
 * so only new/changed blocks re-render during streaming.
 */
export const MemoizedMarkdown = React.memo(
  Markdown,
  (prevProps, nextProps) => {
    // If id is provided, use it for memoization
    if (prevProps.id && nextProps.id) {
      return (
        prevProps.id === nextProps.id &&
        prevProps.children === nextProps.children &&
        prevProps.mode === nextProps.mode
      )
    }
    // Otherwise compare content and mode
    return (
      prevProps.children === nextProps.children &&
      prevProps.mode === nextProps.mode
    )
  }
)
MemoizedMarkdown.displayName = 'MemoizedMarkdown'

// Re-export for convenience
export { CodeBlock, InlineCode } from './CodeBlock'
export { CollapsibleMarkdownProvider } from './CollapsibleMarkdownContext'
