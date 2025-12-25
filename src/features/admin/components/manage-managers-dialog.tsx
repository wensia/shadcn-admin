/**
 * 负责人管理对话框组件
 * 用于管理校区部门的负责人（经理、副经理、主管）
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Users, UserPlus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { EmployeeSelectorDialog } from '@/components/employee-selector-dialog'
import { adminApi } from '../api'
import type {
  CampusDepartmentItem,
  DepartmentManagerItem,
  DepartmentManagerCreate,
  ManagerType,
} from '../types'
import { MANAGER_TYPE_OPTIONS } from '../types'

interface ManageManagersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campusDepartment: CampusDepartmentItem | null
  onSuccess?: () => void
}

/** 负责人类型显示配置 */
const managerTypeBadgeVariants: Record<ManagerType, 'default' | 'secondary' | 'outline'> = {
  manager: 'default',
  deputy: 'secondary',
  supervisor: 'outline',
}

const managerTypeLabels: Record<ManagerType, string> = {
  manager: '经理',
  deputy: '副经理',
  supervisor: '主管',
}

export function ManageManagersDialog({
  open,
  onOpenChange,
  campusDepartment,
  onSuccess,
}: ManageManagersDialogProps) {
  const queryClient = useQueryClient()

  // 添加负责人表单状态
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null)
  const [selectedManagerType, setSelectedManagerType] = useState<ManagerType>('manager')

  // 员工选择器弹窗状态
  const [employeeSelectorOpen, setEmployeeSelectorOpen] = useState(false)

  // 删除确认对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingManager, setDeletingManager] = useState<DepartmentManagerItem | null>(null)

  // 获取负责人列表
  const {
    data: managersData,
    isLoading: isLoadingManagers,
    refetch: refetchManagers,
  } = useQuery({
    queryKey: ['campus-department-managers', campusDepartment?.id],
    queryFn: async () => {
      if (!campusDepartment?.id) return []
      const response = await adminApi.getCampusDepartmentManagers(campusDepartment.id)
      return response.data || []
    },
    enabled: !!campusDepartment?.id && open,
  })

  const managers = managersData || []

  // 已经是负责人的员工ID列表
  const existingManagerIds = managers.map((m) => m.employee_id)

  // 添加负责人
  const addMutation = useMutation({
    mutationFn: (data: DepartmentManagerCreate) => {
      if (!campusDepartment?.id) throw new Error('未选择校区部门')
      return adminApi.addCampusDepartmentManager(campusDepartment.id, data)
    },
    onSuccess: () => {
      toast.success('添加负责人成功')
      setSelectedEmployee(null)
      setSelectedManagerType('manager')
      refetchManagers()
      queryClient.invalidateQueries({ queryKey: ['admin-campus-departments'] })
      onSuccess?.()
    },
    onError: (error: Error) => {
      toast.error(`添加负责人失败: ${error.message}`)
    },
  })

  // 移除负责人
  const removeMutation = useMutation({
    mutationFn: (managerId: string) => {
      if (!campusDepartment?.id) throw new Error('未选择校区部门')
      return adminApi.removeCampusDepartmentManager(campusDepartment.id, managerId)
    },
    onSuccess: () => {
      toast.success('移除负责人成功')
      setDeleteDialogOpen(false)
      setDeletingManager(null)
      refetchManagers()
      queryClient.invalidateQueries({ queryKey: ['admin-campus-departments'] })
      onSuccess?.()
    },
    onError: (error: Error) => {
      toast.error(`移除负责人失败: ${error.message}`)
    },
  })

  // 处理添加负责人
  const handleAddManager = () => {
    if (!selectedEmployee) {
      toast.error('请选择员工')
      return
    }
    addMutation.mutate({
      employee_id: selectedEmployee.id,
      manager_type: selectedManagerType,
    })
  }

  // 处理删除点击
  const handleDeleteClick = (manager: DepartmentManagerItem) => {
    setDeletingManager(manager)
    setDeleteDialogOpen(true)
  }

  // 处理删除确认
  const handleDeleteConfirm = () => {
    if (deletingManager) {
      removeMutation.mutate(deletingManager.id)
    }
  }

  // 关闭对话框时重置状态
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedEmployee(null)
      setSelectedManagerType('manager')
    }
    onOpenChange(newOpen)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              负责人管理
            </DialogTitle>
            <DialogDescription>
              {campusDepartment
                ? `管理「${campusDepartment.campus_name} - ${campusDepartment.department_name}」的负责人`
                : '管理部门负责人'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            {/* 当前负责人列表 */}
            <div>
              <h4 className="text-sm font-medium mb-3">当前负责人</h4>
              {isLoadingManagers ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
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
              ) : managers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                  暂无负责人，请添加
                </div>
              ) : (
                <div className="space-y-2">
                  {managers.map((manager) => (
                    <div
                      key={manager.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {manager.employee?.name || '未知员工'}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {manager.employee?.phone || manager.employee?.email || '-'}
                        </div>
                      </div>
                      <Badge variant={managerTypeBadgeVariants[manager.manager_type]}>
                        {managerTypeLabels[manager.manager_type]}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => handleDeleteClick(manager)}
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 添加负责人表单 */}
            <div className="border-t pt-6">
              <h4 className="text-sm font-medium mb-3">添加负责人</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 min-w-0">
                    <Label>选择员工</Label>
                    <Button
                      variant="outline"
                      className="w-full justify-start font-normal"
                      onClick={() => setEmployeeSelectorOpen(true)}
                    >
                      {selectedEmployee ? (
                        <span>{selectedEmployee.name}</span>
                      ) : (
                        <span className="text-muted-foreground">点击选择员工...</span>
                      )}
                    </Button>
                  </div>

                  <div className="space-y-2 min-w-0">
                    <Label>负责人类型</Label>
                    <Select
                      value={selectedManagerType}
                      onValueChange={(value) => setSelectedManagerType(value as ManagerType)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MANAGER_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleAddManager}
                  disabled={!selectedEmployee || addMutation.isPending}
                  className="w-full"
                >
                  {addMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      添加中...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      添加负责人
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 员工选择器弹窗 */}
      <EmployeeSelectorDialog
        open={employeeSelectorOpen}
        onOpenChange={setEmployeeSelectorOpen}
        onSelect={(employee) => {
          setSelectedEmployee({ id: employee.id, name: employee.name })
        }}
        title="选择员工"
        description="选择要添加为负责人的员工"
        confirmText="确定选择"
        excludeIds={existingManagerIds}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认移除负责人</AlertDialogTitle>
            <AlertDialogDescription>
              确定要移除「{deletingManager?.employee?.name}」的
              {deletingManager?.manager_type && managerTypeLabels[deletingManager.manager_type]}
              职责吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMutation.isPending ? '移除中...' : '移除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
