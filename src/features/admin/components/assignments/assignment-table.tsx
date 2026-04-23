import { Button, Empty, Popconfirm, Spin, Tag, Typography } from '@douyinfe/semi-ui-19'
import { IconUserGroup } from '@douyinfe/semi-icons'
import { ArrowRightLeft, UserMinus } from 'lucide-react'
import { ASSIGNMENT_ROLE_LABELS, type AssignmentItem } from '../../types'
import {
  formatDate,
  roleTagColor,
  scopeLabel,
} from '../../lib/assignment-format'

const { Text } = Typography

export interface AssignmentTableProps {
  items: AssignmentItem[]
  isLoading: boolean
  isHistory: boolean
  onRelieve: (id: string) => void
  onTransfer: (a: AssignmentItem) => void
  /** 空状态自定义文案（可选） */
  emptyTitle?: string
  emptyDescription?: string
  /** 是否隐藏 scope 列（主从页右侧面板内展示时，scope 已经是"当前节点"，不需要重复展示） */
  hideScope?: boolean
}

export function AssignmentTable({
  items,
  isLoading,
  isHistory,
  onRelieve,
  onTransfer,
  emptyTitle,
  emptyDescription,
  hideScope,
}: AssignmentTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spin size="large" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <Empty
        image={<IconUserGroup size="extra-large" />}
        title={emptyTitle ?? (isHistory ? '暂无历史记录' : '暂无任命')}
        description={
          emptyDescription ?? (isHistory ? undefined : '点击右上角"新增任命"按钮开始')
        }
        style={{ padding: '48px 0' }}
      />
    )
  }

  return (
    <div className="space-y-2 mt-3">
      {items.map((a) => (
        <div
          key={a.id}
          className="flex items-center justify-between p-3 rounded-md border border-[var(--semi-color-border)] hover:bg-[var(--semi-color-fill-0)]"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Tag color={roleTagColor(a.role)} size="small">
                {a.role_label || ASSIGNMENT_ROLE_LABELS[a.role]}
              </Tag>
              {a.rank > 0 && (
                <Tag color="grey" size="small">
                  副职 #{a.rank}
                </Tag>
              )}
              {!a.is_active && (
                <Tag color="light-grey" size="small">
                  已卸任
                </Tag>
              )}
              <Text strong>{a.employee_name || '未知员工'}</Text>
            </div>
            <div className="flex items-center gap-4 text-xs">
              {!hideScope && <Text type="tertiary">{scopeLabel(a)}</Text>}
              <Text type="tertiary">任命：{formatDate(a.appointed_at)}</Text>
              {a.relieved_at && (
                <Text type="tertiary">卸任：{formatDate(a.relieved_at)}</Text>
              )}
            </div>
            {a.remark && (
              <Text type="tertiary" className="text-xs mt-1 block">
                备注：{a.remark}
              </Text>
            )}
          </div>
          {a.is_active && (
            <div className="flex gap-2 ml-4 shrink-0">
              <Button
                size="small"
                icon={<ArrowRightLeft size={14} />}
                onClick={() => onTransfer(a)}
              >
                交接/晋升
              </Button>
              <Popconfirm
                title="确认卸任？"
                content={`将 ${a.employee_name} 从此任命中卸任`}
                onConfirm={() => onRelieve(a.id)}
              >
                <Button size="small" type="danger" icon={<UserMinus size={14} />}>
                  卸任
                </Button>
              </Popconfirm>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
