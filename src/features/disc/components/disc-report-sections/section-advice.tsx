/**
 * 沟通与管理建议 Section
 *
 * 三个子标题(Title h6)，列表项以 Tag 开头 + 正文。
 */

import { Typography, Tag } from '@douyinfe/semi-ui-19'
import type { AdviceItem } from './report-types'
import { InlineMarkup } from './inline-markup'

const { Title: SemiTitle, Paragraph } = Typography

interface SectionAdviceProps {
  communicationStrategies: AdviceItem[]
  riskConcerns: AdviceItem[]
  developmentDirections: AdviceItem[]
}

export function SectionAdvice({
  communicationStrategies,
  riskConcerns,
  developmentDirections,
}: SectionAdviceProps) {
  const hasContent =
    communicationStrategies.length > 0 ||
    riskConcerns.length > 0 ||
    developmentDirections.length > 0

  if (!hasContent) return null

  return (
    <div style={{ marginBottom: 28 }}>
      <SemiTitle heading={5} style={{ marginBottom: 16, fontSize: 15 }}>
        沟通与管理建议
      </SemiTitle>

      {communicationStrategies.length > 0 && (
        <AdviceGroup title="沟通策略" items={communicationStrategies} />
      )}
      {riskConcerns.length > 0 && (
        <AdviceGroup title="风险关注" items={riskConcerns} />
      )}
      {developmentDirections.length > 0 && (
        <AdviceGroup title="发展方向" items={developmentDirections} />
      )}
    </div>
  )
}

function AdviceGroup({ title, items }: { title: string; items: AdviceItem[] }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <SemiTitle
        heading={6}
        style={{
          fontSize: 13,
          color: 'var(--semi-color-text-2)',
          marginBottom: 10,
        }}
      >
        {title}
      </SemiTitle>

      <div className="flex flex-col" style={{ gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ lineHeight: 1.7, fontSize: 14 }}>
            {item.tag && (
              <Tag
                size="small"
                type="light"
                color="blue"
                style={{ marginRight: 8, verticalAlign: 'baseline' }}
              >
                {item.tag}
              </Tag>
            )}
            <Paragraph
              style={{ display: 'inline', margin: 0, fontSize: 14, lineHeight: 1.7 }}
            >
              <InlineMarkup text={item.text} />
            </Paragraph>
          </div>
        ))}
      </div>
    </div>
  )
}
