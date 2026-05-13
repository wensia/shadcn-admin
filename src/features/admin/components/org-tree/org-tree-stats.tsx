/**
 * 组织架构树顶部统计卡
 */
import { useMemo } from 'react'
import { Typography } from '@douyinfe/semi-ui-19'
import type { OrganizationTreeNode } from '../../types'

const { Text } = Typography

interface OrgTreeStatsProps {
  tree: OrganizationTreeNode[]
  compact?: boolean
}

interface StatsData {
  region_count: number
  district_count: number
  area_count: number
  campus_count: number
  area_office_count: number
  department_count: number
  employee_count: number
  leader_count: number
  missing_leader_count: number
}

function walk(
  nodes: OrganizationTreeNode[],
  acc: StatsData,
  seenCampusIds: Set<string>,
): void {
  for (const n of nodes) {
    switch (n.type) {
      case 'region':
        acc.region_count += 1
        break
      case 'district':
        acc.district_count += 1
        break
      case 'area':
        acc.area_count += 1
        break
      case 'area_office':
        acc.area_office_count += 1
        if (n.employee_count && !seenCampusIds.has(n.id)) {
          acc.employee_count += n.employee_count
          seenCampusIds.add(n.id)
        }
        break
      case 'campus':
        acc.campus_count += 1
        if (n.employee_count && !seenCampusIds.has(n.id)) {
          acc.employee_count += n.employee_count
          seenCampusIds.add(n.id)
        }
        break
      case 'campus_department':
      case 'area_department':
      case 'district_department':
        acc.department_count += 1
        break
    }
    acc.leader_count += n.leaders?.length ?? 0
    acc.missing_leader_count += n.missing_singleton_roles?.length ?? 0
    if (n.children?.length) {
      walk(n.children, acc, seenCampusIds)
    }
  }
}

export function OrgTreeStats({ tree, compact = false }: OrgTreeStatsProps) {
  const stats = useMemo(() => {
    const acc: StatsData = {
      region_count: 0,
      district_count: 0,
      area_count: 0,
      campus_count: 0,
      area_office_count: 0,
      department_count: 0,
      employee_count: 0,
      leader_count: 0,
      missing_leader_count: 0,
    }
    walk(tree, acc, new Set())
    return acc
  }, [tree])

  const tiles: Array<{ label: string; value: number; tone?: 'danger' }> = [
    { label: '大区', value: stats.region_count },
    { label: '地区', value: stats.district_count },
    { label: '区域', value: stats.area_count },
    { label: '校区', value: stats.campus_count + stats.area_office_count },
    { label: '部门', value: stats.department_count },
    { label: '在任任命', value: stats.leader_count },
    { label: '员工数', value: stats.employee_count },
    {
      label: '未任命告警',
      value: stats.missing_leader_count,
      tone: stats.missing_leader_count > 0 ? 'danger' : undefined,
    },
  ]

  if (compact) {
    return (
      <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="min-h-9 rounded-md border px-3 py-1.5 flex items-center justify-between gap-2"
            style={{
              background: 'var(--semi-color-fill-0)',
              borderColor: t.tone === 'danger' ? 'var(--semi-color-danger-light-default)' : 'var(--semi-color-border)',
            }}
          >
            <Text type="tertiary" className="text-xs truncate">
              {t.label}
            </Text>
            <Text
              strong
              className="text-sm shrink-0"
              style={{ color: t.tone === 'danger' && t.value > 0 ? 'var(--semi-color-danger)' : undefined }}
            >
              {t.value}
            </Text>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-md border p-3"
          style={{
            background: 'var(--semi-color-fill-0)',
            borderColor: t.tone === 'danger' ? 'var(--semi-color-danger-light-default)' : 'var(--semi-color-border)',
          }}
        >
          <Text type="tertiary" className="text-xs block">
            {t.label}
          </Text>
          <Text
            strong
            className="text-lg"
            style={{ color: t.tone === 'danger' && t.value > 0 ? 'var(--semi-color-danger)' : undefined }}
          >
            {t.value}
          </Text>
        </div>
      ))}
    </div>
  )
}
