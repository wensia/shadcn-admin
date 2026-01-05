/**
 * ChangeHistoryTimeline 变更历史组件
 * 以表格形式展示信息变更和归属变更记录
 *
 * Anthropic 品牌色:
 * - Orange: #d97757 (主要强调色)
 * - Green: #788c5d (次要强调色)
 * - Mid Gray: #b0aea5 (次要元素)
 */

import * as React from 'react'
import { FileEdit, UserCog, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'

// Anthropic 品牌色
const anthropicColors = {
  orange: '#d97757',
  green: '#788c5d',
  midGray: '#b0aea5',
}
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatTime } from '@/lib/utils/time'
import { EmptyState } from './empty-state'
import type { LeadInfoChangeLog, LeadOwnershipChangeLog } from '../../types'
import { infoChangeTypeLabels, ownershipChangeTypeLabels } from '../../types'

type ChangeFilter = 'all' | 'info' | 'ownership'

interface ChangeHistoryTimelineProps {
  infoChanges: LeadInfoChangeLog[]
  ownershipChanges: LeadOwnershipChangeLog[]
  isLoading?: boolean
  className?: string
}

export function ChangeHistoryTimeline({
  infoChanges,
  ownershipChanges,
  isLoading,
  className,
}: ChangeHistoryTimelineProps) {
  const s = useStyleClasses()
  const [filter, setFilter] = React.useState<ChangeFilter>('all')

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', s.text.xs, 'text-muted-foreground')}>
        加载中...
      </div>
    )
  }

  const hasInfoChanges = infoChanges && infoChanges.length > 0
  const hasOwnershipChanges = ownershipChanges && ownershipChanges.length > 0
  const hasNoData = !hasInfoChanges && !hasOwnershipChanges

  return (
    <div className={cn('space-y-6', className)}>
      {/* 筛选按钮 */}
      <div className={cn('flex gap-2', s.gap.tight)}>
        <Button
          size="sm"
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          className={cn(s.height.controlSm, s.text.xs)}
        >
          全部 ({(infoChanges?.length || 0) + (ownershipChanges?.length || 0)})
        </Button>
        <Button
          size="sm"
          variant={filter === 'info' ? 'default' : 'outline'}
          onClick={() => setFilter('info')}
          className={cn(s.height.controlSm, s.text.xs)}
        >
          信息变更 ({infoChanges?.length || 0})
        </Button>
        <Button
          size="sm"
          variant={filter === 'ownership' ? 'default' : 'outline'}
          onClick={() => setFilter('ownership')}
          className={cn(s.height.controlSm, s.text.xs)}
        >
          归属变更 ({ownershipChanges?.length || 0})
        </Button>
      </div>

      {hasNoData ? (
        <EmptyState
          icon={<FileEdit />}
          title="暂无变更记录"
          description="线索的信息和归属变更将在这里展示"
        />
      ) : (
        <>
          {/* 信息变更表格 */}
          {(filter === 'all' || filter === 'info') && hasInfoChanges && (
            <InfoChangeTable
              data={infoChanges}
              showTitle={filter === 'all'}
            />
          )}

          {/* 归属变更表格 */}
          {(filter === 'all' || filter === 'ownership') && hasOwnershipChanges && (
            <OwnershipChangeTable
              data={ownershipChanges}
              showTitle={filter === 'all'}
            />
          )}

          {/* 当筛选后无数据时的提示 */}
          {filter === 'info' && !hasInfoChanges && (
            <EmptyState
              icon={<FileEdit />}
              title="暂无信息变更"
              description="线索信息变更记录将在这里展示"
            />
          )}
          {filter === 'ownership' && !hasOwnershipChanges && (
            <EmptyState
              icon={<UserCog />}
              title="暂无归属变更"
              description="线索归属变更记录将在这里展示"
            />
          )}
        </>
      )}
    </div>
  )
}

/**
 * 信息变更表格
 */
