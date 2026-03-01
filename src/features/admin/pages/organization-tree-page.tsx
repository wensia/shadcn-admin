/**
 * 组织架构树页面
 * 展示员工的层级关系
 */

import { useState } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, User, Users, Search } from 'lucide-react'
import { Main } from '@/components/layout/main'
import { Button, Input, Tag, Skeleton, Typography, Card } from '@douyinfe/semi-ui-19'
import { IconRefresh } from '@douyinfe/semi-icons'
import { cn } from '@/lib/utils'
import { adminApi } from '../api'
import type { EmployeeHierarchyNode } from '../types'

const { Text } = Typography

/**
 * 单个员工节点组件
 */
function EmployeeNode({
  node,
  level = 0,
  searchTerm = '',
}: {
  node: EmployeeHierarchyNode
  level?: number
  searchTerm?: string
}) {
  const [isExpanded, setIsExpanded] = useState(level < 2) // 默认展开前两级
  const hasChildren = node.children && node.children.length > 0

  // 搜索高亮
  const isMatch = searchTerm &&
    (node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.email?.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="select-none">
      <div
        className={cn(
          'group flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors cursor-pointer',
          'hover:bg-muted/50',
          isMatch && 'bg-yellow-100 dark:bg-yellow-900/30'
        )}
        style={{ paddingLeft: `${level * 24 + 8}px` }}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {/* 展开/收起图标 */}
        <span className="w-4 h-4 flex items-center justify-center">
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" style={{ color: 'var(--semi-color-text-2)' }} />
            ) : (
              <ChevronRight className="h-4 w-4" style={{ color: 'var(--semi-color-text-2)' }} />
            )
          ) : (
            <span className="w-4" />
          )}
        </span>

        {/* 用户图标 */}
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center',
          node.is_superuser ? 'bg-primary/10 text-primary' : 'bg-muted'
        )}>
          {hasChildren ? (
            <Users className="h-4 w-4" />
          ) : (
            <User className="h-4 w-4" />
          )}
        </div>

        {/* 员工信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{node.name}</span>
            {node.is_superuser && (
              <Tag color="blue" size="small">超管</Tag>
            )}
            {hasChildren && (
              <Tag size="small">{node.children.length} 人</Tag>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--semi-color-text-2)' }}>
            {node.position && <span>{node.position}</span>}
            {node.position && node.department && <span>·</span>}
            {node.department && <span>{node.department}</span>}
            {(node.position || node.department) && node.campus && <span>·</span>}
            {node.campus && <span>{node.campus}</span>}
          </div>
        </div>

        {/* 联系方式 */}
        <div className="hidden md:flex flex-col items-end text-xs" style={{ color: 'var(--semi-color-text-2)' }}>
          {node.phone && <span>{node.phone}</span>}
          {node.email && <span className="truncate max-w-[200px]">{node.email}</span>}
        </div>
      </div>

      {/* 子节点 */}
      {hasChildren && isExpanded && (
        <div className="border-l ml-6 border-muted">
          {node.children.map((child) => (
            <EmployeeNode
              key={child.id}
              node={child}
              level={level + 1}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * 骨架屏
 */
function TreeSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center gap-2 py-1.5 px-2">
            <Skeleton.Paragraph rows={1} style={{ width: 16, height: 16 }} />
            <Skeleton.Avatar size="small" />
            <div className="flex-1 space-y-1">
              <Skeleton.Paragraph rows={1} style={{ width: 128 }} />
              <Skeleton.Paragraph rows={1} style={{ width: 192 }} />
            </div>
          </div>
          {i === 1 && (
            <div className="ml-12 space-y-2 border-l border-muted pl-2">
              {[1, 2].map((j) => (
                <div key={j} className="flex items-center gap-2 py-1.5 px-2">
                  <Skeleton.Paragraph rows={1} style={{ width: 16, height: 16 }} />
                  <Skeleton.Avatar size="small" />
                  <div className="flex-1 space-y-1">
                    <Skeleton.Paragraph rows={1} style={{ width: 96 }} />
                    <Skeleton.Paragraph rows={1} style={{ width: 144 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * 统计卡片
 */
function StatsCards({ nodes, totalEmployees }: { nodes: EmployeeHierarchyNode[]; totalEmployees: number }) {
  const topManagers = nodes.filter(n => n.children && n.children.length > 0)

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-lg border bg-card p-4">
        <Text type="tertiary" size="small">员工总数</Text>
        <p className="text-2xl font-bold">{totalEmployees}</p>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <Text type="tertiary" size="small">顶层管理者</Text>
        <p className="text-2xl font-bold">{nodes.length}</p>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <Text type="tertiary" size="small">有下属的管理者</Text>
        <p className="text-2xl font-bold">{topManagers.length}</p>
      </div>
    </div>
  )
}

export function OrganizationTreePage() {
  useDocumentTitle('组织架构树')
  const [searchTerm, setSearchTerm] = useState('')

  // 获取员工层级树
  const {
    data: hierarchyData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['employee-hierarchy-tree'],
    queryFn: async () => {
      const response = await adminApi.getEmployeeHierarchyTree()
      return response.data
    },
  })

  // 过滤搜索结果
  const filterNodes = (nodes: EmployeeHierarchyNode[], term: string): EmployeeHierarchyNode[] => {
    if (!term) return nodes

    const matchesSearch = (node: EmployeeHierarchyNode): boolean => {
      const nameMatch = node.name.toLowerCase().includes(term.toLowerCase())
      const phoneMatch = node.phone?.toLowerCase().includes(term.toLowerCase())
      const emailMatch = node.email?.toLowerCase().includes(term.toLowerCase())
      const positionMatch = node.position?.toLowerCase().includes(term.toLowerCase())
      const departmentMatch = node.department?.toLowerCase().includes(term.toLowerCase())
      const campusMatch = node.campus?.toLowerCase().includes(term.toLowerCase())

      if (nameMatch || phoneMatch || emailMatch || positionMatch || departmentMatch || campusMatch) {
        return true
      }

      // 检查子节点
      if (node.children && node.children.length > 0) {
        return node.children.some(child => matchesSearch(child))
      }

      return false
    }

    return nodes.filter(node => matchesSearch(node))
  }

  const filteredNodes = hierarchyData?.nodes ? filterNodes(hierarchyData.nodes, searchTerm) : []

  return (
    <Main>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">组织架构树</h2>
          <Text type="tertiary">
            查看员工的上下级层级关系（基于汇报关系）
          </Text>
        </div>
        <Button
          theme="outline"
          icon={<IconRefresh spin={isRefetching} />}
          onClick={() => refetch()}
          disabled={isRefetching}
        />
      </div>

      {/* 统计卡片 */}
      {hierarchyData && (
        <StatsCards
          nodes={hierarchyData.nodes}
          totalEmployees={hierarchyData.total_employees}
        />
      )}

      {/* 搜索框 */}
      <div className="mt-4 flex items-center gap-2">
        <Input
          prefix={<Search className="h-4 w-4" />}
          placeholder="搜索员工姓名、手机号、邮箱..."
          value={searchTerm}
          onChange={(v) => setSearchTerm(v)}
          style={{ maxWidth: 384 }}
        />
        {searchTerm && (
          <Button
            theme="borderless"
            type="tertiary"
            size="small"
            onClick={() => setSearchTerm('')}
          >
            清除
          </Button>
        )}
      </div>

      {/* 树形结构 */}
      <Card className="mt-4" title="员工层级" headerExtraContent={
        <Text type="tertiary" size="small">点击有下属的员工可以展开/收起其下属列表</Text>
      }>
        {isLoading ? (
          <TreeSkeleton />
        ) : filteredNodes.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--semi-color-text-2)' }}>
            {searchTerm ? '没有找到匹配的员工' : '暂无员工数据'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredNodes.map((node) => (
              <EmployeeNode
                key={node.id}
                node={node}
                searchTerm={searchTerm}
              />
            ))}
          </div>
        )}
      </Card>
    </Main>
  )
}
