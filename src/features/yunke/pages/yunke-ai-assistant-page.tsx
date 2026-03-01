import { useCallback, useState } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useIsMobile } from '@/hooks/use-mobile'
import { Main } from '@/components/layout/main'
import { SideSheet } from '@douyinfe/semi-ui-19'
import { AIChatContainer } from '../components/ai-chat/ai-chat-container'
import { ChatSessionSidebar } from '../components/ai-chat/chat-session-sidebar'
import { useChatSessions } from '../components/ai-chat/use-chat-sessions'

export function YunkeAIAssistantPage() {
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

  useDocumentTitle('AI 数据助手')
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleNewChat = useCallback(async () => {
    await createSession()
  }, [createSession])

  const handleTitleGenerated = useCallback((sessionId: string, title: string) => {
    updateSessionTitle(sessionId, title)
  }, [updateSessionTitle])

  return (
    <Main fixed className='pt-0'>
      <div className="flex h-[calc(100dvh-theme(spacing.16))]">
        {/* 桌面端：直接显示侧边栏 */}
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

        {/* 移动端：SideSheet 抽屉侧边栏 */}
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
    </Main>
  )
}
