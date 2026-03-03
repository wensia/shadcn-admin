/**
 * AI Prompt 版本管理组件
 * 数据表展示每个 prompt（按场景分组），点击行展开历史版本
 */

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText,
  Database,
  Plus,
  Pencil,
  Copy,
  Eye,
  CircleCheck,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/utils/time'

import { Table, Button, Tag, Skeleton, Typography, Tooltip } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { isSkeletonRow, SKELETON_ID_PREFIX } from '@/lib/table-utils'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { aiConfigApi } from '../../api'
import { AI_SCENES, type AIPromptItem } from '../../types'
import { AIPromptPreviewSheet } from './ai-prompt-preview-sheet'
import {
  AIPromptFormDialog,
  type PromptDialogState,
  type PromptDialogMode,
} from './ai-prompt-form-dialog'

const { Text } = Typography

// ============================================================================
// 类型定义
// ============================================================================

/** 表格行数据：按场景分组的 prompt 汇总 */
interface PromptGroupRow {
  id: string
  sceneKey: string
  sceneLabel: string
  sceneDescription: string
  activePrompt: AIPromptItem | null
  versions: AIPromptItem[]
  versionCount: number
}

const DEFAULT_SCENE_KEY = AI_SCENES.find((s) => s.needsPrompt)?.key || AI_SCENES[0].key

const INITIAL_DIALOG_STATE: PromptDialogState = {
  open: false,
  mode: 'create',
  sceneKey: DEFAULT_SCENE_KEY,
}

// ============================================================================
// 展开行：版本历史列表
// ============================================================================

