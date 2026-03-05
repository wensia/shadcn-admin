/**
 * AI Prompt 全屏预览侧抽屉
 * 以等宽字体展示 prompt 完整内容
 */

import { Tag, SideSheet, Typography } from '@douyinfe/semi-ui-19'
import { formatTime } from '@/lib/utils/time'
import type { AIPromptItem } from '../../types'

const { Text } = Typography

interface AIPromptPreviewSheetProps {
  prompt: AIPromptItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AIPromptPreviewSheet({
  prompt,
  open,
  onOpenChange,
}: AIPromptPreviewSheetProps) {
  return (
    <SideSheet
      title={
        prompt ? (
          <div className="flex items-center gap-2">
            <Tag size="small" color="grey">{`v${prompt.version}`}</Tag>
            <span className="truncate">{prompt.name}</span>
            {prompt.is_active && (
              <Tag size="small" color="green">当前激活</Tag>
            )}
          </div>
        ) : (
          <span>预览</span>
        )
      }
      visible={open}
      onCancel={() => onOpenChange(false)}
      width={672}
      headerStyle={{ borderBottom: '1px solid var(--semi-color-border)' }}
    >
      {prompt ? (
        <>
          <div style={{ marginBottom: 12 }}>
            <Text type="tertiary" size="small">
              {prompt.description || '无版本说明'}
              <span style={{ marginLeft: 8 }}>
                {formatTime(prompt.created_at)}
              </span>
            </Text>
          </div>
          <div className="overflow-auto" style={{ height: 'calc(100vh - 140px)' }}>
            <pre className="font-mono text-sm whitespace-pre-wrap break-words leading-relaxed">
              {prompt.content}
            </pre>
          </div>
        </>
      ) : null}
    </SideSheet>
  )
}
