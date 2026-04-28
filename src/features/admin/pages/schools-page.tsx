/**
 * 学校管理页面
 */

import { useState, useMemo, useRef } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'
import { Plus, Pencil, Trash2, GraduationCap } from 'lucide-react'
import { Form, Button, Modal, Input, Typography } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconSearch } from '@douyinfe/semi-icons'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { adminApi } from '../api'
import type { SchoolItem, SchoolCreate, SchoolUpdate } from '../types'
import { showApiErrorToast } from '@/lib/api/error-toast'

const { Text } = Typography

interface SchoolFormValues {
  name: string
  province?: string
  city?: string
  district?: string
  address?: string
  contact_phone?: string
  remark?: string
}

export function SchoolsPage() {
  useDocumentTitle('学校管理')
  const queryClient = useQueryClient()
  const formRef = useRef<FormApi | null>(null)

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SchoolItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<SchoolItem | null>(null)

  // 获取学校列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-schools', page, pageSize, searchValue],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page,
        size: pageSize,
      }
      if (searchValue) {
        params.search = searchValue
      }
      const response = await adminApi.getSchools(params)
      return response.data
    },
  })

  // 创建学校
  const createMutation = useMutation({
    mutationFn: (data: SchoolCreate) => adminApi.createSchool(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin-schools'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '创建失败')
    },
  })

  // 更新学校
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SchoolUpdate }) =>
      adminApi.updateSchool(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-schools'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '更新失败')
    },
  })

  // 删除学校
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteSchool(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-schools'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '删除失败')
    },
  })

  // 表格列定义
  const columns: ColumnProps<SchoolItem>[] = [
    {
      title: '学校名称',
      dataIndex: 'name',
      width: 200,
      render: (text: string, record: SchoolItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={128} />
        return (
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-amber-500" />
            <Text strong>{text}</Text>
          </div>
        )
      },
    },
    {
      title: '所在地区',
      dataIndex: 'province',
      width: 200,
      render: (_province: string, record: SchoolItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={96} />
        const parts = [record.province, record.city, record.district].filter(Boolean)
        return parts.length > 0 ? parts.join(' / ') : '-'
      },
    },
    {
      title: '详细地址',
      dataIndex: 'address',
      render: (text: string, record: SchoolItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={160} />
        if (!text) return '-'
        return (
          <span style={{ maxWidth: 200, display: 'inline-block' }} className="truncate" title={text}>
            {text}
          </span>
        )
      },
    },
    {
      title: '联系电话',
      dataIndex: 'contact_phone',
      width: 140,
      render: (text: string, record: SchoolItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={96} />
        return text || '-'
      },
    },
    {
      title: '年级',
      dataIndex: 'grade_levels',
      width: 120,
      render: (levels: string[], record: SchoolItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        return levels && levels.length > 0 ? levels.join(', ') : '-'
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 180,
      render: (text: string | undefined, record: SchoolItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={112} />
        return text ? new Date(text).toLocaleString('zh-CN') : '-'
      },
    },
    {
      title: '操作',
      dataIndex: 'id',
      width: 120,
      render: (_id: string, record: SchoolItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        return (
          <div style={{ display: 'flex', gap: 4 }}>
            <Button theme="borderless" type="tertiary" icon={<Pencil className="h-4 w-4" />} size="small" onClick={() => handleEdit(record)} />
            <Button theme="borderless" type="danger" icon={<Trash2 className="h-4 w-4" />} size="small" onClick={() => handleDeleteClick(record)} />
          </div>
        )
      },
    },
  ]

  const items = useMemo(() => data?.items ?? [], [data?.items])

  // 处理创建
  const handleCreate = () => {
    setEditingItem(null)
    setDialogOpen(true)
    setTimeout(() => { formRef.current?.reset() }, 0)
  }

  // 处理编辑
  const handleEdit = (item: SchoolItem) => {
    setEditingItem(item)
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.setValues({
        name: item.name,
        province: item.province || '',
        city: item.city || '',
        district: item.district || '',
        address: item.address || '',
        contact_phone: item.contact_phone || '',
        remark: item.remark || '',
      })
    }, 0)
  }

  // 处理删除点击
  const handleDeleteClick = (item: SchoolItem) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  // 处理删除确认
  const handleDeleteConfirm = () => {
    if (deletingItem) {
      deleteMutation.mutate(deletingItem.id)
    }
  }

  // 处理表单提交
  const handleSubmit = (values: SchoolFormValues) => {
    const submitData: SchoolCreate = {
      ...values,
      province: values.province || undefined,
      city: values.city || undefined,
      district: values.district || undefined,
      address: values.address || undefined,
      contact_phone: values.contact_phone || undefined,
      remark: values.remark || undefined,
      grade_levels: editingItem?.grade_levels ?? [],
    }
    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        data: submitData as SchoolUpdate,
      })
    } else {
      createMutation.mutate(submitData)
    }
  }

  // 处理搜索
  const handleSearch = () => {
    setPage(1)
    refetch()
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <DataTableLayout
        title="学校管理"
        total={data?.total}
        headerActions={
          <Button theme="solid" type="primary" icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
            新建学校
          </Button>
        }
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        toolbar={
          <div className="flex items-center gap-2">
            <Input
              prefix={<IconSearch />}
              placeholder="搜索学校名称..."
              value={searchValue}
              onChange={(v) => setSearchValue(v)}
              onEnterPress={handleSearch}
              showClear
              style={{ width: 250 }}
            />
          </div>
        }
      >
        <SemiDataTable
          columns={columns}
          data={items}
          total={data?.total ?? 0}
          page={page}
          pageSize={pageSize}
          isLoading={isLoading}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
        />
      </DataTableLayout>

      {/* 创建/编辑对话框 */}
      <Modal
        title={editingItem ? '编辑学校' : '新建学校'}
        visible={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="primary" onClick={() => formRef.current?.submitForm()} loading={isPending}>保存</Button>
          </div>
        }
      >
        <Form
          getFormApi={(api) => { formRef.current = api }}
          onSubmit={handleSubmit}
          labelPosition="top"
        >
          <Form.Input
            field="name"
            label="学校名称"
            placeholder="请输入学校名称"
            rules={[
              { required: true, message: '请输入学校名称' },
              { max: 100, message: '学校名称不能超过100个字符' },
            ]}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Form.Input field="province" label="省份" placeholder="省份" />
            <Form.Input field="city" label="城市" placeholder="城市" />
            <Form.Input field="district" label="区县" placeholder="区县" />
          </div>
          <Form.Input
            field="address"
            label="详细地址"
            placeholder="请输入详细地址（可选）"
          />
          <Form.Input
            field="contact_phone"
            label="联系电话"
            placeholder="请输入联系电话（可选）"
          />
          <Form.TextArea
            field="remark"
            label="备注"
            placeholder="请输入备注（可选）"
            rows={3}
          />
        </Form>
      </Modal>

      {/* 删除确认对话框 */}
      <Modal
        title="确认删除"
        visible={deleteDialogOpen}
        onCancel={() => setDeleteDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="danger" onClick={handleDeleteConfirm} loading={deleteMutation.isPending}>删除</Button>
          </div>
        }
      >
        确定要删除学校"{deletingItem?.name}"吗？此操作不可撤销。
      </Modal>
    </>
  )
}
