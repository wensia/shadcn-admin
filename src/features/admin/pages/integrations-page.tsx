/**
 * 集成配置页面
 * 整合所有外部服务/API 密钥配置
 */

import { useSearch, useNavigate } from '@tanstack/react-router'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Mic, Bot, Webhook, KeyRound, Settings2 } from 'lucide-react'

import { Main } from '@/components/layout/main'
import { Tabs, TabPane } from '@douyinfe/semi-ui-19'

// Tab 内容组件（将逐步创建）
import { ASRConfigContent } from '../components/integrations/asr-config-content'
import { DingtalkRobotsContent } from '../components/integrations/dingtalk-robots-content'
import { WebhookHooksContent } from '../components/integrations/webhook-hooks-content'
import { ApiKeysContent } from '../components/integrations/api-keys-content'

// Tab 配置
const TABS = [
  { id: 'asr', label: 'ASR 配置', icon: Mic, description: '语音识别服务' },
  { id: 'dingtalk', label: '钉钉机器人', icon: Bot, description: '钉钉群通知' },
  { id: 'webhook', label: 'Webhook', icon: Webhook, description: '外部回调钩子' },
  { id: 'apikeys', label: 'API 密钥', icon: KeyRound, description: '系统接口密钥' },
] as const

type TabId = typeof TABS[number]['id']

export function IntegrationsPage() {
  useDocumentTitle('集成配置')
  const navigate = useNavigate()
  const search = useSearch({ from: '/_authenticated/admin/integrations' })
  const tabFromSearch = search.tab as TabId
  const currentTab = TABS.some((tab) => tab.id === tabFromSearch) ? tabFromSearch : 'asr'

  // Tab 切换时更新 URL
  const handleTabChange = (value: string) => {
    navigate({
      to: '/admin/integrations',
      search: { tab: value },
      replace: true,
    })
  }

  return (
    <Main fixed>
      <div className="flex h-full flex-col gap-4">
        {/* 标题栏 */}
        <div className="flex items-center gap-3">
          <Settings2 className="h-6 w-6" style={{ color: 'var(--semi-color-text-2)' }} />
          <div>
            <h1 className="text-2xl font-bold">集成配置</h1>
            <p className="text-sm" style={{ color: 'var(--semi-color-text-2)' }}>
              管理外部服务、API 密钥和系统集成
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          activeKey={currentTab}
          onChange={handleTabChange}
          className="flex flex-1 flex-col overflow-hidden"
        >
          {TABS.map((tab) => (
            <TabPane
              key={tab.id}
              tab={<span style={{display:'inline-flex',alignItems:'center',gap:8}}><tab.icon size={16}/>{tab.label}</span>}
              itemKey={tab.id}
            >
              <div className="h-full flex flex-col pt-4">
                {tab.id === 'asr' && <ASRConfigContent />}
                {tab.id === 'dingtalk' && <DingtalkRobotsContent />}
                {tab.id === 'webhook' && <WebhookHooksContent />}
                {tab.id === 'apikeys' && <ApiKeysContent />}
              </div>
            </TabPane>
          ))}
        </Tabs>
      </div>
    </Main>
  )
}
