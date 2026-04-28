/**
 * 一键建咨询师 Dialog
 *
 * 由「云客子账号管理」页面的 `＋ 一键建咨询师` 按钮打开。
 */
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Banner,
  Button,
  Form,
  Modal,
  Select,
  Switch,
  TreeSelect,
  Typography,
} from '@douyinfe/semi-ui-19'
import { Check, Copy, RefreshCw } from 'lucide-react'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { toast } from '@/lib/toast'
import { EmployeeSelectorDialog } from '@/components/employee-selector-dialog'
import { adminApi } from '@/features/admin/api'
import type { EmployeeIdentityItem } from '@/features/admin/types'
import type { EmployeeListItem } from '@/features/crm/leads/api'
import { yunkeOnboardingApi } from '../api'
import type { OnboardingConsultantResult, YunkeDeptNode } from '../types'

const { Title, Text } = Typography

interface Props {
  open: boolean
  onClose: () => void
  /** 当前选中的云客 credential（作为 admin 账号来执行创建） */
  credential: {
    id: string
    phone: string
    company_name: string | null
    status: number
  }
}

/** 转换云客部门数据为 Semi TreeSelect 需要的 treeData（key/value/label/children）。 */
function toTreeData(tree: YunkeDeptNode[] | null | undefined): any[] {
  if (!Array.isArray(tree) || tree.length === 0) return []

  const isDeptNode = (n: any) =>
    !(
      n?.userId ||
      n?.user_id ||
      n?.userRealname ||
      n?.userCellphone ||
      n?.usedPhone ||
      n?.nodeType === 'user' ||
      n?.type === 'user'
    )
  const deptNodes = tree.filter(isDeptNode)
  if (deptNodes.length === 0) return []

  const hasNested = deptNodes.some(
    (n) => Array.isArray((n as any).children) && (n as any).children.length > 0
  )
  if (hasNested) {
    return deptNodes.map((n) => ({
      key: n.id,
      value: n.id,
      label: n.name,
      children: n.children?.length
        ? toTreeData(n.children as YunkeDeptNode[])
        : undefined,
    }))
  }

  const ids = new Set(deptNodes.map((n) => n.id))
  const byParent = new Map<string, YunkeDeptNode[]>()
  for (const n of deptNodes) {
    const p = (n as any).pid || (n as any).parentId || ''
    const key = ids.has(p) ? p : '__ROOT__'
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(n)
  }
  const build = (items: YunkeDeptNode[]): any[] =>
    items.map((n) => ({
      key: n.id,
      value: n.id,
      label: n.name,
      children: byParent.get(n.id)?.length
        ? build(byParent.get(n.id)!)
        : undefined,
    }))
  return build(byParent.get('__ROOT__') ?? deptNodes)
}

/** 兼容云客角色字段命名：id | roleId, name | roleName */
function normalizeRole(r: any): { id: string; name: string } | null {
  const id = r?.id ?? r?.roleId
  const name = r?.name ?? r?.roleName
  if (!id || !name) return null
  return { id: String(id), name: String(name) }
}

function getIdentityScopeName(identity: EmployeeIdentityItem): string {
  if (identity.scope_type === 'campus') return identity.campus_name || '校区'
  if (identity.scope_type === 'area') return identity.area_name || '片区'
  if (identity.scope_type === 'district')
    return identity.district_name || '地区'
  if (identity.scope_type === 'region') return identity.region_name || '大区'
  return identity.scope_type
}

function formatIdentity(identity: EmployeeIdentityItem): string {
  return [
    getIdentityScopeName(identity),
    identity.department_name,
    identity.position_name,
  ]
    .filter(Boolean)
    .join(' / ')
}

