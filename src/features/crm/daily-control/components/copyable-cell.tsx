/**
 * 可复制单元格组件 - Semi Design 版
 * 支持悬浮展示完整内容和复制
 */

import { useState } from 'react'
import { Tooltip, Button, Toast } from '@douyinfe/semi-ui-19'
import { IconCopy, IconTick } from '@douyinfe/semi-icons'
import { copyToClipboard } from '@/lib/utils'

interface CopyableCellProps {
  content: string
  maxWidthClass?: string
  className?: string
}

export function CopyableCell({ content, maxWidthClass = 'max-w-[150px]', className }: CopyableCellProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const success = await copyToClipboard(content)
    if (success) {
      setCopied(true)
      Toast.success('已复制到剪贴板')
      setTimeout(() => setCopied(false), 2000)
    } else {
      Toast.error('复制失败')
    }
  }

  // 从 Tailwind class 提取 max-width 值
  const maxWidthMatch = maxWidthClass.match(/max-w-\[(\d+)px\]/)
  const maxWidth = maxWidthMatch ? parseInt(maxWidthMatch[1]) : 150

  return (
    <Tooltip
      content={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320 }}>
          <p style={{ fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>{content}</p>
          <Button
            icon={copied ? <IconTick /> : <IconCopy />}
            onClick={handleCopy}
            block
          >
            {copied ? '已复制' : '复制内容'}
          </Button>
        </div>
      }
      position="top"
    >
      <span
        style={{
          display: 'block', overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap', cursor: 'pointer', maxWidth,
        }}
        className={className}
      >
        {content}
      </span>
    </Tooltip>
  )
}
