/**
 * 员工管理页面 - Semi Design 版本
 */

import { useState, useMemo, useRef, useCallback } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'
import { Plus, Pencil, Trash2, User, KeyRound, X, CheckCircle, AlertCircle, Copy, Eye, EyeOff, AlertTriangle, Key, XCircle, MoreHorizontal, UserCheck, UserX } from 'lucide-react'
import { Button, Input, Select, Modal, Form, Tag, Typography, Switch, Dropdown, TreeSelect } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { IconSearch, IconRefresh } from '@douyinfe/semi-icons'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import type { FilterTag } from '@/components/semi/filter-tags-bar'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { adminApi, apiKeysApi } from '../api'
import { type EmployeeItem, type EmployeeUpdate, type EmployeeIdentityItem, type ApiKeyCreateResponse, type OrganizationTreeNode } from '../types'
import { EmployeeStatusBadge, SuperuserBadge, PositionNameBadge } from '../components/status-badge'
import { EmployeeBatchImportDialog } from '../components/employee-batch-import-dialog'
import { EmployeeEditDialog } from '../components/employees/employee-edit-dialog'
import { showApiErrorToast } from '@/lib/api/error-toast'

const { Text } = Typography

// 组织级别类型
type ScopeType = 'campus' | 'area' | 'district' | 'region'

const SCOPE_TYPE_LABELS: Record<ScopeType, string> = {
  region: '大区',
  district: '地区',
  area: '片区',
  campus: '校区',
}

const DIALOG_SELECT_STYLE = { width: '100%' } as const

// 员工身份数据类型
interface IdentityFormData {
  id?: string
  scope_type: ScopeType
  campus_id: string
  region_id: string
  district_id: string
  area_id: string
  department_id: string
  position_id: string
  is_active: boolean
}

interface EmployeeFormValues {
  username: string
  name: string
  email: string
  phone: string
  is_active: boolean
  is_superuser: boolean
  joined_at: string
}

interface ApiKeyFormValues {
  name: string
  expires_in_days: number
}

interface CampusTreeOption {
  label: string
  value: string
  key: string
  disabled: boolean
  isLeaf: boolean
  children?: CampusTreeOption[]
}