export function CreateConsultantDialog({ open, onClose, credential }: Props) {
  const [employeeSelectorOpen, setEmployeeSelectorOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeListItem | null>(null)
  const [selectedIdentityId, setSelectedIdentityId] = useState('')
  const [formValues, setFormValues] = useState<{
    yunkeRoleId: string
    yunkeDeptId: string
    sendSms: boolean
  }>({ yunkeRoleId: '', yunkeDeptId: '', sendSms: false })
  const [result, setResult] = useState<OnboardingConsultantResult | null>(null)

  useEffect(() => {
    if (!open) {
      setEmployeeSelectorOpen(false)
      setSelectedEmployee(null)
      setSelectedIdentityId('')
      setFormValues({ yunkeRoleId: '', yunkeDeptId: '', sendSms: false })
      setResult(null)
    }
  }, [open])

  // ---------------- CRM 员工 + 身份 ----------------
  const { data: identities = [], isLoading: identitiesLoading } = useQuery({
    queryKey: ['yunke-onboarding-employee-identities', selectedEmployee?.id],
    queryFn: async () =>
      (
        await adminApi.getEmployeeIdentities({
          page: 1,
          size: 100,
          employee_id: selectedEmployee!.id,
          is_active: true,
        })
      ).data?.items ?? [],
    enabled: open && Boolean(selectedEmployee?.id),
  })

  const identityOptions = useMemo(
    () =>
      identities.map((identity) => ({
        label: formatIdentity(identity),
        value: identity.id,
      })),
    [identities]
  )
  const selectedIdentity = useMemo(
    () =>
      identities.find((identity) => identity.id === selectedIdentityId) ?? null,
    [identities, selectedIdentityId]
  )

  // ---------------- 云客下拉（部门树 + 角色） ----------------
  const {
    data: yunkeOptions,
    isLoading: yunkeLoading,
    error: yunkeError,
  } = useQuery({
    queryKey: ['yunke-onboarding-options', credential.id],
    queryFn: () => yunkeOnboardingApi.getOptions(credential.id),
    enabled: open && credential.status === 1,
    retry: false,
  })

  const roles = useMemo(
    () =>
      (yunkeOptions?.roles ?? [])
        .map((r: any) => normalizeRole(r))
        .filter((x): x is { id: string; name: string } => !!x),
    [yunkeOptions]
  )
  const deptTreeData = useMemo(
    () => toTreeData(yunkeOptions?.dept_tree),
    [yunkeOptions]
  )

  useEffect(() => {
    if (!formValues.yunkeRoleId && roles.length > 0) {
      const counselor = roles.find((r) => r.name === '咨询师')
      if (counselor) setFormValues((v) => ({ ...v, yunkeRoleId: counselor.id }))
    }
  }, [roles, formValues.yunkeRoleId])

  // ---------------- 提交 ----------------
  const mutation = useMutation({
    mutationFn: yunkeOnboardingApi.createConsultant,
    onSuccess: (res) => {
      setResult(res)
      if (!res.step_errors?.length) {
        toast.success(`已为 ${res.employee.name} 创建云客账号`)
      } else {
        toast.warning('已处理，但部分步骤失败，请查看对话框内提示')
      }
    },
    onError: (err) => {
      showApiErrorToast(err, '创建失败')
    },
  })

  const handleSubmit = () => {
    if (!selectedEmployee) {
      toast.error('请选择 CRM 员工')
      return
    }
    if (!selectedEmployee.phone) {
      toast.error('所选员工没有手机号')
      return
    }
    if (!selectedIdentityId) {
      toast.error('请选择员工身份')
      return
    }
    if (!formValues.yunkeDeptId) {
      toast.error('请选择云客部门')
      return
    }
    if (!formValues.yunkeRoleId) {
      toast.error('请选择云客角色')
      return
    }

    mutation.mutate({
      employee_id: selectedEmployee.id,
      identity_id: selectedIdentityId,
      yunke_admin_account_id: credential.id,
      yunke_dept_id: formValues.yunkeDeptId,
      yunke_role_id: formValues.yunkeRoleId,
      send_sms: formValues.sendSms ? 1 : 0,
    })
  }

  const copyText = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`${label} 已复制`))
  }

  // ---------------- 渲染 ----------------

  if (result) {
    const { employee, yunke, step_errors } = result
    const identityText = [
      employee.campus?.name,
      employee.department?.name,
      employee.position?.name,
    ]
      .filter(Boolean)
      .join(' / ')
    const ruimfBlock = [
      `姓名：${employee.name}`,
      `用户名：${employee.username}`,
      `手机号：${employee.phone || '-'}`,
      `CRM身份：${identityText || '-'}`,
    ].join('\n')
    const yunkeBlock = yunke
      ? [
          `云客账号：${yunke.phone}`,
          `初始密码：${yunke.password || '已存在绑定，请使用已保存密码或重置密码'}`,
          `所属公司：${yunke.company_code}`,
          `登录地址：https://crm.yunkecn.com`,
        ].join('\n')
      : null

    return (
      <Modal
        title={`已创建云客账号：${employee.name}`}
        visible={open}
        onCancel={onClose}
        width={560}
        footer={<Button onClick={onClose}>关闭</Button>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {step_errors && step_errors.length > 0 && (
            <Banner
              type='warning'
              title='部分步骤未完成'
              description={
                <ul style={{ paddingLeft: 16, margin: 0 }}>
                  {step_errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              }
            />
          )}

          <ResultCard
            title='CRM 员工信息'
            body={ruimfBlock}
            onCopy={() => copyText(ruimfBlock, 'CRM 员工信息')}
          />
          {yunkeBlock ? (
            <ResultCard
              title={`云客账号信息 ${yunke?.login_ok ? '· 已登录' : '· 未登录'}`}
              body={yunkeBlock}
              onCopy={() => copyText(yunkeBlock, '云客信息')}
            />
          ) : (
            <Banner
              type='info'
              description='云客账号未创建；CRM 员工未变更，可去「云客子账号管理」手动补齐绑定。'
            />
          )}
        </div>
      </Modal>
    )
  }

  return (
    <>
      <Modal
        title='一键建咨询师'
        visible={open}
        onCancel={onClose}
        width={600}
        okText='一键创建'
        cancelText='取消'
        onOk={handleSubmit}
        confirmLoading={mutation.isPending}
        maskClosable={!mutation.isPending}
      >
        {credential.status !== 1 && (
          <Banner
            type='danger'
            description='当前 credential 未登录，请先在云客账号页登录刷新'
          />
        )}
        {yunkeError && (
          <Banner
            type='danger'
            description={`拉取云客下拉数据失败：${String(yunkeError)}`}
          />
        )}
        {yunkeLoading && (
          <Banner
            type='info'
            icon={<RefreshCw className='h-4 w-4' />}
            description='拉取云客部门树与角色列表中…'
          />
        )}

        <div
          style={{
            marginTop: 12,
            marginBottom: 8,
            color: 'var(--semi-color-text-2)',
            fontSize: 12,
          }}
        >
          使用 <b>{credential.company_name || credential.phone}</b>{' '}
          作为云客管理员执行创建
        </div>

        <Form labelPosition='left' labelWidth={96} style={{ width: '100%' }}>
          <Form.Slot label='CRM员工'>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                minHeight: 36,
              }}
            >
              <div style={{ minWidth: 0 }}>
                {selectedEmployee ? (
                  <>
                    <Text strong>{selectedEmployee.name}</Text>
                    <Text type='tertiary' style={{ marginLeft: 8 }}>
                      {selectedEmployee.phone || selectedEmployee.username}
                    </Text>
                  </>
                ) : (
                  <Text type='tertiary'>请选择 CRM 中已有的课程顾问</Text>
                )}
              </div>
              <Button onClick={() => setEmployeeSelectorOpen(true)}>
                {selectedEmployee ? '更换顾问' : '选择顾问'}
              </Button>
            </div>
          </Form.Slot>

          <Form.Slot label='员工身份'>
            <Select
              style={{ width: '100%' }}
              value={selectedIdentityId || undefined}
              placeholder={
                selectedEmployee ? '选择该员工的 CRM 身份' : '请先选择员工'
              }
              disabled={!selectedEmployee}
              loading={identitiesLoading}
              filter
              optionList={identityOptions}
              onChange={(value) => setSelectedIdentityId(String(value ?? ''))}
            />
            {selectedEmployee &&
              identities.length === 0 &&
              !identitiesLoading && (
                <Text
                  type='warning'
                  size='small'
                  style={{ marginTop: 4, display: 'block' }}
                >
                  该员工没有生效中的身份
                </Text>
              )}
            {selectedIdentity && (
              <Text
                type='tertiary'
                size='small'
                style={{ marginTop: 4, display: 'block' }}
              >
                {formatIdentity(selectedIdentity)}
              </Text>
            )}
          </Form.Slot>

          <Form.Slot label='云客部门'>
            <TreeSelect
              style={{ width: '100%' }}
              value={formValues.yunkeDeptId || undefined}
              placeholder='选择云客组织架构下的部门'
              treeData={deptTreeData}
              filterTreeNode
              showSearchClear
              dropdownStyle={{ maxHeight: 360, overflow: 'auto' }}
              onChange={(value) =>
                setFormValues((x) => ({
                  ...x,
                  yunkeDeptId: String(value ?? ''),
                }))
              }
            />
          </Form.Slot>
          <Form.Slot label='云客角色'>
            <Select
              style={{ width: '100%' }}
              value={formValues.yunkeRoleId || undefined}
              placeholder='选择云客角色'
              filter
              onChange={(value) =>
                setFormValues((x) => ({
                  ...x,
                  yunkeRoleId: String(value ?? ''),
                }))
              }
              optionList={roles.map((r) => ({ label: r.name, value: r.id }))}
            />
            {formValues.yunkeRoleId &&
              roles.find((r) => r.id === formValues.yunkeRoleId)?.name !==
                '咨询师' && (
                <Text
                  type='warning'
                  size='small'
                  style={{ marginTop: 4, display: 'block' }}
                >
                  当前选择的不是「咨询师」
                </Text>
              )}
          </Form.Slot>

          <Form.Slot label='短信通知'>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Switch
                checked={formValues.sendSms}
                onChange={(v) => setFormValues((x) => ({ ...x, sendSms: v }))}
              />
              <Text type='tertiary'>
                {formValues.sendSms ? '发送短信给员工' : '不发送短信'}
              </Text>
            </div>
          </Form.Slot>
        </Form>
      </Modal>
      <EmployeeSelectorDialog
        open={employeeSelectorOpen}
        onOpenChange={setEmployeeSelectorOpen}
        onSelect={(employee) => {
          setSelectedEmployee(employee)
          setSelectedIdentityId('')
        }}
        title='选择课程顾问'
        description='从 CRM 在职课程顾问中选择要开通云客账号的员工'
        confirmText='选定顾问'
        filterByAdvisorPosition
      />
    </>
  )
}

function ResultCard({
  title,
  body,
  onCopy,
}: {
  title: string
  body: string
  onCopy: () => void
}) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div
      style={{
        border: '1px solid var(--semi-color-border)',
        borderRadius: 8,
        padding: 12,
        background: 'var(--semi-color-fill-0)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <Title heading={6} style={{ margin: 0 }}>
          {title}
        </Title>
        <Button
          theme='outline'
          size='small'
          icon={
            copied ? (
              <Check className='h-3 w-3' />
            ) : (
              <Copy className='h-3 w-3' />
            )
          }
          onClick={handleCopy}
        >
          {copied ? '已复制' : '一键复制'}
        </Button>
      </div>
      <pre
        style={{
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        {body}
      </pre>
    </div>
  )
}
