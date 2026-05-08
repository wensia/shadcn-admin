import GithubSlugger from 'github-slugger'
import {
  helpDocs,
  type HelpDocCategory,
  type HelpDocKind,
  type HelpDocMeta,
} from '@/content/help/manifest'

const markdownModules = import.meta.glob('/src/content/help/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

export interface HelpHeading {
  id: string
  text: string
  depth: 2 | 3
}

export interface HelpDocument extends HelpDocMeta {
  body: string
  renderBody: string
  headings: HelpHeading[]
  searchText: string
}

export const HELP_CATEGORY_ORDER: HelpDocCategory[] = [
  '快速开始',
  '市场部',
  '咨询部',
  '教管部',
  '更新历史',
]

export const HELP_KIND_LABEL: Record<HelpDocKind, string> = {
  guide: '使用教程',
  changelog: '更新历史',
}

function stripMarkdownInline(text: string) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractHeadings(body: string): HelpHeading[] {
  const slugger = new GithubSlugger()
  return body
    .split('\n')
    .map((line) => {
      const match = /^(#{2,3})\s+(.+?)\s*#*$/.exec(line.trim())
      if (!match) return null

      const text = stripMarkdownInline(match[2])
      if (!text) return null

      return {
        id: slugger.slug(text),
        text,
        depth: match[1].length as 2 | 3,
      }
    })
    .filter((heading): heading is HelpHeading => Boolean(heading))
}

function stripLeadingTitle(body: string, expectedTitle: string) {
  const lines = body.split('\n')
  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0)
  if (firstContentIndex < 0) return body

  const match = /^#\s+(.+?)\s*#*$/.exec(lines[firstContentIndex].trim())
  if (!match) return body

  const title = stripMarkdownInline(match[1])
  if (title !== expectedTitle) return body

  lines.splice(firstContentIndex, 1)
  return lines.join('\n').trimStart()
}

function buildSearchText(doc: HelpDocMeta, body: string) {
  return [
    doc.title,
    doc.summary,
    doc.category,
    doc.kind,
    doc.audiences.join(' '),
    doc.relatedRoutes.join(' '),
    stripMarkdownInline(body),
  ]
    .join('\n')
    .toLowerCase()
}

function compareDocuments(a: HelpDocument, b: HelpDocument) {
  if (a.kind === 'changelog' && b.kind === 'changelog') {
    return b.updatedAt.localeCompare(a.updatedAt) || a.order - b.order
  }
  return a.order - b.order
}

export const helpDocuments: HelpDocument[] = helpDocs
  .map((doc) => {
    const body = markdownModules[doc.path] ?? ''
    return {
      ...doc,
      body,
      renderBody: stripLeadingTitle(body, doc.title),
      headings: extractHeadings(body),
      searchText: buildSearchText(doc, body),
    }
  })
  .sort(compareDocuments)

export const defaultHelpDoc =
  helpDocuments.find((doc) => doc.id === 'overview') ?? helpDocuments[0]
