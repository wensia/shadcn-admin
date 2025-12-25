/**
 * 员工选择器弹窗组件
 * 可复用的员工选择组件，支持搜索、分页、校区筛选
 */

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, RefreshCw, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { employeeApi, type EmployeeListItem } from '@/features/crm/leads/api'

export interface EmployeeSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (employee: EmployeeListItem) => void
  title?: string
  description?: string
  confirmText?: string
  /** 要排除的员工ID列表 */
  excludeIds?: string[]
}

export function EmployeeSelectorDialog({
  open,
  onOpenChange,
  onSelect,
  title = '选择员工',
  description = '从列表中选择一名员工',
  confirmText = '确定选择',
  excludeIds = []
}: EmployeeSelectorDialogProps) {
  // 状态
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeListItem | null>(null)
  const [searchText, setSearchText] = useState('')
  const [selectedCampus, setSelectedCampus] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 5

  // 获取校区列表
  const { data: campuses = [] } = useQuery({
    queryKey: ['user-campuses'],
    queryFn: async () => {
      return await employeeApi.getCurrentUserCampuses()
    },
    enabled: open,
    staleTime: 5 * 60 * 1000
  })

  // 获取员工列表
  const { data: employeeData, isLoading, refetch } = useQuery({
    queryKey: ['employees-for-selector', page, pageSize, searchText, selectedCampus],
    queryFn: async () => {
      const response = await employeeApi.getCourseAdvisors({
        page,
        size: pageSize,
        search: searchText || undefined,
        campus_name: selectedCampus || undefined,
        is_active: true
      })
      return response.data
    },
    enabled: open
  })

  // 过滤掉已排除的员工
  const filteredItems = employeeData?.items?.filter(
    (emp) => !excludeIds.includes(emp.id)
  ) || []

  // 弹框关闭时重置状态
  useEffect(() => {
    if (!open) {
      setSelectedEmployee(null)
      setSearchText('')
      setSelectedCampus('')
      setPage(1)
    }
  }, [open])

  // 搜索时重置页码
  useEffect(() => {
    setPage(1)
  }, [searchText, selectedCampus])

  const handleRefresh = () => {
    setSearchText('')
    setSelectedCampus('')
    setPage(1)
    refetch()
  }

  const handleSelectEmployee = (employee: EmployeeListItem) => {
    if (selectedEmployee?.id === employee.id) {
      setSelectedEmployee(null)
    } else {
      setSelectedEmployee(employee)
    }
  }

  const handleConfirm = () => {
    if (selectedEmployee) {
      onSelect(selectedEmployee)
      onOpenChange(false)
    }
  }

  // 获取员工的校区和部门信息
  const getEmployeeInfo = (employee: EmployeeListItem) => {
    const identity = employee.employee_identities?.[0]
    return {
      campus: identity?.campus?.name || employee.campus_name || '-',
      department: identity?.department?.name || employee.department_name || '-',
      position: identity?.position?.name || employee.position?.name || '-'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="text-base">{title}</DialogTitle>
          <DialogDescription className="text-xs">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
          {/* 搜索栏 */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">搜索</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="输入姓名或用户名搜索"
                  className="h-8 text-xs pl-8 w-48"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">校区</Label>
              <Select value={selectedCampus} onValueChange={setSelectedCampus}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue placeholder="全部校区" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" " className="text-xs">全部校区</SelectItem>
                  {campuses.map((campus) => (
                    <SelectItem key={campus.id} value={campus.name} className="text-xs">
                      {campus.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              title="刷新"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* 员工表格 */}
          <ScrollArea className="flex-1 border rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-14 text-xs text-center">选择</TableHead>
                  <TableHead className="w-24 text-xs">姓名</TableHead>
                  <TableHead className="w-28 text-xs">用户名</TableHead>
                  <TableHead className="w-24 text-xs">职位</TableHead>
                  <TableHead className="w-28 text-xs">校区</TableHead>
                  <TableHead className="w-24 text-xs">部门</TableHead>
                  <TableHead className="w-16 text-xs text-center">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      暂无员工数据
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((employee) => {
                    const isSelected = selectedEmployee?.id === employee.id
                    const info = getEmployeeInfo(employee)
                    return (
                      <TableRow
                        key={employee.id}
                        className={cn(
                          'cursor-pointer hover:bg-muted/50 transition-colors',
                          isSelected && 'bg-primary/5'
                        )}
                        onClick={() => handleSelectEmployee(employee)}
                      >
                        <TableCell className="text-center">
                          <div
                            className={cn(
                              'w-4 h-4 rounded-full border-2 mx-auto flex items-center justify-center transition-colors',
                              isSelected
                                ? 'border-primary bg-primary'
                                : 'border-muted-foreground/30'
                            )}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                          </div>
                        </TableCell>
                        <TableCell className={cn('text-xs', isSelected && 'font-semibold text-primary')}>
                          {employee.name}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {employee.username}
                        </TableCell>
                        <TableCell>
                          {info.position !== '-' && (
                            <Badge variant="secondary" className="text-xs h-5">
                              {info.position}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{info.campus}</TableCell>
                        <TableCell className="text-xs">{info.department}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={employee.is_active ? 'default' : 'destructive'}
                            className="text-xs h-5"
                          >
                            {employee.is_active ? '在职' : '离职'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* 分页 */}
          <div className="flex items-center justify-center gap-4 shrink-0 pt-2 border-t">
            <span className="text-xs text-muted-foreground">
              共 {employeeData?.total || 0} 位员工
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                上一页
              </Button>
              <span className="text-xs px-2">
                第 {page} / {Math.max(1, Math.ceil((employeeData?.total || 0) / pageSize))} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                disabled={page >= Math.ceil((employeeData?.total || 0) / pageSize)}
                onClick={() => setPage(p => p + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="px-4 py-3 border-t gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            size="sm"
            className="h-8 text-xs"
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            size="sm"
            className="h-8 text-xs"
            disabled={!selectedEmployee}
          >
            {selectedEmployee ? `${confirmText} ${selectedEmployee.name}` : '请先选择员工'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
