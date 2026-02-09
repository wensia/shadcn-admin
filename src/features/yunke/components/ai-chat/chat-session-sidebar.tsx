import { useState, useRef, useEffect, useMemo } from 'react'
import { Plus, MoreHorizontal, Pencil, Trash2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ChatSession } from './use-chat-sessions'

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
      <div className="px-1 py-0.5">
        <Input
          ref={inputRef}
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') {
              setEditTitle(session.title)
              setIsEditing(false)
            }
          }}
          className="h-8 text-sm"
        />
      </div>
    )
  }

  return (
    <div
      className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors ${
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-accent/50 text-foreground/80'
      }`}
      onClick={onSelect}
    >
      <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{session.title}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded hover:bg-accent"
            onClick={e => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem
            onClick={e => {
              e.stopPropagation()
              setEditTitle(session.title)
              setIsEditing(true)
            }}
          >
            <Pencil className="h-3.5 w-3.5 mr-2" />
            重命名
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={e => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
    <div className="w-[260px] border-r flex flex-col h-full bg-muted/30">
      <div className="p-3">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onNewChat}
        >
          <Plus className="h-4 w-4" />
          新对话
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {isLoading && sessions.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            加载中...
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            暂无对话
          </div>
        ) : (
          groups.map(group => (
            <div key={group.label} className="mb-2">
              <div className="text-xs text-muted-foreground px-2 py-1.5 font-medium">
                {group.label}
              </div>
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
