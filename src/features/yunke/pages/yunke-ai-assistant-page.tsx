import { useCallback, useState } from 'react'
import { MessageSquareText, PhoneCall } from 'lucide-react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useIsMobile } from '@/hooks/use-mobile'
import { Main } from '@/components/layout/main'
import { Button, SideSheet } from '@douyinfe/semi-ui-19'
import { AIChatContainer } from '../components/ai-chat/ai-chat-container'
import { ChatSessionSidebar } from '../components/ai-chat/chat-session-sidebar'
import { useChatSessions } from '../components/ai-chat/use-chat-sessions'
import { CoachWorkspace } from '../components/coach/coach-workspace'

type WorkspaceMode = 'assistant' | 'coach'

function AIDataWorkspace() {
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

  const handleNewChat = useCallback(async () => {
    await createSession()
  }, [createSession])

  const handleTitleGenerated = useCallback((sessionId: string, title: string) => {
    updateSessionTitle(sessionId, title)
  }, [updateSessionTitle])

  return (
    <div className="flex flex-1 min-h-0">
      {!isMobile && (
        <ChatSessionSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onNewChat={handleNewChat}
          onSelectSession={selectSession}
          onDeleteSession={deleteSession}
          onRenameSession={renameSession}
          isLoading={isLoading}
        />
      )}

      {isMobile && (
        <SideSheet
          visible={sidebarOpen}
          onCancel={() => setSidebarOpen(false)}
          placement="left"
          width={280}
          bodyStyle={{ padding: 0 }}
          title="对话列表"
        >
          <ChatSessionSidebar
            sessions={sessions}
            currentSessionId={currentSessionId}
            onNewChat={() => { handleNewChat(); setSidebarOpen(false) }}
            onSelectSession={(id) => { selectSession(id); setSidebarOpen(false) }}
            onDeleteSession={deleteSession}
            onRenameSession={renameSession}
            isLoading={isLoading}
          />
        </SideSheet>
      )}

      <div className="flex-1 min-w-0">
        <AIChatContainer
          sessionId={currentSessionId}
          onTitleGenerated={handleTitleGenerated}
          ensureSession={createSession}
          onOpenSidebar={isMobile ? () => setSidebarOpen(true) : undefined}
        />
      </div>
    </div>
  )
}

export function YunkeAIAssistantPage() {
  const [mode, setMode] = useState<WorkspaceMode>('assistant')

  useDocumentTitle(mode === 'coach' ? '课程顾问陪练' : 'AI 数据助手')

  return (
    <Main fixed className='pt-0'>
      <div className="px-4 pb-4 pt-4">
        <div
          className="inline-flex rounded-[20px] border p-1.5"
          style={{
            borderColor: 'rgba(148, 163, 184, 0.18)',
            background: 'linear-gradient(145deg, rgba(255,252,248,0.92), rgba(248,250,252,0.94))',
          }}
        >
          <Button
            icon={<MessageSquareText className="h-4 w-4" />}
            type={mode === 'assistant' ? 'primary' : 'tertiary'}
            theme={mode === 'assistant' ? 'solid' : 'borderless'}
            onClick={() => setMode('assistant')}
            style={{ borderRadius: 14 }}
          >
            AI 数据助手
          </Button>
          <Button
            icon={<PhoneCall className="h-4 w-4" />}
            type={mode === 'coach' ? 'primary' : 'tertiary'}
            theme={mode === 'coach' ? 'solid' : 'borderless'}
            onClick={() => setMode('coach')}
            style={{ borderRadius: 14 }}
          >
            顾问陪练
          </Button>
        </div>
      </div>

      {mode === 'coach' ? <CoachWorkspace /> : <AIDataWorkspace />}
    </Main>
  )
}
