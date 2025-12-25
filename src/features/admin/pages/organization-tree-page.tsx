/**
 * 组织架构树页面
 * 展示员工的上下级层级关系（基于 reports_to 字段）
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, User, Users, RefreshCw, Search } from 'lucide-react'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { adminApi } from '../api'
import type { EmployeeHierarchyNode } from '../types'

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
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
              <Badge variant="default" className="text-xs">超管</Badge>
            )}
            {hasChildren && (
              <Badge variant="secondary" className="text-xs">
                {node.children.length} 人
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {node.position && <span>{node.position}</span>}
            {node.position && node.department && <span>·</span>}
            {node.department && <span>{node.department}</span>}
            {(node.position || node.department) && node.campus && <span>·</span>}
            {node.campus && <span>{node.campus}</span>}
          </div>
        </div>

        {/* 联系方式 */}
        <div className="hidden md:flex flex-col items-end text-xs text-muted-foreground">
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
            <Skeleton className="w-4 h-4" />
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          {i === 1 && (
            <div className="ml-12 space-y-2 border-l border-muted pl-2">
              {[1, 2].map((j) => (
                <div key={j} className="flex items-center gap-2 py-1.5 px-2">
                  <Skeleton className="w-4 h-4" />
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-36" />
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
  // 计算统计数据
  const countSubordinates = (node: EmployeeHierarchyNode): number => {
    let count = 1
    if (node.children) {
      node.children.forEach(child => {
        count += countSubordinates(child)
      })
    }
    return count
  }

  const topManagers = nodes.filter(n => n.children && n.children.length > 0)
  const totalWithSubordinates = nodes.reduce((acc, node) => acc + countSubordinates(node), 0)

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>员工总数</CardDescription>
          <CardTitle className="text-2xl">{totalEmployees}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>顶层管理者</CardDescription>
          <CardTitle className="text-2xl">{nodes.length}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>有下属的管理者</CardDescription>
          <CardTitle className="text-2xl">{topManagers.length}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  )
}

export function OrganizationTreePage() {
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
          <p className="text-muted-foreground">
            查看员工的上下级层级关系（基于汇报关系）
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isRefetching}
          title="刷新"
        >
          <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
        </Button>
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
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索员工姓名、手机号、邮箱..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchTerm('')}
          >
            清除
          </Button>
        )}
      </div>

      {/* 树形结构 */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>员工层级</CardTitle>
          <CardDescription>
            点击有下属的员工可以展开/收起其下属列表
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TreeSkeleton />
          ) : filteredNodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
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
        </CardContent>
      </Card>
    </Main>
  )
}
