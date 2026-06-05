/**
 * 负责人管理对话框组件
 * 用于管理校区部门的负责人（经理、副经理、主管）
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'
import { Users, UserPlus, Trash2 } from 'lucide-react'
import { Button, Modal, Select, Tag, Typography } from '@douyinfe/semi-ui-19'
import { IconLoading } from '@douyinfe/semi-icons'
import { EmployeeSelectorDialog } from '@/components/employee-selector-dialog'
import { DialogBodySkeleton } from '@/components/semi/dialog-body-skeleton'
import type { SemiTagColor } from '@/lib/semi-types'
import { adminApi } from '../api'
import {
  MANAGER_TYPE_OPTIONS,
  type CampusDepartmentItem,
  type DepartmentManagerItem,
  type DepartmentManagerCreate,
  type ManagerType,
} from '../types'
import { showApiErrorToast } from '@/lib/api/error-toast'

const { Text } = Typography

interface ManageManagersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campusDepartment: CampusDepartmentItem | null
  onSuccess?: () => void
}

/** 负责人类型显示配置 */
const managerTypeTagColors: Record<ManagerType, SemiTagColor> = {
  manager: 'blue',
  deputy: 'cyan',
  supervisor: 'grey',
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
      showApiErrorToast(error, '添加负责人失败')
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
      refetchManagers()
      queryClient.invalidateQueries({ queryKey: ['admin-campus-departments'] })
      onSuccess?.()
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '移除负责人失败')
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

  // 处理删除点击 - 使用 Semi Modal.warning 确认
  const handleDeleteClick = (manager: DepartmentManagerItem) => {
    Modal.warning({
      title: '确认移除负责人',
      content: (
        <span>
          确定要移除「{manager.employee?.name}」的
          {managerTypeLabels[manager.manager_type]}
          职责吗？此操作不可撤销。
        </span>
      ),
      okText: '移除',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => {
        removeMutation.mutate(manager.id)
      },
    })
  }

  // 关闭对话框时重置状态
  const handleClose = () => {
    setSelectedEmployee(null)
    setSelectedManagerType('manager')
    onOpenChange(false)
  }

  // 负责人类型选项
  const managerTypeOptions = MANAGER_TYPE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  }))

  return (
    <>
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            负责人管理
          </div>
        }
        visible={open}
        onCancel={handleClose}
        footer={null}
        width={600}
        style={{ maxHeight: '85vh' }}
      >
        <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 16 }}>
          {campusDepartment
            ? `管理「${campusDepartment.campus_name} - ${campusDepartment.department_name}」的负责人`
            : '管理部门负责人'}
        </Text>

        <div className="space-y-6" style={{ maxHeight: 'calc(85vh - 160px)', overflowY: 'auto', paddingBottom: 16 }}>
          {/* 当前负责人列表 */}
          <div>
            <h4 className="text-sm font-medium mb-3">当前负责人</h4>
            {isLoadingManagers ? (
              <DialogBodySkeleton variant="list" rows={2} compact />
            ) : managers.length === 0 ? (
              <div className="text-center py-8 border rounded-lg border-dashed" style={{ color: 'var(--semi-color-text-2)' }}>
                暂无负责人，请添加
              </div>
            ) : (
              <div className="space-y-2">
                {managers.map((manager) => (
                  <div
                    key={manager.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-[var(--semi-color-fill-0)] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--semi-color-primary-light-default)' }}>
                      <Users className="h-5 w-5" style={{ color: 'var(--semi-color-primary)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {manager.employee?.name || '未知员工'}
                      </div>
                      <Text type="tertiary" size="small" className="truncate block">
                        {manager.employee?.phone || manager.employee?.email || '-'}
                      </Text>
                    </div>
                    <Tag color={managerTypeTagColors[manager.manager_type]} type="light">
                      {managerTypeLabels[manager.manager_type]}
                    </Tag>
                    <Button
                      theme="borderless"
                      type="danger"
                      icon={<Trash2 className="h-4 w-4" />}
                      onClick={() => handleDeleteClick(manager)}
                      disabled={removeMutation.isPending}
                    />
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
                  <label className="text-sm font-medium">选择员工</label>
                  <Button
                    theme="light"
                    style={{ width: '100%', justifyContent: 'flex-start', fontWeight: 'normal' }}
                    onClick={() => setEmployeeSelectorOpen(true)}
                  >
                    {selectedEmployee ? (
                      <span>{selectedEmployee.name}</span>
                    ) : (
                      <span style={{ color: 'var(--semi-color-text-2)' }}>点击选择员工...</span>
                    )}
                  </Button>
                </div>

                <div className="space-y-2 min-w-0">
                  <label className="text-sm font-medium">负责人类型</label>
                  <Select
                    value={selectedManagerType}
                    onChange={(value) => setSelectedManagerType(value as ManagerType)}
                    style={{ width: '100%' }}
                    optionList={managerTypeOptions}
                  />
                </div>
              </div>

              <Button
                theme="solid"
                type="primary"
                onClick={handleAddManager}
                disabled={!selectedEmployee || addMutation.isPending}
                block
                icon={addMutation.isPending ? <IconLoading spin /> : <UserPlus className="h-4 w-4" />}
              >
                {addMutation.isPending ? '添加中...' : '添加负责人'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

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
        filterByAdvisorPosition={false}
      />
    </>
  )
}
