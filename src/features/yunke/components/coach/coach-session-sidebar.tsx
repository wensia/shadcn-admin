import { useEffect, useMemo, useRef, useState } from 'react'
import { Clock3, Keyboard, MoreHorizontal, Pencil, PhoneCall, Trash2 } from 'lucide-react'
import { Dropdown, Input, Tag, Typography } from '@douyinfe/semi-ui-19'
import type { TrainingSession } from './coach-types'

const { Text } = Typography

function getGroupLabel(dateValue: string | null | undefined) {
  if (!dateValue) return '更早'

  const target = new Date(dateValue)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)

  if (target >= today) return '今天'
  if (target >= yesterday) return '昨天'
  if (target >= weekAgo) return '最近 7 天'
  return '更早'
}

const GROUP_ORDER = ['今天', '昨天', '最近 7 天', '更早']

function SessionRow({
  session,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  session: TrainingSession
  active: boolean
  onSelect: () => void
  onRename: (title: string) => void
  onDelete: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(session.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  if (isEditing) {
    return (
      <div className="px-1 py-1">
        <Input
          ref={inputRef}
          value={draftTitle}
          size="small"
          onChange={(value) => setDraftTitle(value)}
          onBlur={() => {
            const next = draftTitle.trim()
            if (next && next !== session.title) onRename(next)
            setDraftTitle(session.title)
            setIsEditing(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              const next = draftTitle.trim()
              if (next && next !== session.title) onRename(next)
              setDraftTitle(session.title)
              setIsEditing(false)
            }
            if (event.key === 'Escape') {
              setDraftTitle(session.title)
              setIsEditing(false)
            }
          }}
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group w-full rounded-2xl border px-3 py-3 text-left transition-all"
      style={{
        borderColor: active ? 'rgba(17, 24, 39, 0.14)' : 'rgba(148, 163, 184, 0.18)',
        background: active
          ? 'linear-gradient(145deg, rgba(255,245,238,0.94), rgba(255,255,255,0.98))'
          : 'rgba(255,255,255,0.82)',
        boxShadow: active ? '0 16px 30px rgba(15, 23, 42, 0.08)' : 'none',
      }}
    >
      <div className="mb-2 flex items-start gap-2">
        <div
          className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full"
          style={{
            background: session.mode === 'voice' ? 'rgba(251, 113, 133, 0.12)' : 'rgba(59, 130, 246, 0.12)',
            color: session.mode === 'voice' ? '#E11D48' : '#2563EB',
          }}
        >
          {session.mode === 'voice' ? <PhoneCall className="h-4 w-4" /> : <Keyboard className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900">{session.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Tag size="small" color={session.mode === 'voice' ? 'red' : 'blue'}>
              {session.mode === 'voice' ? '语音' : '文字'}
            </Tag>
            <Text type="tertiary" size="small">
              {session.difficulty}
            </Text>
            {session.current_stage && (
              <Text type="tertiary" size="small">
                {session.current_stage}
              </Text>
            )}
          </div>
        </div>
        <Dropdown
          trigger="click"
          position="bottomRight"
          clickToHide
          render={
            <Dropdown.Menu>
              <Dropdown.Item
                onClick={(event) => {
                  event?.stopPropagation()
                  setDraftTitle(session.title)
                  setIsEditing(true)
                }}
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                重命名
              </Dropdown.Item>
              <Dropdown.Item
                type="danger"
                onClick={(event) => {
                  event?.stopPropagation()
                  onDelete()
                }}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                删除
              </Dropdown.Item>
            </Dropdown.Menu>
          }
        >
          <span
            className="rounded-lg p-1 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4 text-slate-400" />
          </span>
        </Dropdown>
      </div>

      <div className="flex items-center gap-1 text-xs text-slate-400">
        <Clock3 className="h-3.5 w-3.5" />
        <span>{new Date(session.last_message_at || session.created_at).toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })}</span>
      </div>
    </button>
  )
}

interface CoachSessionSidebarProps {
  sessions: TrainingSession[]
  currentSessionId: string | null
  isLoading: boolean
  onSelectSession: (sessionId: string) => void
  onRenameSession: (sessionId: string, title: string) => void
  onDeleteSession: (sessionId: string) => void
}

export function CoachSessionSidebar({
  sessions,
  currentSessionId,
  isLoading,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
}: CoachSessionSidebarProps) {
  const groups = useMemo(() => {
    const map = new Map<string, TrainingSession[]>()
    sessions.forEach((session) => {
      const label = getGroupLabel(session.last_message_at || session.created_at)
      const list = map.get(label) || []
      list.push(session)
      map.set(label, list)
    })

    return GROUP_ORDER
      .filter((label) => map.has(label))
      .map((label) => ({ label, items: map.get(label) || [] }))
  }, [sessions])

  return (
    <aside
      className="flex h-full w-[280px] flex-col border-r"
      style={{
        borderColor: 'rgba(148, 163, 184, 0.18)',
        background: 'linear-gradient(180deg, rgba(255,252,248,0.98), rgba(248,250,252,0.92))',
      }}
    >
      <div className="border-b px-4 py-4" style={{ borderColor: 'rgba(148, 163, 184, 0.16)' }}>
        <div className="text-sm font-semibold text-slate-900">陪练记录</div>
        <Text type="tertiary" size="small" className="mt-1 block">
          文字与语音会话统一归档，方便复盘连续追踪。
        </Text>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {isLoading && sessions.length === 0 ? (
          <Text type="tertiary" size="small">加载中...</Text>
        ) : null}

        {!isLoading && sessions.length === 0 ? (
          <div
            className="rounded-2xl border px-4 py-5"
            style={{ borderColor: 'rgba(148, 163, 184, 0.18)', background: 'rgba(255,255,255,0.82)' }}
          >
            <div className="text-sm font-medium text-slate-900">还没有陪练会话</div>
            <Text type="tertiary" size="small" className="mt-2 block">
              先在右侧训练设置里新建一场文字或语音陪练。
            </Text>
          </div>
        ) : null}

        {groups.map((group) => (
          <section key={group.label}>
            <div className="mb-2 px-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              {group.label}
            </div>
            <div className="space-y-2">
              {group.items.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  active={session.id === currentSessionId}
                  onSelect={() => onSelectSession(session.id)}
                  onRename={(title) => onRenameSession(session.id, title)}
                  onDelete={() => onDeleteSession(session.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  )
}
