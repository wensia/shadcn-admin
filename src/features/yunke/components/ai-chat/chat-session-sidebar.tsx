import { useState, useRef, useEffect, useMemo } from 'react'
import { Plus, MoreHorizontal, Pencil, Trash2, MessageSquare } from 'lucide-react'
import { Button, Input, Dropdown, Typography } from '@douyinfe/semi-ui-19'
import type { ChatSession } from './use-chat-sessions'

const { Text } = Typography

interface ChatSessionSidebarProps {
  sessions: ChatSession[]
  currentSessionId: string | null
  onNewChat: () => void
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
  onRenameSession: (id: string, title: string) => void
  isLoading: boolean
}

interface DateGroup {
  label: string
  sessions: ChatSession[]
}

function getDateGroup(dateStr: string | null): string {
  if (!dateStr) return '更早'
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)

  if (date >= today) return '今天'
  if (date >= yesterday) return '昨天'
  if (date >= weekAgo) return '最近7天'
  return '更早'
}

const GROUP_ORDER = ['今天', '昨天', '最近7天', '更早']

function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: {
  session: ChatSession
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (title: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(session.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const handleSave = () => {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== session.title) {
      onRename(trimmed)
    } else {
      setEditTitle(session.title)
    }
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div style={{ padding: '2px 4px' }}>
        <Input
          ref={inputRef}
          value={editTitle}
          onChange={v => setEditTitle(v)}
          onBlur={handleSave}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') {
              setEditTitle(session.title)
              setIsEditing(false)
            }
          }}
          size="small"
          style={{ height: 32, fontSize: 13 }}
        />
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 8px',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 13,
        transition: 'background 0.15s',
        background: isActive ? 'var(--semi-color-fill-0)' : undefined,
        color: isActive ? 'var(--semi-color-text-0)' : 'var(--semi-color-text-1)',
      }}
      className="group"
      onClick={onSelect}
      onMouseEnter={e => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--semi-color-fill-0)'
      }}
      onMouseLeave={e => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = ''
      }}
    >
      <MessageSquare style={{ width: 14, height: 14, flexShrink: 0, color: 'var(--semi-color-text-2)' }} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.title}</span>
      <Dropdown
        trigger="click"
        position="bottomRight"
        clickToHide
        render={
          <Dropdown.Menu>
            <Dropdown.Item
              onClick={(e) => {
                e?.stopPropagation()
                setEditTitle(session.title)
                setIsEditing(true)
              }}
            >
              <Pencil style={{ width: 14, height: 14, marginRight: 8 }} />
              重命名
            </Dropdown.Item>
            <Dropdown.Item
              type="danger"
              onClick={(e) => {
                e?.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 style={{ width: 14, height: 14, marginRight: 8 }} />
              删除
            </Dropdown.Item>
          </Dropdown.Menu>
        }
      >
        <Button
          theme="borderless"
          style={{
            opacity: 0,
            flexShrink: 0,
            padding: 2,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            minWidth: 'auto',
            height: 'auto',
          }}
          className="group-hover:!opacity-100"
          onClick={e => e.stopPropagation()}
        >
          <MoreHorizontal style={{ width: 14, height: 14, color: 'var(--semi-color-text-2)' }} />
        </Button>
      </Dropdown>
    </div>
  )
}

export function ChatSessionSidebar({
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  isLoading,
}: ChatSessionSidebarProps) {
  const groups = useMemo<DateGroup[]>(() => {
    const map = new Map<string, ChatSession[]>()
    for (const session of sessions) {
      const label = getDateGroup(session.last_message_at || session.created_at)
      const list = map.get(label) || []
      list.push(session)
      map.set(label, list)
    }
    return GROUP_ORDER
      .filter(label => map.has(label))
      .map(label => ({ label, sessions: map.get(label)! }))
  }, [sessions])

  return (
    <div
      style={{
        width: 260,
        borderRight: '1px solid var(--semi-color-border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--semi-color-bg-0)',
      }}
    >
      <div style={{ padding: 12 }}>
        <Button
          theme="outline"
          block
          icon={<Plus style={{ width: 16, height: 16 }} />}
          onClick={onNewChat}
          style={{ justifyContent: 'flex-start', gap: 8 }}
        >
          新对话
        </Button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
        {isLoading && sessions.length === 0 ? (
          <Text type="tertiary" size="small" style={{ display: 'block', textAlign: 'center', padding: '16px 0' }}>
            加载中...
          </Text>
        ) : sessions.length === 0 ? (
          <Text type="tertiary" size="small" style={{ display: 'block', textAlign: 'center', padding: '16px 0' }}>
            暂无对话
          </Text>
        ) : (
          groups.map(group => (
            <div key={group.label} style={{ marginBottom: 8 }}>
              <Text
                type="tertiary"
                size="small"
                style={{ display: 'block', padding: '6px 8px', fontWeight: 500 }}
              >
                {group.label}
              </Text>
              {group.sessions.map(session => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isActive={session.id === currentSessionId}
                  onSelect={() => onSelectSession(session.id)}
                  onDelete={() => onDeleteSession(session.id)}
                  onRename={(title) => onRenameSession(session.id, title)}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
