/**
 * InfoItem 信息项组件
 * 渲染为表格单元格 (td)，用于在 InfoGrid 内展示
 * 支持快捷编辑功能
 */

import * as React from 'react'
import { Copy, Check, Pencil, Loader2 } from 'lucide-react'
import { cn, copyToClipboard } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
import { toast } from 'sonner'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { FormDatePicker } from '@/components/date-picker'
import { DateTimePicker } from '@/components/date-time-picker'

interface InfoItemProps {
  label: string
  value?: string | React.ReactNode
  /** 原始值，用于编辑时的初始值 */
  rawValue?: string
  span?: 1 | 2 // 跨列数
  copyable?: boolean
  highlight?: boolean
  className?: string
  // 编辑相关 props
  editable?: boolean
  fieldType?: 'text' | 'number' | 'select' | 'date' | 'datetime'
  options?: Array<{ label: string; value: string }>
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
  options = [],
  onSave,
}: InfoItemProps) {
  const s = useStyleClasses()
  const [copied, setCopied] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [editValue, setEditValue] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)

  // 打开编辑时初始化值
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
      toast.success('已复制到剪贴板')
      setTimeout(() => setCopied(false), 2000)
    } else {
      toast.error('复制失败')
    }
  }

  const handleSave = async () => {
    if (!onSave) return

    setIsSaving(true)
    try {
      await onSave(editValue)
      setIsEditing(false)
      toast.success('保存成功')
    } catch (error: any) {
      toast.error(error?.message || '保存失败')
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

  // span=2 时合并列
  const colSpan = span === 2 ? 3 : 1

  // 渲染编辑控件
  const renderEditControl = () => {
    switch (fieldType) {
      case 'select':
        return (
          <Select value={editValue} onValueChange={setEditValue}>
            <SelectTrigger className="h-8 text-xs w-full">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case 'date':
        return (
          <FormDatePicker
            value={editValue}
            onChange={(val) => setEditValue(val || '')}
            placeholder="选择日期"
          />
        )
      case 'datetime':
        return (
          <DateTimePicker
            value={editValue}
            onChange={(val) => setEditValue(val || '')}
            placeholder="选择日期时间"
            showQuickButtons={false}
          />
        )
      case 'number':
        return (
          <Input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 text-xs"
            autoFocus
          />
        )
      default:
        return (
          <Input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 text-xs"
            autoFocus
          />
        )
    }
  }

  // 渲染值区域（可编辑或只读）
  const renderValue = () => {
    const displayValue = value || <span className="text-muted-foreground">-</span>

    if (editable && onSave) {
      const triggerButton = (
        <button
          type="button"
          className={cn(
            'group flex items-center gap-1.5 text-left',
            'rounded px-1 -mx-1 py-0.5 -my-0.5',
            'hover:bg-muted/50 transition-colors cursor-pointer',
            isSaving && 'pointer-events-none'
          )}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-xs">保存中...</span>
            </>
          ) : (
            <>
              <span className="break-words">{displayValue}</span>
              <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </>
          )}
        </button>
      )

      return (
        <Popover open={isEditing} onOpenChange={setIsEditing}>
          {/* 编辑弹窗关闭时显示提示 */}
          {!isEditing ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  {triggerButton}
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                点击编辑
              </TooltipContent>
            </Tooltip>
          ) : (
            <PopoverTrigger asChild>
              {triggerButton}
            </PopoverTrigger>
          )}
          <PopoverContent
            className={cn("p-3 relative", fieldType === 'datetime' ? 'w-auto' : 'w-64')}
            align="start"
            // 使用 modal 模式防止页面重新渲染时焦点丢失导致 Popover 关闭
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => {
              // 保存过程中阻止关闭
              if (isSaving) {
                e.preventDefault()
                return
              }
              // 阻止点击 DateTimePicker 弹窗时关闭外层 Popover
              const target = e.target as HTMLElement
              if (target?.closest('[data-radix-popper-content-wrapper]')) {
                e.preventDefault()
              }
            }}
            onInteractOutside={(e) => {
              // 保存过程中阻止关闭
              if (isSaving) {
                e.preventDefault()
                return
              }
              // 阻止点击 DateTimePicker 弹窗时关闭外层 Popover
              const target = e.target as HTMLElement
              if (target?.closest('[data-radix-popper-content-wrapper]')) {
                e.preventDefault()
              }
            }}
            onFocusOutside={(e) => {
              // 防止焦点移出时关闭 Popover（计时器更新导致的焦点问题）
              e.preventDefault()
            }}
            onEscapeKeyDown={(e) => {
              // 保存过程中阻止 ESC 关闭
              if (isSaving) {
                e.preventDefault()
              }
            }}
          >
            {/* 保存中的遮罩层 */}
            {isSaving && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-md">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">保存中...</span>
                </div>
              </div>
            )}
            <div className="space-y-3">
              <div className="text-xs font-medium text-muted-foreground">{label}</div>
              {renderEditControl()}
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                  className="h-7 text-xs"
                  disabled={isSaving}
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="h-7 text-xs"
                  disabled={isSaving}
                >
                  {isSaving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  保存
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )
    }

    return (
      <div className="flex items-center gap-1.5">
        <span className="break-words">{displayValue}</span>
        {copyable && value && typeof value === 'string' && (
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              'inline-flex items-center justify-center shrink-0',
              'h-5 w-5 rounded hover:bg-muted transition-colors',
              'text-muted-foreground hover:text-foreground'
            )}
            title="复制"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <td
        className={cn(
          'py-1.5 pr-3 text-muted-foreground whitespace-nowrap align-top',
          span === 2 && 'w-auto',
          className
        )}
        colSpan={span === 2 ? 1 : undefined}
      >
        {label}
      </td>
      <td
        className={cn(
          'py-1.5 align-top',
          span === 2 && 'pr-0',
          highlight && 'text-destructive font-medium'
        )}
        colSpan={span === 2 ? colSpan : undefined}
      >
        {renderValue()}
      </td>
    </>
  )
}
