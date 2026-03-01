/**
 * AI 配置页面
 * 独立的 AI 大模型配置管理页面，包含模型配置、场景配置、Prompt 管理和资料库
 */

import { BrainCircuit, Settings2, FileText, Layers, BookOpen } from 'lucide-react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Main } from '@/components/layout/main'
import { Tabs, TabPane } from '@douyinfe/semi-ui-19'
import { AIConfigContent } from '../components/integrations/ai-config-content'
import { AISceneConfigContent } from '../components/integrations/ai-scene-config'
import { AIPromptManager } from '../components/integrations/ai-prompt-manager'
import { AIDocumentLibrary } from '../components/integrations/ai-document-library'

export function AIConfigPage() {
  useDocumentTitle('AI 配置')

  return (
    <Main fixed>
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-6 w-6" style={{ color: 'var(--semi-color-text-2)' }} />
          <div>
            <h1 className="text-2xl font-bold">AI 配置</h1>
            <p className="text-sm" style={{ color: 'var(--semi-color-text-2)' }}>
              管理 AI 大模型服务、场景配置、Prompt 模板和资料库
            </p>
          </div>
        </div>
        <Tabs defaultActiveKey="models" className="flex flex-1 flex-col overflow-hidden">
          <TabPane tab={<span style={{display:'inline-flex',alignItems:'center',gap:8}}><Settings2 size={16}/>模型配置</span>} itemKey="models">
            <AIConfigContent />
          </TabPane>
          <TabPane tab={<span style={{display:'inline-flex',alignItems:'center',gap:8}}><Layers size={16}/>场景配置</span>} itemKey="scenes">
            <AISceneConfigContent />
          </TabPane>
          <TabPane tab={<span style={{display:'inline-flex',alignItems:'center',gap:8}}><FileText size={16}/>Prompt 管理</span>} itemKey="prompts">
            <AIPromptManager />
          </TabPane>
          <TabPane tab={<span style={{display:'inline-flex',alignItems:'center',gap:8}}><BookOpen size={16}/>资料库</span>} itemKey="documents">
            <AIDocumentLibrary />
          </TabPane>
        </Tabs>
      </div>
    </Main>
  )
}
