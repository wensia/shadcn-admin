/**
 * AI 场景配置组件
 * 数据表布局：为每个 AI 使用场景指定模型配置和 Prompt 版本
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'

import { Table, Select, Tag, Skeleton, Typography } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { aiConfigApi } from '../../api'
import {
  AI_PROVIDER_OPTIONS,
  AI_SCENES,
  type AISceneConfig,
  type AIPromptItem,
} from '../../types'

const { Text } = Typography

const getProviderLabel = (provider: string) =>
  AI_PROVIDER_OPTIONS.find((p) => p.value === provider)?.label || provider

// 场景行的类型
interface SceneRow {
  key: string
  label: string
  description: string
  needsPrompt: boolean
}

export function AISceneConfigContent() {
  const queryClient = useQueryClient()

  // 数据查询
  const { data: sceneMapping, isLoading: scenesLoading } = useQuery({
    queryKey: ['admin-ai-scene-mapping'],
    queryFn: () => aiConfigApi.getSceneMapping(),
  })

  const { data: allConfigs, isLoading: configsLoading } = useQuery({
    queryKey: ['admin-ai-configs-all'],
    queryFn: () => aiConfigApi.list({ is_active: true, limit: 100 }),
  })

  const { data: allPrompts, isLoading: promptsLoading } = useQuery({
    queryKey: ['admin-ai-prompts-all'],
    queryFn: () => aiConfigApi.listPrompts({ limit: 100 }),
  })

  // Mutations
  const setSceneMutation = useMutation({
    mutationFn: ({
      sceneKey,
      configId,
    }: {
      sceneKey: string
      configId: string | null
    }) => aiConfigApi.setSceneConfig(sceneKey, configId),
    onSuccess: (_result, variables) => {
      const scene = AI_SCENES.find((s) => s.key === variables.sceneKey)
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

  // Handlers
  const handleSceneChange = (sceneKey: string, configId: string) => {
    setSceneMutation.mutate({
      sceneKey,
      configId: configId === '__none__' ? null : configId,
    })
  }

  const handlePromptChange = (promptId: string) => {
    if (promptId === '__none__') return
    activatePromptMutation.mutate(promptId)
  }

  // 按场景分组 prompts
  const promptsByScene = (allPrompts?.items || []).reduce<
    Record<string, AIPromptItem[]>
  >((acc, item) => {
    if (!acc[item.scene_key]) acc[item.scene_key] = []
    acc[item.scene_key].push(item)
    return acc
  }, {})

  const isLoading = scenesLoading || configsLoading || promptsLoading

  const configOptionList = [
    { value: '__none__', label: '未配置（使用默认）' },
    ...(allConfigs?.items.map((config) => ({
      value: config.id,
      label: `${config.name} (${getProviderLabel(config.provider)})`,
    })) || []),
  ]

  const columns: ColumnProps<SceneRow>[] = [
    {
      title: '场景',
      dataIndex: 'label',
      width: 200,
      render: (_: unknown, record: SceneRow) => {
        if (isLoading) {
          return (
            <div>
              <Skeleton.Paragraph rows={1} style={{ width: 96, marginBottom: 4 }} />
              <Skeleton.Paragraph rows={1} style={{ width: 144 }} />
            </div>
          )
        }
        return (
          <div>
            <div className="text-sm font-medium">{record.label}</div>
            <Text type="tertiary" size="small" style={{ marginTop: 2, display: 'block' }}>
              {record.description}
            </Text>
          </div>
        )
      },
    },
    {
      title: '模型',
      dataIndex: 'config',
      width: 280,
      render: (_: unknown, record: SceneRow) => {
        if (isLoading) {
          return <Skeleton.Paragraph rows={1} style={{ width: '100%' }} />
        }
        const currentConfig = sceneMapping?.[record.key] as AISceneConfig | undefined
        return (
          <Select
            value={currentConfig?.config_id || '__none__'}
            onChange={(value) => handleSceneChange(record.key, value as string)}
            disabled={setSceneMutation.isPending}
            size="small"
            style={{ width: '100%' }}
            optionList={configOptionList}
          />
        )
      },
    },
    {
      title: 'Prompt',
      dataIndex: 'prompt',
      width: 280,
      render: (_: unknown, record: SceneRow) => {
        if (isLoading) {
          return <Skeleton.Paragraph rows={1} style={{ width: '100%' }} />
        }
        const scenePrompts = promptsByScene[record.key] || []
        const activePrompt = scenePrompts.find((p) => p.is_active)

        if (!record.needsPrompt) {
          return <Text type="tertiary" size="small">--</Text>
        }

        if (scenePrompts.length === 0) {
          return (
            <Text type="tertiary" size="small">
              暂无 Prompt，请先在 Prompt 管理中创建
            </Text>
          )
        }

        const promptOptionList = [
          { value: '__none__', label: '未选择' },
          ...scenePrompts.map((prompt) => ({
            value: prompt.id,
            label: `v${prompt.version} - ${prompt.name}${prompt.is_active ? ' (当前)' : ''}`,
          })),
        ]

        return (
          <Select
            value={activePrompt?.id || '__none__'}
            onChange={(value) => handlePromptChange(value as string)}
            disabled={activatePromptMutation.isPending}
            size="small"
            style={{ width: '100%' }}
            optionList={promptOptionList}
          />
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, record: SceneRow) => {
        if (isLoading) {
          return <Skeleton.Paragraph rows={1} style={{ width: 40 }} />
        }
        const currentConfig = sceneMapping?.[record.key] as AISceneConfig | undefined
        const scenePrompts = promptsByScene[record.key] || []
        const activePrompt = scenePrompts.find((p) => p.is_active)
        const isConfigured = !!currentConfig?.config_id
        const isPromptReady = !record.needsPrompt || !!activePrompt

        return isConfigured && isPromptReady ? (
          <Tag size="small" color="blue" style={{ fontSize: 10 }}>
            就绪
          </Tag>
        ) : (
          <Tag size="small" type="light" style={{ fontSize: 10 }}>
            待配置
          </Tag>
        )
      },
    },
  ]

  return (
    <DataTableLayout
      title="场景配置"
      total={AI_SCENES.length}
      onRefresh={() => {
        queryClient.invalidateQueries({ queryKey: ['admin-ai-scene-mapping'] })
        queryClient.invalidateQueries({ queryKey: ['admin-ai-configs-all'] })
        queryClient.invalidateQueries({ queryKey: ['admin-ai-prompts-all'] })
      }}
      isRefreshing={isLoading}
    >
      {/* 静态配置表（无分页），保留 Table：行数固定为 AI_SCENES */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Table
          columns={columns}
          dataSource={AI_SCENES as unknown as SceneRow[]}
          rowKey="key"
          pagination={false}
          loading={false}
        />
      </div>
    </DataTableLayout>
  )
}
