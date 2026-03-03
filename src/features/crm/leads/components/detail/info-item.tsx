/**
 * InfoItem 信息项组件 - Semi Design 版本
 * 渲染为表格单元格 (td)，用于在 InfoGrid 内展示
 * 支持快捷编辑功能
 */

import * as React from 'react'
import { Popover, Input, Select, Button, Toast, Spin, DatePicker } from '@douyinfe/semi-ui-19'
import { IconCopy, IconTick, IconEdit, IconLoading, IconPlus } from '@douyinfe/semi-icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { copyToClipboard } from '@/lib/utils'
import { apiClient } from '@/lib/api/client'
import { showApiErrorToast } from '@/lib/api/error-toast'

// 异步 Select 配置
interface AsyncSelectConfig {
  apiEndpoint: string
  searchParam?: string
  itemsKey?: string
  labelKey?: string
  valueKey?: string
  creatable?: boolean
  createEndpoint?: string
  createFieldName?: string
}

type AsyncSelectOptionItem = Record<string, unknown>

interface InfoItemProps {
  label: string
  value?: string | React.ReactNode
  rawValue?: string
  span?: 1 | 2
  copyable?: boolean
  highlight?: boolean
  className?: string
  editable?: boolean
  fieldType?: 'text' | 'number' | 'select' | 'date' | 'datetime' | 'async-select'
  maxLength?: number
  options?: Array<{ label: string; value: string }>
  asyncSelectConfig?: AsyncSelectConfig
  onSave?: (value: string) => Promise<void>
}

