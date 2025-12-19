/**
 * InfoItem 信息项组件
 * 渲染为表格单元格 (td)，用于在 InfoGrid 内展示
 */

import * as React from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
import { toast } from 'sonner'

interface InfoItemProps {
  label: string
  value?: string | React.ReactNode
  span?: 1 | 2 // 跨列数
  copyable?: boolean
  highlight?: boolean
  className?: string
}

export function InfoItem({
  label,
  value,
  span = 1,
  copyable = false,
  highlight = false,
  className,
}: InfoItemProps) {
  const s = useStyleClasses()
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!value || typeof value !== 'string') return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success('已复制到剪贴板')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('复制失败')
    }
  }

  // span=2 时合并列
  const colSpan = span === 2 ? 3 : 1

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
        <div className="flex items-center gap-1.5">
          <span className="break-words">
            {value || <span className="text-muted-foreground">-</span>}
          </span>
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
      </td>
    </>
  )
}
