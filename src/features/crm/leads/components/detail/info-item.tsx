/**
 * InfoItem 信息项组件
 * 用于展示单条 label: value 信息
 */

import * as React from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
import { Button } from '@/components/ui/button'
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

  const handleCopy = async () => {
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

  const spanClass = span === 2 ? 'col-span-1 sm:col-span-2' : ''

  return (
    <div
      className={cn(
        'flex items-start gap-2 group',
        spanClass,
        className
      )}
    >
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span
        className={cn(
          'flex-1 break-words',
          highlight && 'text-primary font-medium'
        )}
      >
        {value || '-'}
      </span>
      {copyable && value && typeof value === 'string' && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0',
            copied && 'opacity-100'
          )}
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  )
}
