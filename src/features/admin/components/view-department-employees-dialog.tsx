/**
 * 查看部门员工对话框组件
 * 用于显示校区部门下的所有在职员工信息
 * 排序规则：职位等级（高在前）> 入职日期（早在前）
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, Building2, Network } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { adminApi } from '../api'
import type { CampusDepartmentItem, EmployeeIdentityItem } from '../types'
import { PositionNameBadge, PositionLevelBadge } from './status-badge'

interface ViewDepartmentEmployeesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campusDepartment: CampusDepartmentItem | null
}

export function ViewDepartmentEmployeesDialog({
  open,
  onOpenChange,
  campusDepartment,
}: ViewDepartmentEmployeesDialogProps) {
  // 获取部门员工列表
  const {
    data: employeesData,
    isLoading,
  } = useQuery({
    queryKey: [
      'department-employees',
      campusDepartment?.campus_id,
      campusDepartment?.department_id,
    ],
    queryFn: async () => {
      if (!campusDepartment?.campus_id || !campusDepartment?.department_id) {
        return { items: [], total: 0 }
      }
      const response = await adminApi.getEmployeeIdentities({
        campus_id: campusDepartment.campus_id,
        department_id: campusDepartment.department_id,
        size: 100,
        is_active: true,
      })
      return response.data || { items: [], total: 0 }
    },
    enabled: !!campusDepartment?.campus_id && !!campusDepartment?.department_id && open,
  })

  // 对员工数据排序：职位等级（高在前）> 入职日期（早在前）
  const employees = useMemo(() => {
    const items = employeesData?.items || []
    return [...items].sort((a, b) => {
      // 首先按职位等级降序（数字大的在前）
      const levelA = parseInt(a.position_level) || 1
      const levelB = parseInt(b.position_level) || 1
      if (levelA !== levelB) {
        return levelB - levelA
      }
      // 然后按入职日期升序（早入职的在前）
      const joinedA = a.employee_joined_at ? new Date(a.employee_joined_at).getTime() : Infinity
      const joinedB = b.employee_joined_at ? new Date(b.employee_joined_at).getTime() : Infinity
      return joinedA - joinedB
    })
  }, [employeesData?.items])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            部门员工列表
          </DialogTitle>
          <DialogDescription>
            {campusDepartment
              ? `「${campusDepartment.campus_name} - ${campusDepartment.department_name}」的在职员工列表`
              : '查看部门员工'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {/* 部门信息摘要 */}
          {campusDepartment && (
            <div className="flex items-center gap-4 mb-4 pb-4 border-b">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-teal-500" />
                <span className="font-medium">{campusDepartment.campus_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Network className="h-4 w-4 text-purple-500" />
                <span className="font-medium">{campusDepartment.department_name}</span>
              </div>
              <Badge variant="secondary" className="ml-auto">
                共 {employees.length} 人
              </Badge>
            </div>
          )}

          {/* 员工列表 */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-14" />
                </div>
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
              <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p>该部门暂无在职员工</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">姓名</TableHead>
                    <TableHead className="w-[120px]">用户名</TableHead>
                    <TableHead className="w-[140px]">职位</TableHead>
                    <TableHead className="w-[80px]">职级</TableHead>
                    <TableHead className="w-[100px]">入职日期</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee: EmployeeIdentityItem) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-medium text-primary">
                              {employee.employee_name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <span className="font-medium truncate">{employee.employee_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {employee.employee_username}
                      </TableCell>
                      <TableCell>
                        <PositionNameBadge positionName={employee.position_name} />
                      </TableCell>
                      <TableCell>
                        <PositionLevelBadge level={parseInt(employee.position_level) || 1} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {employee.employee_joined_at
                          ? new Date(employee.employee_joined_at).toLocaleDateString('zh-CN')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
