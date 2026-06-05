import { useEffect, useMemo, useRef, useState } from 'react'
import { Dropdown, Input } from '@douyinfe/semi-ui-19'
import {
  Folder,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Search,
  SquarePen,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import type { ChatSession } from './use-chat-sessions'

interface ChatSessionSidebarProps {
  sessions: ChatSession[]
  currentSessionId: string | null
  onNewChat: () => void
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
  onRenameSession: (id: string, title: string) => void
  isLoading: boolean
  onCloseSidebar?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

interface DateGroup {
  label: string
  sessions: ChatSession[]
}

const GROUP_ORDER = ['今天', '昨天', '最近7天', '更早']

const menuButtonStyle = {
  height: 36,
  width: '100%',
  border: '1px solid transparent',
  borderRadius: 10,
  background: 'transparent',
  color: 'rgb(13, 13, 13)',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '0 10px',
  fontSize: 14,
  lineHeight: '20px',
  cursor: 'pointer',
} satisfies React.CSSProperties

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

function SidebarIconButton({
  label,
  children,
  onClick,
}: {
  label: string
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type='button'
      aria-label={label}
      onClick={onClick}
      style={{
        width: 36,
        height: 36,
        border: 0,
        borderRadius: 8,
        background: 'transparent',
        color: 'rgb(143, 143, 143)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = 'rgb(244, 244, 244)'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}

function SidebarMenuButton({
  icon,
  children,
  onClick,
}: {
  icon: React.ReactNode
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      style={menuButtonStyle}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = 'rgb(244, 244, 244)'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'transparent'
      }}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

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
  const [isHovered, setIsHovered] = useState(false)
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
      <div style={{ padding: '2px 8px' }}>
        <Input
          ref={inputRef}
          value={editTitle}
          onChange={(value) => setEditTitle(value)}
          onBlur={handleSave}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleSave()
            if (event.key === 'Escape') {
              setEditTitle(session.title)
              setIsEditing(false)
            }
          }}
          style={{
            height: 32,
            fontSize: 14,
            borderRadius: 8,
          }}
        />
      </div>
    )
  }

  return (
    <button
      type='button'
      onClick={onSelect}
      onMouseEnter={(event) => {
        setIsHovered(true)
        if (!isActive) {
          event.currentTarget.style.background = 'rgb(244, 244, 244)'
        }
      }}
      onMouseLeave={(event) => {
        setIsHovered(false)
        if (!isActive) {
          event.currentTarget.style.background = 'transparent'
        }
      }}
      style={{
        height: 36,
        width: '100%',
        border: '1px solid transparent',
        borderRadius: 10,
        background: isActive ? 'rgb(243, 243, 243)' : 'transparent',
        color: 'rgb(13, 13, 13)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px 0 10px',
        gap: 8,
        fontSize: 14,
        lineHeight: '20px',
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          minWidth: 0,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {session.title}
      </span>
      <Dropdown
        trigger='click'
        position='bottomRight'
        clickToHide
        render={
          <Dropdown.Menu>
            <Dropdown.Item
              onClick={(event) => {
                event?.stopPropagation()
                setEditTitle(session.title)
                setIsEditing(true)
              }}
            >
              <Pencil size={14} style={{ marginRight: 8 }} />
              重命名
            </Dropdown.Item>
            <Dropdown.Item
              type='danger'
              onClick={(event) => {
                event?.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 size={14} style={{ marginRight: 8 }} />
              删除
            </Dropdown.Item>
          </Dropdown.Menu>
        }
      >
        <span
          onClick={(event) => event.stopPropagation()}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgb(143, 143, 143)',
            opacity: isActive || isHovered ? 1 : 0,
            flexShrink: 0,
          }}
        >
          <MoreHorizontal size={18} strokeWidth={1.8} />
        </span>
      </Dropdown>
    </button>
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
  onCloseSidebar,
  collapsed = false,
  onToggleCollapse,
}: ChatSessionSidebarProps) {
  const groups = useMemo<DateGroup[]>(() => {
    const map = new Map<string, ChatSession[]>()
    for (const session of sessions) {
      const label = getDateGroup(session.last_message_at || session.created_at)
      const list = map.get(label) || []
      list.push(session)
      map.set(label, list)
    }
    return GROUP_ORDER.filter((label) => map.has(label)).map((label) => ({
      label,
      sessions: map.get(label)!,
    }))
  }, [sessions])

  if (collapsed) {
    return (
      <aside
        aria-label='历史聊天记录'
        style={{
          width: 52,
          height: '100%',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'rgb(249, 249, 249)',
          borderRight: '1px solid rgb(232, 232, 232)',
          color: 'rgb(13, 13, 13)',
          transition: 'width 0.18s ease',
        }}
      >
        <div
          style={{
            height: 52,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SidebarIconButton label='展开边栏' onClick={onToggleCollapse}>
            <PanelLeftOpen size={20} strokeWidth={1.8} />
          </SidebarIconButton>
        </div>

        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            padding: '0 0 10px',
            borderBottom: '1px solid rgb(232, 232, 232)',
          }}
        >
          <SidebarIconButton label='新聊天' onClick={onNewChat}>
            <SquarePen size={19} strokeWidth={1.8} />
          </SidebarIconButton>
          <SidebarIconButton label='搜索聊天'>
            <Search size={19} strokeWidth={1.8} />
          </SidebarIconButton>
          <SidebarIconButton label='CRM 数据助手'>
            <Folder size={19} strokeWidth={1.8} />
          </SidebarIconButton>
        </div>

        <div style={{ minHeight: 0, flex: 1 }} />

        <div
          style={{
            width: '100%',
            borderTop: '1px solid rgb(232, 232, 232)',
            padding: '8px 0',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'rgb(238, 238, 238)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UserRound size={16} strokeWidth={1.8} />
          </span>
        </div>
      </aside>
    )
  }

  return (
    <aside
      aria-label='历史聊天记录'
      style={{
        width: 260,
        height: '100%',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgb(249, 249, 249)',
        borderRight: '1px solid rgb(232, 232, 232)',
        color: 'rgb(13, 13, 13)',
        transition: 'width 0.18s ease',
      }}
    >
      <div
        style={{
          height: 52,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 8px 8px 16px',
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: 0,
            color: 'rgb(13, 13, 13)',
          }}
        >
          RMF CRM
        </div>
        {onCloseSidebar ? (
          <SidebarIconButton label='关闭边栏' onClick={onCloseSidebar}>
            <X size={20} strokeWidth={1.8} />
          </SidebarIconButton>
        ) : (
          <SidebarIconButton label='收起边栏' onClick={onToggleCollapse}>
            <PanelLeftClose size={20} strokeWidth={1.8} />
          </SidebarIconButton>
        )}
      </div>

      <div
        style={{
          padding: '0 6px 10px',
          borderBottom: '1px solid rgb(232, 232, 232)',
        }}
      >
        <SidebarMenuButton
          icon={<SquarePen size={18} strokeWidth={1.8} />}
          onClick={onNewChat}
        >
          新聊天
        </SidebarMenuButton>
        <SidebarMenuButton
          icon={<Search size={18} strokeWidth={1.8} />}
          onClick={() => undefined}
        >
          搜索聊天
        </SidebarMenuButton>
        <SidebarMenuButton
          icon={<Folder size={18} strokeWidth={1.8} />}
          onClick={() => undefined}
        >
          CRM 数据助手
        </SidebarMenuButton>
      </div>

      <div
        style={{
          minHeight: 0,
          flex: 1,
          overflowY: 'auto',
          padding: '0 6px 8px',
        }}
      >
        {isLoading && sessions.length === 0 ? (
          <div
            style={{
              padding: '18px 10px',
              color: 'rgb(143, 143, 143)',
              fontSize: 14,
            }}
          >
            加载中...
          </div>
        ) : sessions.length === 0 ? (
          <div
            style={{
              padding: '18px 10px',
              color: 'rgb(143, 143, 143)',
              fontSize: 14,
            }}
          >
            暂无对话
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} style={{ marginTop: 12 }}>
              <div
                style={{
                  padding: '6px 10px',
                  color: 'rgb(95, 95, 95)',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {group.label === '最近7天' ? '最近' : group.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {group.sessions.map((session) => (
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
            </div>
          ))
        )}
      </div>

      <div
        style={{
          flexShrink: 0,
          borderTop: '1px solid rgb(232, 232, 232)',
          padding: '8px 10px',
        }}
      >
        <div
          style={{
            height: 44,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 6px',
            color: 'rgb(13, 13, 13)',
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgb(238, 238, 238)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <UserRound size={16} strokeWidth={1.8} />
          </span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span
              style={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: 14,
              }}
            >
              超级管理员
            </span>
            <span
              style={{
                display: 'block',
                color: 'rgb(143, 143, 143)',
                fontSize: 12,
              }}
            >
              CRM Pro
            </span>
          </span>
        </div>
      </div>
    </aside>
  )
}
