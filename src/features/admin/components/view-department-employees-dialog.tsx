/**
 * 查看部门员工对话框组件
 * 用于显示校区部门下的所有在职员工信息
 * 排序规则：职位等级（高在前）> 入职日期（早在前）
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, Building2, Network } from 'lucide-react'
import { Modal, Table, Tag, Typography } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { DialogBodySkeleton } from '@/components/semi/dialog-body-skeleton'
import { adminApi } from '../api'
import type { CampusDepartmentItem, EmployeeIdentityItem } from '../types'
import { PositionNameBadge, PositionLevelBadge } from './status-badge'

const { Text } = Typography

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

  // Semi Table 列定义
  const columns: ColumnProps<EmployeeIdentityItem>[] = [
    {
      title: '姓名',
      dataIndex: 'employee_name',
      width: 140,
      render: (_text: string, record: EmployeeIdentityItem) => (
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--semi-color-primary-light-default)' }}
          >
            <span className="text-xs font-medium" style={{ color: 'var(--semi-color-primary)' }}>
              {record.employee_name?.charAt(0) || '?'}
            </span>
          </div>
          <span className="font-medium truncate">{record.employee_name}</span>
        </div>
      ),
    },
    {
      title: '用户名',
      dataIndex: 'employee_username',
      width: 120,
      render: (text: string) => (
        <Text type="tertiary">{text}</Text>
      ),
    },
    {
      title: '职位',
      dataIndex: 'position_name',
      width: 140,
      render: (text: string) => (
        <PositionNameBadge positionName={text} />
      ),
    },
    {
      title: '职级',
      dataIndex: 'position_level',
      width: 80,
      render: (text: string) => (
        <PositionLevelBadge level={parseInt(text) || 1} />
      ),
    },
    {
      title: '入职日期',
      dataIndex: 'employee_joined_at',
      width: 100,
      render: (text: string) => (
        <Text type="tertiary">
          {text ? new Date(text).toLocaleDateString('zh-CN') : '-'}
        </Text>
      ),
    },
  ]

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          部门员工列表
        </div>
      }
      visible={open}
      onCancel={() => onOpenChange(false)}
      footer={null}
      width={800}
      style={{ maxHeight: '85vh' }}
    >
      <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 16 }}>
        {campusDepartment
          ? `「${campusDepartment.campus_name} - ${campusDepartment.department_name}」的在职员工列表`
          : '查看部门员工'}
      </Text>

      <div style={{ maxHeight: 'calc(85vh - 160px)', overflowY: 'auto' }}>
        {/* 部门信息摘要 */}
        {campusDepartment && (
          <div className="flex items-center gap-4 mb-4 pb-4 border-b">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4" style={{ color: '#14b8a6' }} />
              <span className="font-medium">{campusDepartment.campus_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Network className="h-4 w-4" style={{ color: '#a855f7' }} />
              <span className="font-medium">{campusDepartment.department_name}</span>
            </div>
            <Tag color="grey" type="light" style={{ marginLeft: 'auto' }}>
              共 {employees.length} 人
            </Tag>
          </div>
        )}

        {/* 员工列表 */}
        {isLoading ? (
          <DialogBodySkeleton variant="list" rows={5} compact />
        ) : employees.length === 0 ? (
          <div className="text-center py-12 border rounded-lg border-dashed" style={{ color: 'var(--semi-color-text-2)' }}>
            <Users className="h-12 w-12 mx-auto mb-3" style={{ opacity: 0.5 }} />
            <p>该部门暂无在职员工</p>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={employees}
            rowKey="id"
            pagination={false}
            size="small"
          />
        )}
      </div>
    </Modal>
  )
}
