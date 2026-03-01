/**
 * 创建/编辑线索Dialog组件 - 分步表单版本
 * 3步：联系信息 → 学生信息 → 补充信息
 *
 * 重要：使用 display:none 隐藏非当前步骤，而非条件渲染，
 * 确保所有 Semi Form 字段始终挂载，提交时能获取全部字段值。
 */

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal, Form, Button, Input, Select, DatePicker, Toast, Steps, Table, Tag, Card } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { IconInfoCircle } from '@douyinfe/semi-icons'
import { leadsApi } from '../api'
import { apiClient } from '@/lib/api/client'
import type { Lead, LeadCreate, LeadUpdate, Gender, SourceChannelExtraField } from '../types'
import { gradeLabels, LeadStatus } from '../types'
import { leadStatusStyles } from '@/lib/status-styles'
import type { SourceChannel } from '@/features/admin/types'
import { showApiErrorToast } from '@/lib/api/error-toast'

const { TextArea } = Input

interface LeadFormDialogProps {
  lead?: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const CHILD_NAME_MAX_LENGTH = 10
const TOTAL_STEPS = 3

const genderOptions = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
]

const relationOptions = [
  { value: 'father', label: '父亲' },
  { value: 'mother', label: '母亲' },
  { value: 'grandfather', label: '爷爷' },
  { value: 'grandmother', label: '奶奶' },
  { value: 'other', label: '其他' },
]

const intentionOptions = [
  { value: 'high', label: '高意向' },
  { value: 'medium', label: '中等' },
  { value: 'low', label: '低意向' },
]

// 每步需要验证的 Semi Form 字段
const STEP_FIELDS: string[][] = [
  // Step 0: 联系信息
  ['parent_phone', 'parent_name', 'parent_wechat', 'parent_relation', 'source_channel_id', 'owner_campus_id', 'intention_level'],
  // Step 1: 学生信息
  ['child_name', 'child_gender', 'child_birthday', 'grade', 'school_name', 'course_interests'],
  // Step 2: 补充信息
  ['parent_email', 'backup_contact_name', 'backup_contact_phone', 'backup_contact_relation', 'province', 'city', 'district', 'address_detail', 'notes'],
]

const STEP_TITLES = ['联系信息', '学生信息', '补充信息']

// 重复线索信息
interface DuplicateLeadInfo {
  id: string
  child_name: string
  parent_phone: string
  owner_campus_name: string
  status: string
  advisor_name?: string | null
  created_at?: string | null
  activated_at?: string | null
}

