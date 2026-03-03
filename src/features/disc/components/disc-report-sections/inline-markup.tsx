/**
 * 三级标记渲染器
 *
 * 将 craft-md 中的内联标记转为 Semi Design 组件：
 * - **蓝色加粗**  → Typography.Text strong + primary 色
 * - ***红色加粗*** → Typography.Text strong + danger 色
 * - <mark>标签</mark> → Tag size="small" type="light" color="blue"
 */

import { Fragment } from 'react'
import { Typography, Tag } from '@douyinfe/semi-ui-19'

const { Text } = Typography

const MARKUP_REGEX = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|<mark>[^<]*<\/mark>)/g

/** 将含有内联标记的文本渲染为 Semi 组件 */
export function InlineMarkup({ text }: { text: string }) {
  const parts = text.split(MARKUP_REGEX)
  if (parts.length === 1) return <>{text}</>

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('***') && part.endsWith('***')) {
          return (
            <Text
              key={i}
              strong
              style={{ color: 'var(--semi-color-danger)', fontStyle: 'normal' }}
            >
              {part.slice(3, -3)}
            </Text>
          )
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text
              key={i}
              strong
              style={{ color: 'var(--semi-color-primary)' }}
            >
              {part.slice(2, -2)}
            </Text>
          )
        }
        if (part.startsWith('<mark>') && part.endsWith('</mark>')) {
          return (
            <Tag
              key={i}
              size="small"
              type="light"
              color="blue"
              style={{ verticalAlign: 'baseline', margin: '0 2px' }}
            >
              {part.slice(6, -7)}
            </Tag>
          )
        }
        return <Fragment key={i}>{part}</Fragment>
      })}
    </>
  )
}

/** 渲染含有内联标记的多行文本（按换行拆分为 <p>） */
export function InlineMarkupParagraphs({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).filter(Boolean)
  return (
    <>
      {paragraphs.map((p, i) => (
        <div
          key={i}
          className="semi-typography semi-typography-paragraph"
          style={{ lineHeight: 1.8, marginBottom: i < paragraphs.length - 1 ? 12 : 0 }}
        >
          <InlineMarkup text={p.trim()} />
        </div>
      ))}
    </>
  )
}