export function InfoItem({
  label,
  value,
  rawValue,
  span = 1,
  copyable = false,
  highlight = false,
  className,
  editable = false,
  fieldType = 'text',
  maxLength,
  options = [],
  asyncSelectConfig,
  onSave,
}: InfoItemProps) {
  const queryClient = useQueryClient()
  const [copied, setCopied] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [editValue, setEditValue] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [isCreating, setIsCreating] = React.useState(false)

  // 异步 Select 搜索查询
  const { data: asyncOptions = [], isLoading: isLoadingOptions } = useQuery({
    queryKey: [
      'async-select',
      asyncSelectConfig,
      asyncSelectConfig?.apiEndpoint,
      searchQuery,
      asyncSelectConfig?.searchParam,
      asyncSelectConfig?.itemsKey,
    ],
    queryFn: async () => {
      if (!asyncSelectConfig) return []
      const searchParam = asyncSelectConfig.searchParam || 'search'
      const params = new URLSearchParams({ page: '1', size: '20' })
      if (searchQuery) params.set(searchParam, searchQuery)
      const res = await apiClient.get(`${asyncSelectConfig.apiEndpoint}?${params}`)
      const itemsKey = asyncSelectConfig.itemsKey || 'items'
      return res.data[itemsKey] || []
    },
    enabled: isEditing && fieldType === 'async-select' && !!asyncSelectConfig,
    staleTime: 30000,
  })

  // 创建新选项
  const createMutation = useMutation({
    mutationFn: async (newValue: string) => {
      if (!asyncSelectConfig) throw new Error('Missing config')
      const endpoint = asyncSelectConfig.createEndpoint || asyncSelectConfig.apiEndpoint
      const fieldName = asyncSelectConfig.createFieldName || 'name'
      const res = await apiClient.post(endpoint, { [fieldName]: newValue })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['async-select', asyncSelectConfig?.apiEndpoint] })
    },
  })

  React.useEffect(() => {
    if (isEditing) {
      setEditValue(rawValue || (typeof value === 'string' ? value : '') || '')
    }
  }, [isEditing, rawValue, value])

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!value || typeof value !== 'string') return
    const success = await copyToClipboard(value)
    if (success) {
      setCopied(true)
      Toast.success('已复制到剪贴板')
      setTimeout(() => setCopied(false), 2000)
    } else {
      Toast.error('复制失败')
    }
  }

  const handleSave = async () => {
    if (!onSave) return
    setIsSaving(true)
    try {
      await onSave(editValue)
      setIsEditing(false)
      Toast.success('保存成功')
    } catch (error: unknown) {
      showApiErrorToast(error, '保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && fieldType !== 'select') {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }

  const colSpan = span === 2 ? 3 : 1

  // 渲染编辑控件
  const renderEditControl = () => {
    switch (fieldType) {
      case 'select':
        return (
          <Select
            value={editValue}
            onChange={(val) => setEditValue(val as string)}
            optionList={options.map((opt) => ({ label: opt.label, value: opt.value }))}
            style={{ width: '100%' }}
          />
        )
      case 'date':
        return (
          <DatePicker
            value={editValue || undefined}
            onChange={(_date, dateStr) => setEditValue((dateStr as string) || '')}
            type="date"
            style={{ width: '100%' }}
          />
        )
      case 'datetime':
        return (
          <DatePicker
            value={editValue || undefined}
            onChange={(_date, dateStr) => setEditValue((dateStr as string) || '')}
            type="dateTime"
            style={{ width: '100%' }}
          />
        )
      case 'number':
        return (
          <Input
            type="number"
            value={editValue}
            onChange={(val) => setEditValue(val)}
            onKeyDown={handleKeyDown}
            autofocus
          />
        )
      case 'async-select': {
        if (!asyncSelectConfig) return null
        const labelKey = asyncSelectConfig.labelKey || 'name'
        const valueKey = asyncSelectConfig.valueKey || 'name'
        const optList = asyncOptions.map((opt: AsyncSelectOptionItem) => ({
          label: String(opt[labelKey] ?? ''),
          value: String(opt[valueKey] ?? ''),
        }))
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Select
              filter
              remote
              onSearch={(val) => setSearchQuery(val)}
              value={editValue}
              onChange={(val) => { setEditValue(val as string); setSearchQuery('') }}
              optionList={optList}
              loading={isLoadingOptions}
              style={{ width: '100%' }}
              placeholder="搜索或输入新值..."
              emptyContent={searchQuery ? '未找到匹配项' : '输入关键词搜索'}
            />
            {asyncSelectConfig.creatable && searchQuery && !asyncOptions.some(
              (opt: AsyncSelectOptionItem) => String(opt[labelKey] ?? '').toLowerCase() === searchQuery.toLowerCase()
            ) && (
              <Button
                size="small"
                theme="light"
                icon={isCreating ? <IconLoading /> : <IconPlus />}
                disabled={isCreating}
                onClick={async () => {
                  setIsCreating(true)
                  try {
                    await createMutation.mutateAsync(searchQuery)
                    setEditValue(searchQuery)
                    setSearchQuery('')
                    Toast.success(`"${searchQuery}" 创建成功`)
                  } catch (error: unknown) {
                    Toast.error(error instanceof Error ? error.message : '创建失败')
                  } finally {
                    setIsCreating(false)
                  }
                }}
              >
                创建 "{searchQuery}"
              </Button>
            )}
            {editValue && (
              <div style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                已选择: <span style={{ fontWeight: 500, color: 'var(--semi-color-text-0)' }}>{editValue}</span>
              </div>
            )}
          </div>
        )
      }
      default:
        return (
          <Input
            value={editValue}
            onChange={(val) => setEditValue(val)}
            onKeyDown={handleKeyDown}
            maxLength={maxLength}
            autofocus
          />
        )
    }
  }

  // 渲染值区域
  const renderValue = () => {
    const displayValue = value || <span style={{ color: 'var(--semi-color-text-2)' }}>-</span>

    if (editable && onSave) {
      return (
        <Popover
          visible={isEditing}
          onVisibleChange={(visible) => {
            if (isSaving && !visible) return
            setIsEditing(visible)
          }}
          trigger="click"
          position="bottomLeft"
          content={
            <div style={{ padding: 12, width: fieldType === 'async-select' ? 280 : fieldType === 'datetime' ? 'auto' : 240, position: 'relative' }}>
              {isSaving && (
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', zIndex: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4,
                }}>
                  <Spin size="small" />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--semi-color-text-2)' }}>{label}</div>
                {renderEditControl()}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Button size="small" theme="light" onClick={() => setIsEditing(false)} disabled={isSaving}>取消</Button>
                  <Button size="small" theme="solid" onClick={handleSave} disabled={isSaving}>
                    {isSaving && <IconLoading spin style={{ marginRight: 4 }} />}
                    保存
                  </Button>
                </div>
              </div>
            </div>
          }
        >
            <Button
              theme="borderless"
              title="点击编辑"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, textAlign: 'left',
                borderRadius: 4, padding: '2px 4px', margin: '-2px -4px',
                transition: 'background 0.2s', fontSize: 'inherit', color: 'inherit',
                minWidth: 'auto', height: 'auto',
              }}
              className="hover:!bg-[var(--semi-color-fill-0)]"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <IconLoading spin style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }} />
                  <span style={{ color: 'var(--semi-color-text-2)', fontSize: 12 }}>保存中...</span>
                </>
              ) : (
                <>
                  <span style={{ wordBreak: 'break-word' }}>{displayValue}</span>
                  <IconEdit style={{ fontSize: 12, color: 'var(--semi-color-text-2)', opacity: 0, transition: 'opacity 0.2s' }} className="info-item-edit-icon" />
                </>
              )}
            </Button>
        </Popover>
      )
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ wordBreak: 'break-word' }}>{displayValue}</span>
        {copyable && value && typeof value === 'string' && (
          <Button
            theme="borderless"
            onClick={handleCopy}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              width: 20, height: 20, borderRadius: 4, color: 'var(--semi-color-text-2)', transition: 'background 0.2s',
              minWidth: 'auto',
            }}
            className="hover:!bg-[var(--semi-color-fill-0)]"
            title="复制"
          >
            {copied ? <IconTick style={{ fontSize: 14, color: 'var(--semi-color-success)' }} /> : <IconCopy style={{ fontSize: 14 }} />}
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      <td
        className={className}
        style={{
          padding: '6px 12px',
          color: 'var(--semi-color-text-2)',
          whiteSpace: 'nowrap',
          verticalAlign: 'top',
          borderBottom: '1px solid var(--semi-color-border)',
          borderRight: '1px solid var(--semi-color-border)',
          background: 'var(--semi-color-fill-0)',
          ...(span === 2 ? { width: 'auto' } : {}),
        }}
        colSpan={span === 2 ? 1 : undefined}
      >
        {label}
      </td>
      <td
        style={{
          padding: '6px 12px',
          verticalAlign: 'top',
          borderBottom: '1px solid var(--semi-color-border)',
          borderRight: '1px solid var(--semi-color-border)',
          ...(highlight ? { color: '#ef4444', fontWeight: 500 } : {}),
        }}
        colSpan={span === 2 ? colSpan : undefined}
      >
        {renderValue()}
      </td>
    </>
  )
}
