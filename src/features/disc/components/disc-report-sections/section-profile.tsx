/**
 * 综合画像 Section
 *
 * 无 Card 包裹，宽松行高，三级标记嵌入段落。
 */

import { InlineMarkupParagraphs } from './inline-markup'

interface SectionProfileProps {
  profile: string
}

export function SectionProfile({ profile }: SectionProfileProps) {
  if (!profile) return null

  return (
    <div style={{ marginBottom: 28 }}>
      <InlineMarkupParagraphs text={profile} />
    </div>
  )
}
