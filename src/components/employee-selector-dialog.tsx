/**
 * 员工选择器弹窗组件 - Semi Design 版本
 * 可复用的员工选择组件，支持搜索、分页、校区筛选
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Modal, Button, Input, Select, Table, Tag, Typography } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { IconSearch, IconRefresh } from '@douyinfe/semi-icons'
import { Check } from 'lucide-react'
import { employeeApi, type EmployeeListItem } from '@/features/crm/leads/api'

const { Text } = Typography

export interface EmployeeSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (employee: EmployeeListItem) => void
  title?: string
  description?: string
  confirmText?: string
  excludeIds?: string[]
  filterByAdvisorPosition?: boolean
}

export function EmployeeSelectorDialog({
  open,
  onOpenChange,
  onSelect,
  title = '选择员工',
  description = '从列表中选择一名员工',
  confirmText = '确定选择',
  excludeIds = [],
  filterByAdvisorPosition = true
}: EmployeeSelectorDialogProps) {
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
    queryKey: ['employees-for-selector', page, pageSize, searchText, selectedCampus, filterByAdvisorPosition],
    queryFn: async () => {
      const params = {
        page,
        size: pageSize,
        search: searchText || undefined,
        campus_name: selectedCampus || undefined,
        is_active: true
      }
      const response = filterByAdvisorPosition
        ? await employeeApi.getCourseAdvisors(params)
        : await employeeApi.getEmployees(params)
      return response.data
    },
    enabled: open
  })

  const filteredItems = employeeData?.items?.filter(
    (emp) => !excludeIds.includes(emp.id)
  ) || []

  const resetDialogState = () => {
    setSelectedEmployee(null)
    setSearchText('')
    setSelectedCampus('')
    setPage(1)
  }

  const handleClose = () => {
    resetDialogState()
    onOpenChange(false)
  }

  const handleRefresh = () => {
    resetDialogState()
    refetch()
  }

  const handleConfirm = () => {
    if (selectedEmployee) {
      onSelect(selectedEmployee)
      handleClose()
    }
  }

  const getEmployeeInfo = (employee: EmployeeListItem) => {
    const identity = employee.employee_identities?.[0]
    return {
      campus: identity?.campus?.name || employee.campus_name || '-',
      department: identity?.department?.name || employee.department_name || '-',
      position: identity?.position?.name || employee.position?.name || '-'
    }
  }

  const columns: ColumnProps<EmployeeListItem>[] = [
    {
      title: '选择',
      dataIndex: 'id',
      width: 50,
      align: 'center',
      render: (_: string, record: EmployeeListItem) => {
        const isSelected = selectedEmployee?.id === record.id
        return (
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              border: `2px solid ${isSelected ? 'var(--semi-color-primary)' : 'var(--semi-color-border)'}`,
              backgroundColor: isSelected ? 'var(--semi-color-primary)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
            }}
          >
            {isSelected && <Check size={10} color="#fff" />}
          </div>
        )
      },
    },
    {
      title: '姓名',
      dataIndex: 'name',
      width: 90,
      render: (text: string, record: EmployeeListItem) => (
        <Text strong={selectedEmployee?.id === record.id} style={selectedEmployee?.id === record.id ? { color: 'var(--semi-color-primary)' } : undefined}>
          {text}
        </Text>
      ),
    },
    {
      title: '用户名',
      dataIndex: 'username',
      width: 100,
      render: (text: string) => <Text type="tertiary">{text}</Text>,
    },
    {
      title: '职位',
      dataIndex: 'position',
      width: 90,
      render: (_: unknown, record: EmployeeListItem) => {
        const info = getEmployeeInfo(record)
        return info.position !== '-' ? (
          <Tag size="small">{info.position}</Tag>
        ) : null
      },
    },
    {
      title: '校区',
      dataIndex: 'campus_name',
      width: 100,
      render: (_: string, record: EmployeeListItem) => getEmployeeInfo(record).campus,
    },
    {
      title: '部门',
      dataIndex: 'department_name',
      width: 90,
      render: (_: string, record: EmployeeListItem) => getEmployeeInfo(record).department,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 60,
      align: 'center',
      render: (isActive: boolean) => (
        <Tag size="small" color={isActive ? 'green' : 'red'}>
          {isActive ? '在职' : '离职'}
        </Tag>
      ),
    },
  ]

  // 校区选项
  const campusOptions = [
    { value: '', label: '全部校区' },
    ...campuses.map((c) => ({ value: c.name, label: c.name }))
  ]

  return (
    <Modal
      title={
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--semi-color-text-2)', fontWeight: 400 }}>{description}</div>
        </div>
      }
      visible={open}
      onCancel={handleClose}
      width={900}
      closeOnEsc
      style={{ maxHeight: '85vh' }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            theme="solid"
            type="primary"
            onClick={handleConfirm}
            disabled={!selectedEmployee}
          >
            {selectedEmployee ? `${confirmText} ${selectedEmployee.name}` : '请先选择员工'}
          </Button>
        </div>
      }
    >
      {/* 搜索栏 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text type="tertiary">搜索</Text>
          <Input
            prefix={<IconSearch />}
            value={searchText}
            onChange={(v) => {
              setSearchText(v)
              setPage(1)
            }}
            placeholder="输入姓名或用户名搜索"
            showClear
            style={{ width: 200 }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text type="tertiary">校区</Text>
          <Select
            value={selectedCampus}
            onChange={(v) => {
              setSelectedCampus(v as string)
              setPage(1)
            }}
            optionList={campusOptions}
            style={{ width: 140 }}
          />
        </div>
        <Button
          theme="borderless"
          type="tertiary"
          icon={<IconRefresh />}
          onClick={handleRefresh}
        />
      </div>

      {/* 员工表格 */}
      <Table
        columns={columns}
        dataSource={filteredItems}
        rowKey="id"
        loading={isLoading}
        pagination={{
          currentPage: page,
          pageSize,
          total: employeeData?.total || 0,
          onPageChange: setPage,
          showTotal: true,
          formatPageText: (info: { total: number }) => `共 ${info.total} 位员工`,
        }}
        onRow={(record) => ({
          onClick: () => {
            if (record) {
              setSelectedEmployee(
                selectedEmployee?.id === record.id ? null : record
              )
            }
          },
          style: {
            cursor: 'pointer',
            backgroundColor: selectedEmployee?.id === record?.id ? 'var(--semi-color-primary-light-default)' : undefined,
          },
        })}
        empty={
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--semi-color-text-2)', fontSize: 13 }}>
            暂无员工数据
          </div>
        }
      />
    </Modal>
  )
}
