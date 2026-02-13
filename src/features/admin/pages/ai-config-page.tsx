/**
 * AI 配置页面
 * 独立的 AI 大模型配置管理页面，包含模型配置、场景配置、Prompt 管理和资料库
 */

import { BrainCircuit, Settings2, FileText, Layers, BookOpen } from 'lucide-react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Main } from '@/components/layout/main'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
          <BrainCircuit className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">AI 配置</h1>
            <p className="text-sm text-muted-foreground">
              管理 AI 大模型服务、场景配置、Prompt 模板和资料库
            </p>
          </div>
        </div>
        <Tabs defaultValue="models" className="flex flex-1 flex-col overflow-hidden">
          <TabsList>
            <TabsTrigger value="models" className="gap-2">
              <Settings2 className="h-4 w-4" />
              模型配置
            </TabsTrigger>
            <TabsTrigger value="scenes" className="gap-2">
              <Layers className="h-4 w-4" />
              场景配置
            </TabsTrigger>
            <TabsTrigger value="prompts" className="gap-2">
              <FileText className="h-4 w-4" />
              Prompt 管理
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <BookOpen className="h-4 w-4" />
              资料库
            </TabsTrigger>
          </TabsList>
          <div className="flex-1 overflow-hidden pt-4">
            <TabsContent value="models" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
              <AIConfigContent />
            </TabsContent>
            <TabsContent value="scenes" className="h-full m-0 overflow-auto">
              <AISceneConfigContent />
            </TabsContent>
            <TabsContent value="prompts" className="h-full m-0 overflow-auto">
              <AIPromptManager />
            </TabsContent>
            <TabsContent value="documents" className="h-full m-0 overflow-auto">
              <AIDocumentLibrary />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </Main>
  )
}
