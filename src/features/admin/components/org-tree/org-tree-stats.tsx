/**
 * 组织架构树顶部统计卡（仅旧版 organization-tree-page.tsx 使用）
 *
 * 新版 organization-page.tsx 已不再渲染独立的统计条，转而通过
 * computeOrgStats(tree) 把数字嵌入树面板 header 与右侧空状态的告警 CTA。
 * 统计/定位工具函数已移到 ./org-stats-helpers.ts。
 */
import { useMemo } from 'react'
import { Typography } from '@douyinfe/semi-ui-19'
import type { OrganizationTreeNode } from '../../types'
import { computeOrgStats } from './org-stats-helpers'

const { Text } = Typography

interface OrgTreeStatsProps {
  tree: OrganizationTreeNode[]
}

export function OrgTreeStats({ tree }: OrgTreeStatsProps) {
  const stats = useMemo(() => computeOrgStats(tree), [tree])

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

  return (
    <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-md border p-3"
          style={{
            background: 'var(--semi-color-fill-0)',
            borderColor:
              t.tone === 'danger'
                ? 'var(--semi-color-danger-light-default)'
                : 'var(--semi-color-border)',
          }}
        >
          <Text type="tertiary" className="text-xs block">
            {t.label}
          </Text>
          <Text
            strong
            className="text-lg"
            style={{
              color:
                t.tone === 'danger' && t.value > 0
                  ? 'var(--semi-color-danger)'
                  : undefined,
            }}
          >
            {t.value}
          </Text>
        </div>
      ))}
    </div>
  )
}
