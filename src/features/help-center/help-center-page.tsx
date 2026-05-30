import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Button, Empty, Input, Tag } from '@douyinfe/semi-ui-19'
import { IconSearch } from '@douyinfe/semi-icons'
import {
  BookOpen,
  Clock3,
  FileText,
  FolderOpen,
  Link2,
  ListTree,
} from 'lucide-react'
import { Main } from '@/components/layout/main'
import {
  defaultHelpDoc,
  HELP_CATEGORY_ORDER,
  HELP_KIND_LABEL,
  helpDocuments,
  type HelpDocument,
} from './help-content'
import { MarkdownRenderer } from './markdown-renderer'
import './help-center.css'

type HelpKindFilter = 'all' | 'guide' | 'changelog'

const kindFilters: Array<{ key: HelpKindFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'guide', label: '使用教程' },
  { key: 'changelog', label: '更新历史' },
]

function normalizeKeyword(keyword: string) {
  return keyword.trim().toLowerCase()
}

function getKindTagColor(kind: HelpDocument['kind']) {
  return kind === 'changelog' ? 'amber' : 'blue'
}

function getDocIcon(kind: HelpDocument['kind']) {
  return kind === 'changelog' ? Clock3 : FileText
}

function groupDocs(docs: HelpDocument[]) {
  return HELP_CATEGORY_ORDER.map((category) => ({
    category,
    docs: docs.filter((doc) => doc.category === category),
  })).filter((group) => group.docs.length > 0)
}

export function HelpCenterPage() {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { doc?: string }
  const [keyword, setKeyword] = useState('')
  const [kindFilter, setKindFilter] = useState<HelpKindFilter>('all')

  const normalizedKeyword = normalizeKeyword(keyword)

  const visibleDocs = useMemo(() => {
    return helpDocuments.filter((doc) => {
      const kindMatched = kindFilter === 'all' || doc.kind === kindFilter
      const keywordMatched =
        !normalizedKeyword || doc.searchText.includes(normalizedKeyword)
      return kindMatched && keywordMatched
    })
  }, [kindFilter, normalizedKeyword])

  const currentDoc = useMemo(() => {
    if (visibleDocs.length === 0) return undefined

    const selectedId =
      typeof search.doc === 'string' && search.doc.length > 0
        ? search.doc
        : defaultHelpDoc?.id

    return (
      visibleDocs.find((doc) => doc.id === selectedId) ??
      visibleDocs[0] ??
      defaultHelpDoc
    )
  }, [search.doc, visibleDocs])

  useEffect(() => {
    if (!currentDoc) return
    if (search.doc === currentDoc.id) return

    void navigate({
      to: '/help-center',
      search: { doc: currentDoc.id },
      replace: true,
    })
  }, [currentDoc, navigate, search.doc])

  const groupedDocs = useMemo(() => groupDocs(visibleDocs), [visibleDocs])

  const handleSelectDoc = (docId: string) => {
    void navigate({
      to: '/help-center',
      search: { doc: docId },
    })
  }

  return (
    <Main fixed fluid className="help-center-main">
      <section className="help-center-shell">
        <header className="help-center-toolbar">
          <div>
            <h1 className="help-center-title">帮助中心</h1>
            <p className="help-center-subtitle">
              查找 CRM 使用教程、常用流程和更新历史。
            </p>
          </div>

          <div className="help-center-controls">
            <Input
              prefix={<IconSearch />}
              showClear
              composition
              value={keyword}
              placeholder="搜索标题、正文、部门"
              onChange={(value) => setKeyword(value)}
              style={{ width: 300 }}
            />
            <div className="help-center-kind-switch" role="tablist">
              {kindFilters.map((item) => (
                <Button
                  key={item.key}
                  theme={kindFilter === item.key ? 'solid' : 'borderless'}
                  type={kindFilter === item.key ? 'primary' : 'tertiary'}
                  onClick={() => setKindFilter(item.key)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </header>

        <div className="help-center-layout">
          <aside className="help-center-nav" aria-label="帮助文档目录">
            {groupedDocs.length > 0 ? (
              groupedDocs.map((group) => (
                <section key={group.category} className="help-center-nav-group">
                  <h2 className="help-center-nav-group-title">
                    <FolderOpen size={14} />
                    {group.category}
                  </h2>
                  <div className="help-center-doc-list">
                    {group.docs.map((doc) => {
                      const Icon = getDocIcon(doc.kind)
                      const active = currentDoc?.id === doc.id
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          className={`help-center-doc-item${active ? ' is-active' : ''}`}
                          onClick={() => handleSelectDoc(doc.id)}
                        >
                          <span className="help-center-doc-item-title">
                            <Icon size={14} />
                            {doc.title}
                          </span>
                          <span className="help-center-doc-item-summary">
                            {doc.summary}
                          </span>
                          <span className="help-center-doc-item-meta">
                            <Tag
                              size="small"
                              color={getKindTagColor(doc.kind)}
                              type="light"
                            >
                              {HELP_KIND_LABEL[doc.kind]}
                            </Tag>
                            <Tag size="small" color="grey" type="light">
                              {doc.updatedAt}
                            </Tag>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))
            ) : (
              <div className="help-center-empty">
                <Empty
                  title="没有找到文档"
                  description="换个关键词或切换文档类型试试"
                />
              </div>
            )}
          </aside>

          <article className="help-center-document">
            {currentDoc ? (
              <>
                <header className="help-center-doc-header">
                  <div className="help-center-doc-kicker">
                    <Tag
                      color={getKindTagColor(currentDoc.kind)}
                      type="light"
                    >
                      {HELP_KIND_LABEL[currentDoc.kind]}
                    </Tag>
                    <Tag color="grey" type="light">
                      更新于 {currentDoc.updatedAt}
                    </Tag>
                    {currentDoc.audiences.map((audience) => (
                      <Tag key={audience} color="white" type="light">
                        {audience}
                      </Tag>
                    ))}
                  </div>
                  <h2 className="help-center-doc-title">{currentDoc.title}</h2>
                  <p className="help-center-doc-summary">
                    {currentDoc.summary}
                  </p>
                  {currentDoc.relatedRoutes.length > 0 && (
                    <div
                      className="help-center-related"
                      aria-label="相关系统入口"
                    >
                      {currentDoc.relatedRoutes.map((route) => (
                        <Link
                          key={route}
                          to={route}
                          className="help-center-route-link"
                        >
                          <Link2 size={13} />
                          {route}
                        </Link>
                      ))}
                    </div>
                  )}
                </header>
                <div className="help-center-markdown">
                  <MarkdownRenderer content={currentDoc.renderBody} />
                </div>
              </>
            ) : (
              <div className="help-center-empty">
                <Empty
                  title="没有找到文档"
                  description="换个关键词或切换文档类型试试"
                />
              </div>
            )}
          </article>

          <aside className="help-center-outline" aria-label="当前文档目录">
            <h2 className="help-center-outline-title">
              <ListTree size={15} />
              本文目录
            </h2>
            {currentDoc && currentDoc.headings.length > 0 ? (
              <nav className="help-center-outline-list">
                {currentDoc.headings.map((heading) => (
                  <a
                    key={`${heading.id}-${heading.text}`}
                    href={`#${heading.id}`}
                    className={`help-center-outline-link depth-${heading.depth}`}
                  >
                    {heading.text}
                  </a>
                ))}
              </nav>
            ) : (
              <Empty
                title="暂无目录"
                description="当前文档标题较少"
                image={<BookOpen size={42} />}
              />
            )}
          </aside>
        </div>
      </section>
    </Main>
  )
}
