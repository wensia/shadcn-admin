import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle, Plus, X } from 'lucide-react'
import { Button, Empty, Form, Modal, Select, Spin, Switch, TabPane, Tabs, Tag, TreeSelect, Typography } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { adminApi } from '../../api'
import {
  type EmployeeIdentityItem,
  type EmployeeItem,
  type EmployeeUpdate,
  type OrganizationTreeNode,
} from '../../types'

const { Text } = Typography

type ScopeType = 'campus' | 'area' | 'district' | 'region'

const SCOPE_TYPE_LABELS: Record<ScopeType, string> = {
  region: '大区',
  district: '地区',
  area: '片区',
  campus: '校区',
}

const DIALOG_SELECT_STYLE = { width: '100%' } as const

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

interface CampusTreeOption {
  label: string
  value: string
  key: string
  disabled: boolean
  isLeaf: boolean
  children?: CampusTreeOption[]
}

interface EmployeeEditDialogProps {
  open: boolean
  employeeId: string | null
  employee?: EmployeeItem | null
  lookupKeyword?: string | null
  onClose: () => void
  onSuccess?: () => void
}

interface EmployeeEditDialogContentProps {
  open: boolean
  employee: EmployeeItem
  identityItems: EmployeeIdentityItem[]
  onClose: () => void
  onSuccess?: () => void
}

