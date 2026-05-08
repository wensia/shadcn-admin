import ReactMarkdown, { type Components } from 'react-markdown'
import { Link, type LinkProps } from '@tanstack/react-router'
import rehypeSlug from 'rehype-slug'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
}

function isExternalHref(href: string) {
  return (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('//') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  )
}

function parseHelpDocHref(href: string) {
  if (!href.startsWith('/help-center')) return null
  const [, query = ''] = href.split('?')
  const doc = new URLSearchParams(query).get('doc')
  return doc ? { doc } : {}
}

function stripQueryAndHash(href: string) {
  const queryIndex = href.indexOf('?')
  const hashIndex = href.indexOf('#')
  const endCandidates = [queryIndex, hashIndex].filter((index) => index >= 0)
  const end = endCandidates.length > 0 ? Math.min(...endCandidates) : href.length
  return href.slice(0, end)
}

const markdownComponents: Components = {
  h1: ({ children, ...props }) => (
    <h1 className="help-markdown-h1" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="help-markdown-h2" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="help-markdown-h3" {...props}>
      {children}
    </h3>
  ),
  table: ({ children }) => (
    <div className="help-markdown-table-wrap">
      <table className="help-markdown-table">{children}</table>
    </div>
  ),
  th: ({ children, ...props }) => (
    <th className="help-markdown-th" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="help-markdown-td" {...props}>
      {children}
    </td>
  ),
  code: ({ children, className, ...props }) => {
    if (!className) {
      return (
        <code className="help-markdown-inline-code" {...props}>
          {children}
        </code>
      )
    }

    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },
  pre: ({ children, ...props }) => (
    <pre className="help-markdown-pre" {...props}>
      {children}
    </pre>
  ),
  a: ({ children, href = '', ...props }) => {
    if (!href) {
      return <span {...props}>{children}</span>
    }

    if (href.startsWith('#')) {
      return (
        <a className="help-markdown-link" href={href} {...props}>
          {children}
        </a>
      )
    }

    if (isExternalHref(href)) {
      return (
        <a
          className="help-markdown-link"
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          {...props}
        >
          {children}
        </a>
      )
    }

    const helpSearch = parseHelpDocHref(href)
    if (helpSearch) {
      return (
        <Link
          className="help-markdown-link"
          to="/help-center"
          search={helpSearch}
        >
          {children}
        </Link>
      )
    }

    if (href.startsWith('/')) {
      return (
        <Link
          className="help-markdown-link"
          to={stripQueryAndHash(href) as LinkProps['to']}
        >
          {children}
        </Link>
      )
    }

    return (
      <a className="help-markdown-link" href={href} {...props}>
        {children}
      </a>
    )
  },
  img: ({ src = '', alt = '' }) => (
    <img className="help-markdown-img" src={src} alt={alt} loading="lazy" />
  ),
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      skipHtml
      remarkPlugins={[remarkGfm, remarkBreaks]}
      rehypePlugins={[rehypeSlug]}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  )
}
