/**
 * 集成配置页面
 * 整合所有外部服务/API 密钥配置
 */

import { useSearch, useNavigate } from '@tanstack/react-router'
import { Mic, Bot, Webhook, CloudCog, KeyRound, Settings2 } from 'lucide-react'

import { Main } from '@/components/layout/main'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Tab 内容组件（将逐步创建）
import { ASRConfigContent } from '../components/integrations/asr-config-content'
import { DingtalkRobotsContent } from '../components/integrations/dingtalk-robots-content'
import { WebhookHooksContent } from '../components/integrations/webhook-hooks-content'
import { YunkeAccountsContent } from '../components/integrations/yunke-accounts-content'
import { ApiKeysContent } from '../components/integrations/api-keys-content'

// Tab 配置
const TABS = [
  { id: 'asr', label: 'ASR 配置', icon: Mic, description: '语音识别服务' },
  { id: 'dingtalk', label: '钉钉机器人', icon: Bot, description: '钉钉群通知' },
  { id: 'webhook', label: 'Webhook', icon: Webhook, description: '外部回调钩子' },
  { id: 'yunke', label: '云客账号', icon: CloudCog, description: '外呼系统' },
  { id: 'apikeys', label: 'API 密钥', icon: KeyRound, description: '系统接口密钥' },
] as const

type TabId = typeof TABS[number]['id']

export function IntegrationsPage() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/_authenticated/admin/integrations' })
  const currentTab = (search.tab as TabId) || 'asr'

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
          <Settings2 className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">集成配置</h1>
            <p className="text-sm text-muted-foreground">
              管理外部服务、API 密钥和系统集成
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={currentTab}
          onValueChange={handleTabChange}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab 内容区域 */}
          <div className="flex-1 overflow-hidden pt-4">
            <TabsContent value="asr" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
              <ASRConfigContent />
            </TabsContent>
            <TabsContent value="dingtalk" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
              <DingtalkRobotsContent />
            </TabsContent>
            <TabsContent value="webhook" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
              <WebhookHooksContent />
            </TabsContent>
            <TabsContent value="yunke" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
              <YunkeAccountsContent />
            </TabsContent>
            <TabsContent value="apikeys" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
              <ApiKeysContent />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </Main>
  )
}