function InfoChangeTable({
  data,
  showTitle,
}: {
  data: LeadInfoChangeLog[]
  showTitle?: boolean
}) {
  const s = useStyleClasses()

  // 展开 changes 数组，每个字段变更一行
  const flattenedData = React.useMemo(() => {
    const rows: Array<{
      id: string
      rowKey: string
      changed_at: string
      changed_by_name: string
      change_type: string
      field_name: string
      old_value: string | null | undefined
      new_value: string | null | undefined
      change_reason?: string
      isFirstInGroup: boolean
      groupSize: number
    }> = []

    data.forEach((log) => {
      // 多字段变更
      if (log.changes && log.changes.length > 0) {
        log.changes.forEach((change, idx) => {
          rows.push({
            id: log.id,
            rowKey: `${log.id}-${idx}`,
            changed_at: log.changed_at,
            changed_by_name: log.changed_by_name || '-',
            change_type: log.change_type,
            field_name: change.field_name,
            old_value: change.old_value,
            new_value: change.new_value,
            change_reason: log.change_reason,
            isFirstInGroup: idx === 0,
            groupSize: log.changes!.length,
          })
        })
      }
      // 单字段变更
      else if (log.field_name) {
        rows.push({
          id: log.id,
          rowKey: log.id,
          changed_at: log.changed_at,
          changed_by_name: log.changed_by_name || '-',
          change_type: log.change_type,
          field_name: log.field_name,
          old_value: log.old_value,
          new_value: log.new_value,
          change_reason: log.change_reason,
          isFirstInGroup: true,
          groupSize: 1,
        })
      }
    })

    return rows
  }, [data])

  return (
    <div className="space-y-2">
      {showTitle && (
        <div className="flex items-center gap-2">
          <FileEdit className={cn(s.size.icon)} style={{ color: anthropicColors.orange }} />
          <h3 className={cn(s.text.sm, 'font-semibold')}>信息变更</h3>
          <Badge className={cn(s.text.xs, s.height.badge, 'text-white')} style={{ backgroundColor: anthropicColors.orange }}>
            {data.length}
          </Badge>
        </div>
      )}
      <div className={cn('rounded-md border', s.rounded)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={cn(s.text.xs, 'w-[140px]')}>变更时间</TableHead>
              <TableHead className={cn(s.text.xs, 'w-[90px]')}>变更类型</TableHead>
              <TableHead className={cn(s.text.xs, 'w-[100px]')}>字段</TableHead>
              <TableHead className={cn(s.text.xs)}>原值</TableHead>
              <TableHead className={cn(s.text.xs, 'w-[30px]')}></TableHead>
              <TableHead className={cn(s.text.xs)}>新值</TableHead>
              <TableHead className={cn(s.text.xs, 'w-[80px]')}>操作人</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flattenedData.map((row) => (
              <TableRow key={row.rowKey}>
                {row.isFirstInGroup ? (
                  <TableCell
                    className={cn(s.text.xs, 'align-top')}
                    rowSpan={row.groupSize}
                  >
                    {formatTime(row.changed_at)}
                  </TableCell>
                ) : null}
                {row.isFirstInGroup ? (
                  <TableCell
                    className={cn(s.text.xs, 'align-top')}
                    rowSpan={row.groupSize}
                  >
                    <Badge variant="outline" className={cn(s.text.xs, 'h-5')}>
                      {infoChangeTypeLabels[row.change_type as keyof typeof infoChangeTypeLabels] || row.change_type}
                    </Badge>
                  </TableCell>
                ) : null}
                <TableCell className={cn(s.text.xs, 'font-medium')}>
                  {row.field_name}
                </TableCell>
                <TableCell className={cn(s.text.xs, 'text-muted-foreground')}>
                  <span className="line-through" style={{ color: anthropicColors.midGray }}>
                    {row.old_value || '-'}
                  </span>
                </TableCell>
                <TableCell className={cn(s.text.xs)}>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </TableCell>
                <TableCell className={cn(s.text.xs)}>
                  <span style={{ color: anthropicColors.green }}>
                    {row.new_value || '-'}
                  </span>
                </TableCell>
                {row.isFirstInGroup ? (
                  <TableCell
                    className={cn(s.text.xs, 'align-top')}
                    rowSpan={row.groupSize}
                  >
                    {row.changed_by_name}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

/**
 * 归属变更表格
 */
function OwnershipChangeTable({
  data,
  showTitle,
}: {
  data: LeadOwnershipChangeLog[]
  showTitle?: boolean
}) {
  const s = useStyleClasses()

  return (
    <div className="space-y-2">
      {showTitle && (
        <div className="flex items-center gap-2">
          <UserCog className={cn(s.size.icon)} style={{ color: anthropicColors.orange }} />
          <h3 className={cn(s.text.sm, 'font-semibold')}>归属变更</h3>
          <Badge className={cn(s.text.xs, s.height.badge, 'text-white')} style={{ backgroundColor: anthropicColors.orange }}>
            {data.length}
          </Badge>
        </div>
      )}
      <div className={cn('rounded-md border', s.rounded)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={cn(s.text.xs, 'w-[140px]')}>变更时间</TableHead>
              <TableHead className={cn(s.text.xs, 'w-[90px]')}>变更类型</TableHead>
              <TableHead className={cn(s.text.xs)}>顾问变更</TableHead>
              <TableHead className={cn(s.text.xs)}>校区变更</TableHead>
              <TableHead className={cn(s.text.xs, 'w-[80px]')}>操作人</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((log) => {
              const hasAdvisorChange = log.previous_advisor_name || log.current_advisor_name
              const hasCampusChange = log.previous_campus_name || log.current_campus_name

              return (
                <TableRow key={log.id}>
                  <TableCell className={cn(s.text.xs)}>
                    {formatTime(log.changed_at)}
                  </TableCell>
                  <TableCell className={cn(s.text.xs)}>
                    <Badge variant="outline" className={cn(s.text.xs, 'h-5')}>
                      {ownershipChangeTypeLabels[log.change_type as keyof typeof ownershipChangeTypeLabels] || log.change_type}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn(s.text.xs)}>
                    {hasAdvisorChange ? (
                      <div className="flex items-center gap-1">
                        <span className="line-through" style={{ color: anthropicColors.midGray }}>
                          {log.previous_advisor_name || '无'}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span style={{ color: anthropicColors.green }}>
                          {log.current_advisor_name || '无'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className={cn(s.text.xs)}>
                    {hasCampusChange ? (
                      <div className="flex items-center gap-1">
                        <span className="line-through" style={{ color: anthropicColors.midGray }}>
                          {log.previous_campus_name || '无'}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span style={{ color: anthropicColors.green }}>
                          {log.current_campus_name || '无'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className={cn(s.text.xs)}>
                    {log.changed_by_name || '-'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