function VersionHistoryPanel({
  record,
  onEdit,
  onCopy,
  onPreview,
  onActivate,
}: {
  record: PromptGroupRow
  onEdit: (prompt: AIPromptItem) => void
  onCopy: (prompt: AIPromptItem) => void
  onPreview: (prompt: AIPromptItem) => void
  onActivate: (promptId: string) => void
}) {
  const { versions } = record

  return (
    <div className="px-6 py-3 space-y-1.5" style={{ backgroundColor: 'var(--semi-color-bg-1)' }}>
      <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 8 }}>
        共 {versions.length} 个版本
      </Text>
      {versions.map((prompt, idx) => (
        <div
          key={prompt.id}
          className={cn(
            'group flex items-center gap-4 rounded-lg px-4 py-2.5 transition-colors cursor-pointer',
            prompt.is_active
              ? 'bg-white border border-green-200 dark:border-green-900 shadow-sm'
              : 'bg-white/60 border border-transparent hover:bg-white hover:border-gray-200',
            idx === 0 && !prompt.is_active && 'border-dashed border-gray-200'
          )}
          onClick={() => onPreview(prompt)}
        >
          {/* 版本号 */}
          <div className="shrink-0 w-12">
            <Tag
              color={prompt.is_active ? 'green' : undefined}
              size="small"
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            >
              v{prompt.version}
            </Tag>
          </div>

          {/* 名称 + 描述 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{prompt.name}</span>
              {prompt.is_active && (
                <span className="shrink-0 inline-flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400 font-medium">
                  <CircleCheck className="h-3 w-3" />
                  激活中
                </span>
              )}
            </div>
            {prompt.description && (
              <Text type="tertiary" size="small" className="truncate mt-0.5" style={{ display: 'block' }}>
                {prompt.description}
              </Text>
            )}
          </div>

          {/* 时间 */}
          <Text type="tertiary" size="small" className="shrink-0 w-[120px] text-right">
            {formatTime(prompt.created_at)}
          </Text>

          {/* 操作按钮 */}
          <div
            className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <Tooltip content="预览内容">
              <span style={{ display: 'inline-flex' }}>
                <Button
                  theme="borderless"
                  type="tertiary"
                  size="small"
                  icon={<Eye className="h-3.5 w-3.5" />}
                  onClick={() => onPreview(prompt)}
                />
              </span>
            </Tooltip>
            <Tooltip content="编辑">
              <span style={{ display: 'inline-flex' }}>
                <Button
                  theme="borderless"
                  type="tertiary"
                  size="small"
                  icon={<Pencil className="h-3.5 w-3.5" />}
                  onClick={() => onEdit(prompt)}
                />
              </span>
            </Tooltip>
            <Tooltip content="基于此版本创建">
              <span style={{ display: 'inline-flex' }}>
                <Button
                  theme="borderless"
                  type="tertiary"
                  size="small"
                  icon={<Copy className="h-3.5 w-3.5" />}
                  onClick={() => onCopy(prompt)}
                />
              </span>
            </Tooltip>
            {!prompt.is_active && (
              <Tooltip content="激活此版本">
                <span style={{ display: 'inline-flex' }}>
                  <Button
                    theme="borderless"
                    size="small"
                    icon={<CircleCheck className="h-3.5 w-3.5" />}
                    style={{ color: '#16a34a' }}
                    onClick={() => onActivate(prompt.id)}
                  />
                </span>
              </Tooltip>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================

export function AIPromptManager() {
  const queryClient = useQueryClient()
  const [dialogState, setDialogState] = useState<PromptDialogState>(INITIAL_DIALOG_STATE)
  const [previewPrompt, setPreviewPrompt] = useState<AIPromptItem | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [expandedRowKeys, setExpandedRowKeys] = useState<(string | number)[]>([])

  // 查询所有 prompt
  const { data, isLoading } = useQuery({
    queryKey: ['admin-ai-prompts'],
    queryFn: () => aiConfigApi.listPrompts({ limit: 100 }),
  })

  // 构建表格行数据：按 scene_key 分组
  const tableData: PromptGroupRow[] = useMemo(() => {
    const scenes = AI_SCENES.filter((s) => s.needsPrompt)

    if (isLoading) {
      return scenes.map((scene, i) => ({
        id: `${SKELETON_ID_PREFIX}${i}`,
        sceneKey: scene.key,
        sceneLabel: scene.label,
        sceneDescription: scene.description,
        activePrompt: null,
        versions: [],
        versionCount: 0,
      }))
    }

    const grouped: Record<string, AIPromptItem[]> = {}
    for (const item of data?.items || []) {
      if (!grouped[item.scene_key]) grouped[item.scene_key] = []
      grouped[item.scene_key].push(item)
    }
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => b.version - a.version)
    }

    return scenes.map((scene) => {
      const versions = grouped[scene.key] || []
      const activePrompt = versions.find((p) => p.is_active) || null
      return {
        id: scene.key,
        sceneKey: scene.key,
        sceneLabel: scene.label,
        sceneDescription: scene.description,
        activePrompt,
        versions,
        versionCount: versions.length,
      }
    })
  }, [data, isLoading])

  // Mutations
  const createMutation = useMutation({
    mutationFn: (d: { scene_key: string; name: string; content: string; description?: string }) =>
      aiConfigApi.createPrompt(d),
    onSuccess: () => {
      toast.success('Prompt 创建成功')
      closeDialog()
      invalidatePrompts()
    },
    onError: (error: Error) => showApiErrorToast(error, '创建失败'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: { id: string; data: { name: string; content: string; description?: string } }) =>
      aiConfigApi.updatePrompt(id, d),
    onSuccess: () => {
      toast.success('更新成功')
      closeDialog()
      invalidatePrompts()
    },
    onError: (error: Error) => showApiErrorToast(error, '更新失败'),
  })

  const activateMutation = useMutation({
    mutationFn: (promptId: string) => aiConfigApi.activatePrompt(promptId),
    onSuccess: (result) => {
      toast.success(`已激活 v${result.version}`)
      invalidatePrompts()
    },
    onError: (error: Error) => showApiErrorToast(error, '激活失败'),
  })

  const seedMutation = useMutation({
    mutationFn: () => aiConfigApi.seedDefaultPrompts(),
    onSuccess: (result) => {
      toast.success(result.message || '默认 Prompt 初始化完成')
      invalidatePrompts()
    },
    onError: (error: Error) => showApiErrorToast(error, '初始化失败'),
  })

  const invalidatePrompts = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-ai-prompts'] })
    queryClient.invalidateQueries({ queryKey: ['admin-ai-prompts-all'] })
  }

  const closeDialog = () => setDialogState(INITIAL_DIALOG_STATE)

  const openDialog = (mode: PromptDialogMode, sceneKey: string, prompt?: AIPromptItem) => {
    setDialogState({
      open: true,
      mode,
      sceneKey,
      prompt: mode === 'edit' ? prompt : undefined,
      sourcePrompt: mode === 'copy' ? prompt : undefined,
    })
  }

  const handleFormSubmit = (d: {
    name: string
    content: string
    description?: string
    sceneKey: string
    promptId?: string
    mode: PromptDialogMode
  }) => {
    if (d.mode === 'edit' && d.promptId) {
      updateMutation.mutate({
        id: d.promptId,
        data: { name: d.name, content: d.content, description: d.description },
      })
    } else {
      createMutation.mutate({
        scene_key: d.sceneKey,
        name: d.name,
        content: d.content,
        description: d.description,
      })
    }
  }

  const handlePreview = (prompt: AIPromptItem) => {
    setPreviewPrompt(prompt)
    setPreviewOpen(true)
  }

  // 表格列定义
  const columns: ColumnProps<PromptGroupRow>[] = useMemo(
    () => [
      {
        title: '场景',
        dataIndex: 'sceneLabel',
        width: 200,
        render: (_: unknown, record: PromptGroupRow) => {
          if (isSkeletonRow(record.id)) {
            return (
              <div className="space-y-1">
                <Skeleton.Paragraph rows={1} style={{ width: 80 }} />
                <Skeleton.Paragraph rows={1} style={{ width: 128 }} />
              </div>
            )
          }
          return (
            <div>
              <div className="text-sm font-medium">{record.sceneLabel}</div>
              <Text type="tertiary" size="small" style={{ marginTop: 2, display: 'block' }}>
                {record.sceneDescription}
              </Text>
            </div>
          )
        },
      },
      {
        title: '当前 Prompt',
        dataIndex: 'activePrompt',
        render: (_: unknown, record: PromptGroupRow) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 144 }} />
          }
          const { activePrompt } = record
          if (!activePrompt) {
            return <Text type="tertiary" size="small">暂无激活版本</Text>
          }
          return (
            <div className="min-w-0">
              <span className="text-sm">{activePrompt.name}</span>
              {activePrompt.description && (
                <Text type="tertiary" size="small" className="truncate mt-0.5 max-w-[300px]" style={{ display: 'block' }}>
                  {activePrompt.description}
                </Text>
              )}
            </div>
          )
        },
      },
      {
        title: '激活版本',
        dataIndex: 'activeVersion',
        width: 100,
        render: (_: unknown, record: PromptGroupRow) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 64 }} />
          }
          const { activePrompt } = record
          if (!activePrompt) {
            return (
              <Tag size="small" type="light">
                待配置
              </Tag>
            )
          }
          return (
            <Tag size="small" color="green">
              v{activePrompt.version}
            </Tag>
          )
        },
      },
      {
        title: '版本数',
        dataIndex: 'versionCount',
        width: 80,
        render: (_: unknown, record: PromptGroupRow) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 32 }} />
          }
          return <Text type="tertiary">{record.versionCount}</Text>
        },
      },
      {
        title: '',
        dataIndex: 'actions',
        width: 120,
        render: (_: unknown, record: PromptGroupRow) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 80 }} />
          }
          return (
            <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
              <Button
                size="small"
                theme="outline"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => openDialog('create', record.sceneKey)}
              >
                新建版本
              </Button>
            </div>
          )
        },
      },
    ],
    []
  )

  return (
    <>
      <DataTableLayout
        title="Prompt 版本管理"
        headerActions={
          <Tooltip content="将代码中硬编码的默认 Prompt 写入数据库（已有则跳过）">
            <span style={{ display: 'inline-flex' }}>
              <Button
                theme="outline"
                size="small"
                icon={<Database className="h-3.5 w-3.5" />}
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
              >
                初始化默认
              </Button>
            </span>
          </Tooltip>
        }
        onRefresh={() => invalidatePrompts()}
        isRefreshing={isLoading}
      >
        {/* 保留 Table：SemiDataTable 不支持 expandable rows */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Table
            columns={columns}
            dataSource={tableData}
            rowKey="id"
            pagination={false}
            loading={false}
            expandedRowKeys={expandedRowKeys}
            onExpand={(expanded, record) => {
              setExpandedRowKeys((prev) =>
                expanded
                  ? [...prev, (record as PromptGroupRow).id]
                  : prev.filter((key) => key !== (record as PromptGroupRow).id)
              )
            }}
            expandedRowRender={(record: PromptGroupRow) => (
              <VersionHistoryPanel
                record={record}
                onEdit={(p) => openDialog('edit', p.scene_key, p)}
                onCopy={(p) => openDialog('copy', p.scene_key, p)}
                onPreview={handlePreview}
                onActivate={(id) => activateMutation.mutate(id)}
              />
            )}
            rowExpandable={(record: PromptGroupRow) => record.versionCount > 0}
            onRow={(record: PromptGroupRow) => ({
              style: { cursor: record.versionCount > 0 ? 'pointer' : 'default' },
            })}
            empty={
              <div className="flex flex-col items-center py-8" style={{ color: 'var(--semi-color-text-2)' }}>
                <FileText className="mb-2 h-8 w-8" />
                <p>暂无 Prompt 配置</p>
                <Text type="tertiary" size="small" style={{ marginTop: 4 }}>
                  点击"初始化默认"导入系统默认 Prompt
                </Text>
              </div>
            }
          />
        </div>
      </DataTableLayout>

      {/* 创建/编辑弹窗 */}
      <AIPromptFormDialog
        state={dialogState}
        onClose={closeDialog}
        onSubmit={handleFormSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      {/* 全屏预览侧抽屉 */}
      <AIPromptPreviewSheet
        prompt={previewPrompt}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </>
  )
}
