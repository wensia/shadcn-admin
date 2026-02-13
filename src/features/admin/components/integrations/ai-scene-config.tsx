/**
 * AI 场景配置组件
 * 为每个 AI 使用场景指定模型配置和 Prompt
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { showApiErrorToast } from '@/lib/api/error-toast'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { aiConfigApi } from '../../api'
import { AI_PROVIDER_OPTIONS, AI_SCENES, type AISceneConfig, type AIPromptItem } from '../../types'

const getProviderLabel = (provider: string) =>
  AI_PROVIDER_OPTIONS.find((p) => p.value === provider)?.label || provider

export function AISceneConfigContent() {
  const queryClient = useQueryClient()

  const { data: sceneMapping, isLoading: scenesLoading } = useQuery({
    queryKey: ['admin-ai-scene-mapping'],
    queryFn: () => aiConfigApi.getSceneMapping(),
  })

  const { data: allConfigs, isLoading: configsLoading } = useQuery({
    queryKey: ['admin-ai-configs-all'],
    queryFn: () => aiConfigApi.list({ is_active: true, limit: 100 }),
  })

  // 获取所有 prompt（用于 prompt 选择器）
  const { data: allPrompts, isLoading: promptsLoading } = useQuery({
    queryKey: ['admin-ai-prompts-all'],
    queryFn: () => aiConfigApi.listPrompts({ limit: 100 }),
  })

  const setSceneMutation = useMutation({
    mutationFn: ({ sceneKey, configId }: { sceneKey: string; configId: string | null }) =>
      aiConfigApi.setSceneConfig(sceneKey, configId),
    onSuccess: (_result, variables) => {
      const scene = AI_SCENES.find(s => s.key === variables.sceneKey)
      toast.success(`${scene?.label || '场景'}模型配置已更新`)
      queryClient.invalidateQueries({ queryKey: ['admin-ai-scene-mapping'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '设置场景配置失败')
    },
  })

  const activatePromptMutation = useMutation({
    mutationFn: (promptId: string) => aiConfigApi.activatePrompt(promptId),
    onSuccess: (result) => {
      toast.success(`Prompt 已切换为 v${result.version}`)
      queryClient.invalidateQueries({ queryKey: ['admin-ai-prompts-all'] })
      queryClient.invalidateQueries({ queryKey: ['admin-ai-prompts'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '切换 Prompt 失败')
    },
  })

  const handleSceneChange = (sceneKey: string, configId: string) => {
    setSceneMutation.mutate({
      sceneKey,
      configId: configId === '__none__' ? null : configId,
    })
  }

  const handlePromptChange = (promptId: string) => {
    if (promptId && promptId !== '__none__') {
      activatePromptMutation.mutate(promptId)
    }
  }

  // 按场景分组 prompts
  const promptsByScene = (allPrompts?.items || []).reduce<Record<string, AIPromptItem[]>>(
    (acc, item) => {
      if (!acc[item.scene_key]) acc[item.scene_key] = []
      acc[item.scene_key].push(item)
      return acc
    },
    {}
  )

  const isLoading = scenesLoading || configsLoading || promptsLoading

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">场景配置</h3>
        <span className="text-xs text-muted-foreground">为每个 AI 场景指定模型和 Prompt</span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {AI_SCENES.map((scene) => {
          const currentConfig = sceneMapping?.[scene.key] as AISceneConfig | undefined
          const scenePrompts = promptsByScene[scene.key] || []
          const activePrompt = scenePrompts.find(p => p.is_active)

          return (
            <Card key={scene.key} className="min-w-0 py-0">
              <CardContent className="p-4">
                <div className="mb-3">
                  <div className="text-sm font-medium">{scene.label}</div>
                  <div className="text-xs text-muted-foreground">{scene.description}</div>
                </div>

                <div className="space-y-3">
                  {/* 模型配置 */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">模型</Label>
                    {isLoading ? (
                      <Skeleton className="h-8 w-full" />
                    ) : (
                      <Select
                        value={currentConfig?.config_id || '__none__'}
                        onValueChange={(value) => handleSceneChange(scene.key, value)}
                        disabled={setSceneMutation.isPending}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="选择模型配置" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            <span className="text-muted-foreground">未配置（使用默认）</span>
                          </SelectItem>
                          {allConfigs?.items.map((config) => (
                            <SelectItem key={config.id} value={config.id}>
                              {config.name}
                              <span className="ml-1 text-muted-foreground">
                                ({getProviderLabel(config.provider)})
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Prompt 配置（仅需要 prompt 的场景显示） */}
                  {scene.needsPrompt && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Prompt</Label>
                      {isLoading ? (
                        <Skeleton className="h-8 w-full" />
                      ) : scenePrompts.length === 0 ? (
                        <div className="flex items-center gap-1.5 h-8 px-2 rounded-md border border-dashed text-xs text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          暂无 Prompt，请在 Prompt 管理中创建
                        </div>
                      ) : (
                        <Select
                          value={activePrompt?.id || '__none__'}
                          onValueChange={handlePromptChange}
                          disabled={activatePromptMutation.isPending}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="选择 Prompt" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">
                              <span className="text-muted-foreground">未配置</span>
                            </SelectItem>
                            {scenePrompts.map((prompt) => (
                              <SelectItem key={prompt.id} value={prompt.id}>
                                <span className="flex items-center gap-1.5">
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                    v{prompt.version}
                                  </Badge>
                                  {prompt.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
