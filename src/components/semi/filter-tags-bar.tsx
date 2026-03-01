/**
 * FilterTagsBar - 筛选条件标签栏
 * 显示当前活跃的筛选条件 + 清除全部按钮
 */

import { Tag, Button, Typography } from '@douyinfe/semi-ui-19'

const { Text } = Typography

export interface FilterTag {
  key: string
  label: string
  value: string
  onClose: () => void
}

interface FilterTagsBarProps {
  tags: FilterTag[]
  onClearAll: () => void
}

export function FilterTagsBar({ tags, onClearAll }: FilterTagsBarProps) {
  if (tags.length === 0) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 10,
        paddingBottom: 2,
      }}
    >
      <Text type="tertiary" size="small">
        筛选条件:
      </Text>
      {tags.map((tag) => (
        <Tag
          key={tag.key}
          closable
          onClose={() => tag.onClose()}
          color="white"
          style={{ border: '1px solid var(--semi-color-border)' }}
        >
          {tag.label}: {tag.value}
        </Tag>
      ))}
      <Button type="tertiary" theme="borderless" onClick={onClearAll}>
        清除全部
      </Button>
    </div>
  )
}