export function EmployeesPage() {
  useDocumentTitle('员工管理')
  const queryClient = useQueryClient()

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [committedSearch, setCommittedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [campusFilter, setCampusFilter] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [batchImportDialogOpen, setBatchImportDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<EmployeeItem | null>(null)
  const [editingItemOpenKey, setEditingItemOpenKey] = useState(0)
  const [deletingItem, setDeletingItem] = useState<EmployeeItem | null>(null)
  const [resetPasswordItem, setResetPasswordItem] = useState<EmployeeItem | null>(null)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  // 创建成功结果显示
  const [createSuccessDialogOpen, setCreateSuccessDialogOpen] = useState(false)
  const [createResult, setCreateResult] = useState<{ username: string; password: string; name: string } | null>(null)

  // 员工身份管理状态
  const [identities, setIdentities] = useState<IdentityFormData[]>([])
  const [departmentOptionsMap, setDepartmentOptionsMap] = useState<Record<string, Array<{ id: string; name: string; campus_department_id: string }>>>({})
  const [positionOptionsMap, setPositionOptionsMap] = useState<Record<string, Array<{ id: string; name: string; level: number; level_display: string }>>>({})
  const [deptToCampusDeptMap, setDeptToCampusDeptMap] = useState<Record<string, string>>({})
  const [isSavingIdentities, setIsSavingIdentities] = useState(false)

  // API密钥管理状态
  const [apiKeyFilter, setApiKeyFilter] = useState<string>('all')
  const [apiKeyCreateDialogOpen, setApiKeyCreateDialogOpen] = useState(false)
  const [apiKeyResultDialogOpen, setApiKeyResultDialogOpen] = useState(false)
  const [apiKeyDeleteDialogOpen, setApiKeyDeleteDialogOpen] = useState(false)
  const [selectedApiKeyEmployee, setSelectedApiKeyEmployee] = useState<EmployeeItem | null>(null)
  const [createdApiKey, setCreatedApiKey] = useState<ApiKeyCreateResponse | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)

  // Semi Form refs
  const formRef = useRef<FormApi | null>(null)
  const apiKeyFormRef = useRef<FormApi | null>(null)

  // 获取员工列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-employees', page, pageSize, committedSearch, statusFilter, apiKeyFilter, campusFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page,
        size: pageSize,
      }
      if (committedSearch) {
        params.search = committedSearch
      }
      if (statusFilter !== 'all') {
        params.is_active = statusFilter === 'active'
      }
      if (apiKeyFilter !== 'all') {
        params.has_api_key = apiKeyFilter === 'yes'
      }
      if (campusFilter) {
        params.campus_id = campusFilter
      }
      const response = await adminApi.getEmployees(params)
      return response.data
    },
  })

  // 获取组织架构树（用于校区TreeSelect）
  const { data: orgTreeData } = useQuery({
    queryKey: ['admin-organization-tree'],
    queryFn: async () => {
      const response = await adminApi.getOrganizationTree()
      return response.data || []
    },
  })

  // 将组织架构树转换为 Semi TreeSelect 格式，只有校区/区域办公室可选
  const campusTreeData = useMemo(() => {
    const TYPE_LABELS: Record<string, string> = { region: '大区', district: '地区', area: '片区' }
    const convert = (nodes: OrganizationTreeNode[]): CampusTreeOption[] =>
      nodes.map(node => {
        const isLeaf = node.type === 'campus' || node.type === 'area_office'
        const children = node.children ? convert(node.children) : []
        const prefix = TYPE_LABELS[node.type]
        return {
          label: prefix ? `${prefix}: ${node.name}` : node.name,
          value: node.id,
          key: node.id,
          disabled: !isLeaf,
          isLeaf,
          ...(children.length > 0 ? { children } : {}),
        }
      })
    return convert(orgTreeData || [])
  }, [orgTreeData])

  // 平铺所有校区节点（用于筛选下拉 + filter tag 显示）
  const flatCampusList = useMemo(() => {
    const list: { id: string; name: string; regionName?: string }[] = []
    const walk = (nodes: OrganizationTreeNode[], regionName?: string) => {
      for (const node of nodes) {
        if (node.type === 'campus' || node.type === 'area_office') {
          list.push({ id: node.id, name: node.name, regionName })
        } else {
          walk(node.children || [], node.type === 'region' ? node.name : regionName)
        }
      }
    }
    walk(orgTreeData || [])
    return list
  }, [orgTreeData])

  const campusNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    flatCampusList.forEach(c => { map[c.id] = c.name })
    return map
  }, [flatCampusList])

  // 获取大区列表
  const { data: regionsData } = useQuery({
    queryKey: ['admin-regions-simple'],
    queryFn: async () => {
      const response = await adminApi.getRegions({ size: 100, is_active: true })
      return response.data?.items || []
    },
  })
  const regions = regionsData || []

  // 获取全局部门列表
  const { data: globalDepartmentsData } = useQuery({
    queryKey: ['admin-departments-simple'],
    queryFn: async () => {
      const response = await adminApi.getDepartmentsSimple()
      return response.data || []
    },
  })
  const globalDepartments = globalDepartmentsData || []

  // 获取全局职位列表
  const { data: globalPositionsData } = useQuery({
    queryKey: ['admin-positions-simple'],
    queryFn: async () => {
      const response = await adminApi.getPositions({ size: 200, is_active: true })
      return response.data?.items || []
    },
  })
  const globalPositions = useMemo(() => globalPositionsData || [], [globalPositionsData])

  const getScopedGlobalPositions = useCallback((departmentId: string) => {
    if (!departmentId) return globalPositions
    const scopedPositions = globalPositions.filter((position) => position.department_ids?.includes(departmentId))
    return scopedPositions.length > 0 ? scopedPositions : globalPositions
  }, [globalPositions])

  // 地区列表映射（按大区ID）
  const [districtOptionsMap, setDistrictOptionsMap] = useState<Record<string, Array<{ id: string; name: string }>>>({})
  // 片区列表映射（按地区ID）
  const [areaOptionsMap, setAreaOptionsMap] = useState<Record<string, Array<{ id: string; name: string }>>>({})

  // 加载地区列表（按大区）
  const loadDistrictsForRegion = useCallback(async (regionId: string) => {
    if (districtOptionsMap[regionId]) return
    try {
      const response = await adminApi.getDistricts({ region_id: regionId, size: 100 })
      const items = response.data?.items
      if (items) {
        setDistrictOptionsMap(prev => ({ ...prev, [regionId]: items.map(d => ({ id: d.id, name: d.name })) }))
      }
    } catch (error) {
      showApiErrorToast(error, '加载地区失败')
    }
  }, [districtOptionsMap])

  // 加载片区列表（按地区）
  const loadAreasForDistrict = useCallback(async (districtId: string) => {
    if (areaOptionsMap[districtId]) return
    try {
      const response = await adminApi.getAreas({ district_id: districtId, size: 100 })
      const items = response.data?.items
      if (items) {
        setAreaOptionsMap(prev => ({ ...prev, [districtId]: items.map(a => ({ id: a.id, name: a.name })) }))
      }
    } catch (error) {
      showApiErrorToast(error, '加载片区失败')
    }
  }, [areaOptionsMap])

  // 获取员工身份信息
  const employeeIds = data?.items?.map(e => e.id) || []
  const { data: identitiesData } = useQuery({
    queryKey: ['admin-employee-identities', employeeIds],
    queryFn: async () => {
      if (employeeIds.length === 0) return { items: [] }
      const response = await adminApi.getEmployeeIdentities({ size: 1000 })
      return response.data
    },
    enabled: employeeIds.length > 0,
  })

  // 构建员工ID到身份信息的映射
  const employeeIdentitiesMap = useMemo(() => {
    const map: Record<string, EmployeeIdentityItem[]> = {}
    if (identitiesData?.items) {
      identitiesData.items.forEach((identity) => {
        if (!map[identity.employee_id]) {
          map[identity.employee_id] = []
        }
        map[identity.employee_id].push(identity)
      })
    }
    return map
  }, [identitiesData])

  // API密钥 mutations
  const createApiKeyMutation = useMutation({
    mutationFn: (data: { employeeId: string; name: string; expires_in_days: number }) =>
      apiKeysApi.create(data.employeeId, {
        name: data.name,
        expires_in_days: data.expires_in_days,
      }),
    onSuccess: (response) => {
      setCreatedApiKey(response)
      setApiKeyCreateDialogOpen(false)
      setApiKeyResultDialogOpen(true)
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '创建失败')
    },
  })

  const regenerateApiKeyMutation = useMutation({
    mutationFn: (employeeId: string) => apiKeysApi.regenerate(employeeId),
    onSuccess: (response) => {
      setCreatedApiKey(response)
      setApiKeyResultDialogOpen(true)
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '重新生成失败')
    },
  })

  const deleteApiKeyMutation = useMutation({
    mutationFn: (employeeId: string) => apiKeysApi.delete(employeeId),
    onSuccess: () => {
      toast.success('API密钥已删除')
      setApiKeyDeleteDialogOpen(false)
      setSelectedApiKeyEmployee(null)
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '删除失败')
    },
  })

  // 创建员工
  const createMutation = useMutation({
    mutationFn: (data: { name: string; email?: string; phone?: string; scope_type?: string; campus_id?: string; region_id?: string; district_id?: string; area_id?: string; department_id?: string; position_id?: string; joined_at?: string }) =>
      adminApi.quickCreateEmployee(data),
    onSuccess: (response) => {
      if (response.data) {
        setCreateResult({
          username: response.data.username,
          password: response.data.password,
          name: response.data.name,
        })
        setCreateSuccessDialogOpen(true)
      }
      setDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
      queryClient.invalidateQueries({ queryKey: ['admin-employee-identities'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '创建失败')
    },
  })

  // 更新员工
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EmployeeUpdate }) =>
      adminApi.updateEmployee(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '更新失败')
    },
  })

  // 切换员工在职/离职状态
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      adminApi.updateEmployeeStatus(id, { is_active }),
    onSuccess: (_response, variables) => {
      toast.success(variables.is_active ? '已设为在职' : '已设为离职')
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '状态更新失败')
    },
  })

  // 删除员工
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteEmployee(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '删除失败')
    },
  })

  // 重置密码
  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) => adminApi.resetEmployeePassword(id),
    onSuccess: (response) => {
      toast.success('密码重置成功')
      setGeneratedPassword(response.data?.new_password || null)
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '密码重置失败')
    },
  })

  // ========== 身份管理相关函数 ==========

  const loadDepartmentsForCampus = useCallback(async (campusId: string): Promise<Record<string, string>> => {
    if (departmentOptionsMap[campusId]) {
      const existingMap: Record<string, string> = {}
      departmentOptionsMap[campusId].forEach(d => {
        existingMap[d.id] = d.campus_department_id
      })
      return existingMap
    }
    try {
      const response = await adminApi.getCampusDepartmentsSimple(campusId)
      if (response.data) {
        const depts = response.data
        setDepartmentOptionsMap(prev => ({ ...prev, [campusId]: depts }))
        const newMap: Record<string, string> = {}
        depts.forEach(d => {
          newMap[d.id] = d.campus_department_id
        })
        setDeptToCampusDeptMap(prev => ({ ...prev, ...newMap }))
        return newMap
      }
    } catch (error) {
      showApiErrorToast(error, '加载部门失败')
    }
    return {}
  }, [departmentOptionsMap])

  const loadPositionsForDepartment = useCallback(async (departmentId: string, campusDeptIdOverride?: string) => {
    const campusDeptId = campusDeptIdOverride || deptToCampusDeptMap[departmentId]
    if (!campusDeptId) return
    if (positionOptionsMap[departmentId]) return
    try {
      const response = await adminApi.getCampusDepartmentPositionsSimple(campusDeptId)
      const data = response.data
      if (data) {
        setPositionOptionsMap(prev => ({ ...prev, [departmentId]: data }))
      }
    } catch (error) {
      showApiErrorToast(error, '加载职位失败')
    }
  }, [deptToCampusDeptMap, positionOptionsMap])

  const handleIdentityScopeChange = (index: number, scopeType: ScopeType) => {
    setIdentities(prev => {
      const newIdentities = [...prev]
      newIdentities[index] = {
        ...newIdentities[index],
        scope_type: scopeType,
        campus_id: '',
        region_id: '',
        district_id: '',
        area_id: '',
        department_id: '',
        position_id: '',
      }
      return newIdentities
    })
  }

  const handleIdentityRegionChange = (index: number, regionId: string) => {
    setIdentities(prev => {
      const newIdentities = [...prev]
      newIdentities[index] = {
        ...newIdentities[index],
        region_id: regionId,
        district_id: '',
        area_id: '',
        department_id: '',
        position_id: '',
      }
      return newIdentities
    })
    if (regionId) {
      loadDistrictsForRegion(regionId)
    }
  }

  const handleIdentityDistrictChange = (index: number, districtId: string) => {
    setIdentities(prev => {
      const newIdentities = [...prev]
      newIdentities[index] = {
        ...newIdentities[index],
        district_id: districtId,
        area_id: '',
        department_id: '',
        position_id: '',
      }
      return newIdentities
    })
    if (districtId) {
      loadAreasForDistrict(districtId)
    }
  }

  const handleIdentityAreaChange = (index: number, areaId: string) => {
    setIdentities(prev => {
      const newIdentities = [...prev]
      newIdentities[index] = {
        ...newIdentities[index],
        area_id: areaId,
        department_id: '',
        position_id: '',
      }
      return newIdentities
    })
  }

  const handleIdentityCampusChange = (index: number, campusId: string) => {
    setIdentities(prev => {
      const newIdentities = [...prev]
      newIdentities[index] = {
        ...newIdentities[index],
        campus_id: campusId,
        department_id: '',
        position_id: '',
      }
      return newIdentities
    })
    if (campusId) {
      loadDepartmentsForCampus(campusId)
    }
  }

  const handleIdentityDepartmentChange = async (index: number, departmentId: string) => {
    setIdentities(prev => {
      const newIdentities = [...prev]
      newIdentities[index] = {
        ...newIdentities[index],
        department_id: departmentId,
        position_id: '',
      }
      return newIdentities
    })
    if (departmentId) {
      const campusId = identities[index]?.campus_id
      let campusDeptId = deptToCampusDeptMap[departmentId]
      if (!campusDeptId && campusId) {
        const deptMap = await loadDepartmentsForCampus(campusId)
        campusDeptId = deptMap[departmentId]
      }
      if (campusDeptId) {
        loadPositionsForDepartment(departmentId, campusDeptId)
      }
    }
  }

  const handleIdentityPositionChange = (index: number, positionId: string) => {
    setIdentities(prev => {
      const newIdentities = [...prev]
      newIdentities[index] = {
        ...newIdentities[index],
        position_id: positionId,
      }
      return newIdentities
    })
  }

  const handleIdentityActiveChange = (index: number, isActive: boolean) => {
    setIdentities(prev => {
      const newIdentities = [...prev]
      newIdentities[index] = {
        ...newIdentities[index],
        is_active: isActive,
      }
      return newIdentities
    })
  }

  const addIdentity = () => {
    setIdentities(prev => [
      ...prev,
      { scope_type: 'campus', campus_id: '', region_id: '', district_id: '', area_id: '', department_id: '', position_id: '', is_active: true },
    ])
  }

  const removeIdentity = (index: number) => {
    if (identities.length <= 1) {
      toast.warning('至少需要保留一个身份')
      return
    }
    setIdentities(prev => prev.filter((_, i) => i !== index))
  }

  // 验证身份是否完整
  const isIdentityComplete = (i: IdentityFormData) => {
    if (!i.department_id || !i.position_id) return false
    if (i.scope_type === 'campus') return !!i.campus_id
    if (i.scope_type === 'region') return !!i.region_id
    if (i.scope_type === 'district') return !!i.region_id && !!i.district_id
    if (i.scope_type === 'area') return !!i.region_id && !!i.district_id && !!i.area_id
    return false
  }

  const getCampusLeadershipLabel = (record: EmployeeItem) => {
    const leaderships = record.campus_leaderships || []
    if (leaderships.length === 0) return null
    const first = leaderships[0]
    return `${first.campus_name} ${first.role_label}`
  }

  // Semi Table 列定义
  const columns: ColumnProps<EmployeeItem>[] = [
      {
        title: '用户名',
        dataIndex: 'username',
        render: (_: unknown, record: EmployeeItem) => {
          if (isSkeletonRow(record.id)) {
            return <SemiSkeletonCell width={80} />
          }
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <User className="h-4 w-4 text-blue-500" />
              <span style={{ fontWeight: 500 }}>{record.username}</span>
            </div>
          )
        },
      },
      {
        title: '姓名',
        dataIndex: 'name',
        render: (_: unknown, record: EmployeeItem) => {
          if (isSkeletonRow(record.id)) {
            return <SemiSkeletonCell width={64} />
          }
          return record.name
        },
      },
      {
        title: '手机号',
        dataIndex: 'phone',
        render: (_: unknown, record: EmployeeItem) => {
          if (isSkeletonRow(record.id)) {
            return <SemiSkeletonCell width={96} />
          }
          return record.phone || '-'
        },
      },
      {
        title: '所属组织',
        dataIndex: 'campus',
        render: (_: unknown, record: EmployeeItem) => {
          if (isSkeletonRow(record.id)) {
            return <SemiSkeletonCell width={64} />
          }
          const ids = employeeIdentitiesMap[record.id] || []
          const activeIdentity = ids.find(i => i.is_active) || ids[0]
          if (!activeIdentity) {
            return <Text type="tertiary">-</Text>
          }
          const getOrgLabel = (i: EmployeeIdentityItem) => {
            const scope = i.scope_type || 'campus'
            if (scope === 'region') return i.region_name ? `大区:${i.region_name}` : null
            if (scope === 'district') return i.district_name ? `地区:${i.district_name}` : null
            if (scope === 'area') return i.area_name ? `片区:${i.area_name}` : null
            return i.campus_name || null
          }
          const activeLabel = getOrgLabel(activeIdentity)
          if (!activeLabel) {
            return <Text type="tertiary">-</Text>
          }
          const uniqueLabels = [...new Set(ids.map(getOrgLabel).filter(Boolean))]
          if (uniqueLabels.length > 1) {
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Tag size="small">{activeLabel}</Tag>
                <Text type="tertiary" size="small">+{uniqueLabels.length - 1}</Text>
              </div>
            )
          }
          return <Tag size="small">{activeLabel}</Tag>
        },
      },
      {
        title: '职位',
        dataIndex: 'position',
        render: (_: unknown, record: EmployeeItem) => {
          if (isSkeletonRow(record.id)) {
            return <SemiSkeletonCell width={80} />
          }
          const ids = employeeIdentitiesMap[record.id] || []
          const activeIdentity = ids.find(i => i.is_active) || ids[0]
          if (!activeIdentity || !activeIdentity.position_name) {
            return <Text type="tertiary">-</Text>
          }
          return <PositionNameBadge positionName={activeIdentity.position_name} />
        },
      },
      {
        title: '校区职务',
        dataIndex: 'campus_leaderships',
        render: (_: unknown, record: EmployeeItem) => {
          if (isSkeletonRow(record.id)) {
            return <SemiSkeletonCell width={120} />
          }
          const leaderships = record.campus_leaderships || []
          if (leaderships.length === 0) {
            return <Text type="tertiary">-</Text>
          }
          const firstLabel = getCampusLeadershipLabel(record)
          if (leaderships.length === 1) {
            return <Tag size="small">{firstLabel}</Tag>
          }
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Tag size="small">{firstLabel}</Tag>
              <Text type="tertiary" size="small">+{leaderships.length - 1}</Text>
            </div>
          )
        },
      },
      {
        title: '权限',
        dataIndex: 'is_superuser',
        render: (_: unknown, record: EmployeeItem) => {
          if (isSkeletonRow(record.id)) {
            return <SemiSkeletonCell width={64} />
          }
          return <SuperuserBadge isSuperuser={record.is_superuser} />
        },
      },
      {
        title: '状态',
        dataIndex: 'is_active',
        render: (_: unknown, record: EmployeeItem) => {
          if (isSkeletonRow(record.id)) {
            return <SemiSkeletonCell width={56} />
          }
          return <EmployeeStatusBadge isActive={record.is_active} />
        },
      },
      {
        title: 'API Key',
        dataIndex: 'api_key_status',
        render: (_: unknown, record: EmployeeItem) => {
          if (isSkeletonRow(record.id)) {
            return <SemiSkeletonCell width={80} />
          }
          if (record.has_api_key) {
            return (
              <Tag color="green" size="small">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle className="h-3 w-3" />
                  已创建
                </span>
              </Tag>
            )
          }
          return <Tag size="small">未创建</Tag>
        },
      },
      {
        title: '入职日期',
        dataIndex: 'joined_at',
        render: (_: unknown, record: EmployeeItem) => {
          if (isSkeletonRow(record.id)) {
            return <SemiSkeletonCell width={96} />
          }
          return record.joined_at
            ? new Date(record.joined_at).toLocaleDateString('zh-CN')
            : '-'
        },
      },
      {
        title: '操作',
        dataIndex: 'actions',
        fixed: 'right' as const,
        width: 60,
        render: (_: unknown, record: EmployeeItem) => {
          if (isSkeletonRow(record.id)) {
            return <SemiSkeletonCell width={32} />
          }
          return (
            <Dropdown
              trigger="click"
              position="bottomRight"
              clickToHide
              render={
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => handleEdit(record)}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Pencil className="h-4 w-4" />
                      编辑员工
                    </span>
                  </Dropdown.Item>
                  {record.is_active ? (
                    <Dropdown.Item onClick={() => toggleStatusMutation.mutate({ id: record.id, is_active: false })}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <UserX className="h-4 w-4 text-amber-500" />
                        设为离职
                      </span>
                    </Dropdown.Item>
                  ) : (
                    <Dropdown.Item onClick={() => toggleStatusMutation.mutate({ id: record.id, is_active: true })}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <UserCheck className="h-4 w-4 text-emerald-600" />
                        设为在职
                      </span>
                    </Dropdown.Item>
                  )}
                  <Dropdown.Item onClick={() => handleResetPassword(record)}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <KeyRound className="h-4 w-4" />
                      重置密码
                    </span>
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  {record.has_api_key ? (
                    <>
                      <Dropdown.Item onClick={() => handleApiKeyRegenerateClick(record)}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <IconRefresh size="small" />
                          重新生成API Key
                        </span>
                      </Dropdown.Item>
                      <Dropdown.Item type="danger" onClick={() => handleApiKeyDeleteClick(record)}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <XCircle className="h-4 w-4" />
                          删除API Key
                        </span>
                      </Dropdown.Item>
                    </>
                  ) : (
                    <Dropdown.Item onClick={() => handleApiKeyCreateClick(record)}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Key className="h-4 w-4 text-emerald-600" />
                        创建API Key
                      </span>
                    </Dropdown.Item>
                  )}
                  <Dropdown.Divider />
                  <Dropdown.Item type="danger" onClick={() => handleDeleteClick(record)}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Trash2 className="h-4 w-4" />
                      删除员工
                    </span>
                  </Dropdown.Item>
                </Dropdown.Menu>
              }
            >
              <span data-stop-row-click style={{ display: 'inline-flex' }}>
                <Button
                  theme="borderless"
                  type="tertiary"
                  icon={<MoreHorizontal className="h-4 w-4" />}
                />
              </span>
            </Dropdown>
          )
        },
      },
    ]

  const items = useMemo(() => data?.items ?? [], [data?.items])

  // 处理创建
  const handleCreate = () => {
    setEditingItem(null)
    setIdentities([{ scope_type: 'campus', campus_id: '', region_id: '', district_id: '', area_id: '', department_id: '', position_id: '', is_active: true }])
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.reset()
      formRef.current?.setValues({
        username: '',
        name: '',
        email: '',
        phone: '',
        is_active: true,
        is_superuser: false,
        joined_at: '',
      })
    }, 0)
  }

  // 处理编辑
  const handleEdit = (item: EmployeeItem) => {
    setEditingItem({ ...item })
    setEditingItemOpenKey((key) => key + 1)
  }

  // 处理重置密码
  const handleResetPassword = (item: EmployeeItem) => {
    setResetPasswordItem(item)
    setGeneratedPassword(null)
    setResetPasswordDialogOpen(true)
  }

  const handleDeleteClick = (item: EmployeeItem) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (deletingItem) {
      deleteMutation.mutate(deletingItem.id)
    }
  }

  // 处理表单提交
  const handleFormSubmit = async (values: EmployeeFormValues) => {
    const validIdentities = identities.filter(isIdentityComplete)

    if (editingItem) {
      if (validIdentities.length === 0) {
        toast.warning('请至少配置一个完整的组织身份（包含部门和职位）')
        return
      }

      const submitData = {
        name: values.name,
        username: values.username,
        email: values.email || undefined,
        phone: values.phone || undefined,
        is_active: values.is_active,
        is_superuser: values.is_superuser,
        joined_at: values.joined_at || undefined,
      }

      setIsSavingIdentities(true)
      try {
        await adminApi.updateEmployee(editingItem.id, submitData as EmployeeUpdate)
        await adminApi.updateEmployeeIdentities(editingItem.id, validIdentities)
        toast.success('更新成功')
        setDialogOpen(false)
        setEditingItem(null)
        queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
        queryClient.invalidateQueries({ queryKey: ['admin-employee-identities'] })
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '未知错误'
        toast.error(`更新失败: ${errorMessage}`)
      } finally {
        setIsSavingIdentities(false)
      }
    } else {
      if (validIdentities.length === 0) {
        createMutation.mutate({
          name: values.name,
          email: values.email || undefined,
          phone: values.phone || undefined,
          joined_at: values.joined_at || undefined,
        })
      } else {
        const firstIdentity = validIdentities[0]
        if (firstIdentity.scope_type === 'campus') {
          const deptInfo = departmentOptionsMap[firstIdentity.campus_id]?.find(d => d.id === firstIdentity.department_id)
          createMutation.mutate({
            name: values.name,
            email: values.email || undefined,
            phone: values.phone || undefined,
            scope_type: 'campus',
            campus_id: firstIdentity.campus_id,
            department_id: deptInfo?.campus_department_id || firstIdentity.department_id,
            position_id: firstIdentity.position_id,
            joined_at: values.joined_at || undefined,
          })
        } else {
          createMutation.mutate({
            name: values.name,
            email: values.email || undefined,
            phone: values.phone || undefined,
            scope_type: firstIdentity.scope_type,
            region_id: firstIdentity.region_id || undefined,
            district_id: firstIdentity.district_id || undefined,
            area_id: firstIdentity.area_id || undefined,
            department_id: firstIdentity.department_id,
            position_id: firstIdentity.position_id,
            joined_at: values.joined_at || undefined,
          })
        }
      }
    }
  }

  const handleResetPasswordConfirm = () => {
    if (resetPasswordItem) {
      resetPasswordMutation.mutate(resetPasswordItem.id)
    }
  }

  const handleResetPasswordClose = () => {
    setResetPasswordDialogOpen(false)
    setResetPasswordItem(null)
    setGeneratedPassword(null)
  }

  const handleApiKeyCreateClick = (employee: EmployeeItem) => {
    setSelectedApiKeyEmployee(employee)
    setApiKeyCreateDialogOpen(true)
    setTimeout(() => {
      apiKeyFormRef.current?.reset()
      apiKeyFormRef.current?.setValues({
        name: `${employee.name}的API密钥`,
        expires_in_days: 365,
      })
    }, 0)
  }

  const handleApiKeyCreateSubmit = (values: ApiKeyFormValues) => {
    if (!selectedApiKeyEmployee) return
    createApiKeyMutation.mutate({
      employeeId: selectedApiKeyEmployee.id,
      name: values.name,
      expires_in_days: values.expires_in_days,
    })
  }

  const handleApiKeyRegenerateClick = (employee: EmployeeItem) => {
    setSelectedApiKeyEmployee(employee)
    regenerateApiKeyMutation.mutate(employee.id)
  }

  const handleApiKeyDeleteClick = (employee: EmployeeItem) => {
    setSelectedApiKeyEmployee(employee)
    setApiKeyDeleteDialogOpen(true)
  }

  const handleApiKeyDeleteConfirm = () => {
    if (!selectedApiKeyEmployee) return
    deleteApiKeyMutation.mutate(selectedApiKeyEmployee.id)
  }

  const handleCopyToClipboard = async (text: string) => {
    const { copyToClipboard } = await import('@/lib/utils')
    const success = await copyToClipboard(text)
    if (success) {
      toast.success('API Key已复制到剪贴板')
    } else {
      toast.error('复制失败')
    }
  }

  const handleSearch = () => {
    setCommittedSearch(searchValue.trim())
    setPage(1)
  }

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    if (!value) {
      setCommittedSearch('')
      setPage(1)
    }
  }

  const handleClearAllFilters = () => {
    setSearchValue('')
    setCommittedSearch('')
    setStatusFilter('all')
    setApiKeyFilter('all')
    setCampusFilter('')
    setPage(1)
  }

  const filterTags: FilterTag[] = []

  if (committedSearch) {
    filterTags.push({
      key: 'search',
      label: '搜索',
      value: committedSearch,
      onClose: () => {
        setSearchValue('')
        setCommittedSearch('')
        setPage(1)
      },
    })
  }

  if (statusFilter !== 'all') {
    filterTags.push({
      key: 'status',
      label: '状态',
      value: statusFilter === 'active' ? '在职' : '离职',
      onClose: () => {
        setStatusFilter('all')
        setPage(1)
      },
    })
  }

  if (apiKeyFilter !== 'all') {
    filterTags.push({
      key: 'api-key',
      label: 'API Key',
      value: apiKeyFilter === 'yes' ? '已创建' : '未创建',
      onClose: () => {
        setApiKeyFilter('all')
        setPage(1)
      },
    })
  }

  if (campusFilter) {
    filterTags.push({
      key: 'campus',
      label: '校区',
      value: campusNameMap[campusFilter] || campusFilter,
      onClose: () => {
        setCampusFilter('')
        setPage(1)
      },
    })
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <DataTableLayout
          title="员工管理"
          total={data?.total}
          headerActions={
            <div style={{ display: 'flex', gap: 8 }}>
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => setBatchImportDialogOpen(true)}>
                批量导入
              </Button>
              <Button theme="solid" type="primary" icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
                新建员工
              </Button>
            </div>
          }
          onRefresh={() => refetch()}
          isRefreshing={isLoading}
          toolbar={
            <div className="flex items-center gap-2">
              <Input
                prefix={<IconSearch />}
                placeholder="搜索用户名、姓名、手机号..."
                value={searchValue}
                onChange={handleSearchChange}
                onEnterPress={handleSearch}
                style={{ minWidth: 200, maxWidth: 360 }}
              />
              <Select
                value={statusFilter}
                onChange={(value) => { setStatusFilter(value as string); setPage(1) }}
                style={{ width: 140 }}
                optionList={[
                  { label: '全部状态', value: 'all' },
                  { label: '在职', value: 'active' },
                  { label: '离职', value: 'inactive' },
                ]}
              />
              <Select
                value={apiKeyFilter}
                onChange={(value) => { setApiKeyFilter(value as string); setPage(1) }}
                style={{ width: 170 }}
                optionList={[
                  { label: '全部API Key状态', value: 'all' },
                  { label: '已创建API Key', value: 'yes' },
                  { label: '未创建API Key', value: 'no' },
                ]}
              />
              <Select
                value={campusFilter || undefined}
                onChange={(value) => { setCampusFilter((value as string) || ''); setPage(1) }}
                placeholder="筛选校区"
                style={{ width: 180 }}
                showClear
                filter
                optionList={flatCampusList.map(c => ({
                  label: c.regionName ? `${c.regionName} · ${c.name}` : c.name,
                  value: c.id,
                }))}
              />
              <Button theme="outline" onClick={handleSearch}>搜索</Button>
            </div>
          }
          filterTags={filterTags}
          onClearAllFilters={handleClearAllFilters}
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
      </div>

      {/* 创建/编辑对话框 */}
      <Modal
        title={editingItem ? '编辑员工' : '新建员工'}
        visible={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        width={672}
        style={{ maxHeight: '90vh' }}
        bodyStyle={{ overflow: 'auto', maxHeight: 'calc(90vh - 130px)' }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDialogOpen(false)}>取消</Button>
            <Button
              theme="solid"
              type="primary"
              onClick={() => formRef.current?.submitForm()}
              loading={createMutation.isPending || updateMutation.isPending || isSavingIdentities}
            >
              保存
            </Button>
          </div>
        }
      >
        <Form
          getFormApi={(api) => { formRef.current = api }}
          onSubmit={handleFormSubmit}
          labelPosition="top"
        >
          {editingItem ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Input field="username" label="用户名" placeholder="请输入用户名" disabled />
              <Form.Input field="name" label="姓名" placeholder="请输入姓名" rules={[{ required: true, message: '请输入姓名' }]} />
            </div>
          ) : (
            <Form.Input field="name" label="姓名" placeholder="请输入姓名" rules={[{ required: true, message: '请输入姓名' }]} />
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Input field="phone" label="手机号" placeholder="请输入手机号（可选）" />
            <Form.Input field="email" label="邮箱" placeholder="请输入邮箱（可选）" />
          </div>
          <Form.DatePicker field="joined_at" label="入职日期" placeholder="请选择入职日期" type="date" style={{ width: '100%' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Switch field="is_active" label="在职状态" />
            <Form.Switch field="is_superuser" label="超级管理员" />
          </div>

          {editingItem && (
            <div style={{ borderTop: '1px solid var(--semi-color-border)', marginTop: 16, paddingTop: 16 }}>
              <Text strong>校区职务</Text>
              <div style={{ marginTop: 8 }}>
                {(editingItem.campus_leaderships || []).length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(editingItem.campus_leaderships || []).map((leadership) => (
                      <Tag key={`${leadership.campus_id}-${leadership.role}`} size="small">
                        {leadership.campus_name} {leadership.role_label}
                      </Tag>
                    ))}
                  </div>
                ) : (
                  <Text type="tertiary" size="small">当前未担任校区校长或助理校长</Text>
                )}
              </div>
            </div>
          )}

          {/* 身份管理区域 */}
          <div style={{ borderTop: '1px solid var(--semi-color-border)', marginTop: 16, paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text strong>组织身份配置</Text>
              {editingItem && (
                <Button theme="outline" icon={<Plus className="h-4 w-4" />} onClick={addIdentity}>
                  添加身份
                </Button>
              )}
            </div>

            <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--semi-color-fill-0)', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                <AlertCircle className="h-4 w-4" />
                {editingItem
                  ? '员工需要至少一个有效的组织身份配置才能正常使用系统功能。若该员工担任校区领导，移除对应校区有效身份后系统会自动解绑任命。'
                  : '请为新员工配置组织级别、部门和职位，用户名和密码将自动生成。'
                }
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {identities.map((identity, index) => (
                <div key={index} style={{ border: '1px solid var(--semi-color-border)', borderRadius: 8, padding: 12 }}>
                  {editingItem && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text type="tertiary">身份 {index + 1}</Text>
                        {isIdentityComplete(identity) ? (
                          <Tag color="green">
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                              <CheckCircle className="h-3 w-3" />
                              完整
                            </span>
                          </Tag>
                        ) : (
                          <Tag color="orange">
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                              <AlertCircle className="h-3 w-3" />
                              未完成
                            </span>
                          </Tag>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text type="tertiary">启用</Text>
                        <Switch
                          checked={identity.is_active}
                          onChange={(checked) => handleIdentityActiveChange(index, checked)}
                        />
                        <Button
                          icon={<X className="h-3 w-3" />}
                          onClick={() => removeIdentity(index)}
                          disabled={identities.length <= 1}
                        />
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* 第一行：组织级别 + 组织层级选择 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      <Select
                        value={identity.scope_type}
                        onChange={(value) => handleIdentityScopeChange(index, value as ScopeType)}
                        style={DIALOG_SELECT_STYLE}
                        optionList={(Object.entries(SCOPE_TYPE_LABELS) as [ScopeType, string][]).map(([value, label]) => ({
                          label, value,
                        }))}
                      />

                      {identity.scope_type === 'campus' && (
                        <div style={{ gridColumn: 'span 3' }}>
                          <TreeSelect
                            value={identity.campus_id || undefined}
                            onChange={(value) => handleIdentityCampusChange(index, value as string)}
                            placeholder="搜索或选择校区"
                            style={DIALOG_SELECT_STYLE}
                            treeData={campusTreeData}
                            filterTreeNode
                            showSearchClear
                            dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                          />
                        </div>
                      )}

                      {identity.scope_type === 'region' && (
                        <div style={{ gridColumn: 'span 3' }}>
                          <Select
                            value={identity.region_id || undefined}
                            onChange={(value) => handleIdentityRegionChange(index, value as string)}
                            placeholder="选择大区"
                            style={DIALOG_SELECT_STYLE}
                            optionList={regions.map(r => ({ label: r.name, value: r.id }))}
                          />
                        </div>
                      )}

                      {identity.scope_type === 'district' && (
                        <>
                          <Select
                            value={identity.region_id || undefined}
                            onChange={(value) => handleIdentityRegionChange(index, value as string)}
                            placeholder="选择大区"
                            style={DIALOG_SELECT_STYLE}
                            optionList={regions.map(r => ({ label: r.name, value: r.id }))}
                          />
                          <div style={{ gridColumn: 'span 2' }}>
                            <Select
                              value={identity.district_id || undefined}
                              onChange={(value) => handleIdentityDistrictChange(index, value as string)}
                              placeholder="选择地区"
                              style={DIALOG_SELECT_STYLE}
                              disabled={!identity.region_id}
                              optionList={(districtOptionsMap[identity.region_id] || []).map(d => ({ label: d.name, value: d.id }))}
                            />
                          </div>
                        </>
                      )}

                      {identity.scope_type === 'area' && (
                        <>
                          <Select
                            value={identity.region_id || undefined}
                            onChange={(value) => handleIdentityRegionChange(index, value as string)}
                            placeholder="大区"
                            style={DIALOG_SELECT_STYLE}
                            optionList={regions.map(r => ({ label: r.name, value: r.id }))}
                          />
                          <Select
                            value={identity.district_id || undefined}
                            onChange={(value) => handleIdentityDistrictChange(index, value as string)}
                            placeholder="地区"
                            style={DIALOG_SELECT_STYLE}
                            disabled={!identity.region_id}
                            optionList={(districtOptionsMap[identity.region_id] || []).map(d => ({ label: d.name, value: d.id }))}
                          />
                          <Select
                            value={identity.area_id || undefined}
                            onChange={(value) => handleIdentityAreaChange(index, value as string)}
                            placeholder="片区"
                            style={DIALOG_SELECT_STYLE}
                            disabled={!identity.district_id}
                            optionList={(areaOptionsMap[identity.district_id] || []).map(a => ({ label: a.name, value: a.id }))}
                          />
                        </>
                      )}
                    </div>

                    {/* 第二行：部门 + 职位 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {identity.scope_type === 'campus' ? (
                        <Select
                          value={identity.department_id || undefined}
                          onChange={(value) => handleIdentityDepartmentChange(index, value as string)}
                          placeholder="选择部门"
                          style={DIALOG_SELECT_STYLE}
                          disabled={!identity.campus_id}
                          optionList={(departmentOptionsMap[identity.campus_id] || []).map(d => ({ label: d.name, value: d.id }))}
                        />
                      ) : (
                        <Select
                          value={identity.department_id || undefined}
                          onChange={(value) => {
                            setIdentities(prev => {
                              const newIdentities = [...prev]
                              newIdentities[index] = { ...newIdentities[index], department_id: value as string, position_id: '' }
                              return newIdentities
                            })
                          }}
                          placeholder="选择部门"
                          style={DIALOG_SELECT_STYLE}
                          optionList={globalDepartments.map(d => ({ label: d.name, value: d.id }))}
                        />
                      )}

                      {identity.scope_type === 'campus' ? (
                        <Select
                          value={identity.position_id || undefined}
                          onChange={(value) => handleIdentityPositionChange(index, value as string)}
                          placeholder="选择职位"
                          style={DIALOG_SELECT_STYLE}
                          disabled={!identity.department_id}
                          optionList={(positionOptionsMap[identity.department_id] || []).map(p => ({
                            label: `${p.name} (${p.level_display})`, value: p.id,
                          }))}
                        />
                      ) : (
                        <Select
                          value={identity.position_id || undefined}
                          onChange={(value) => handleIdentityPositionChange(index, value as string)}
                          placeholder="选择职位"
                          style={DIALOG_SELECT_STYLE}
                          disabled={!identity.department_id}
                          optionList={getScopedGlobalPositions(identity.department_id).map((position) => ({
                            label: `${position.name} (${position.level_display})`,
                            value: position.id,
                          }))}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Form>
      </Modal>

      <EmployeeEditDialog
        key={editingItem ? `${editingItem.id}:${editingItemOpenKey}` : 'employee-edit-closed'}
        open={!!editingItem}
        employeeId={editingItem?.id ?? null}
        employee={editingItem}
        onClose={() => setEditingItem(null)}
        onSuccess={() => {
          refetch()
          queryClient.invalidateQueries({ queryKey: ['admin-employee-identities'] })
        }}
      />

      {/* 重置密码对话框 */}
      <Modal
        title={generatedPassword ? '密码已重置' : '重置密码'}
        visible={resetPasswordDialogOpen}
        onCancel={handleResetPasswordClose}
        width={500}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {generatedPassword ? (
              <Button theme="solid" type="primary" onClick={handleResetPasswordClose}>关闭</Button>
            ) : (
              <>
                <Button onClick={handleResetPasswordClose}>取消</Button>
                <Button
                  theme="solid"
                  type="primary"
                  onClick={handleResetPasswordConfirm}
                  loading={resetPasswordMutation.isPending}
                >
                  确认重置
                </Button>
              </>
            )}
          </div>
        }
      >
        <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 16 }}>
          {generatedPassword
            ? `员工「${resetPasswordItem?.name}」的密码已重置成功`
            : `确定要重置员工「${resetPasswordItem?.name}」的密码吗？系统将自动生成新密码。`
          }
        </Text>
        {generatedPassword ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--semi-color-fill-0)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--semi-color-success)' }}>
                <CheckCircle className="h-4 w-4" />
                请将新密码告知员工，此密码只显示一次。
              </div>
            </div>
            <div>
              <Text strong size="small">新密码</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Input
                  value={generatedPassword}
                  readonly
                  style={{ fontFamily: 'monospace', fontSize: 16, letterSpacing: 2 }}
                />
                <Button
                  theme="outline"
                  onClick={async () => {
                    const { copyToClipboard } = await import('@/lib/utils')
                    const success = await copyToClipboard(generatedPassword)
                    if (success) {
                      toast.success('密码已复制到剪贴板')
                    } else {
                      toast.error('复制失败')
                    }
                  }}
                >
                  复制
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--semi-color-fill-0)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
              <AlertCircle className="h-4 w-4" />
              重置后原密码将失效，员工需要使用新密码登录。
            </div>
          </div>
        )}
      </Modal>

      {/* 创建成功弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle className="h-5 w-5 text-green-500" />
            员工创建成功
          </div>
        }
        visible={createSuccessDialogOpen}
        onCancel={() => { setCreateSuccessDialogOpen(false); setCreateResult(null) }}
        width={450}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setCreateSuccessDialogOpen(false); setCreateResult(null) }}>关闭</Button>
            <Button
              theme="solid"
              type="primary"
              onClick={async () => {
                if (createResult) {
                  const { copyToClipboard } = await import('@/lib/utils')
                  const text = `用户名: ${createResult.username}\n密码: ${createResult.password}`
                  const success = await copyToClipboard(text)
                  if (success) {
                    toast.success('账号信息已复制到剪贴板')
                  } else {
                    toast.error('复制失败')
                  }
                }
              }}
            >
              复制账号信息
            </Button>
          </div>
        }
      >
        <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 12 }}>
          员工「{createResult?.name}」已创建成功，请将以下登录信息告知员工。
        </Text>
        <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--semi-color-fill-0)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
            <AlertCircle className="h-4 w-4" />
            密码只显示一次，请妥善保存。
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Text strong size="small">用户名</Text>
            <Input value={createResult?.username || ''} readonly style={{ fontFamily: 'monospace', marginTop: 4 }} />
          </div>
          <div>
            <Text strong size="small">初始密码</Text>
            <Input value={createResult?.password || ''} readonly style={{ fontFamily: 'monospace', fontSize: 16, letterSpacing: 2, marginTop: 4 }} />
          </div>
        </div>
      </Modal>

      {/* API Key 创建对话框 */}
      <Modal
        title="创建API Key"
        visible={apiKeyCreateDialogOpen}
        onCancel={() => setApiKeyCreateDialogOpen(false)}
        width={600}
        style={{ maxHeight: '90vh' }}
        bodyStyle={{ overflow: 'auto', maxHeight: 'calc(90vh - 130px)' }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setApiKeyCreateDialogOpen(false)}>取消</Button>
            <Button
              theme="solid"
              type="primary"
              onClick={() => apiKeyFormRef.current?.submitForm()}
              loading={createApiKeyMutation.isPending}
            >
              创建API Key
            </Button>
          </div>
        }
      >
        <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 16 }}>
          为员工 {selectedApiKeyEmployee?.name}（{selectedApiKeyEmployee?.username}）创建API Key
        </Text>
        <Form
          getFormApi={(api) => { apiKeyFormRef.current = api }}
          onSubmit={handleApiKeyCreateSubmit}
          labelPosition="top"
        >
          <Form.Input
            field="name"
            label="密钥名称"
            placeholder="请输入密钥名称"
            rules={[{ required: true, message: '请输入密钥名称' }]}
          />
          <Form.InputNumber
            field="expires_in_days"
            label="有效期（天）"
            min={1}
            max={3650}
            extraText="最短1天，最长10年（3650天）"
          />
        </Form>
      </Modal>

      {/* API Key 结果对话框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle className="h-5 w-5 text-green-500" />
            API Key已生成
          </div>
        }
        visible={apiKeyResultDialogOpen}
        onCancel={() => { setApiKeyResultDialogOpen(false); setCreatedApiKey(null); setShowApiKey(false) }}
        width={550}
        footer={
          <Button theme="solid" type="primary" onClick={() => {
            setApiKeyResultDialogOpen(false)
            setCreatedApiKey(null)
            setShowApiKey(false)
          }}>
            我已安全保存
          </Button>
        }
      >
        <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--semi-color-danger-light-default)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--semi-color-danger)' }}>
            <AlertTriangle className="h-4 w-4" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <Text strong size="small" style={{ color: 'var(--semi-color-danger)' }}>重要提示</Text>
              <div style={{ marginTop: 4 }}>请立即复制并安全保存此API Key，它只会显示一次。关闭此对话框后将无法再次查看完整密钥。</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, alignItems: 'center' }}>
            <Text strong size="small">员工：</Text>
            <span>{createdApiKey?.name}（{createdApiKey?.username}）</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, alignItems: 'center' }}>
            <Text strong size="small">密钥名称：</Text>
            <span>{createdApiKey?.info?.name}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, alignItems: 'flex-start' }}>
            <Text strong size="small">API Key：</Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <code style={{ backgroundColor: 'var(--semi-color-fill-0)', padding: '4px 8px', borderRadius: 4, fontSize: 13, wordBreak: 'break-all', flex: 1 }}>
                  {showApiKey ? createdApiKey?.api_key : '••••••••••••••••••••••••••••••••'}
                </code>
                <Button
                  theme="borderless"
                  type="tertiary"
                  icon={showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  onClick={() => setShowApiKey(!showApiKey)}
                />
              </div>
              <Button
                theme="outline"
                block
                icon={<Copy className="h-4 w-4" />}
                onClick={() => handleCopyToClipboard(createdApiKey?.api_key || '')}
              >
                复制API Key
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* API Key 删除确认对话框 */}
      <Modal
        title="确认删除API Key"
        visible={apiKeyDeleteDialogOpen}
        onCancel={() => setApiKeyDeleteDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setApiKeyDeleteDialogOpen(false)}>取消</Button>
            <Button
              theme="solid"
              type="danger"
              onClick={handleApiKeyDeleteConfirm}
              loading={deleteApiKeyMutation.isPending}
            >
              删除
            </Button>
          </div>
        }
      >
        确定要删除员工 {selectedApiKeyEmployee?.name} 的API Key吗？删除后，使用该密钥的所有调用都会失败。
      </Modal>

      {/* 删除确认对话框 */}
      <Modal
        title="确认删除"
        visible={deleteDialogOpen}
        onCancel={() => setDeleteDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button
              theme="solid"
              type="danger"
              onClick={handleDeleteConfirm}
              loading={deleteMutation.isPending}
            >
              删除
            </Button>
          </div>
        }
      >
        确定要删除员工「{deletingItem?.name}」吗？此操作不可撤销。
        删除后该员工将无法登录系统。
      </Modal>

      {/* 批量导入弹窗 */}
      <EmployeeBatchImportDialog
        open={batchImportDialogOpen}
        onOpenChange={setBatchImportDialogOpen}
        onSuccess={() => refetch()}
      />
    </>
  )
}
