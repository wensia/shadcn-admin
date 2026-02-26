/**
 * 员工管理页面
 */

import { useState, useMemo } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type VisibilityState,
} from '@tanstack/react-table'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search, User, KeyRound, RefreshCw, X, CheckCircle, AlertCircle, Copy, Shield, Eye, EyeOff, AlertTriangle, Key, XCircle, MoreHorizontal } from 'lucide-react'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SimplePagination } from '@/components/data-table/simple-pagination'
import { DataTableViewOptions } from '@/components/data-table/view-options'
import { adminApi, apiKeysApi } from '../api'
import { DEFAULT_API_SCOPES, type EmployeeItem, type EmployeeUpdate, type EmployeeIdentityItem, type ApiKeyCreateResponse } from '../types'
import { EmployeeStatusBadge, SuperuserBadge, PositionNameBadge } from '../components/status-badge'
import { showApiErrorToast } from '@/lib/api/error-toast'

// 表单验证 schema
const formSchema = z.object({
  username: z.string().min(2, '用户名至少2个字符').max(50, '用户名不能超过50个字符').optional().or(z.literal('')),
  name: z.string().min(1, '请输入姓名').max(50, '姓名不能超过50个字符'),
  email: z.string().email('请输入有效的邮箱地址').optional().or(z.literal('')),
  phone: z.string().max(20, '手机号不能超过20个字符').optional(),
  is_active: z.boolean().default(true),
  is_superuser: z.boolean().default(false),
  joined_at: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

// API密钥创建表单
const apiKeyFormSchema = z.object({
  name: z.string().min(1, '请输入密钥名称').max(100, '名称最多100个字符'),
  expires_in_days: z.coerce.number().int().min(1, '至少1天').max(3650, '最长10年').default(365),
  scopes: z.record(z.array(z.string())).default({}),
})

type ApiKeyFormData = z.infer<typeof apiKeyFormSchema>

// 权限名称映射
const PERMISSION_LABELS: Record<string, string> = {
  read: '查看',
  create: '创建',
  update: '更新',
  delete: '删除',
}


// 组织级别类型
type ScopeType = 'campus' | 'area' | 'district' | 'region'

const SCOPE_TYPE_LABELS: Record<ScopeType, string> = {
  region: '大区',
  district: '地区',
  area: '片区',
  campus: '校区',
}

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

export function EmployeesPage() {
  useDocumentTitle('员工管理')
  const queryClient = useQueryClient()

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<EmployeeItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<EmployeeItem | null>(null)
  const [resetPasswordItem, setResetPasswordItem] = useState<EmployeeItem | null>(null)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null) // 后端生成的新密码
  // 创建成功结果显示
  const [createSuccessDialogOpen, setCreateSuccessDialogOpen] = useState(false)
  const [createResult, setCreateResult] = useState<{ username: string; password: string; name: string } | null>(null)
  // 列可见性状态 - 默认隐藏邮箱列
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    email: false,
  })

  // 员工身份管理状态
  const [identities, setIdentities] = useState<IdentityFormData[]>([])
  // 部门选项映射（按校区）
  const [departmentOptionsMap, setDepartmentOptionsMap] = useState<Record<string, Array<{ id: string; name: string; campus_department_id: string }>>>({})
  // 职位选项映射（按部门）
  const [positionOptionsMap, setPositionOptionsMap] = useState<Record<string, Array<{ id: string; name: string; level: number; level_display: string }>>>({})
  // 部门到 campus_department_id 的映射
  const [deptToCampusDeptMap, setDeptToCampusDeptMap] = useState<Record<string, string>>({})
  // 保存中状态
  const [isSavingIdentities, setIsSavingIdentities] = useState(false)

  // API密钥管理状态
  const [apiKeyFilter, setApiKeyFilter] = useState<string>('all')
  const [apiKeyCreateDialogOpen, setApiKeyCreateDialogOpen] = useState(false)
  const [apiKeyResultDialogOpen, setApiKeyResultDialogOpen] = useState(false)
  const [apiKeyScopesDialogOpen, setApiKeyScopesDialogOpen] = useState(false)
  const [apiKeyDeleteDialogOpen, setApiKeyDeleteDialogOpen] = useState(false)
  const [selectedApiKeyEmployee, setSelectedApiKeyEmployee] = useState<EmployeeItem | null>(null)
  const [createdApiKey, setCreatedApiKey] = useState<ApiKeyCreateResponse | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [selectedScopes, setSelectedScopes] = useState<Record<string, string[]>>({})

  // 表单
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      name: '',
      email: '',
      phone: '',
      is_active: true,
      is_superuser: false,
      joined_at: '',
    },
  })

  // API密钥创建表单
  const apiKeyForm = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: {
      name: '',
      expires_in_days: 365,
      scopes: {},
    },
  })

  // 获取员工列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-employees', page, pageSize, searchValue, statusFilter, apiKeyFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page,
        size: pageSize,
      }
      if (searchValue) {
        params.search = searchValue
      }
      if (statusFilter !== 'all') {
        params.is_active = statusFilter === 'active'
      }
      if (apiKeyFilter !== 'all') {
        params.has_api_key = apiKeyFilter === 'yes'
      }
      const response = await adminApi.getEmployees(params)
      return response.data
    },
  })

  // 获取校区列表
  const { data: campusesData } = useQuery({
    queryKey: ['admin-campuses-simple'],
    queryFn: async () => {
      const response = await adminApi.getCampusesSimple()
      return response.data || []
    },
  })

  const campuses = campusesData || []

  // 获取大区列表
  const { data: regionsData } = useQuery({
    queryKey: ['admin-regions-simple'],
    queryFn: async () => {
      const response = await adminApi.getRegions({ size: 100, is_active: true })
      return response.data?.items || []
    },
  })
  const regions = regionsData || []

  // 获取全局部门列表（非校区级别身份使用）
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
  const globalPositions = globalPositionsData || []

  // 地区列表映射（按大区ID）
  const [districtOptionsMap, setDistrictOptionsMap] = useState<Record<string, Array<{ id: string; name: string }>>>({})
  // 片区列表映射（按地区ID）
  const [areaOptionsMap, setAreaOptionsMap] = useState<Record<string, Array<{ id: string; name: string }>>>({})

  // 加载地区列表（按大区）
  const loadDistrictsForRegion = async (regionId: string) => {
    if (districtOptionsMap[regionId]) return
    try {
      const response = await adminApi.getDistricts({ region_id: regionId, size: 100 })
      if (response.data?.items) {
        setDistrictOptionsMap(prev => ({ ...prev, [regionId]: response.data!.items.map(d => ({ id: d.id, name: d.name })) }))
      }
    } catch (error) {
      showApiErrorToast(error, '加载地区失败')
    }
  }

  // 加载片区列表（按地区）
  const loadAreasForDistrict = async (districtId: string) => {
    if (areaOptionsMap[districtId]) return
    try {
      const response = await adminApi.getAreas({ district_id: districtId, size: 100 })
      if (response.data?.items) {
        setAreaOptionsMap(prev => ({ ...prev, [districtId]: response.data!.items.map(a => ({ id: a.id, name: a.name })) }))
      }
    } catch (error) {
      showApiErrorToast(error, '加载片区失败')
    }
  }

  // 获取员工身份信息（包含职位）
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
    mutationFn: (data: { employeeId: string; formData: ApiKeyFormData }) =>
      apiKeysApi.create(data.employeeId, {
        name: data.formData.name,
        scopes: Object.keys(data.formData.scopes).length > 0 ? data.formData.scopes : undefined,
        expires_in_days: data.formData.expires_in_days,
      }),
    onSuccess: (response) => {
      setCreatedApiKey(response)
      setApiKeyCreateDialogOpen(false)
      setApiKeyResultDialogOpen(true)
      apiKeyForm.reset()
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

  const updateApiKeyScopesMutation = useMutation({
    mutationFn: (data: { employeeId: string; scopes: Record<string, string[]> }) =>
      apiKeysApi.updateScopes(data.employeeId, { scopes: data.scopes }),
    onSuccess: () => {
      toast.success('权限更新成功')
      setApiKeyScopesDialogOpen(false)
      setSelectedApiKeyEmployee(null)
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '更新权限失败')
    },
  })

  // 创建员工（使用快速创建API，自动生成用户名和密码）
  const createMutation = useMutation({
    mutationFn: (data: { name: string; scope_type?: string; campus_id?: string; region_id?: string; district_id?: string; area_id?: string; department_id: string; position_id: string; joined_at?: string }) =>
      adminApi.quickCreateEmployee(data),
    onSuccess: (response) => {
      if (response.data) {
        // 保存创建结果用于显示
        setCreateResult({
          username: response.data.username,
          password: response.data.password,
          name: response.data.name,
        })
        setCreateSuccessDialogOpen(true)
      }
      setDialogOpen(false)
      form.reset()
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
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '更新失败')
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
      // 保存后端生成的新密码，显示给用户
      setGeneratedPassword(response.data?.new_password || null)
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '密码重置失败')
    },
  })

  // ========== 身份管理相关函数 ==========

  // 加载校区的部门列表，返回映射数据
  const loadDepartmentsForCampus = async (campusId: string): Promise<Record<string, string>> => {
    // 如果已缓存，返回现有映射
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
        // 更新映射
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
  }

  // 加载部门的职位列表，接受可选的 campusDeptId 参数
  const loadPositionsForDepartment = async (departmentId: string, campusDeptIdOverride?: string) => {
    const campusDeptId = campusDeptIdOverride || deptToCampusDeptMap[departmentId]
    if (!campusDeptId) {
      return
    }
    if (positionOptionsMap[departmentId]) return // 已缓存
    try {
      const response = await adminApi.getCampusDepartmentPositionsSimple(campusDeptId)
      if (response.data) {
        setPositionOptionsMap(prev => ({ ...prev, [departmentId]: response.data! }))
      }
    } catch (error) {
      showApiErrorToast(error, '加载职位失败')
    }
  }

  // 处理组织级别变更
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

  // 处理大区变更
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

  // 处理地区变更
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

  // 处理片区变更
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

  // 处理校区变更
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

  // 处理部门变更
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

      // 如果映射尚未建立，需要重新加载并获取
      if (!campusDeptId && campusId) {
        const deptMap = await loadDepartmentsForCampus(campusId)
        campusDeptId = deptMap[departmentId]
      }

      if (campusDeptId) {
        loadPositionsForDepartment(departmentId, campusDeptId)
      }
    }
  }

  // 处理职位变更
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

  // 处理身份激活状态变更
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

  // 添加新身份
  const addIdentity = () => {
    setIdentities(prev => [
      ...prev,
      { scope_type: 'campus', campus_id: '', region_id: '', district_id: '', area_id: '', department_id: '', position_id: '', is_active: true },
    ])
  }

  // 删除身份
  const removeIdentity = (index: number) => {
    if (identities.length <= 1) {
      toast.warning('至少需要保留一个身份')
      return
    }
    setIdentities(prev => prev.filter((_, i) => i !== index))
  }

  // 表格列定义
  const columns: ColumnDef<EmployeeItem>[] = useMemo(
    () => [
      {
        accessorKey: 'username',
        header: '用户名',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-20" />
          }
          return (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" />
              <span className="font-medium">{row.original.username}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'name',
        header: '姓名',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-16" />
          }
          return row.original.name
        },
      },
      {
        accessorKey: 'phone',
        header: '手机号',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-24" />
          }
          return row.original.phone || '-'
        },
      },
      {
        id: 'campus',
        header: '所属组织',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-5 w-16" />
          }
          const identities = employeeIdentitiesMap[row.original.id] || []
          const activeIdentity = identities.find(i => i.is_active) || identities[0]
          if (!activeIdentity) {
            return <span className="text-muted-foreground">-</span>
          }
          // 根据 scope_type 显示对应的组织名称
          const getOrgLabel = (i: EmployeeIdentityItem) => {
            const scope = i.scope_type || 'campus'
            if (scope === 'region') return i.region_name ? `大区:${i.region_name}` : null
            if (scope === 'district') return i.district_name ? `地区:${i.district_name}` : null
            if (scope === 'area') return i.area_name ? `片区:${i.area_name}` : null
            return i.campus_name || null
          }
          const activeLabel = getOrgLabel(activeIdentity)
          if (!activeLabel) {
            return <span className="text-muted-foreground">-</span>
          }
          const uniqueLabels = [...new Set(identities.map(getOrgLabel).filter(Boolean))]
          if (uniqueLabels.length > 1) {
            return (
              <div className="flex items-center gap-1">
                <Badge variant="outline">{activeLabel}</Badge>
                <span className="text-xs text-muted-foreground">+{uniqueLabels.length - 1}</span>
              </div>
            )
          }
          return <Badge variant="outline">{activeLabel}</Badge>
        },
      },
      {
        accessorKey: 'email',
        header: '邮箱',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-32" />
          }
          return row.original.email || '-'
        },
      },
      {
        id: 'position',
        header: '职位',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-6 w-20" />
          }
          const identities = employeeIdentitiesMap[row.original.id] || []
          const activeIdentity = identities.find(i => i.is_active) || identities[0]
          if (!activeIdentity || !activeIdentity.position_name) {
            return <span className="text-muted-foreground">-</span>
          }
          return <PositionNameBadge positionName={activeIdentity.position_name} />
        },
      },
      {
        accessorKey: 'is_superuser',
        header: '权限',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-5 w-16" />
          }
          return <SuperuserBadge isSuperuser={row.original.is_superuser} />
        },
      },
      {
        accessorKey: 'is_active',
        header: '状态',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-5 w-14" />
          }
          return <EmployeeStatusBadge isActive={row.original.is_active} />
        },
      },
      {
        id: 'api_key_status',
        header: 'API Key',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-5 w-20" />
          }
          if (row.original.has_api_key) {
            return (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                已创建
              </Badge>
            )
          }
          return <Badge variant="outline">未创建</Badge>
        },
      },
      {
        accessorKey: 'joined_at',
        header: '入职日期',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-24" />
          }
          return row.original.joined_at
            ? new Date(row.original.joined_at).toLocaleDateString('zh-CN')
            : '-'
        },
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-8 w-8" />
          }
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="更多操作"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(row.original)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  编辑员工
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleResetPassword(row.original)}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  重置密码
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {row.original.has_api_key ? (
                  <>
                    <DropdownMenuItem onClick={() => handleApiKeyScopesClick(row.original)}>
                      <Shield className="mr-2 h-4 w-4" />
                      编辑API权限
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleApiKeyRegenerateClick(row.original)}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      重新生成API Key
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => handleApiKeyDeleteClick(row.original)}>
                      <XCircle className="mr-2 h-4 w-4" />
                      删除API Key
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={() => handleApiKeyCreateClick(row.original)}>
                    <Key className="mr-2 h-4 w-4 text-emerald-600" />
                    创建API Key
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => handleDeleteClick(row.original)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除员工
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [employeeIdentitiesMap]
  )

  // 生成骨架屏数据
  const skeletonData: EmployeeItem[] = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, i) => ({
        id: `__skeleton__${i}`,
        username: '',
        name: '',
        email: '',
        phone: '',
        is_active: true,
        is_superuser: false,
        has_api_key: false,
      })),
    []
  )

  const tableData = isLoading ? skeletonData : (data?.items || [])

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: {
      columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
  })

  // 处理创建
  const handleCreate = () => {
    setEditingItem(null)
    form.reset({
      username: '',
      name: '',
      email: '',
      phone: '',
      is_active: true,
      is_superuser: false,
      joined_at: '',
    })
    // 初始化一个空身份
    setIdentities([{ scope_type: 'campus', campus_id: '', region_id: '', district_id: '', area_id: '', department_id: '', position_id: '', is_active: true }])
    setDialogOpen(true)
  }


  // 处理编辑
  const handleEdit = async (item: EmployeeItem) => {
    setEditingItem(item)
    form.reset({
      username: item.username,
      name: item.name,
      email: item.email || '',
      phone: item.phone || '',
      is_active: item.is_active,
      is_superuser: item.is_superuser,
      joined_at: item.joined_at || '',
    })

    // 加载员工身份信息
    try {
      const response = await adminApi.getEmployeeIdentities({ employee_id: item.id, size: 100 })
      const items = response.data?.items || []
      if (items.length > 0) {
        const identityData: IdentityFormData[] = items.map((identity) => ({
          id: identity.id,
          scope_type: (identity.scope_type || 'campus') as ScopeType,
          campus_id: identity.campus_id || '',
          region_id: identity.region_id || '',
          district_id: identity.district_id || '',
          area_id: identity.area_id || '',
          department_id: identity.department_id,
          position_id: identity.position_id,
          is_active: identity.is_active,
        }))
        setIdentities(identityData)

        // 预加载 campus 级别的部门和职位选项
        const campusIdentities = items.filter(i => (i.scope_type || 'campus') === 'campus')
        const uniqueCampusIds = [...new Set(campusIdentities.map(i => i.campus_id).filter(Boolean))] as string[]

        const deptMaps = await Promise.all(uniqueCampusIds.map(id => loadDepartmentsForCampus(id)))

        const combinedDeptMap: Record<string, string> = {}
        deptMaps.forEach(map => {
          Object.assign(combinedDeptMap, map)
        })

        const campusDeptIds = [...new Set(campusIdentities.map(i => i.department_id).filter(Boolean))]
        await Promise.all(campusDeptIds.map(deptId => {
          const campusDeptId = combinedDeptMap[deptId]
          return loadPositionsForDepartment(deptId, campusDeptId)
        }))

        // 预加载区域级别的地区/片区选项
        const uniqueRegionIds = [...new Set(items.map(i => i.region_id).filter(Boolean))] as string[]
        await Promise.all(uniqueRegionIds.map(id => loadDistrictsForRegion(id)))
        const uniqueDistrictIds = [...new Set(items.map(i => i.district_id).filter(Boolean))] as string[]
        await Promise.all(uniqueDistrictIds.map(id => loadAreasForDistrict(id)))
      } else {
        // 没有身份，添加一个空的
        setIdentities([{ scope_type: 'campus', campus_id: '', region_id: '', district_id: '', area_id: '', department_id: '', position_id: '', is_active: true }])
      }
    } catch (error) {
      showApiErrorToast(error, '加载身份信息失败')
      setIdentities([{ scope_type: 'campus', campus_id: '', region_id: '', district_id: '', area_id: '', department_id: '', position_id: '', is_active: true }])
    }

    setDialogOpen(true)
  }


  // 处理重置密码
  const handleResetPassword = (item: EmployeeItem) => {
    setResetPasswordItem(item)
    setGeneratedPassword(null) // 清空之前生成的密码
    setResetPasswordDialogOpen(true)
  }

  // 处理删除点击
  const handleDeleteClick = (item: EmployeeItem) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  // 处理删除确认
  const handleDeleteConfirm = () => {
    if (deletingItem) {
      deleteMutation.mutate(deletingItem.id)
    }
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

  // 处理表单提交
  const handleSubmit = async (data: FormData) => {
    // 验证身份信息必须完整
    const validIdentities = identities.filter(isIdentityComplete)
    if (validIdentities.length === 0) {
      toast.warning('请至少配置一个完整的组织身份（包含部门和职位）')
      return
    }

    if (editingItem) {
      // 编辑模式
      const submitData = {
        ...data,
        email: data.email || undefined,
        phone: data.phone || undefined,
        joined_at: data.joined_at || undefined,
      }

      setIsSavingIdentities(true)
      try {
        // 先更新员工基本信息
        await adminApi.updateEmployee(editingItem.id, submitData as EmployeeUpdate)

        // 再更新身份信息
        await adminApi.updateEmployeeIdentities(editingItem.id, validIdentities)

        toast.success('更新成功')
        setDialogOpen(false)
        setEditingItem(null)
        form.reset()
        queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
        queryClient.invalidateQueries({ queryKey: ['admin-employee-identities'] })
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '未知错误'
        toast.error(`更新失败: ${errorMessage}`)
      } finally {
        setIsSavingIdentities(false)
      }
    } else {
      // 新建模式：使用第一个身份配置
      const firstIdentity = validIdentities[0]

      if (firstIdentity.scope_type === 'campus') {
        // campus 级别：使用 campus_department_id
        const deptInfo = departmentOptionsMap[firstIdentity.campus_id]?.find(d => d.id === firstIdentity.department_id)
        createMutation.mutate({
          name: data.name,
          scope_type: 'campus',
          campus_id: firstIdentity.campus_id,
          department_id: deptInfo?.campus_department_id || firstIdentity.department_id,
          position_id: firstIdentity.position_id,
          joined_at: data.joined_at || undefined,
        })
      } else {
        // 非 campus 级别：直接传全局部门 ID
        createMutation.mutate({
          name: data.name,
          scope_type: firstIdentity.scope_type,
          region_id: firstIdentity.region_id || undefined,
          district_id: firstIdentity.district_id || undefined,
          area_id: firstIdentity.area_id || undefined,
          department_id: firstIdentity.department_id,
          position_id: firstIdentity.position_id,
          joined_at: data.joined_at || undefined,
        })
      }
    }
  }


  // 处理重置密码确认
  const handleResetPasswordConfirm = () => {
    if (resetPasswordItem) {
      resetPasswordMutation.mutate(resetPasswordItem.id)
    }
  }

  // 关闭重置密码对话框
  const handleResetPasswordClose = (open: boolean) => {
    if (!open) {
      setResetPasswordDialogOpen(false)
      setResetPasswordItem(null)
      setGeneratedPassword(null)
    }
  }

  const handleApiKeyCreateClick = (employee: EmployeeItem) => {
    setSelectedApiKeyEmployee(employee)
    apiKeyForm.reset({
      name: `${employee.name}的API密钥`,
      expires_in_days: 365,
      scopes: {},
    })
    setApiKeyCreateDialogOpen(true)
  }

  const handleApiKeyCreateSubmit = (data: ApiKeyFormData) => {
    if (!selectedApiKeyEmployee) return
    createApiKeyMutation.mutate({ employeeId: selectedApiKeyEmployee.id, formData: data })
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

  const handleApiKeyScopesClick = async (employee: EmployeeItem) => {
    setSelectedApiKeyEmployee(employee)
    try {
      const detail = await apiKeysApi.get(employee.id)
      if (!detail.has_api_key || !detail.api_key) {
        toast.warning('该员工尚未创建API Key')
        return
      }
      setSelectedScopes(detail.api_key.scopes || {})
      setApiKeyScopesDialogOpen(true)
    } catch (error) {
      showApiErrorToast(error, '获取API Key详情失败')
    }
  }

  const handleApiKeyScopesSubmit = () => {
    if (!selectedApiKeyEmployee) return
    updateApiKeyScopesMutation.mutate({
      employeeId: selectedApiKeyEmployee.id,
      scopes: selectedScopes,
    })
  }

  const toggleScope = (scope: string, permission: string) => {
    setSelectedScopes((prev) => {
      const current = prev[scope] || []
      if (current.includes(permission)) {
        const newPermissions = current.filter((p) => p !== permission)
        if (newPermissions.length === 0) {
          const { [scope]: _, ...rest } = prev
          return rest
        }
        return { ...prev, [scope]: newPermissions }
      }
      return { ...prev, [scope]: [...current, permission] }
    })
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

  // 处理搜索
  const handleSearch = () => {
    setPage(1)
    refetch()
  }

  return (
    <Main fixed>
      <div className="flex h-full flex-col gap-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">员工管理</h1>
            <p className="text-sm text-muted-foreground">
              管理系统中的员工账号和权限
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            新建员工
          </Button>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索用户名、姓名、手机号..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1) }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">在职</SelectItem>
                <SelectItem value="inactive">离职</SelectItem>
              </SelectContent>
            </Select>
            <Select value={apiKeyFilter} onValueChange={(value) => { setApiKeyFilter(value); setPage(1) }}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="API Key状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部API Key状态</SelectItem>
                <SelectItem value="yes">已创建API Key</SelectItem>
                <SelectItem value="no">未创建API Key</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleSearch}>
              搜索
            </Button>
          </div>
          <DataTableViewOptions table={table} />
          <Button variant="ghost" size="icon" onClick={() => refetch()} title="刷新">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* 表格 */}
        <div className="flex-1 overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={
                        header.column.id === 'actions'
                          ? 'sticky right-0 bg-background shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]'
                          : undefined
                      }
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={
                          cell.column.id === 'actions'
                            ? 'sticky right-0 bg-background shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]'
                            : undefined
                        }
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
        {data && data.total > 0 && (
          <SimplePagination
            page={page}
            pageSize={pageSize}
            total={data.total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* 创建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>
              {editingItem ? '编辑员工' : '新建员工'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? '修改员工信息'
                : '创建一个新的员工账号'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 space-y-4">
              <div className={editingItem ? "grid grid-cols-2 gap-4" : ""}>
                {/* 用户名字段仅在编辑时显示 */}
                {editingItem && (
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>用户名</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="请输入用户名"
                            {...field}
                            disabled={true}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>姓名</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入姓名" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>手机号</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入手机号（可选）" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>邮箱</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入邮箱（可选）" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="joined_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>入职日期</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>在职状态</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_superuser"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>超级管理员</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* 身份管理区域 */}
              <Separator className="my-4" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">组织身份配置</h4>
                  {/* 编辑时允许添加多个身份 */}
                  {editingItem && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addIdentity}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      添加身份
                    </Button>
                  )}
                </div>

                <Alert className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {editingItem
                      ? '员工需要至少一个有效的组织身份配置才能正常使用系统功能。支持大区/地区/片区/校区级别。'
                      : '请为新员工配置组织级别、部门和职位，用户名和密码将自动生成。'
                    }
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  {identities.map((identity, index) => (
                    <Card key={index} className="relative">
                      {/* 编辑时显示身份头部（启用开关、删除按钮等） */}
                      {editingItem && (
                        <CardHeader className="p-3 pb-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">身份 {index + 1}</span>
                              {isIdentityComplete(identity) ? (
                                <Badge variant="outline" className="gap-1 text-xs">
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  完整
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1 text-xs text-orange-500">
                                  <AlertCircle className="h-3 w-3" />
                                  未完成
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">启用</span>
                                <Switch
                                  checked={identity.is_active}
                                  onCheckedChange={(checked) => handleIdentityActiveChange(index, checked)}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => removeIdentity(index)}
                                disabled={identities.length <= 1}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                      )}
                      <CardContent className={editingItem ? "p-3 pt-2" : "p-3"}>
                        <div className="space-y-2">
                          {/* 第一行：组织级别 + 组织层级选择 */}
                          <div className="grid grid-cols-4 gap-2">
                            {/* 组织级别选择 */}
                            <Select
                              value={identity.scope_type}
                              onValueChange={(value) => handleIdentityScopeChange(index, value as ScopeType)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="组织级别" />
                              </SelectTrigger>
                              <SelectContent>
                                {(Object.entries(SCOPE_TYPE_LABELS) as [ScopeType, string][]).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* 根据 scope_type 动态渲染组织层级选择器 */}
                            {identity.scope_type === 'campus' && (
                              <Select
                                value={identity.campus_id}
                                onValueChange={(value) => handleIdentityCampusChange(index, value)}
                              >
                                <SelectTrigger className="h-8 text-xs col-span-3">
                                  <SelectValue placeholder="选择校区" />
                                </SelectTrigger>
                                <SelectContent>
                                  {campuses.map((campus) => (
                                    <SelectItem key={campus.id} value={campus.id}>
                                      {campus.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            {identity.scope_type === 'region' && (
                              <Select
                                value={identity.region_id}
                                onValueChange={(value) => handleIdentityRegionChange(index, value)}
                              >
                                <SelectTrigger className="h-8 text-xs col-span-3">
                                  <SelectValue placeholder="选择大区" />
                                </SelectTrigger>
                                <SelectContent>
                                  {regions.map((region) => (
                                    <SelectItem key={region.id} value={region.id}>
                                      {region.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            {identity.scope_type === 'district' && (
                              <>
                                <Select
                                  value={identity.region_id}
                                  onValueChange={(value) => handleIdentityRegionChange(index, value)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="选择大区" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {regions.map((region) => (
                                      <SelectItem key={region.id} value={region.id}>
                                        {region.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={identity.district_id}
                                  onValueChange={(value) => handleIdentityDistrictChange(index, value)}
                                  disabled={!identity.region_id}
                                >
                                  <SelectTrigger className="h-8 text-xs col-span-2">
                                    <SelectValue placeholder="选择地区" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(districtOptionsMap[identity.region_id] || []).map((d) => (
                                      <SelectItem key={d.id} value={d.id}>
                                        {d.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </>
                            )}

                            {identity.scope_type === 'area' && (
                              <>
                                <Select
                                  value={identity.region_id}
                                  onValueChange={(value) => handleIdentityRegionChange(index, value)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="大区" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {regions.map((region) => (
                                      <SelectItem key={region.id} value={region.id}>
                                        {region.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={identity.district_id}
                                  onValueChange={(value) => handleIdentityDistrictChange(index, value)}
                                  disabled={!identity.region_id}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="地区" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(districtOptionsMap[identity.region_id] || []).map((d) => (
                                      <SelectItem key={d.id} value={d.id}>
                                        {d.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={identity.area_id}
                                  onValueChange={(value) => handleIdentityAreaChange(index, value)}
                                  disabled={!identity.district_id}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="片区" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(areaOptionsMap[identity.district_id] || []).map((a) => (
                                      <SelectItem key={a.id} value={a.id}>
                                        {a.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </>
                            )}
                          </div>

                          {/* 第二行：部门 + 职位 */}
                          <div className="grid grid-cols-2 gap-2">
                            {/* 部门选择 - campus 级别使用校区部门，其他使用全局部门 */}
                            {identity.scope_type === 'campus' ? (
                              <Select
                                value={identity.department_id}
                                onValueChange={(value) => handleIdentityDepartmentChange(index, value)}
                                disabled={!identity.campus_id}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="选择部门" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(departmentOptionsMap[identity.campus_id] || []).map((dept) => (
                                    <SelectItem key={dept.id} value={dept.id}>
                                      {dept.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Select
                                value={identity.department_id}
                                onValueChange={(value) => {
                                  setIdentities(prev => {
                                    const newIdentities = [...prev]
                                    newIdentities[index] = { ...newIdentities[index], department_id: value, position_id: '' }
                                    return newIdentities
                                  })
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="选择部门" />
                                </SelectTrigger>
                                <SelectContent>
                                  {globalDepartments.map((dept) => (
                                    <SelectItem key={dept.id} value={dept.id}>
                                      {dept.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            {/* 职位选择 - campus 级别使用校区部门职位，其他使用全局职位 */}
                            {identity.scope_type === 'campus' ? (
                              <Select
                                value={identity.position_id}
                                onValueChange={(value) => handleIdentityPositionChange(index, value)}
                                disabled={!identity.department_id}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="选择职位" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(positionOptionsMap[identity.department_id] || []).map((pos) => (
                                    <SelectItem key={pos.id} value={pos.id}>
                                      {pos.name} ({pos.level_display})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Select
                                value={identity.position_id}
                                onValueChange={(value) => handleIdentityPositionChange(index, value)}
                                disabled={!identity.department_id}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="选择职位" />
                                </SelectTrigger>
                                <SelectContent>
                                  {globalPositions.map((pos) => (
                                    <SelectItem key={pos.id} value={pos.id}>
                                      {pos.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              </div>
              <DialogFooter className="px-6 pb-6 pt-4 shrink-0 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending || isSavingIdentities}
                >
                  {createMutation.isPending || updateMutation.isPending || isSavingIdentities
                    ? '保存中...'
                    : '保存'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>


      {/* 重置密码对话框 */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={handleResetPasswordClose}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>
              {generatedPassword ? '密码已重置' : '重置密码'}
            </DialogTitle>
            <DialogDescription>
              {generatedPassword
                ? `员工「${resetPasswordItem?.name}」的密码已重置成功`
                : `确定要重置员工「${resetPasswordItem?.name}」的密码吗？系统将自动生成新密码。`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 space-y-4">
            {generatedPassword ? (
              // 显示生成的密码
              <div className="space-y-3">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    请将新密码告知员工，此密码只显示一次。
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <label className="text-sm font-medium">新密码</label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={generatedPassword}
                      className="font-mono text-lg tracking-wider"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
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
              // 确认提示
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  重置后原密码将失效，员工需要使用新密码登录。
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter className="px-6 pb-6 pt-4 shrink-0 border-t">
            {generatedPassword ? (
              // 重置成功后只显示关闭按钮
              <Button onClick={() => handleResetPasswordClose(false)}>
                关闭
              </Button>
            ) : (
              // 确认重置前显示取消和确认按钮
              <>
                <Button
                  variant="outline"
                  onClick={() => handleResetPasswordClose(false)}
                >
                  取消
                </Button>
                <Button
                  onClick={handleResetPasswordConfirm}
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? '重置中...' : '确认重置'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建成功弹窗 */}
      <Dialog open={createSuccessDialogOpen} onOpenChange={setCreateSuccessDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              员工创建成功
            </DialogTitle>
            <DialogDescription>
              员工「{createResult?.name}」已创建成功，请将以下登录信息告知员工。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                密码只显示一次，请妥善保存。
              </AlertDescription>
            </Alert>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">用户名</label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={createResult?.username || ''}
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">初始密码</label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={createResult?.password || ''}
                    className="font-mono text-lg tracking-wider"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateSuccessDialogOpen(false)
                setCreateResult(null)
              }}
            >
              关闭
            </Button>
            <Button
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Key 创建对话框 */}
      <Dialog open={apiKeyCreateDialogOpen} onOpenChange={setApiKeyCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>创建API Key</DialogTitle>
            <DialogDescription>
              为员工 {selectedApiKeyEmployee?.name}（{selectedApiKeyEmployee?.username}）创建API Key
            </DialogDescription>
          </DialogHeader>
          <Form {...apiKeyForm}>
            <form onSubmit={apiKeyForm.handleSubmit(handleApiKeyCreateSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 space-y-4">
                <FormField
                  control={apiKeyForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>密钥名称</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入密钥名称" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={apiKeyForm.control}
                  name="expires_in_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>有效期（天）</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={3650} {...field} />
                      </FormControl>
                      <FormDescription>
                        最短1天，最长10年（3650天）
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>权限范围</FormLabel>
                  <FormDescription>
                    选择此API Key可访问的功能和权限
                  </FormDescription>
                  <div className="space-y-3 mt-2">
                    {Object.entries(DEFAULT_API_SCOPES).map(([scope, info]) => (
                      <div key={scope} className="border rounded-lg p-3">
                        <div className="font-medium mb-2">{info.description}</div>
                        <div className="flex flex-wrap gap-2">
                          {info.permissions.map((permission) => {
                            const currentScopes = apiKeyForm.watch('scopes')
                            const isChecked = currentScopes[scope]?.includes(permission)
                            return (
                              <label
                                key={permission}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    const current = currentScopes[scope] || []
                                    if (checked) {
                                      apiKeyForm.setValue('scopes', {
                                        ...currentScopes,
                                        [scope]: [...current, permission],
                                      })
                                    } else {
                                      const newPermissions = current.filter((p) => p !== permission)
                                      if (newPermissions.length === 0) {
                                        const { [scope]: _, ...rest } = currentScopes
                                        apiKeyForm.setValue('scopes', rest)
                                      } else {
                                        apiKeyForm.setValue('scopes', {
                                          ...currentScopes,
                                          [scope]: newPermissions,
                                        })
                                      }
                                    }
                                  }}
                                />
                                <span className="text-sm">
                                  {PERMISSION_LABELS[permission] || permission}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter className="px-6 pb-6 pt-4 shrink-0 border-t">
                <Button type="button" variant="outline" onClick={() => setApiKeyCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={createApiKeyMutation.isPending}>
                  {createApiKeyMutation.isPending ? '创建中...' : '创建API Key'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* API Key 结果对话框 */}
      <Dialog open={apiKeyResultDialogOpen} onOpenChange={setApiKeyResultDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              API Key已生成
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>重要提示</AlertTitle>
              <AlertDescription>
                请立即复制并安全保存此API Key，它只会显示一次。关闭此对话框后将无法再次查看完整密钥。
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                <span className="text-sm font-medium">员工：</span>
                <span>{createdApiKey?.name}（{createdApiKey?.username}）</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                <span className="text-sm font-medium">密钥名称：</span>
                <span>{createdApiKey?.info?.name}</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
                <span className="text-sm font-medium">API Key：</span>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-2 py-1 rounded text-sm break-all flex-1">
                      {showApiKey ? createdApiKey?.api_key : '••••••••••••••••••••••••••••••••'}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleCopyToClipboard(createdApiKey?.api_key || '')}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    复制API Key
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              setApiKeyResultDialogOpen(false)
              setCreatedApiKey(null)
              setShowApiKey(false)
            }}>
              我已安全保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Key 权限编辑对话框 */}
      <Dialog open={apiKeyScopesDialogOpen} onOpenChange={setApiKeyScopesDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>编辑API Key权限</DialogTitle>
            <DialogDescription>
              修改员工 {selectedApiKeyEmployee?.name} 的API Key权限范围
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 space-y-3">
            {Object.entries(DEFAULT_API_SCOPES).map(([scope, info]) => (
              <div key={scope} className="border rounded-lg p-3">
                <div className="font-medium mb-2">{info.description}</div>
                <div className="flex flex-wrap gap-2">
                  {info.permissions.map((permission) => {
                    const isChecked = selectedScopes[scope]?.includes(permission)
                    return (
                      <label
                        key={permission}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleScope(scope, permission)}
                        />
                        <span className="text-sm">
                          {PERMISSION_LABELS[permission] || permission}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="px-6 pb-6 pt-4 shrink-0 border-t">
            <Button type="button" variant="outline" onClick={() => setApiKeyScopesDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleApiKeyScopesSubmit} disabled={updateApiKeyScopesMutation.isPending}>
              {updateApiKeyScopesMutation.isPending ? '保存中...' : '保存权限'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Key 删除确认对话框 */}
      <AlertDialog open={apiKeyDeleteDialogOpen} onOpenChange={setApiKeyDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除API Key</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除员工 {selectedApiKeyEmployee?.name} 的API Key吗？删除后，使用该密钥的所有调用都会失败。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApiKeyDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteApiKeyMutation.isPending ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除员工「{deletingItem?.name}」吗？此操作不可撤销。
              删除后该员工将无法登录系统。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Main>
  )
}
