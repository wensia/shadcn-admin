/**
 * 可复制单元格组件 - 支持悬浮展示完整内容和复制
 */

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface CopyableCellProps {
  /** 显示的内容 */
  content: string
  /** 最大宽度 class，如 max-w-[150px] */
  maxWidthClass?: string
  /** 额外的 class */
  className?: string
}

export function CopyableCell({ content, maxWidthClass = 'max-w-[150px]', className }: CopyableCellProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      toast.success('已复制到剪贴板')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('复制失败')
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('truncate block cursor-pointer', maxWidthClass, className)}>
          {content}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        className="max-w-[320px] bg-popover text-popover-foreground border shadow-md"
      >
        <div className="space-y-2">
          <p className="text-xs whitespace-pre-wrap break-words">{content}</p>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs w-full gap-1"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                已复制
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                复制内容
              </>
            )}
          </Button>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