// 将 Date 或 string 转为 yyyy-MM-dd 字符串
function toDateString(val: unknown): string | undefined {
  if (!val) return undefined
  if (val instanceof Date) {
    const y = val.getFullYear()
    const m = String(val.getMonth() + 1).padStart(2, '0')
    const d = String(val.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof val === 'string') return val || undefined
  return undefined
}

// 后端 LeadCreate 接受的字段白名单（防止发送多余字段导致 422）
const LEAD_CREATE_FIELDS = [
  'child_name', 'child_gender', 'child_birthday', 'school_name', 'grade', 'course_interests',
  'parent_name', 'parent_phone', 'parent_wechat', 'parent_email', 'parent_relation',
  'province', 'city', 'district', 'address_detail',
  'backup_contact_name', 'backup_contact_phone', 'backup_contact_relation',
  'notes', 'tag',
  'source_channel_id', 'source_extra_info', 'advisor_id', 'owner_campus_id',
] as const

export function LeadFormDialog({ lead, open, onOpenChange, onSuccess }: LeadFormDialogProps) {
  const queryClient = useQueryClient()
  const formApiRef = useRef<any>(null)
  const [watchedChannelId, setWatchedChannelId] = useState('')
  const [extraFieldValues, setExtraFieldValues] = useState<Record<string, string>>({})
  const [currentStep, setCurrentStep] = useState(0)
  const [duplicateLeadInfo, setDuplicateLeadInfo] = useState<DuplicateLeadInfo | null>(null)
  const isEdit = !!lead

  // 打开/关闭时重置步骤
  useEffect(() => {
    if (open) {
      setCurrentStep(0)
      setDuplicateLeadInfo(null)
    }
  }, [open])

  // 获取筛选选项(校区等)
  const { data: filterOptions } = useQuery({
    queryKey: ['filter-options'],
    queryFn: async () => {
      const response = await leadsApi.getFilterOptions()
      return response.data
    },
    enabled: open
  })

  // 获取来源渠道列表
  const { data: sourceChannels } = useQuery({
    queryKey: ['source-channels-full', isEdit],
    queryFn: async () => {
      const params: Record<string, unknown> = { page: 1, size: 100 }
      if (!isEdit) params.is_active = true
      const response = await apiClient.get<{ code: number; data: { items: SourceChannel[] } }>(
        '/source-channels',
        { params }
      )
      return response.data?.items || []
    },
    enabled: open
  })

  // 当前选中渠道的额外字段配置
  const effectiveChannelId = watchedChannelId || (isEdit && lead?.source_channel_id) || ''

  const selectedChannelExtraFields = useMemo<SourceChannelExtraField[]>(() => {
    if (!effectiveChannelId || !sourceChannels) return []
    const channel = sourceChannels.find(c => c.id === effectiveChannelId)
    if (!channel) return []
    const fields = channel.extra_fields || channel.channel_config?.fields || []
    return fields.map(f => ({
      field_name: f.field_name,
      field_label: f.field_label,
      field_type: f.field_type as SourceChannelExtraField['field_type'],
      required: f.required,
      placeholder: f.placeholder,
      options: f.options
    }))
  }, [effectiveChannelId, sourceChannels])

  const handleExtraFieldChange = (fieldName: string, value: string) => {
    setExtraFieldValues(prev => ({ ...prev, [fieldName]: value }))
  }

  // 创建线索
  const createMutation = useMutation({
    mutationFn: async (data: LeadCreate) => {
      const response = await leadsApi.createLead(data)
      return response.data
    },
    onSuccess: () => {
      Toast.success('创建线索成功')
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      onSuccess?.()
      onOpenChange(false)
      formApiRef.current?.reset()
    },
    onError: (error: any) => {
      // 检查是否包含重复线索信息
      const responseData = error?.response?.data
      const duplicateLead = responseData?.data?.duplicate_lead
      if (duplicateLead) {
        setDuplicateLeadInfo(duplicateLead)
        return
      }
      showApiErrorToast(error, '创建失败')
    }
  })

  // 更新线索
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LeadUpdate> }) => {
      const response = await leadsApi.updateLead(id, data)
      return response.data
    },
    onSuccess: () => {
      Toast.success('更新线索成功')
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['lead', lead?.id] })
      onSuccess?.()
      onOpenChange(false)
    },
    onError: (error: any) => {
      showApiErrorToast(error, '更新失败')
    }
  })

  // 当lead变化时更新表单
  useEffect(() => {
    if (!open) return
    requestAnimationFrame(() => {
      if (!formApiRef.current) return
      if (lead) {
        formApiRef.current.setValues({
          child_name: lead.child_name || '',
          child_gender: lead.child_gender as Gender | undefined,
          child_birthday: lead.child_birthday || '',
          grade: lead.grade || '',
          school_name: lead.school_name || '',
          course_interests: lead.course_interests?.join(',') || '',
          parent_name: lead.parent_name || '',
          parent_phone: lead.parent_phone || '',
          parent_wechat: lead.parent_wechat || '',
          parent_email: lead.parent_email || '',
          parent_relation: lead.parent_relation || '',
          backup_contact_name: lead.backup_contact_name || '',
          backup_contact_phone: lead.backup_contact_phone || '',
          backup_contact_relation: lead.backup_contact_relation || '',
          province: lead.province || '',
          city: lead.city || '',
          district: lead.district || '',
          address_detail: lead.address_detail || '',
          source_channel_id: lead.source_channel_id || '',
          intention_level: lead.intention_level || '',
          notes: lead.notes || '',
          owner_campus_id: lead.owner_campus_id || ''
        })
        setWatchedChannelId(lead.source_channel_id || '')
        // 加载额外字段值
        const extraInfo = lead.source_extra_info || {}
        const stringified: Record<string, string> = {}
        for (const [key, value] of Object.entries(extraInfo)) {
          if (value && typeof value === 'object' && 'value' in value) {
            stringified[key] = String((value as { value: unknown }).value || '')
          } else {
            stringified[key] = value != null ? String(value) : ''
          }
        }
        setExtraFieldValues(stringified)
      } else {
        formApiRef.current.reset()
        setExtraFieldValues({})
        setWatchedChannelId('')
      }
    })
  }, [lead, open])

  // 渠道变化时清空额外字段（新建模式）
  useEffect(() => {
    if (!isEdit && watchedChannelId) {
      setExtraFieldValues({})
    }
  }, [watchedChannelId, isEdit])


  // 验证当前步骤字段
  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    if (!formApiRef.current) return false
    const fields = STEP_FIELDS[currentStep]
    try {
      await formApiRef.current.validate(fields)
    } catch {
      return false
    }
    // Step 0 还需验证渠道额外字段
    if (currentStep === 0) {
      for (const field of selectedChannelExtraFields) {
        if (field.required && !extraFieldValues[field.field_name]?.trim()) {
          Toast.error(`请填写${field.field_label}`)
          return false
        }
      }
    }
    return true
  }, [currentStep, selectedChannelExtraFields, extraFieldValues])

  // 下一步
  const handleNext = useCallback(async () => {
    const valid = await validateCurrentStep()
    if (valid) setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS - 1))
  }, [validateCurrentStep])

  // 上一步
  const handlePrev = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }, [])

  // 点击步骤指示器跳转
  const handleStepClick = useCallback(async (targetStep: number) => {
    if (targetStep === currentStep) return
    if (targetStep > currentStep) {
      const valid = await validateCurrentStep()
      if (!valid) return
    }
    setCurrentStep(targetStep)
  }, [currentStep, validateCurrentStep])

  // 提交表单
  const handleSubmit = (values: Record<string, any>) => {
    // 验证额外字段
    for (const field of selectedChannelExtraFields) {
      if (field.required && !extraFieldValues[field.field_name]?.trim()) {
        Toast.error(`请填写${field.field_label}`)
        setCurrentStep(0)
        return
      }
    }

    const sourceExtraInfo: Record<string, any> = {}
    for (const [key, value] of Object.entries(extraFieldValues)) {
      if (value?.trim()) sourceExtraInfo[key] = value.trim()
    }

    // 编辑模式下补充未注册的字段
    if (isEdit && lead) {
      if (!values.source_channel_id) values.source_channel_id = lead.source_channel_id
      if (!values.owner_campus_id) values.owner_campus_id = lead.owner_campus_id
      if (!values.parent_phone) values.parent_phone = lead.parent_phone
    }

    // 构建提交数据 — 只包含后端 schema 接受的字段
    const formattedData: Record<string, any> = {
      parent_phone: values.parent_phone,
      source_channel_id: values.source_channel_id,
      child_name: values.child_name || undefined,
      child_gender: values.child_gender || undefined,
      child_birthday: toDateString(values.child_birthday),
      grade: values.grade || undefined,
      school_name: values.school_name || undefined,
      course_interests: values.course_interests
        ? values.course_interests.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
      parent_name: values.parent_name || undefined,
      parent_wechat: values.parent_wechat || undefined,
      parent_email: values.parent_email || undefined,
      parent_relation: values.parent_relation || undefined,
      backup_contact_name: values.backup_contact_name || undefined,
      backup_contact_phone: values.backup_contact_phone || undefined,
      backup_contact_relation: values.backup_contact_relation || undefined,
      province: values.province || undefined,
      city: values.city || undefined,
      district: values.district || undefined,
      address_detail: values.address_detail || undefined,
      notes: values.notes || undefined,
      owner_campus_id: values.owner_campus_id || undefined,
      source_extra_info: Object.keys(sourceExtraInfo).length > 0 ? sourceExtraInfo : undefined,
    }

    // 清理 undefined 值，避免发送空字段
    for (const key of Object.keys(formattedData)) {
      if (formattedData[key] === undefined) delete formattedData[key]
    }

    if (isEdit && lead) {
      // 编辑模式：额外包含 intention_level（LeadUpdate 接受此字段）
      if (values.intention_level) formattedData.intention_level = values.intention_level
      updateMutation.mutate({ id: lead.id, data: formattedData })
    } else {
      createMutation.mutate(formattedData as LeadCreate)
    }
  }

  // 跳过直接提交（从 Step 1/2 快速提交）
  const handleSkipSubmit = useCallback(async () => {
    const fields = STEP_FIELDS[0]
    try {
      await formApiRef.current?.validate(fields)
    } catch {
      setCurrentStep(0)
      Toast.warning('请先完成联系信息的必填项')
      return
    }
    for (const field of selectedChannelExtraFields) {
      if (field.required && !extraFieldValues[field.field_name]?.trim()) {
        setCurrentStep(0)
        Toast.error(`请填写${field.field_label}`)
        return
      }
    }
    formApiRef.current?.submitForm()
  }, [selectedChannelExtraFields, extraFieldValues])

  const isPending = createMutation.isPending || updateMutation.isPending

  const gradeOptionList = useMemo(
    () => Object.entries(gradeLabels).map(([value, label]) => ({ value, label })),
    []
  )

  const channelOptionList = useMemo(
    () => (sourceChannels || []).map(c => ({ value: c.id, label: c.name })),
    [sourceChannels]
  )

  const campusOptionList = useMemo(
    () => (filterOptions?.campuses || []).map((c: any) => ({ value: c.id, label: c.name })),
    [filterOptions]
  )

  // 2列网格
  const grid2: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px',
  }

  // 步骤面板样式：用 display:none 隐藏而非卸载，保留 Semi Form 字段注册
  const stepStyle = (step: number): React.CSSProperties =>
    currentStep === step ? {} : { display: 'none' }

  const isLastStep = currentStep === TOTAL_STEPS - 1

  return (
    <>
    <Modal
      visible={open}
      onCancel={() => onOpenChange(false)}
      title={isEdit ? '编辑线索' : '新建线索'}
      footer={null}
      width={672}
      bodyStyle={{ padding: 0 }}
      maskClosable={false}
    >
      {/* 步骤指示器 - 紧凑导航样式 */}
      <div style={{ padding: '12px 16px 0' }}>
        <Steps
          current={currentStep}
          size="small"
          type="nav"
          onChange={handleStepClick}
          style={{ cursor: 'pointer' }}
        >
          {STEP_TITLES.map((title, i) => (
            <Steps.Step key={i} title={title} />
          ))}
        </Steps>
      </div>

      <Form
        getFormApi={(api: any) => { formApiRef.current = api }}
        onSubmit={handleSubmit}
        onValueChange={(_values: any, changedValues: any) => {
          if (changedValues && 'source_channel_id' in changedValues) {
            setWatchedChannelId(changedValues.source_channel_id || '')
          }
        }}
        layout="vertical"
        labelPosition="top"
        style={{ margin: 0 }}
      >
        {/* 内容区域 */}
        <div style={{ minHeight: 280, maxHeight: 'calc(85vh - 240px)', overflowY: 'auto', padding: '16px 16px 0' }}>

          {/* Step 0: 联系信息 */}
          <div style={stepStyle(0)}>
            <div style={grid2}>
              {!isEdit && (
                <div>
                  <Form.Input
                    field="parent_phone"
                    label="手机号"
                    placeholder="请输入11位手机号"
                    rules={[
                      { required: true, message: '请输入手机号' },
                      { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位大陆手机号' }
                    ]}
                  />
                </div>
              )}
              <Form.Input
                field="parent_name"
                label="家长姓名"
                placeholder="请输入"
                rules={[{ max: 20, message: '最多20个字符' }]}
              />
              <Form.Input
                field="parent_wechat"
                label="微信号"
                placeholder="请输入"
                rules={[{ max: 30, message: '最多30个字符' }]}
              />
              <Form.Select
                field="parent_relation"
                label="与儿童关系"
                placeholder="选择关系"
                optionList={relationOptions}
                style={{ width: '100%' }}
              />

              {/* 来源渠道 */}
              {isEdit ? (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, marginBottom: 4, fontWeight: 500, color: 'var(--semi-color-text-0)' }}>来源渠道</div>
                  <div style={{ height: 32, display: 'flex', alignItems: 'center', color: 'var(--semi-color-text-2)', fontSize: 14 }}>
                    {lead?.source_channel_name || '-'}
                  </div>
                </div>
              ) : (
                <Form.Select
                  field="source_channel_id"
                  label="来源渠道"
                  placeholder="选择渠道"
                  optionList={channelOptionList}
                  rules={[{ required: true, message: '请选择来源渠道' }]}
                  style={{ width: '100%' }}
                />
              )}

              {/* 渠道额外字段 */}
              {selectedChannelExtraFields.length > 0 && (
                <Card
                  title={<span style={{ fontSize: 13, fontWeight: 500 }}>渠道附加信息</span>}
                  headerStyle={{ padding: '8px 12px', minHeight: 0 }}
                  bodyStyle={{ padding: '12px 12px 0' }}
                  style={{ marginBottom: 24, background: 'var(--semi-color-fill-0)' }}
                >
                  {selectedChannelExtraFields.map((field) => (
                    <div key={field.field_name}>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, color: 'var(--semi-color-text-0)' }}>
                        {field.field_label}
                        {field.required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
                      </div>
                      {field.field_type === 'select' && field.options?.length ? (
                        <Select
                          value={extraFieldValues[field.field_name] || undefined}
                          onChange={(val) => handleExtraFieldChange(field.field_name, val as string)}
                          placeholder={field.placeholder || `选择${field.field_label}`}
                          optionList={field.options.map(opt => ({ value: opt.value, label: opt.label }))}
                          style={{ width: '100%', marginBottom: 12 }}
                        />
                      ) : field.field_type === 'textarea' ? (
                        <TextArea
                          value={extraFieldValues[field.field_name] || ''}
                          onChange={(val) => handleExtraFieldChange(field.field_name, val)}
                          placeholder={field.placeholder || `请输入${field.field_label}`}
                          autosize={{ minRows: 2 }}
                          style={{ marginBottom: 12 }}
                        />
                      ) : field.field_type === 'number' ? (
                        <Input
                          type="number"
                          value={extraFieldValues[field.field_name] || ''}
                          onChange={(val) => handleExtraFieldChange(field.field_name, val)}
                          placeholder={field.placeholder || `请输入${field.field_label}`}
                          style={{ marginBottom: 12 }}
                        />
                      ) : field.field_type === 'date' ? (
                        <DatePicker
                          value={extraFieldValues[field.field_name] || undefined}
                          onChange={(_date: any, dateStr: any) => handleExtraFieldChange(field.field_name, dateStr as string || '')}
                          placeholder={field.placeholder || `选择${field.field_label}`}
                          type="date"
                          style={{ width: '100%', marginBottom: 12 }}
                        />
                      ) : (
                        <Input
                          value={extraFieldValues[field.field_name] || ''}
                          onChange={(val) => handleExtraFieldChange(field.field_name, val)}
                          placeholder={field.placeholder || `请输入${field.field_label}`}
                          style={{ marginBottom: 12 }}
                        />
                      )}
                    </div>
                  ))}
                </Card>
              )}

              {/* 归属校区 */}
              {isEdit ? (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, marginBottom: 4, fontWeight: 500, color: 'var(--semi-color-text-0)' }}>归属校区</div>
                  <div style={{ height: 32, display: 'flex', alignItems: 'center', color: 'var(--semi-color-text-2)', fontSize: 14 }}>
                    {lead?.owner_campus_name || '-'}
                  </div>
                </div>
              ) : (
                <Form.Select
                  field="owner_campus_id"
                  label="归属校区"
                  placeholder="选择校区"
                  optionList={campusOptionList}
                  rules={[{ required: true, message: '请选择归属校区' }]}
                  style={{ width: '100%' }}
                />
              )}

              <Form.Select
                field="intention_level"
                label="意向等级"
                placeholder="选择意向"
                optionList={intentionOptions}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Step 1: 学生信息 */}
          <div style={stepStyle(1)}>
            <div style={grid2}>
              <Form.Input
                field="child_name"
                label="儿童姓名"
                placeholder="请输入"
                maxLength={CHILD_NAME_MAX_LENGTH}
                rules={[{ max: CHILD_NAME_MAX_LENGTH, message: `姓名最多${CHILD_NAME_MAX_LENGTH}个字` }]}
              />
              <Form.Select
                field="child_gender"
                label="性别"
                placeholder="选择性别"
                optionList={genderOptions}
                style={{ width: '100%' }}
              />
              <Form.DatePicker
                field="child_birthday"
                label="生日"
                placeholder="选择生日"
                type="date"
                disabledDate={(date?: Date) => !!date && date > new Date()}
                style={{ width: '100%' }}
              />
              <Form.Select
                field="grade"
                label="年级"
                placeholder="选择年级"
                optionList={gradeOptionList}
                style={{ width: '100%' }}
              />
              <Form.Input
                field="school_name"
                label="学校"
                placeholder="请输入"
                rules={[{ max: 50, message: '最多50个字符' }]}
              />
              <div /> {/* 占位 */}
              <div style={{ gridColumn: 'span 2' }}>
                <Form.Input
                  field="course_interests"
                  label="课程兴趣"
                  placeholder="多个课程用逗号分隔"
                />
              </div>
            </div>
          </div>

          {/* Step 2: 补充信息 */}
          <div style={stepStyle(2)}>
            <div style={grid2}>
              <Form.Input
                field="parent_email"
                label="邮箱"
                placeholder="请输入"
                rules={[{
                  validator: (_rule: any, value: string) => {
                    if (!value) return true
                    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
                  },
                  message: '请输入正确的邮箱'
                }]}
              />
              <div /> {/* 占位 */}

              {/* 备用联系人 */}
              <div style={{ gridColumn: 'span 2', fontSize: 14, fontWeight: 600, color: 'var(--semi-color-text-0)', marginBottom: 4 }}>
                备用联系人
              </div>
              <Form.Input field="backup_contact_name" label="姓名" placeholder="请输入" rules={[{ max: 20, message: '最多20个字符' }]} />
              <Form.Input field="backup_contact_phone" label="电话" placeholder="请输入" rules={[{ max: 15, message: '最多15位' }]} />
              <Form.Input field="backup_contact_relation" label="关系" placeholder="如:母亲" rules={[{ max: 10, message: '最多10个字符' }]} />
              <div /> {/* 占位 */}

              {/* 地址信息 */}
              <div style={{ gridColumn: 'span 2', fontSize: 14, fontWeight: 600, color: 'var(--semi-color-text-0)', marginBottom: 4 }}>
                地址信息
              </div>
              <Form.Input field="province" label="省份" placeholder="请输入" rules={[{ max: 20, message: '最多20个字符' }]} />
              <Form.Input field="city" label="城市" placeholder="请输入" rules={[{ max: 20, message: '最多20个字符' }]} />
              <Form.Input field="district" label="区县" placeholder="请输入" rules={[{ max: 20, message: '最多20个字符' }]} />
              <div style={{ gridColumn: 'span 2' }}>
                <Form.Input field="address_detail" label="详细地址" placeholder="请输入" rules={[{ max: 100, message: '最多100个字符' }]} />
              </div>

              {/* 备注 */}
              <div style={{ gridColumn: 'span 2' }}>
                <Form.TextArea
                  field="notes"
                  label="备注"
                  placeholder="请输入备注信息"
                  rules={[{ max: 500, message: '最多500个字符' }]}
                  autosize={{ minRows: 2, maxRows: 4 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--semi-color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            {currentStep > 0 && !isLastStep && (
              <Button
                type="tertiary"
                onClick={handleSkipSubmit}
                loading={isPending}
                style={{ fontSize: 13 }}
              >
                跳过，直接提交
              </Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => onOpenChange(false)}>取消</Button>
            {currentStep > 0 && (
              <Button onClick={handlePrev}>上一步</Button>
            )}
            {isLastStep ? (
              <Button theme="solid" htmlType="submit" loading={isPending}>
                {isPending ? '提交中...' : '提交'}
              </Button>
            ) : (
              <Button theme="solid" onClick={handleNext}>
                下一步
              </Button>
            )}
            {currentStep > 0 && isLastStep && (
              <Button
                type="tertiary"
                onClick={handleSkipSubmit}
                loading={isPending}
                style={{ fontSize: 13 }}
              >
                跳过，直接提交
              </Button>
            )}
          </div>
        </div>
      </Form>
    </Modal>

    {/* 重复线索信息对话框 */}
    <Modal
      visible={!!duplicateLeadInfo}
      onCancel={() => setDuplicateLeadInfo(null)}
      title={null}
      footer={
        <Button theme="solid" onClick={() => setDuplicateLeadInfo(null)}>
          我知道了
        </Button>
      }
      width={480}
      bodyStyle={{ padding: '20px 24px' }}
    >
      {duplicateLeadInfo && (() => {
        const statusConfig = leadStatusStyles[duplicateLeadInfo.status as LeadStatus]
        const statusLabel = statusConfig?.label || duplicateLeadInfo.status
        const statusColor = statusConfig?.color as 'orange' | 'green' | 'red' | 'grey' | undefined
        const formatDate = (iso: string | null | undefined) => {
          if (!iso) return '-'
          return iso.slice(0, 10)
        }
        type InfoRow = { key: string; label: string; value: React.ReactNode }
        const infoRows: InfoRow[] = [
          { key: 'child_name', label: '学生姓名', value: duplicateLeadInfo.child_name },
          { key: 'parent_phone', label: '手机号', value: duplicateLeadInfo.parent_phone },
          { key: 'owner_campus_name', label: '归属校区', value: duplicateLeadInfo.owner_campus_name },
          { key: 'status', label: '线索状态', value: <Tag size="small" color={statusColor}>{statusLabel}</Tag> },
          { key: 'advisor_name', label: '跟进顾问', value: duplicateLeadInfo.advisor_name || '未分配' },
          { key: 'created_at', label: '创建时间', value: formatDate(duplicateLeadInfo.created_at) },
          { key: 'activated_at', label: '上次激活', value: formatDate(duplicateLeadInfo.activated_at) },
        ]
        const infoColumns: ColumnProps<InfoRow>[] = [
          { title: '字段', dataIndex: 'label', width: 100 },
          { title: '信息', dataIndex: 'value', render: (_text, record) => record?.value ?? '-' },
        ]
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <IconInfoCircle style={{ color: '#ff7d00', fontSize: 20, flexShrink: 0 }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--semi-color-text-0)' }}>
                该手机号已存在线索记录
              </span>
            </div>
            <Table<InfoRow>
              columns={infoColumns}
              dataSource={infoRows}
              rowKey="key"
              pagination={false}
              size="small"
              showHeader={false}
              style={{ fontSize: 13 }}
            />
            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--semi-color-text-2)' }}>
              该线索当前不符合激活条件，无法重复创建。
            </div>
          </div>
        )
      })()}
    </Modal>
    </>
  )
}
