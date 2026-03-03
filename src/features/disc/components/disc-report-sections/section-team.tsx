/**
 * 团队协作建议 Section
 *
 * 同最佳匹配风格：border-left primary + 浅色背景容器
 */

import { Typography } from '@douyinfe/semi-ui-19'
import { InlineMarkupParagraphs } from './inline-markup'

const { Title } = Typography

interface SectionTeamProps {
  teamAdvice: string
}

export function SectionTeam({ teamAdvice }: SectionTeamProps) {
  if (!teamAdvice) return null

  return (
    <div style={{ marginBottom: 28 }}>
      <Title heading={5} style={{ marginBottom: 16, fontSize: 15 }}>
        团队协作建议
      </Title>

      <div
        style={{
          borderLeft: '3px solid var(--semi-color-primary)',
          background: 'var(--semi-color-primary-light-default)',
          padding: '14px 18px',
          borderRadius: '0 8px 8px 0',
        }}
      >
        <InlineMarkupParagraphs text={teamAdvice} />
      </div>
    </div>
  )
}
