import { useCallback, useMemo, useState } from 'react'
import { SideSheet } from '@douyinfe/semi-ui-19'
import {
  ChevronDown,
  MoreHorizontal,
  PanelLeftOpen,
  Share2,
} from 'lucide-react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useIsMobile } from '@/hooks/use-mobile'
import { AIChatContainer } from '../components/ai-chat/ai-chat-container'
import { ChatSessionSidebar } from '../components/ai-chat/chat-session-sidebar'
import { useChatSessions } from '../components/ai-chat/use-chat-sessions'

function HeaderIconButton({
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
        color: 'rgb(13, 13, 13)',
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

function ChatGPTHeader({
  title,
  onOpenSidebar,
}: {
  title: string
  onOpenSidebar?: () => void
}) {
  return (
    <header
      style={{
        height: 52,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        background: 'rgb(255, 255, 255)',
        borderBottom: '1px solid rgb(232, 232, 232)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {onOpenSidebar && (
          <HeaderIconButton label='打开边栏' onClick={onOpenSidebar}>
            <PanelLeftOpen size={20} strokeWidth={1.8} />
          </HeaderIconButton>
        )}
        <button
          type='button'
          style={{
            height: 36,
            border: 0,
            borderRadius: 10,
            background: 'transparent',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '0 10px',
            color: 'rgb(13, 13, 13)',
            fontSize: 18,
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.background = 'rgb(244, 244, 244)'
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = 'transparent'
          }}
        >
          <span
            style={{
              maxWidth: 280,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </span>
          <ChevronDown size={16} strokeWidth={1.8} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          type='button'
          style={{
            height: 36,
            border: 0,
            borderRadius: 8,
            background: 'transparent',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '0 10px',
            color: 'rgb(13, 13, 13)',
            fontSize: 14,
            cursor: 'pointer',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.background = 'rgb(244, 244, 244)'
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = 'transparent'
          }}
        >
          <Share2 size={18} strokeWidth={1.8} />
          分享
        </button>
        <HeaderIconButton label='更多'>
          <MoreHorizontal size={20} strokeWidth={1.8} />
        </HeaderIconButton>
      </div>
    </header>
  )
}

function AIDataWorkspace() {
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const {
    sessions,
    currentSessionId,
    isLoading,
    createSession,
    deleteSession,
    renameSession,
    selectSession,
    updateSessionTitle,
  } = useChatSessions()

  const currentSessionTitle = useMemo(() => {
    return (
      sessions.find((session) => session.id === currentSessionId)?.title ||
      'AI 数据助手'
    )
  }, [currentSessionId, sessions])

  const handleNewChat = useCallback(async () => {
    await createSession()
  }, [createSession])

  const handleTitleGenerated = useCallback(
    (sessionId: string, title: string) => {
      updateSessionTitle(sessionId, title)
    },
    [updateSessionTitle]
  )

  return (
    <div
      style={{
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        background: 'rgb(255, 255, 255)',
        color: 'rgb(13, 13, 13)',
      }}
    >
      {!isMobile && (
        <ChatSessionSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onNewChat={handleNewChat}
          onSelectSession={selectSession}
          onDeleteSession={deleteSession}
          onRenameSession={renameSession}
          isLoading={isLoading}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
        />
      )}

      {isMobile && (
        <SideSheet
          visible={sidebarOpen}
          onCancel={() => setSidebarOpen(false)}
          placement='left'
          width={300}
          bodyStyle={{ padding: 0 }}
          closable={false}
        >
          <ChatSessionSidebar
            sessions={sessions}
            currentSessionId={currentSessionId}
            onNewChat={() => {
              void handleNewChat()
              setSidebarOpen(false)
            }}
            onSelectSession={(id) => {
              selectSession(id)
              setSidebarOpen(false)
            }}
            onDeleteSession={deleteSession}
            onRenameSession={renameSession}
            isLoading={isLoading}
            onCloseSidebar={() => setSidebarOpen(false)}
          />
        </SideSheet>
      )}

      <section
        style={{
          minWidth: 0,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: 'rgb(255, 255, 255)',
        }}
      >
        <ChatGPTHeader
          title={currentSessionTitle}
          onOpenSidebar={isMobile ? () => setSidebarOpen(true) : undefined}
        />
        <AIChatContainer
          sessionId={currentSessionId}
          onTitleGenerated={handleTitleGenerated}
          ensureSession={createSession}
        />
      </section>
    </div>
  )
}

export function YunkeAIAssistantPage() {
  useDocumentTitle('AI 数据助手')

  return <AIDataWorkspace />
}
