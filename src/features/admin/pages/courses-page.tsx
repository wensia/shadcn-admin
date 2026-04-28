/**
 * 课程管理页面
 */

import { useState, useMemo, useRef } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Plus, Pencil, Trash2, Copy, RefreshCw } from 'lucide-react'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'

import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { Button, Form, Modal, Typography } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { coursesApi } from '../api'
import type { Course, CourseFormData } from '../types'
import { StatusBadge } from '../components/status-badge'
import { formatTime } from '@/lib/utils/time'

const { Text } = Typography

export function CoursesPage() {
  useDocumentTitle('课程配置')
  const queryClient = useQueryClient()
  const formRef = useRef<FormApi | null>(null)

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [initDialogOpen, setInitDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Course | null>(null)
  const [deletingItem, setDeletingItem] = useState<Course | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])

  // 查询数据
  const { data: courses = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const response = await coursesApi.getCourses()
      return response || []
    },
  })

  const items = useMemo(() => courses, [courses])

  // 创建
  const createMutation = useMutation({
    mutationFn: (data: CourseFormData) => coursesApi.createCourse(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '创建失败')
    },
  })

  // 更新
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CourseFormData }) =>
      coursesApi.updateCourse(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '更新失败')
    },
  })

  // 删除
  const deleteMutation = useMutation({
    mutationFn: (id: string) => coursesApi.deleteCourse(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '删除失败')
    },
  })

  // 复制
  const copyMutation = useMutation({
    mutationFn: (id: string) => coursesApi.copyCourse(id),
    onSuccess: () => {
      toast.success('复制成功')
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '复制失败')
    },
  })

  // 批量启用
  const batchActivateMutation = useMutation({
    mutationFn: (ids: string[]) => coursesApi.batchActivateCourses(ids),
    onSuccess: () => {
      toast.success('批量启用成功')
      setSelectedRowKeys([])
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '批量启用失败')
    },
  })

  // 批量停用
  const batchDeactivateMutation = useMutation({
    mutationFn: (ids: string[]) => coursesApi.batchDeactivateCourses(ids),
    onSuccess: () => {
      toast.success('批量停用成功')
      setSelectedRowKeys([])
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '批量停用失败')
    },
  })

  // 批量删除
  const batchDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => coursesApi.batchDeleteCourses(ids),
    onSuccess: () => {
      toast.success('批量删除成功')
      setBatchDeleteDialogOpen(false)
      setSelectedRowKeys([])
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '批量删除失败')
    },
  })

  // 初始化预设
  const initPresetMutation = useMutation({
    mutationFn: () => coursesApi.initializePresetCourses(),
    onSuccess: () => {
      toast.success('初始化预设成功')
      setInitDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '初始化预设失败')
    },
  })

  // 列定义
  const columns: ColumnProps<Course>[] = [
      {
        title: '课程名称',
        dataIndex: 'name',
        width: 200,
        render: (_: unknown, record: Course) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={96} />
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen className="h-4 w-4 text-blue-500" />
              <Text strong>{record.name}</Text>
            </div>
          )
        },
      },
      {
        title: '状态',
        dataIndex: 'is_active',
        width: 100,
        render: (_: unknown, record: Course) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={56} />
          return <StatusBadge isActive={record.is_active} />
        },
      },
      {
        title: '排序值',
        dataIndex: 'sort_order',
        width: 100,
        render: (_: unknown, record: Course) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={48} />
          return record.sort_order
        },
      },
      {
        title: '创建时间',
        dataIndex: 'created_at',
        width: 180,
        render: (_: unknown, record: Course) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={128} />
          return formatTime(record.created_at)
        },
      },
      {
        title: '更新时间',
        dataIndex: 'updated_at',
        width: 180,
        render: (_: unknown, record: Course) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={128} />
          return formatTime(record.updated_at)
        },
      },
      {
        title: '操作',
        dataIndex: 'id',
        width: 180,
        render: (_: unknown, record: Course) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={112} />
          return (
            <div style={{ display: 'flex', gap: 4 }}>
              <Button
                theme="borderless"
                type="tertiary"
                icon={<Pencil className="h-4 w-4" />}
                size="small"
                onClick={() => handleEdit(record)}
              />
              <Button
                theme="borderless"
                type="tertiary"
                icon={<Copy className="h-4 w-4" />}
                size="small"
                onClick={() => handleCopy(record)}
                disabled={copyMutation.isPending}
              />
              <Button
                theme="borderless"
                type="danger"
                icon={<Trash2 className="h-4 w-4" />}
                size="small"
                onClick={() => handleDeleteClick(record)}
              />
            </div>
          )
        },
      },
    ]

  // 打开新增对话框
  const handleCreate = () => {
    setEditingItem(null)
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.reset()
      formRef.current?.setValues({ sort_order: 0, is_active: true })
    }, 0)
  }

  // 打开编辑对话框
  const handleEdit = (item: Course) => {
    setEditingItem(item)
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.setValues({
        name: item.name,
        sort_order: item.sort_order,
        is_active: item.is_active,
      })
    }, 0)
  }

  // 复制课程
  const handleCopy = (item: Course) => {
    copyMutation.mutate(item.id)
  }

  // 点击删除按钮
  const handleDeleteClick = (item: Course) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  // 确认删除
  const handleDeleteConfirm = () => {
    if (deletingItem) {
      deleteMutation.mutate(deletingItem.id)
    }
  }

  // 提交表单
  const handleSubmit = (values: Record<string, unknown>) => {
    const formData: CourseFormData = {
      name: values.name as string,
      is_active: values.is_active as boolean,
      sort_order: values.sort_order as number,
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  // 批量启用
  const handleBatchActivate = () => {
    if (selectedRowKeys.length > 0) {
      batchActivateMutation.mutate(selectedRowKeys)
    }
  }

  // 批量停用
  const handleBatchDeactivate = () => {
    if (selectedRowKeys.length > 0) {
      batchDeactivateMutation.mutate(selectedRowKeys)
    }
  }

  // 批量删除
  const handleBatchDeleteConfirm = () => {
    if (selectedRowKeys.length > 0) {
      batchDeleteMutation.mutate(selectedRowKeys)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <DataTableLayout
        title="课程管理"
        total={items.length}
        headerActions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              theme="outline"
              onClick={() => setInitDialogOpen(true)}
              disabled={initPresetMutation.isPending}
              icon={<RefreshCw className="h-4 w-4" />}
            >
              初始化预设
            </Button>
            <Button theme="solid" type="primary" onClick={handleCreate} icon={<Plus className="h-4 w-4" />}>
              新增课程
            </Button>
          </div>
        }
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        toolbar={
          selectedRowKeys.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8, border: '1px solid var(--semi-color-border)', background: 'var(--semi-color-fill-0)', marginBottom: 8 }}>
              <Text type="tertiary" size="small">
                已选择 {selectedRowKeys.length} 项
              </Text>
              <Button size="small" theme="outline" onClick={handleBatchActivate} disabled={batchActivateMutation.isPending}>
                批量启用
              </Button>
              <Button size="small" theme="outline" onClick={handleBatchDeactivate} disabled={batchDeactivateMutation.isPending}>
                批量停用
              </Button>
              <Button size="small" theme="solid" type="danger" onClick={() => setBatchDeleteDialogOpen(true)}>
                批量删除
              </Button>
            </div>
          ) : undefined
        }
      >
        <SemiDataTable
          columns={columns}
          data={items}
          total={items.length}
          page={page}
          pageSize={pageSize}
          isLoading={isLoading}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as string[]),
          }}
        />
      </DataTableLayout>

      {/* 创建/编辑对话框 */}
      <Modal
        title={editingItem ? '编辑课程' : '新建课程'}
        visible={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="primary" onClick={() => formRef.current?.submitForm()} loading={isPending}>
              保存
            </Button>
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
            label="课程名称"
            placeholder="请输入课程名称"
            rules={[
              { required: true, message: '请输入课程名称' },
              { max: 50, message: '名称最多50个字符' },
            ]}
          />
          <Form.InputNumber
            field="sort_order"
            label="排序值"
            placeholder="请输入排序值"
            min={0}
            rules={[{ required: true, message: '请输入排序值' }]}
          />
          <Form.Switch
            field="is_active"
            label="启用状态"
            checkedText="启用"
            uncheckedText="停用"
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
            <Button theme="solid" type="danger" onClick={handleDeleteConfirm} loading={deleteMutation.isPending}>
              删除
            </Button>
          </div>
        }
      >
        确定要删除课程"{deletingItem?.name}"吗？此操作不可撤销。
      </Modal>

      {/* 批量删除确认对话框 */}
      <Modal
        title="确认批量删除"
        visible={batchDeleteDialogOpen}
        onCancel={() => setBatchDeleteDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setBatchDeleteDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="danger" onClick={handleBatchDeleteConfirm} loading={batchDeleteMutation.isPending}>
              删除
            </Button>
          </div>
        }
      >
        确定要删除选中的 {selectedRowKeys.length} 个课程吗？此操作不可撤销。
      </Modal>

      {/* 初始化预设确认对话框 */}
      <Modal
        title="确认初始化"
        visible={initDialogOpen}
        onCancel={() => setInitDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setInitDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="primary" onClick={() => initPresetMutation.mutate()} loading={initPresetMutation.isPending}>
              确定
            </Button>
          </div>
        }
      >
        确定要初始化预设课程吗？这将添加系统预设的课程列表。
      </Modal>
    </>
  )
}
