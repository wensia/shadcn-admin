import { useCallback } from 'react'
import { Main } from '@/components/layout/main'
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

  const handleNewChat = useCallback(async () => {
    await createSession()
  }, [createSession])

  const handleTitleGenerated = useCallback((sessionId: string, title: string) => {
    updateSessionTitle(sessionId, title)
  }, [updateSessionTitle])

  return (
    <Main fixed className='pt-0'>
      <div className="flex h-[calc(100vh-theme(spacing.16))]">
        <ChatSessionSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onNewChat={handleNewChat}
          onSelectSession={selectSession}
          onDeleteSession={deleteSession}
          onRenameSession={renameSession}
          isLoading={isLoading}
        />
        <div className="flex-1 min-w-0">
          <AIChatContainer
            sessionId={currentSessionId}
            onTitleGenerated={handleTitleGenerated}
          />
        </div>
      </div>
    </Main>
  )
}
