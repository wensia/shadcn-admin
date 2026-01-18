/**
 * 创建/编辑线索Dialog组件
 * Mira风格: 紧凑表单布局、小字号
 */

import { useEffect, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { FormDatePicker } from '@/components/date-picker'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { leadsApi } from '../api'
import { apiClient } from '@/lib/api/client'
import type { Lead, LeadCreate, LeadUpdate, Gender, SourceChannelExtraField } from '../types'
import { gradeLabels } from '../types'
import type { SourceChannel } from '@/features/admin/types'

interface LeadFormDialogProps {
  lead?: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

// Zod表单验证Schema - Mira风格关注核心必填项
const formSchema = z.object({
  // 儿童信息
  child_name: z.string().max(50, '姓名过长').optional(),
  child_gender: z.string().optional().nullable(),
  child_birthday: z.string().optional(),
  age: z.number().min(0).max(30).optional(),
  grade: z.string().optional(),
  school_name: z.string().max(100).optional(),
  course_interests: z.string().optional(),

  // 家长信息
  parent_name: z.string().max(50).optional(),
  parent_phone: z.string().min(11, '请输入正确的手机号').max(11, '请输入正确的手机号'),
  parent_wechat: z.string().max(50).optional(),
  parent_email: z.string().email('请输入正确的邮箱').optional().or(z.literal('')),
  parent_relation: z.string().max(20).optional(),

  // 备用联系人
  backup_contact_name: z.string().max(50).optional(),
  backup_contact_phone: z.string().max(11).optional(),
  backup_contact_relation: z.string().max(20).optional(),

  // 地址信息
  province: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  address_detail: z.string().max(200).optional(),

  // 线索属性
  source_channel_id: z.string().min(1, '请选择来源渠道'),
  source_detail: z.string().max(100).optional(),
  intention_level: z.string().optional(),
  notes: z.string().max(500).optional(),
  owner_campus_id: z.string().min(1, '请选择归属校区')
})

type FormData = z.infer<typeof formSchema>

export function LeadFormDialog({ lead, open, onOpenChange, onSuccess }: LeadFormDialogProps) {
  const queryClient = useQueryClient()
  const [phoneCheckResult, setPhoneCheckResult] = useState<string>('')
  const isEdit = !!lead

  // 表单初始化
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      child_name: '',
      child_gender: undefined,
      child_birthday: '',
      age: undefined,
      grade: '',
      school_name: '',
      course_interests: '',
      parent_name: '',
      parent_phone: '',
      parent_wechat: '',
      parent_email: '',
      parent_relation: '',
      backup_contact_name: '',
      backup_contact_phone: '',
      backup_contact_relation: '',
      province: '',
      city: '',
      district: '',
      address_detail: '',
      source_channel_id: '',
      source_detail: '',
      intention_level: '',
      notes: '',
      owner_campus_id: ''
    }
  })

  // 获取筛选选项(校区等)
  const { data: filterOptions } = useQuery({
    queryKey: ['filter-options'],
    queryFn: async () => {
      const response = await leadsApi.getFilterOptions()
      return response.data
    },
    enabled: open
  })

  // 获取来源渠道列表（包含完整信息，用于渲染额外字段）
  const { data: sourceChannels } = useQuery({
    queryKey: ['source-channels-active-full'],
    queryFn: async () => {
      const response = await apiClient.get<{ code: number; data: { items: SourceChannel[] } }>(
        '/source-channels',
        { params: { page: 1, size: 100, is_active: true } }
      )
      return response.data?.items || []
    },
    enabled: open
  })

  // 当前选中的渠道ID
  const watchedChannelId = form.watch('source_channel_id')

  // 获取当前选中渠道的额外字段配置
  const selectedChannelExtraFields = useMemo<SourceChannelExtraField[]>(() => {
    if (!watchedChannelId || !sourceChannels) return []
    const channel = sourceChannels.find(c => c.id === watchedChannelId)
    if (!channel) return []
    // 兼容多种格式
    const fields = channel.extra_fields || channel.channel_config?.fields || []
    return fields.map(f => ({
      field_name: f.field_name,
      field_label: f.field_label,
      field_type: f.field_type as SourceChannelExtraField['field_type'],
      required: f.required,
      placeholder: f.placeholder,
      options: f.options
    }))
  }, [watchedChannelId, sourceChannels])

  // 额外字段值状态
  const [extraFieldValues, setExtraFieldValues] = useState<Record<string, string>>({})

  // 更新额外字段值
  const handleExtraFieldChange = (fieldName: string, value: string) => {
    setExtraFieldValues(prev => ({ ...prev, [fieldName]: value }))
  }

  // 创建线索Mutation
  const createMutation = useMutation({
    mutationFn: async (data: LeadCreate) => {
      const response = await leadsApi.createLead(data)
      return response.data
    },
    onSuccess: () => {
      toast.success('创建线索成功')
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      onSuccess?.()
      onOpenChange(false)
      form.reset()
    },
    onError: (error: any) => {
      toast.error(error.message || '创建失败')
    }
  })

  // 更新线索Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LeadUpdate> }) => {
      const response = await leadsApi.updateLead(id, data)
      return response.data
    },
    onSuccess: () => {
      toast.success('更新线索成功')
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['lead', lead?.id] })
      onSuccess?.()
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error.message || '更新失败')
    }
  })

  // 当lead变化时更新表单数据
  useEffect(() => {
    if (lead && open) {
      form.reset({
        child_name: lead.child_name || '',
        child_gender: lead.child_gender as Gender | undefined,
        child_birthday: lead.child_birthday || '',
        age: lead.age || undefined,
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
        source_detail: lead.source_detail || '',
        intention_level: lead.intention_level || '',
        notes: lead.notes || '',
        owner_campus_id: lead.owner_campus_id || ''
      })
      // 加载现有的额外字段值
      setExtraFieldValues(lead.source_extra_info || {})
    } else if (!lead && open) {
      form.reset()
      setExtraFieldValues({})
    }
  }, [lead, open, form])

  // 当渠道变化时，清空额外字段值（仅新建模式）
  useEffect(() => {
    if (!isEdit && watchedChannelId) {
      setExtraFieldValues({})
    }
  }, [watchedChannelId, isEdit])

  // 手机号变化时检查重复(防抖)
  const handlePhoneChange = async (phone: string) => {
    if (phone.length === 11) {
      try {
        const response = await leadsApi.checkPhoneDuplicate(phone, lead?.id)
        if (response.data.is_duplicate) {
          setPhoneCheckResult(
            `发现${response.data.duplicate_count}个重复线索`
          )
        } else {
          setPhoneCheckResult('')
        }
      } catch (error) {
        // 静默处理错误
      }
    } else {
      setPhoneCheckResult('')
    }
  }

  // 提交表单
  const onSubmit = (data: FormData) => {
    // 验证额外字段必填项
    for (const field of selectedChannelExtraFields) {
      if (field.required && !extraFieldValues[field.field_name]?.trim()) {
        toast.error(`请填写${field.field_label}`)
        return
      }
    }

    // 构建额外字段数据（仅包含有值的字段）
    const sourceExtraInfo: Record<string, any> = {}
    for (const [key, value] of Object.entries(extraFieldValues)) {
      if (value?.trim()) {
        sourceExtraInfo[key] = value.trim()
      }
    }

    const formattedData: any = {
      ...data,
      age: data.age || undefined,
      course_interests: data.course_interests
        ? data.course_interests.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      parent_email: data.parent_email || undefined,
      intention_level: data.intention_level || undefined,
      // 添加额外字段数据
      source_extra_info: Object.keys(sourceExtraInfo).length > 0 ? sourceExtraInfo : undefined
    }

    if (isEdit && lead) {
      updateMutation.mutate({ id: lead.id, data: formattedData })
    } else {
      createMutation.mutate(formattedData as LeadCreate)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0" showCloseButton={false}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Mira风格: 紧凑的Dialog Header */}
            <DialogHeader className="px-4 py-3 border-b">
              <DialogTitle className="text-base">{isEdit ? '编辑线索' : '新建线索'}</DialogTitle>
              <DialogDescription className="text-xs">
                {isEdit ? '修改线索信息' : '填写完整信息创建新线索'}
              </DialogDescription>
            </DialogHeader>

            {/* 可滚动表单区域 - 使用固定最大高度 */}
            <ScrollArea className="max-h-[calc(85vh-140px)]">
              <div className="space-y-4 py-4 px-4">
                {/* 儿童信息 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">儿童信息</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="child_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">儿童姓名</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-8 text-xs" placeholder="请输入" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="child_gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">性别</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs w-full">
                                <SelectValue placeholder="选择性别" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male" className="text-xs">男</SelectItem>
                              <SelectItem value="female" className="text-xs">女</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">年龄</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              className="h-8 text-xs"
                              placeholder="请输入"
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="child_birthday"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">生日</FormLabel>
                          <FormControl>
                            <FormDatePicker
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="选择生日"
                              maxDate={new Date()}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="grade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">年级</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs w-full">
                                <SelectValue placeholder="选择年级" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(gradeLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value} className="text-xs">
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="school_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">学校</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-8 text-xs" placeholder="请输入" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="course_interests"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel className="text-xs">课程兴趣</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="h-8 text-xs"
                              placeholder="多个课程用逗号分隔"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* 家长信息 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">家长信息</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="parent_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">家长姓名</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-8 text-xs" placeholder="请输入" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    {!isEdit && (
                      <FormField
                        control={form.control}
                        name="parent_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              手机号 <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <div className="space-y-1">
                                <Input
                                  {...field}
                                  className="h-8 text-xs"
                                  placeholder="请输入11位手机号"
                                  onChange={(e) => {
                                    field.onChange(e)
                                    handlePhoneChange(e.target.value)
                                  }}
                                />
                                {phoneCheckResult && (
                                  <p className="text-xs text-orange-500">{phoneCheckResult}</p>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="parent_wechat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">微信号</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-8 text-xs" placeholder="请输入" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="parent_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">邮箱</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" className="h-8 text-xs" placeholder="请输入" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="parent_relation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">与儿童关系</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="选择关系" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="father" className="text-xs">父亲</SelectItem>
                              <SelectItem value="mother" className="text-xs">母亲</SelectItem>
                              <SelectItem value="grandfather" className="text-xs">爷爷</SelectItem>
                              <SelectItem value="grandmother" className="text-xs">奶奶</SelectItem>
                              <SelectItem value="other" className="text-xs">其他</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* 备用联系人 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">备用联系人(可选)</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="backup_contact_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">姓名</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-8 text-xs" placeholder="请输入" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="backup_contact_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">电话</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-8 text-xs" placeholder="请输入" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="backup_contact_relation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">关系</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-8 text-xs" placeholder="如:母亲" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* 地址信息 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">地址信息(可选)</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="province"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">省份</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-8 text-xs" placeholder="请输入" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">城市</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-8 text-xs" placeholder="请输入" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="district"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">区县</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-8 text-xs" placeholder="请输入" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address_detail"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel className="text-xs">详细地址</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-8 text-xs" placeholder="请输入" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* 线索属性 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">线索属性</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="source_channel_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            来源渠道 {!isEdit && <span className="text-destructive">*</span>}
                          </FormLabel>
                          {isEdit ? (
                            <p className="text-xs h-8 flex items-center text-muted-foreground">
                              {lead?.source_channel_name || '-'}
                            </p>
                          ) : (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="选择渠道" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {sourceChannels?.map((channel) => (
                                  <SelectItem
                                    key={channel.id}
                                    value={channel.id}
                                    className="text-xs"
                                  >
                                    {channel.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="source_detail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">来源详情</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-8 text-xs" placeholder="请输入" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    {/* 渠道额外字段动态渲染 */}
                    {selectedChannelExtraFields.length > 0 && (
                      <>
                        {selectedChannelExtraFields.map((field) => (
                          <div key={field.field_name} className="space-y-1">
                            <label className="text-xs font-medium">
                              {field.field_label}
                              {field.required && <span className="text-destructive ml-0.5">*</span>}
                            </label>
                            {field.field_type === 'select' && field.options?.length ? (
                              <Select
                                value={extraFieldValues[field.field_name] || ''}
                                onValueChange={(value) => handleExtraFieldChange(field.field_name, value)}
                              >
                                <SelectTrigger className="h-8 text-xs w-full">
                                  <SelectValue placeholder={field.placeholder || `选择${field.field_label}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {field.options.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : field.field_type === 'textarea' ? (
                              <Textarea
                                value={extraFieldValues[field.field_name] || ''}
                                onChange={(e) => handleExtraFieldChange(field.field_name, e.target.value)}
                                placeholder={field.placeholder || `请输入${field.field_label}`}
                                className="min-h-[60px] text-xs resize-none"
                              />
                            ) : field.field_type === 'number' ? (
                              <Input
                                type="number"
                                value={extraFieldValues[field.field_name] || ''}
                                onChange={(e) => handleExtraFieldChange(field.field_name, e.target.value)}
                                placeholder={field.placeholder || `请输入${field.field_label}`}
                                className="h-8 text-xs"
                              />
                            ) : field.field_type === 'date' ? (
                              <FormDatePicker
                                value={extraFieldValues[field.field_name] || ''}
                                onChange={(value) => handleExtraFieldChange(field.field_name, value || '')}
                                placeholder={field.placeholder || `选择${field.field_label}`}
                              />
                            ) : (
                              <Input
                                type="text"
                                value={extraFieldValues[field.field_name] || ''}
                                onChange={(e) => handleExtraFieldChange(field.field_name, e.target.value)}
                                placeholder={field.placeholder || `请输入${field.field_label}`}
                                className="h-8 text-xs"
                              />
                            )}
                          </div>
                        ))}
                      </>
                    )}

                    <FormField
                      control={form.control}
                      name="owner_campus_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            归属校区 {!isEdit && <span className="text-destructive">*</span>}
                          </FormLabel>
                          {isEdit ? (
                            <p className="text-xs h-8 flex items-center text-muted-foreground">
                              {lead?.owner_campus_name || '-'}
                            </p>
                          ) : (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="选择校区" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {filterOptions?.campuses?.map((campus) => (
                                  <SelectItem
                                    key={campus.id}
                                    value={campus.id}
                                    className="text-xs"
                                  >
                                    {campus.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="intention_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">意向等级</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs w-full">
                                <SelectValue placeholder="选择意向" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="high" className="text-xs">高意向</SelectItem>
                              <SelectItem value="medium" className="text-xs">中等</SelectItem>
                              <SelectItem value="low" className="text-xs">低意向</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel className="text-xs">备注</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              className="min-h-[60px] text-xs resize-none"
                              placeholder="请输入备注信息"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Mira风格: 紧凑的Dialog Footer */}
            <DialogFooter className="px-4 py-3 border-t gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                size="sm"
                className="h-8 text-xs"
              >
                取消
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 text-xs"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? '提交中...' : '确定'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
