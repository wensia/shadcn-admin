/**
 * 最佳匹配分析 Section
 *
 * border-left 3px primary + 浅色背景容器
 */

import { Typography } from '@douyinfe/semi-ui-19'
import { InlineMarkupParagraphs } from './inline-markup'

const { Title } = Typography

interface SectionBestMatchProps {
  bestMatchAnalysis: string
}

export function SectionBestMatch({ bestMatchAnalysis }: SectionBestMatchProps) {
  if (!bestMatchAnalysis) return null

  return (
    <div style={{ marginBottom: 28 }}>
      <Title heading={5} style={{ marginBottom: 16, fontSize: 15 }}>
        最佳匹配深度分析
      </Title>

      <div
        style={{
          borderLeft: '3px solid var(--semi-color-primary)',
          background: 'var(--semi-color-primary-light-default)',
          padding: '14px 18px',
          borderRadius: '0 8px 8px 0',
        }}
      >
        <InlineMarkupParagraphs text={bestMatchAnalysis} />
      </div>
    </div>
  )
}
