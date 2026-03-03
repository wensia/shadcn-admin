import { useState } from 'react'
import { Fragment } from 'react/jsx-runtime'
import { format } from 'date-fns'
import {
  ArrowLeft,
  MoreVertical,
  Edit,
  Paperclip,
  Phone,
  ImagePlus,
  Plus,
  Search as SearchIcon,
  Send,
  Video,
  MessagesSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, Button, Divider, Input as SemiInput } from '@douyinfe/semi-ui-19'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { HeaderActions } from '@/components/layout/header-actions'
import { NewChat } from './components/new-chat'
import { type ChatUser, type Convo } from './data/chat-types'
// Fake Data
import { conversations } from './data/convo.json'

export function Chats() {
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null)
  const [mobileSelectedUser, setMobileSelectedUser] = useState<ChatUser | null>(
    null
  )
  const [createConversationDialogOpened, setCreateConversationDialog] =
    useState(false)

  // Filtered data based on the search query
  const filteredChatList = conversations.filter(({ fullName }) =>
    fullName.toLowerCase().includes(search.trim().toLowerCase())
  )

  const currentMessage = selectedUser?.messages.reduce(
    (acc: Record<string, Convo[]>, obj) => {
      const key = format(obj.timestamp, 'd MMM, yyyy')

      // Create an array for the category if it doesn't exist
      if (!acc[key]) {
        acc[key] = []
      }

      // Push the current object to the array
      acc[key].push(obj)

      return acc
    },
    {}
  )

  const users = conversations.map(({ messages, ...user }) => user)

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <Search />
        <HeaderActions showSearch={false} />
      </Header>

      <Main fixed>
        <section className='flex h-full gap-6'>
          {/* Left Side */}
          <div className='flex w-full flex-col gap-2 sm:w-56 lg:w-72 2xl:w-80'>
            <div className='sticky top-0 z-10 -mx-4 bg-background px-4 pb-3 shadow-md sm:static sm:z-auto sm:mx-0 sm:p-0 sm:shadow-none'>
              <div className='flex items-center justify-between py-2'>
                <div className='flex gap-2'>
                  <h1 className='text-2xl font-bold'>Inbox</h1>
                  <MessagesSquare size={20} />
                </div>

                <Button
                  theme='borderless'
                  type='tertiary'
                  icon={<Edit size={24} />}
                  onClick={() => setCreateConversationDialog(true)}
                  className='rounded-lg'
                />
              </div>

              <SemiInput
                prefix={<SearchIcon size={15} className='stroke-slate-500' />}
                placeholder='Search chat...'
                value={search}
                onChange={(v) => setSearch(v)}
                showClear
                style={{ width: '100%' }}
              />
            </div>

            <div className='-mx-3 h-full overflow-auto p-3'>
              {filteredChatList.map((chatUsr) => {
                const { id, profile, username, messages, fullName } = chatUsr
                const lastConvo = messages[0]
                const lastMsg =
                  lastConvo.sender === 'You'
                    ? `You: ${lastConvo.message}`
                    : lastConvo.message
                return (
                  <Fragment key={id}>
                    <div
                      role='button'
                      tabIndex={0}
                      className={cn(
                        'group hover:bg-accent hover:text-accent-foreground cursor-pointer',
                        `flex w-full rounded-md px-2 py-2 text-start text-sm`,
                        selectedUser?.id === id && 'sm:bg-muted'
                      )}
                      onClick={() => {
                        setSelectedUser(chatUsr)
                        setMobileSelectedUser(chatUsr)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSelectedUser(chatUsr)
                          setMobileSelectedUser(chatUsr)
                        }
                      }}
                    >
                      <div className='flex gap-2'>
                        <Avatar size='default' src={profile} alt={username}>{username}</Avatar>
                        <div>
                          <span className='col-start-2 row-span-2 font-medium'>
                            {fullName}
                          </span>
                          <span className='col-start-2 row-span-2 row-start-2 line-clamp-2 text-ellipsis' style={{ color: 'var(--semi-color-text-2)' }}>
                            {lastMsg}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Divider style={{ margin: '4px 0' }} />
                  </Fragment>
                )
              })}
            </div>
          </div>

          {/* Right Side */}
          {selectedUser ? (
            <div
              className={cn(
                'absolute inset-0 start-full z-50 hidden w-full flex-1 flex-col border shadow-xs sm:static sm:z-auto sm:flex sm:rounded-md',
                mobileSelectedUser && 'start-0 flex'
              )}
              style={{ background: 'var(--semi-color-bg-0)', borderColor: 'var(--semi-color-border)' }}
            >
              {/* Top Part */}
              <div className='mb-1 flex flex-none justify-between p-4 shadow-lg sm:rounded-t-md' style={{ background: 'var(--semi-color-bg-1)' }}>
                {/* Left */}
                <div className='flex gap-3'>
                  <Button
                    theme='borderless'
                    type='tertiary'
                    icon={<ArrowLeft className='rtl:rotate-180' />}
                    className='-ms-2 h-full sm:hidden'
                    onClick={() => setMobileSelectedUser(null)}
                  />
                  <div className='flex items-center gap-2 lg:gap-4'>
                    <Avatar
                      size='small'
                      src={selectedUser.profile}
                      alt={selectedUser.username}
                    >{selectedUser.username}</Avatar>
                    <div>
                      <span className='col-start-2 row-span-2 text-sm font-medium lg:text-base'>
                        {selectedUser.fullName}
                      </span>
                      <span className='col-start-2 row-span-2 row-start-2 line-clamp-1 block max-w-32 text-xs text-nowrap text-ellipsis lg:max-w-none lg:text-sm' style={{ color: 'var(--semi-color-text-2)' }}>
                        {selectedUser.title}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right */}
                <div className='-me-1 flex items-center gap-1 lg:gap-2'>
                  <Button
                    theme='borderless'
                    type='tertiary'
                    icon={<Video size={22} />}
                    className='hidden size-8 rounded-full sm:inline-flex lg:size-10'
                  />
                  <Button
                    theme='borderless'
                    type='tertiary'
                    icon={<Phone size={22} />}
                    className='hidden size-8 rounded-full sm:inline-flex lg:size-10'
                  />
                  <Button
                    theme='borderless'
                    type='tertiary'
                    icon={<MoreVertical className='sm:size-5' />}
                    className='h-10 rounded-md sm:h-8 sm:w-4 lg:h-10 lg:w-6'
                  />
                </div>
              </div>

              {/* Conversation */}
              <div className='flex flex-1 flex-col gap-2 rounded-md px-4 pt-0 pb-4'>
                <div className='flex size-full flex-1'>
                  <div className='chat-text-container relative -me-4 flex flex-1 flex-col overflow-y-hidden'>
                    <div className='chat-flex flex h-40 w-full grow flex-col-reverse justify-start gap-4 overflow-y-auto py-2 pe-4 pb-4'>
                      {currentMessage &&
                        Object.keys(currentMessage).map((key) => (
                          <Fragment key={key}>
                            {currentMessage[key].map((msg, index) => (
                              <div
                                key={`${msg.sender}-${msg.timestamp}-${index}`}
                                className={cn(
                                  'chat-box max-w-72 px-3 py-2 wrap-break-word shadow-lg',
                                  msg.sender === 'You'
                                    ? 'self-end rounded-[16px_16px_0_16px] bg-primary/90 text-primary-foreground/75'
                                    : 'self-start rounded-[16px_16px_16px_0] bg-muted'
                                )}
                              >
                                {msg.message}{' '}
                                <span
                                  className={cn(
                                    'mt-1 block text-xs font-light text-foreground/75 italic',
                                    msg.sender === 'You' &&
                                      'text-end text-primary-foreground/85'
                                  )}
                                >
                                  {format(msg.timestamp, 'h:mm a')}
                                </span>
                              </div>
                            ))}
                            <div className='text-center text-xs'>{key}</div>
                          </Fragment>
                        ))}
                    </div>
                  </div>
                </div>
                <div className='flex w-full flex-none gap-2'>
                  <div className='flex flex-1 items-center gap-2 rounded-md border px-2 py-1 focus-within:ring-1 focus-within:ring-ring focus-within:outline-hidden lg:gap-4' style={{ borderColor: 'var(--semi-color-border)', background: 'var(--semi-color-bg-1)' }}>
                    <div className='space-x-1'>
                      <Button
                        theme='borderless'
                        type='tertiary'
                        icon={<Plus size={20} />}
                        className='h-8 rounded-md'
                      />
                      <Button
                        theme='borderless'
                        type='tertiary'
                        icon={<ImagePlus size={20} />}
                        className='hidden h-8 rounded-md lg:inline-flex'
                      />
                      <Button
                        theme='borderless'
                        type='tertiary'
                        icon={<Paperclip size={20} />}
                        className='hidden h-8 rounded-md lg:inline-flex'
                      />
                    </div>
                    <SemiInput
                      placeholder='Type your messages...'
                      style={{ flex: 1, border: 'none', background: 'transparent' }}
                    />
                    <Button
                      theme='borderless'
                      type='tertiary'
                      icon={<Send size={20} />}
                      className='hidden sm:inline-flex'
                    />
                  </div>
                  <Button theme='solid' className='h-full sm:hidden'>
                    <Send size={18} /> Send
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'absolute inset-0 start-full z-50 hidden w-full flex-1 flex-col justify-center rounded-md border shadow-xs sm:static sm:z-auto sm:flex'
              )}
              style={{ background: 'var(--semi-color-bg-1)', borderColor: 'var(--semi-color-border)' }}
            >
              <div className='flex flex-col items-center space-y-6'>
                <div className='flex size-16 items-center justify-center rounded-full border-2' style={{ borderColor: 'var(--semi-color-border)' }}>
                  <MessagesSquare className='size-8' />
                </div>
                <div className='space-y-2 text-center'>
                  <h1 className='text-xl font-semibold'>Your messages</h1>
                  <p className='text-sm' style={{ color: 'var(--semi-color-text-2)' }}>
                    Send a message to start a chat.
                  </p>
                </div>
                <Button theme='solid' onClick={() => setCreateConversationDialog(true)}>
                  Send message
                </Button>
              </div>
            </div>
          )}
        </section>
        <NewChat
          users={users}
          onOpenChange={setCreateConversationDialog}
          open={createConversationDialogOpened}
        />
      </Main>
    </>
  )
}