function normalizeDateInputValue(value?: string | null): string {
  if (!value) return ''
  const matched = /^(\d{4}-\d{2}-\d{2})/.exec(value)
  if (matched?.[1]) return matched[1]
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

function buildInitialIdentities(items: EmployeeIdentityItem[]): IdentityFormData[] {
  if (items.length === 0) {
    return [{
      scope_type: 'campus',
      campus_id: '',
      region_id: '',
      district_id: '',
      area_id: '',
      department_id: '',
      position_id: '',
      is_active: true,
    }]
  }

  return items.map((identity) => ({
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
}

function buildInitialDepartmentOptions(items: EmployeeIdentityItem[]) {
  const map: Record<string, Array<{ id: string; name: string; campus_department_id: string }>> = {}
  for (const identity of items) {
    if ((identity.scope_type || 'campus') !== 'campus') continue
    if (!identity.campus_id || !identity.department_id || !identity.department_name) continue
    map[identity.campus_id] = map[identity.campus_id] || []
    if (!map[identity.campus_id].some((item) => item.id === identity.department_id)) {
      map[identity.campus_id].push({
        id: identity.department_id,
        name: identity.department_name,
        campus_department_id: '',
      })
    }
  }
  return map
}

function buildInitialPositionOptions(items: EmployeeIdentityItem[]) {
  const map: Record<string, Array<{ id: string; name: string; level: number; level_display: string }>> = {}
  for (const identity of items) {
    if (!identity.department_id || !identity.position_id || !identity.position_name) continue
    map[identity.department_id] = map[identity.department_id] || []
    if (!map[identity.department_id].some((item) => item.id === identity.position_id)) {
      const level = Number(identity.position_level || 0)
      map[identity.department_id].push({
        id: identity.position_id,
        name: identity.position_name,
        level,
        level_display: identity.position_level ? `L${identity.position_level}` : '职位',
      })
    }
  }
  return map
}

function EmployeeEditDialogContent({
  open,
  employee,
  identityItems,
  onClose,
  onSuccess,
}: EmployeeEditDialogContentProps) {
  const queryClient = useQueryClient()
  const formRef = useRef<FormApi | null>(null)
  const initialIdentities = useMemo(() => buildInitialIdentities(identityItems), [identityItems])
  const identityPreloadKey = useMemo(
    () => initialIdentities
      .map((identity) => [
        identity.scope_type,
        identity.campus_id,
        identity.region_id,
        identity.district_id,
        identity.department_id,
      ].join(':'))
      .join('|'),
    [initialIdentities],
  )
  const preloadedKeyRef = useRef<string | null>(null)
  const [identities, setIdentities] = useState<IdentityFormData[]>(initialIdentities)
  const [departmentOptionsMap, setDepartmentOptionsMap] = useState<Record<string, Array<{ id: string; name: string; campus_department_id: string }>>>(() =>
    buildInitialDepartmentOptions(identityItems),
  )
  const [positionOptionsMap, setPositionOptionsMap] = useState<Record<string, Array<{ id: string; name: string; level: number; level_display: string }>>>(() =>
    buildInitialPositionOptions(identityItems),
  )
  const [deptToCampusDeptMap, setDeptToCampusDeptMap] = useState<Record<string, string>>({})
  const [districtOptionsMap, setDistrictOptionsMap] = useState<Record<string, Array<{ id: string; name: string }>>>({})
  const [areaOptionsMap, setAreaOptionsMap] = useState<Record<string, Array<{ id: string; name: string }>>>({})
  const [isSaving, setIsSaving] = useState(false)

  const { data: orgTreeData } = useQuery({
    queryKey: ['admin-organization-tree'],
    queryFn: async () => {
      const response = await adminApi.getOrganizationTree()
      return response.data || []
    },
    enabled: open,
  })

  const campusTreeData = useMemo(() => {
    const typeLabels: Record<string, string> = { region: '大区', district: '地区', area: '片区' }
    const convert = (nodes: OrganizationTreeNode[]): CampusTreeOption[] =>
      nodes.map((node) => {
        const isLeaf = node.type === 'campus' || node.type === 'area_office'
        const children = node.children ? convert(node.children) : []
        const prefix = typeLabels[node.type]
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

  const { data: regionsData } = useQuery({
    queryKey: ['admin-regions-simple'],
    queryFn: async () => {
      const response = await adminApi.getRegions({ size: 100, is_active: true })
      return response.data?.items || []
    },
    enabled: open,
  })
  const regions = regionsData || []

  const { data: globalDepartmentsData } = useQuery({
    queryKey: ['admin-departments-simple'],
    queryFn: async () => {
      const response = await adminApi.getDepartmentsSimple()
      return response.data || []
    },
    enabled: open,
  })
  const globalDepartments = globalDepartmentsData || []

  const { data: globalPositionsData } = useQuery({
    queryKey: ['admin-positions-simple'],
    queryFn: async () => {
      const response = await adminApi.getPositions({ size: 200, is_active: true })
      return response.data?.items || []
    },
    enabled: open,
  })
  const globalPositions = useMemo(() => globalPositionsData || [], [globalPositionsData])

  const getScopedGlobalPositions = useCallback((departmentId: string) => {
    if (!departmentId) return globalPositions
    const scopedPositions = globalPositions.filter((position) => position.department_ids?.includes(departmentId))
    return scopedPositions.length > 0 ? scopedPositions : globalPositions
  }, [globalPositions])

  const loadDistrictsForRegion = useCallback(async (regionId: string) => {
    if (districtOptionsMap[regionId]) return
    try {
      const response = await adminApi.getDistricts({ region_id: regionId, size: 100 })
      const items = response.data?.items
      if (items) {
        setDistrictOptionsMap((prev) => ({ ...prev, [regionId]: items.map((district) => ({ id: district.id, name: district.name })) }))
      }
    } catch (error) {
      showApiErrorToast(error, '加载地区失败')
    }
  }, [districtOptionsMap])

  const loadAreasForDistrict = useCallback(async (districtId: string) => {
    if (areaOptionsMap[districtId]) return
    try {
      const response = await adminApi.getAreas({ district_id: districtId, size: 100 })
      const items = response.data?.items
      if (items) {
        setAreaOptionsMap((prev) => ({ ...prev, [districtId]: items.map((area) => ({ id: area.id, name: area.name })) }))
      }
    } catch (error) {
      showApiErrorToast(error, '加载片区失败')
    }
  }, [areaOptionsMap])

  const loadDepartmentsForCampus = useCallback(async (campusId: string): Promise<Record<string, string>> => {
    const existingOptions = departmentOptionsMap[campusId]
    if (existingOptions?.length && existingOptions.every((item) => item.campus_department_id)) {
      return Object.fromEntries(existingOptions.map((item) => [item.id, item.campus_department_id]))
    }

    try {
      const response = await adminApi.getCampusDepartmentsSimple(campusId)
      if (response.data) {
        const departments = response.data
        const campusDepartmentMap = Object.fromEntries(
          departments.map((department) => [department.id, department.campus_department_id]),
        )
        setDepartmentOptionsMap((prev) => ({ ...prev, [campusId]: departments }))
        setDeptToCampusDeptMap((prev) => ({ ...prev, ...campusDepartmentMap }))
        return campusDepartmentMap
      }
    } catch (error) {
      showApiErrorToast(error, '加载部门失败')
    }
    return {}
  }, [departmentOptionsMap])

  const loadPositionsForDepartment = useCallback(async (departmentId: string, campusDeptIdOverride?: string) => {
    const campusDeptId = campusDeptIdOverride || deptToCampusDeptMap[departmentId]
    if (!campusDeptId) return
    try {
      const response = await adminApi.getCampusDepartmentPositionsSimple(campusDeptId)
      const data = response.data
      if (data) {
        setPositionOptionsMap((prev) => ({ ...prev, [departmentId]: data }))
      }
    } catch (error) {
      showApiErrorToast(error, '加载职位失败')
    }
  }, [deptToCampusDeptMap])

  useEffect(() => {
    if (!open || preloadedKeyRef.current === identityPreloadKey) return
    preloadedKeyRef.current = identityPreloadKey

    const preloadOptions = async () => {
      const campusIdentities = initialIdentities.filter((identity) => identity.scope_type === 'campus' && identity.campus_id)
      const departmentMaps = await Promise.all(campusIdentities.map((identity) => loadDepartmentsForCampus(identity.campus_id)))
      const combinedDepartmentMap: Record<string, string> = {}
      departmentMaps.forEach((map) => { Object.assign(combinedDepartmentMap, map) })

      await Promise.all(campusIdentities.map((identity) =>
        loadPositionsForDepartment(identity.department_id, combinedDepartmentMap[identity.department_id]),
      ))

      const regionIds = [...new Set(initialIdentities.map((identity) => identity.region_id).filter(Boolean))]
      await Promise.all(regionIds.map((id) => loadDistrictsForRegion(id)))
      const districtIds = [...new Set(initialIdentities.map((identity) => identity.district_id).filter(Boolean))]
      await Promise.all(districtIds.map((id) => loadAreasForDistrict(id)))
    }

    void preloadOptions()
  }, [
    identityPreloadKey,
    initialIdentities,
    loadAreasForDistrict,
    loadDepartmentsForCampus,
    loadDistrictsForRegion,
    loadPositionsForDepartment,
    open,
  ])

  const handleIdentityScopeChange = (index: number, scopeType: ScopeType) => {
    setIdentities((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        scope_type: scopeType,
        campus_id: '',
        region_id: '',
        district_id: '',
        area_id: '',
        department_id: '',
        position_id: '',
      }
      return next
    })
  }

  const handleIdentityRegionChange = (index: number, regionId: string) => {
    setIdentities((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        region_id: regionId,
        district_id: '',
        area_id: '',
        department_id: '',
        position_id: '',
      }
      return next
    })
    if (regionId) void loadDistrictsForRegion(regionId)
  }

  const handleIdentityDistrictChange = (index: number, districtId: string) => {
    setIdentities((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        district_id: districtId,
        area_id: '',
        department_id: '',
        position_id: '',
      }
      return next
    })
    if (districtId) void loadAreasForDistrict(districtId)
  }

  const handleIdentityAreaChange = (index: number, areaId: string) => {
    setIdentities((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        area_id: areaId,
        department_id: '',
        position_id: '',
      }
      return next
    })
  }

  const handleIdentityCampusChange = (index: number, campusId: string) => {
    setIdentities((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        campus_id: campusId,
        department_id: '',
        position_id: '',
      }
      return next
    })
    if (campusId) void loadDepartmentsForCampus(campusId)
  }

  const handleIdentityDepartmentChange = async (index: number, departmentId: string) => {
    setIdentities((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        department_id: departmentId,
        position_id: '',
      }
      return next
    })

    if (departmentId) {
      const campusId = identities[index]?.campus_id
      let campusDeptId = deptToCampusDeptMap[departmentId]
      if (!campusDeptId && campusId) {
        const departmentMap = await loadDepartmentsForCampus(campusId)
        campusDeptId = departmentMap[departmentId]
      }
      if (campusDeptId) {
        void loadPositionsForDepartment(departmentId, campusDeptId)
      }
    }
  }

  const handleIdentityPositionChange = (index: number, positionId: string) => {
    setIdentities((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        position_id: positionId,
      }
      return next
    })
  }

  const handleIdentityActiveChange = (index: number, isActive: boolean) => {
    setIdentities((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        is_active: isActive,
      }
      return next
    })
  }

  const addIdentity = () => {
    setIdentities((prev) => [
      ...prev,
      {
        scope_type: 'campus',
        campus_id: '',
        region_id: '',
        district_id: '',
        area_id: '',
        department_id: '',
        position_id: '',
        is_active: true,
      },
    ])
  }

  const removeIdentity = (index: number) => {
    if (identities.length <= 1) {
      toast.warning('至少需要保留一个身份')
      return
    }
    setIdentities((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }

  const isIdentityComplete = (identity: IdentityFormData) => {
    if (!identity.department_id || !identity.position_id) return false
    if (identity.scope_type === 'campus') return !!identity.campus_id
    if (identity.scope_type === 'region') return !!identity.region_id
    if (identity.scope_type === 'district') return !!identity.region_id && !!identity.district_id
    if (identity.scope_type === 'area') return !!identity.region_id && !!identity.district_id && !!identity.area_id
    return false
  }

  const handleSubmit = async (values: EmployeeFormValues) => {
    const validIdentities = identities.filter(isIdentityComplete)
    if (validIdentities.length === 0) {
      toast.warning('请至少配置一个完整的组织身份（包含部门和职位）')
      return
    }

    const submitData: EmployeeUpdate = {
      name: values.name,
      username: values.username,
      email: values.email || undefined,
      phone: values.phone || undefined,
      is_active: values.is_active,
      is_superuser: values.is_superuser,
      joined_at: values.joined_at || undefined,
    }

    setIsSaving(true)
    try {
      await adminApi.updateEmployee(employee.id, submitData)
      await adminApi.updateEmployeeIdentities(employee.id, validIdentities)
      toast.success('更新成功')
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
      queryClient.invalidateQueries({ queryKey: ['admin-employee-detail', employee.id] })
      queryClient.invalidateQueries({ queryKey: ['admin-employee-identities'] })
      queryClient.invalidateQueries({ queryKey: ['scope-members'] })
      queryClient.invalidateQueries({ queryKey: ['organization-tree-full'] })
      queryClient.invalidateQueries({ queryKey: ['admin-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      onSuccess?.()
      onClose()
    } catch (error) {
      showApiErrorToast(error, '更新失败')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      title="编辑员工"
      visible={open}
      onCancel={onClose}
      width={672}
      style={{ maxHeight: '90vh' }}
      bodyStyle={{ overflow: 'auto', maxHeight: 'calc(90vh - 130px)' }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>取消</Button>
          <Button
            theme="solid"
            type="primary"
            onClick={() => formRef.current?.submitForm()}
            loading={isSaving}
          >
            保存
          </Button>
        </div>
      }
    >
      <Form
        getFormApi={(api) => { formRef.current = api }}
        onSubmit={handleSubmit}
        labelPosition="top"
        initValues={{
          username: employee.username,
          name: employee.name,
          email: employee.email || '',
          phone: employee.phone || '',
          is_active: employee.is_active,
          is_superuser: employee.is_superuser,
          joined_at: normalizeDateInputValue(employee.joined_at),
        }}
      >
        <Tabs defaultActiveKey="basic" type="line">
          <TabPane tab="基本信息" itemKey="basic">
            <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Input field="username" label="用户名" placeholder="请输入用户名" disabled />
                <Form.Input
                  field="name"
                  label="姓名"
                  placeholder="请输入姓名"
                  rules={[{ required: true, message: '请输入姓名' }]}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Input field="phone" label="手机号" placeholder="请输入手机号（可选）" />
                <Form.Input field="email" label="邮箱" placeholder="请输入邮箱（可选）" />
              </div>
              <Form.DatePicker
                field="joined_at"
                label="入职日期"
                placeholder="请选择入职日期"
                type="date"
                style={{ width: '100%' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Switch field="is_active" label="在职状态" />
                <Form.Switch field="is_superuser" label="超级管理员" />
              </div>
            </div>
          </TabPane>

          <TabPane tab={`组织身份 (${identities.length})`} itemKey="identity">
            <div style={{ paddingTop: 16 }}>
              <div style={{ marginBottom: 16 }}>
                <Text strong>校区职务</Text>
                <div style={{ marginTop: 8 }}>
                  {(employee.campus_leaderships || []).length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {(employee.campus_leaderships || []).map((leadership) => (
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

              <div style={{ borderTop: '1px solid var(--semi-color-border)', paddingTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text strong>组织身份配置</Text>
                  <Button theme="outline" icon={<Plus className="h-4 w-4" />} onClick={addIdentity}>
                    添加身份
                  </Button>
                </div>

                <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--semi-color-fill-0)', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                    <AlertCircle className="h-4 w-4" />
                    员工需要至少一个有效的组织身份配置才能正常使用系统功能。若该员工担任校区领导，移除对应校区有效身份后系统会自动解绑任命。
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {identities.map((identity, index) => (
                    <div key={index} style={{ border: '1px solid var(--semi-color-border)', borderRadius: 8, padding: 12 }}>
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

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                          <Select
                            value={identity.scope_type}
                            onChange={(value) => handleIdentityScopeChange(index, value as ScopeType)}
                            style={DIALOG_SELECT_STYLE}
                            optionList={(Object.entries(SCOPE_TYPE_LABELS) as [ScopeType, string][]).map(([value, label]) => ({
                              label,
                              value,
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
                                optionList={regions.map((region) => ({ label: region.name, value: region.id }))}
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
                                optionList={regions.map((region) => ({ label: region.name, value: region.id }))}
                              />
                              <div style={{ gridColumn: 'span 2' }}>
                                <Select
                                  value={identity.district_id || undefined}
                                  onChange={(value) => handleIdentityDistrictChange(index, value as string)}
                                  placeholder="选择地区"
                                  style={DIALOG_SELECT_STYLE}
                                  disabled={!identity.region_id}
                                  optionList={(districtOptionsMap[identity.region_id] || []).map((district) => ({ label: district.name, value: district.id }))}
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
                                optionList={regions.map((region) => ({ label: region.name, value: region.id }))}
                              />
                              <Select
                                value={identity.district_id || undefined}
                                onChange={(value) => handleIdentityDistrictChange(index, value as string)}
                                placeholder="地区"
                                style={DIALOG_SELECT_STYLE}
                                disabled={!identity.region_id}
                                optionList={(districtOptionsMap[identity.region_id] || []).map((district) => ({ label: district.name, value: district.id }))}
                              />
                              <Select
                                value={identity.area_id || undefined}
                                onChange={(value) => handleIdentityAreaChange(index, value as string)}
                                placeholder="片区"
                                style={DIALOG_SELECT_STYLE}
                                disabled={!identity.district_id}
                                optionList={(areaOptionsMap[identity.district_id] || []).map((area) => ({ label: area.name, value: area.id }))}
                              />
                            </>
                          )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          {identity.scope_type === 'campus' ? (
                            <Select
                              value={identity.department_id || undefined}
                              onChange={(value) => { void handleIdentityDepartmentChange(index, value as string) }}
                              placeholder="选择部门"
                              style={DIALOG_SELECT_STYLE}
                              disabled={!identity.campus_id}
                              optionList={(departmentOptionsMap[identity.campus_id] || []).map((department) => ({ label: department.name, value: department.id }))}
                            />
                          ) : (
                            <Select
                              value={identity.department_id || undefined}
                              onChange={(value) => {
                                setIdentities((prev) => {
                                  const next = [...prev]
                                  next[index] = { ...next[index], department_id: value as string, position_id: '' }
                                  return next
                                })
                              }}
                              placeholder="选择部门"
                              style={DIALOG_SELECT_STYLE}
                              optionList={globalDepartments.map((department) => ({ label: department.name, value: department.id }))}
                            />
                          )}

                          {identity.scope_type === 'campus' ? (
                            <Select
                              value={identity.position_id || undefined}
                              onChange={(value) => handleIdentityPositionChange(index, value as string)}
                              placeholder="选择职位"
                              style={DIALOG_SELECT_STYLE}
                              disabled={!identity.department_id}
                              optionList={(positionOptionsMap[identity.department_id] || []).map((position) => ({
                                label: `${position.name} (${position.level_display})`,
                                value: position.id,
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
            </div>
          </TabPane>
        </Tabs>
      </Form>
    </Modal>
  )
}

export function EmployeeEditDialog({
  open,
  employeeId,
  employee: employeeProp,
  lookupKeyword,
  onClose,
  onSuccess,
}: EmployeeEditDialogProps) {
  const { data: employee, isLoading: isEmployeeLoading } = useQuery({
    queryKey: [
      'admin-employee-detail',
      employeeId,
      employeeProp,
      employeeProp?.id,
      employeeProp?.username,
      employeeProp?.name,
      employeeProp?.updated_at,
      lookupKeyword,
    ],
    queryFn: async () => {
      if (!employeeId) return null
      if (employeeProp?.id === employeeId) return employeeProp

      const keywords = [...new Set([lookupKeyword, employeeProp?.username, employeeProp?.name].filter(Boolean))] as string[]
      for (const keyword of keywords) {
        const response = await adminApi.getEmployees({ page: 1, size: 50, search: keyword })
        const matched = response.data?.items.find((item) => item.id === employeeId)
        if (matched) return matched
      }

      const response = await adminApi.getEmployees({ page: 1, size: 2000 })
      return response.data?.items.find((item) => item.id === employeeId) ?? null
    },
    enabled: open && !!employeeId,
  })

  const { data: identitiesData, isLoading: isIdentitiesLoading } = useQuery({
    queryKey: ['admin-employee-identities', 'detail', employeeId],
    queryFn: async () => {
      if (!employeeId) return []
      const response = await adminApi.getEmployeeIdentities({ employee_id: employeeId, size: 100 })
      return response.data?.items || []
    },
    enabled: open && !!employeeId,
  })

  if (!open) return null

  if (isEmployeeLoading || isIdentitiesLoading) {
    return (
      <Modal
        title="编辑员工"
        visible={open}
        onCancel={onClose}
        width={672}
        footer={<Button onClick={onClose}>取消</Button>}
      >
        <div style={{ padding: '48px 0', display: 'flex', justifyContent: 'center' }}>
          <Spin />
        </div>
      </Modal>
    )
  }

  if (!employee) {
    return (
      <Modal
        title="编辑员工"
        visible={open}
        onCancel={onClose}
        width={672}
        footer={<Button onClick={onClose}>关闭</Button>}
      >
        <Empty title="员工不存在" description="请刷新后重试" />
      </Modal>
    )
  }

  const identityKey = (identitiesData || [])
    .map((identity) => `${identity.id}:${identity.updated_at || ''}`)
    .join('|')

  return (
    <EmployeeEditDialogContent
      key={`${employee.id}:${identityKey}`}
      open={open}
      employee={employee}
      identityItems={identitiesData || []}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  )
}
