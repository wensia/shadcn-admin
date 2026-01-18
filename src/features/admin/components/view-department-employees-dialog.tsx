/**
 * 查看部门员工对话框组件
 * 用于显示校区部门下的所有员工信息
 */

import { useQuery } from '@tanstack/react-query'
import { Users, Building2, Network, Briefcase, Phone } from 'lucide-react'
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

interface ViewDepartmentEmployeesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campusDepartment: CampusDepartmentItem | null
}

/** 职级显示配置 */
const positionLevelLabels: Record<string, string> = {
  '1': '实习',
  '2': '初级',
  '3': '中级',
  '4': '高级',
  '5': '专家',
  '6': '资深专家',
}

const positionLevelVariants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  '1': 'outline',
  '2': 'outline',
  '3': 'secondary',
  '4': 'default',
  '5': 'default',
  '6': 'default',
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

  const employees = employeesData?.items || []

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
              ? `「${campusDepartment.campus_name} - ${campusDepartment.department_name}」的员工列表`
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
              <p>该部门暂无员工</p>
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
                    <TableHead>状态</TableHead>
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
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{employee.position_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={positionLevelVariants[employee.position_level] || 'outline'}>
                          {positionLevelLabels[employee.position_level] || `L${employee.position_level}`}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {employee.is_active ? (
                          <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                            在职
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            离职
                          </Badge>
                        )}
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
