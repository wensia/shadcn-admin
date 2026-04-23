import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Button,
  Input,
  Modal,
  Select,
  TextArea,
  Typography,
} from '@douyinfe/semi-ui-19'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { EmployeeSelectorDialog } from '@/components/employee-selector-dialog'
import { adminApi } from '../../api'
import {
  ASSIGNMENT_ROLE_LABELS,
  SINGLETON_ROLES,
  type AssignmentCreateRequest,
  type AssignmentRole,
} from '../../types'
import { scopeLabelByType } from '../../lib/assignment-format'
import { ScopeSelector, inferScopeField, type ScopeField } from './scope-selector'

const { Text } = Typography

export interface CreateAssignmentDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  /** 可选：预填角色（右侧面板内就地新增时用） */
  initialRole?: AssignmentRole
  /** 可选：预填作用域（右侧面板内就地新增时用） */
  initialScope?: { field: ScopeField; id: string }
  /** 可选：可选角色白名单（按当前节点类型裁剪） */
  roleWhitelist?: AssignmentRole[]
  /** 可选：是否锁定作用域选择（预填后不允许改） */
  lockScope?: boolean
}

export function CreateAssignmentDialog({
  open,
  onClose,
  onSuccess,
  initialRole,
  initialScope,
  roleWhitelist,
  lockScope,
}: CreateAssignmentDialogProps) {
  const allowedRoles = (roleWhitelist ?? (Object.keys(ASSIGNMENT_ROLE_LABELS) as AssignmentRole[]))
  const defaultRole = initialRole ?? allowedRoles[0]

  const [role, setRole] = useState<AssignmentRole>(defaultRole)
  const [scopeType, setScopeType] = useState<ScopeField>(
    initialScope?.field ?? inferScopeField(defaultRole),
  )
  const [scopeId, setScopeId] = useState<string>(initialScope?.id ?? '')
  const [employeeId, setEmployeeId] = useState<string>('')
  const [employeeName, setEmployeeName] = useState<string>('')
  const [employeeSelectorOpen, setEmployeeSelectorOpen] = useState(false)
  const [rank, setRank] = useState<number | undefined>(undefined)
  const [remark, setRemark] = useState<string>('')

  useEffect(() => {
    if (open) {
      const r = initialRole ?? allowedRoles[0]
      setRole(r)
      setScopeType(initialScope?.field ?? inferScopeField(r))
      setScopeId(initialScope?.id ?? '')
      setEmployeeId('')
      setEmployeeName('')
      setEmployeeSelectorOpen(false)
      setRank(undefined)
      setRemark('')
    }
  }, [open, initialRole, initialScope, allowedRoles])

  const { data: campuses = [] } = useQuery({
    queryKey: ['admin-campuses-options-assign'],
    queryFn: async () => {
      const r = await adminApi.getCampuses({ page: 1, size: 500, is_active: true })
      return r.data?.items || []
    },
    enabled: scopeType === 'campus_id' && !lockScope,
  })
  const { data: areas = [] } = useQuery({
    queryKey: ['admin-areas-options-assign'],
    queryFn: async () => {
      const r = await adminApi.getAreas({ size: 200, is_active: true })
      return r.data?.items || []
    },
    enabled: scopeType === 'area_id' && !lockScope,
  })
  const { data: campusDepts = [] } = useQuery({
    queryKey: ['admin-campus-depts-options-assign'],
    queryFn: async () => {
      const r = await adminApi.getCampusDepartments({ page: 1, size: 1000 })
      return r.data?.items || []
    },
    enabled: scopeType === 'campus_department_id' && !lockScope,
  })
  const { data: areaDepts = [] } = useQuery({
    queryKey: ['admin-area-depts-options-assign'],
    queryFn: async () => {
      const r = await adminApi.getAreaDepartments?.({ page: 1, size: 1000 })
      return r?.data?.items || []
    },
    enabled: scopeType === 'area_department_id' && !lockScope,
  })
  const { data: districtDepts = [] } = useQuery({
    queryKey: ['admin-district-depts-options-assign'],
    queryFn: async () => {
      const r = await adminApi.getDistrictDepartments({ page: 1, size: 1000 })
      return r?.data?.items || []
    },
    enabled: scopeType === 'district_department_id' && !lockScope,
  })

  const createMutation = useMutation({
    mutationFn: (data: AssignmentCreateRequest) => adminApi.createAssignment(data),
    onSuccess: () => {
      toast.success('任命成功')
      onSuccess()
      onClose()
    },
    onError: (error: Error) => showApiErrorToast(error, '任命失败'),
  })

  const handleSubmit = () => {
    if (!employeeId) {
      toast.warning('请选择员工')
      return
    }
    if (!scopeId) {
      toast.warning('请选择作用域')
      return
    }
    const payload: AssignmentCreateRequest = {
      employee_id: employeeId,
      role,
      rank: rank ?? null,
      remark: remark || null,
      [scopeType]: scopeId,
    }
    createMutation.mutate(payload)
  }

  const isSingleton = SINGLETON_ROLES.includes(role)
  const isDeptRole = role === 'dept_manager' || role === 'dept_deputy' || role === 'dept_supervisor'

  return (
    <>
      <Modal
        title="新增任命"
        visible={open}
        onCancel={onClose}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending}
        width={560}
      >
        <div className="space-y-4">
          <div>
            <Text strong className="block mb-2">
              角色
            </Text>
            <Select
              value={role}
              onChange={(v) => {
                const newRole = v as AssignmentRole
                setRole(newRole)
                if (!lockScope) {
                  setScopeType(inferScopeField(newRole))
                  setScopeId('')
                }
                setRank(undefined)
                setEmployeeId('')
                setEmployeeName('')
              }}
              style={{ width: '100%' }}
              placeholder="选择角色"
            >
              {allowedRoles.map((r) => (
                <Select.Option key={r} value={r}>
                  {ASSIGNMENT_ROLE_LABELS[r]}
                </Select.Option>
              ))}
            </Select>
          </div>

          {/* 部门角色需要额外选作用域类型（除非已锁定） */}
          {isDeptRole && !lockScope && (
            <div>
              <Text strong className="block mb-2">
                作用域类型
              </Text>
              <Select
                value={scopeType}
                onChange={(v) => {
                  setScopeType(v as ScopeField)
                  setScopeId('')
                  setEmployeeId('')
                  setEmployeeName('')
                }}
                style={{ width: '100%' }}
              >
                <Select.Option value="campus_department_id">校区部门</Select.Option>
                <Select.Option value="area_department_id">区域部门</Select.Option>
                <Select.Option value="district_department_id">地区部门</Select.Option>
              </Select>
            </div>
          )}

          <div>
            <Text strong className="block mb-2">
              {scopeLabelByType(scopeType)}
            </Text>
            {lockScope ? (
              <Input value="当前节点（已锁定）" readOnly />
            ) : (
              <ScopeSelector
                scopeType={scopeType}
                value={scopeId}
                onChange={setScopeId}
                campuses={campuses}
                areas={areas}
                campusDepts={campusDepts}
                areaDepts={areaDepts}
                districtDepts={districtDepts}
              />
            )}
          </div>

          <div>
            <Text strong className="block mb-2">
              员工
            </Text>
            <div className="flex gap-2">
              <Input value={employeeName || '未选择'} readOnly style={{ flex: 1 }} />
              <Button onClick={() => setEmployeeSelectorOpen(true)}>选择员工</Button>
            </div>
          </div>

          {!isSingleton && (
            <div>
              <Text strong className="block mb-2">
                排序 (rank)
              </Text>
              <Select
                value={rank}
                onChange={(v) => setRank(v as number | undefined)}
                placeholder="自动分配"
                style={{ width: '100%' }}
                allowClear
              >
                <Select.Option value={0}>正职 (0)</Select.Option>
                <Select.Option value={1}>副职 #1</Select.Option>
                <Select.Option value={2}>副职 #2</Select.Option>
                <Select.Option value={3}>副职 #3</Select.Option>
              </Select>
              <Text type="tertiary" className="text-xs block mt-1">
                不填则自动分配为下一个可用排序
              </Text>
            </div>
          )}

          <div>
            <Text strong className="block mb-2">
              备注（可选）
            </Text>
            <TextArea
              value={remark}
              onChange={setRemark}
              placeholder="任命原因、交接说明等"
              rows={2}
              maxLength={500}
            />
          </div>
        </div>
      </Modal>

      <EmployeeSelectorDialog
        open={employeeSelectorOpen}
        onOpenChange={setEmployeeSelectorOpen}
        onSelect={(emp) => {
          setEmployeeId(emp.id)
          setEmployeeName(emp.name)
          setEmployeeSelectorOpen(false)
        }}
        title="选择被任命员工"
        filterByAdvisorPosition={false}
      />
    </>
  )
}
