/**
 * 线索详情信息展示组件
 * 可复用于 LeadDetailSheet 和 ContinuousCallPage
 * 支持快捷编辑功能
 */

import { useState } from 'react'
import { Pencil, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { Lead } from '../../types'
import { gradeLabels, LeadStatus, IntentionLevel } from '../../types'
import { formatTime } from '@/lib/utils/time'
import { InfoCard } from './info-card'
import { InfoGrid } from './info-grid'
import { InfoItem } from './info-item'
import { LeadStatusBadge, IntentionLevelBadge } from '../status-badges'
import { leadStatusStyles, intentionLevelStyles } from '@/lib/status-styles'
import { ChevronDown, Check } from 'lucide-react'

/**
 * 家长关系映射
 */
const parentRelationLabels: Record<string, string> = {
  father: '父亲',
  mother: '母亲',
  grandfather: '爷爷',
  grandmother: '奶奶',
  grandpa_maternal: '外公',
  grandma_maternal: '外婆',
  uncle: '叔叔',
  aunt: '阿姨',
  other: '其他',
}

function formatParentRelation(relation?: string): string | undefined {
  if (!relation) return undefined
  return parentRelationLabels[relation] || relation
}

/**
 * 选项数据
 */
const genderOptions = [
  { label: '男', value: 'male' },
  { label: '女', value: 'female' },
]

const gradeOptions = Object.entries(gradeLabels).map(([value, label]) => ({
  label,
  value,
}))

const relationOptions = Object.entries(parentRelationLabels).map(([value, label]) => ({
  label,
  value,
}))

/**
 * 解析来源渠道额外信息
 * 支持表单字段格式：{ field_name: { label: "显示名", value: "值" } }
 */
function parseSourceExtraInfo(
  obj: Record<string, unknown>
): Array<{ label: string; value: string }> {
  const result: Array<{ label: string; value: string }> = []

  for (const [_key, fieldData] of Object.entries(obj)) {
    if (
      fieldData &&
      typeof fieldData === 'object' &&
      !Array.isArray(fieldData) &&
      'label' in fieldData &&
      'value' in fieldData
    ) {
      const field = fieldData as { label: string; value: unknown }
      result.push({
        label: String(field.label || _key),
        value: formatFieldValue(field.value),
      })
    } else {
      result.push({
        label: _key,
        value: formatFieldValue(fieldData),
      })
    }
  }

  return result
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-'
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number') {
    return value.toString()
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否'
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '-'
    return value.map((item) => formatFieldValue(item)).join('、')
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

/**
 * 线索状态选项
 */
const leadStatusOptions = Object.entries(leadStatusStyles).map(([value, config]) => ({
  value: value as LeadStatus,
  label: config.label,
  color: config.color,
}))

const statusColorMap: Record<string, string> = {
  green: '#788c5d',
  orange: '#d97757',
  red: '#dc2626',
  gray: '#6b7280',
}

/**
 * 可编辑的线索状态选择器
 */
interface EditableLeadStatusProps {
  status: LeadStatus
  editable?: boolean
  onSave?: (value: string) => Promise<void>
}

function EditableLeadStatus({ status, editable, onSave }: EditableLeadStatusProps) {
  const s = useStyleClasses()
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const selectedOption = leadStatusOptions.find(o => o.value === status)
  const selectedColor = selectedOption ? statusColorMap[selectedOption.color] || statusColorMap.gray : statusColorMap.gray

  const handleSelect = async (newStatus: LeadStatus) => {
    if (!onSave || newStatus === status) {
      setOpen(false)
      return
    }
    setIsSaving(true)
    try {
      await onSave(newStatus)
      setOpen(false)
      toast.success('线索状态已更新')
    } catch (error: any) {
      toast.error(error?.message || '更新失败')
    } finally {
      setIsSaving(false)
    }
  }

  if (!editable) {
    return <LeadStatusBadge status={status} />
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            s.text.xs,
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border cursor-pointer',
            'hover:opacity-80 transition-opacity'
          )}
          style={{
            color: selectedColor,
            borderColor: selectedColor,
            backgroundColor: selectedColor + '15',
          }}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              {selectedOption?.label || status}
              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-2 gap-1">
          {leadStatusOptions.map(option => {
            const isSelected = status === option.value
            const color = statusColorMap[option.color] || statusColorMap.gray
            return (
              <Button
                key={option.value}
                variant="ghost"
                size="sm"
                className={cn(
                  'h-7 justify-start text-xs px-2',
                  isSelected && 'font-medium'
                )}
                style={{
                  color: color,
                  backgroundColor: isSelected ? color + '20' : 'transparent',
                }}
                onClick={() => handleSelect(option.value)}
                disabled={isSaving}
              >
                {isSelected && <Check className="mr-1 h-3 w-3" />}
                {option.label}
              </Button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * 意向等级选项
 */
const intentionLevelOptions = Object.entries(intentionLevelStyles).map(([value, config]) => ({
  value: value as IntentionLevel,
  label: config.label,
  color: config.color,
}))

const intentionColorMap: Record<string, string> = {
  green: '#22c55e',
  orange: '#f59e0b',
  gray: '#6b7280',
}

/**
 * 可编辑的意向等级选择器
 */
interface EditableIntentionLevelProps {
  level: IntentionLevel
  editable?: boolean
  onSave?: (value: string) => Promise<void>
}

function EditableIntentionLevel({ level, editable, onSave }: EditableIntentionLevelProps) {
  const s = useStyleClasses()
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const selectedOption = intentionLevelOptions.find(o => o.value === level)
  const selectedColor = selectedOption ? intentionColorMap[selectedOption.color] || intentionColorMap.gray : intentionColorMap.gray

  const handleSelect = async (newLevel: IntentionLevel) => {
    if (!onSave || newLevel === level) {
      setOpen(false)
      return
    }
    setIsSaving(true)
    try {
      await onSave(newLevel)
      setOpen(false)
      toast.success('意向等级已更新')
    } catch (error: any) {
      toast.error(error?.message || '更新失败')
    } finally {
      setIsSaving(false)
    }
  }

  if (!editable) {
    return <IntentionLevelBadge level={level} />
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            s.text.xs,
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border cursor-pointer',
            'hover:opacity-80 transition-opacity'
          )}
          style={{
            color: selectedColor,
            borderColor: selectedColor,
            backgroundColor: selectedColor + '15',
          }}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              {selectedOption?.label || level}
              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex flex-col gap-1">
          {intentionLevelOptions.map(option => {
            const isSelected = level === option.value
            const color = intentionColorMap[option.color] || intentionColorMap.gray
            return (
              <Button
                key={option.value}
                variant="ghost"
                size="sm"
                className={cn(
                  'h-7 justify-start text-xs px-2',
                  isSelected && 'font-medium'
                )}
                style={{
                  color: color,
                  backgroundColor: isSelected ? color + '20' : 'transparent',
                }}
                onClick={() => handleSelect(option.value)}
                disabled={isSaving}
              >
                {isSelected && <Check className="mr-1 h-3 w-3" />}
                {option.label}
              </Button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * 备注卡片组件
 */
interface NotesCardProps {
  notes?: string
  editable?: boolean
  onSave?: (value: string) => Promise<void>
}

function NotesCard({ notes, editable, onSave }: NotesCardProps) {
  const s = useStyleClasses()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(notes || '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!onSave) return
    setIsSaving(true)
    try {
      await onSave(editValue)
      setIsEditing(false)
      toast.success('备注已更新')
    } catch (error: any) {
      toast.error(error?.message || '保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={cn('border bg-card p-4 lg:col-span-2', s.rounded)}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={cn(s.text.sm, 'font-semibold')}>备注</h3>
        {editable && onSave && (
          <Popover open={isEditing} onOpenChange={(open) => {
            setIsEditing(open)
            if (open) setEditValue(notes || '')
          }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted"
                title="编辑备注"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 p-3"
              align="end"
              onFocusOutside={(e) => e.preventDefault()}
            >
              <div className="space-y-3">
                <div className="text-xs font-medium text-muted-foreground">编辑备注</div>
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="请输入备注信息"
                  className="min-h-[80px] text-xs resize-none"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(false)}
                    className="h-7 text-xs"
                    disabled={isSaving}
                  >
                    取消
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    className="h-7 text-xs"
                    disabled={isSaving}
                  >
                    {isSaving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    保存
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      <p className={cn(s.text.xs, 'text-muted-foreground whitespace-pre-wrap')}>
        {notes || '暂无备注'}
      </p>
    </div>
  )
}

interface LeadInfoDisplayProps {
  lead: Lead
  /** 是否逾期（用于高亮下次跟进时间） */
  isOverdue?: boolean
  /** 是否显示备用联系人 */
  showBackupContact?: boolean
  /** 是否精简模式（隐藏邮箱、微信号、课程兴趣等不常用字段） */
  compact?: boolean
  /** 自定义类名 */
  className?: string
  /** 字段更新回调 */
  onFieldUpdate?: (field: string, value: string) => Promise<void>
}

/**
 * 线索详情信息展示组件
 * 统一展示线索的客户信息、来源信息、跟进信息等
 */
export function LeadInfoDisplay({
  lead,
  isOverdue = false,
  showBackupContact = true,
  compact = false,
  className,
  onFieldUpdate,
}: LeadInfoDisplayProps) {
  // 创建字段保存函数
  const createSaveHandler = (field: string) => {
    if (!onFieldUpdate) return undefined
    return async (value: string) => {
      await onFieldUpdate(field, value)
    }
  }

  const editable = !!onFieldUpdate

  return (
    <div className={className}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 客户信息（儿童+家长） */}
        <InfoCard hideTitle className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 儿童信息 */}
            <InfoGrid cols={1}>
              <InfoItem
                label="儿童姓名"
                value={lead.child_name}
                rawValue={lead.child_name || ''}
                editable={editable}
                fieldType="text"
                onSave={createSaveHandler('child_name')}
              />
              <InfoItem
                label="性别"
                value={lead.child_gender === 'male' ? '男' : lead.child_gender === 'female' ? '女' : undefined}
                rawValue={lead.child_gender || ''}
                editable={editable}
                fieldType="select"
                options={genderOptions}
                onSave={createSaveHandler('child_gender')}
              />
              <InfoItem
                label="年龄"
                value={lead.age?.toString()}
                rawValue={lead.age?.toString() || ''}
                editable={editable}
                fieldType="number"
                onSave={createSaveHandler('age')}
              />
              <InfoItem
                label="生日"
                value={lead.child_birthday}
                rawValue={lead.child_birthday || ''}
                editable={editable}
                fieldType="date"
                onSave={createSaveHandler('child_birthday')}
              />
              <InfoItem
                label="年级"
                value={lead.grade ? gradeLabels[lead.grade] : undefined}
                rawValue={lead.grade || ''}
                editable={editable}
                fieldType="select"
                options={gradeOptions}
                onSave={createSaveHandler('grade')}
              />
              <InfoItem
                label="学校"
                value={lead.school_name}
                rawValue={lead.school_name || ''}
                editable={editable}
                fieldType="text"
                onSave={createSaveHandler('school_name')}
              />
              {!compact && (
                <InfoItem
                  label="课程兴趣"
                  value={lead.course_interests?.join('、')}
                  rawValue={lead.course_interests?.join('、') || ''}
                  editable={editable}
                  fieldType="text"
                  onSave={createSaveHandler('course_interests')}
                />
              )}
            </InfoGrid>
            {/* 家长信息 */}
            <InfoGrid cols={1}>
              <InfoItem
                label="家长姓名"
                value={lead.parent_name}
                rawValue={lead.parent_name || ''}
                editable={editable}
                fieldType="text"
                onSave={createSaveHandler('parent_name')}
              />
              <InfoItem
                label="关系"
                value={formatParentRelation(lead.parent_relation)}
                rawValue={lead.parent_relation || ''}
                editable={editable}
                fieldType="select"
                options={relationOptions}
                onSave={createSaveHandler('parent_relation')}
              />
              <InfoItem
                label="手机号"
                value={lead.parent_phone}
                copyable
              />
              {!compact && (
                <InfoItem
                  label="微信号"
                  value={lead.parent_wechat}
                  rawValue={lead.parent_wechat || ''}
                  copyable
                  editable={editable}
                  fieldType="text"
                  onSave={createSaveHandler('parent_wechat')}
                />
              )}
              {!compact && (
                <InfoItem
                  label="邮箱"
                  value={lead.parent_email}
                  rawValue={lead.parent_email || ''}
                  editable={editable}
                  fieldType="text"
                  onSave={createSaveHandler('parent_email')}
                />
              )}
            </InfoGrid>
          </div>
        </InfoCard>

        {/* 来源信息 */}
        <InfoCard hideTitle className="lg:col-span-2">
          <InfoGrid cols={4}>
            <InfoItem label="来源渠道" value={lead.source_channel_name} />
            <InfoItem label="来源详情" value={lead.source_detail} />
            <InfoItem label="创建人" value={lead.created_by_name} />
            <InfoItem label="创建时间" value={formatTime(lead.created_at)} />
            <InfoItem label="激活人" value={lead.activated_by_name} />
            <InfoItem label="激活时间" value={lead.activated_at ? formatTime(lead.activated_at) : undefined} />
            {/* 渠道额外字段 */}
            {lead.source_extra_info && parseSourceExtraInfo(lead.source_extra_info).map((item, index) => (
              <InfoItem
                key={index}
                label={item.label}
                value={item.value}
              />
            ))}
          </InfoGrid>
        </InfoCard>

        {/* 跟进信息 */}
        <InfoCard hideTitle className="lg:col-span-2">
          <InfoGrid cols={4}>
            <InfoItem
              label="线索状态"
              value={lead.status ? (
                <EditableLeadStatus
                  status={lead.status}
                  editable={editable}
                  onSave={createSaveHandler('status')}
                />
              ) : undefined}
            />
            <InfoItem
              label="意向等级"
              value={lead.intention_level ? (
                <EditableIntentionLevel
                  level={lead.intention_level}
                  editable={editable}
                  onSave={createSaveHandler('intention_level')}
                />
              ) : undefined}
            />
            <InfoItem label="负责顾问" value={lead.advisor_name} />
            <InfoItem label="归属校区" value={lead.owner_campus_name} />
            <InfoItem
              label="下次跟进"
              value={lead.next_followup_at ? formatTime(lead.next_followup_at) : undefined}
              rawValue={lead.next_followup_at || ''}
              highlight={isOverdue}
              editable={editable}
              fieldType="datetime"
              onSave={createSaveHandler('next_followup_at')}
            />
            <InfoItem
              label="最后跟进"
              value={lead.last_followup_at ? formatTime(lead.last_followup_at) : undefined}
            />
            <InfoItem
              label="省市区"
              value={[lead.province, lead.city, lead.district].filter(Boolean).join(' ') || undefined}
            />
            <InfoItem label="详细地址" value={lead.address_detail} />
          </InfoGrid>
        </InfoCard>

        {/* 备注 */}
        <NotesCard
          notes={lead.notes}
          editable={editable}
          onSave={createSaveHandler('notes')}
        />

        {/* 备用联系人 */}
        {showBackupContact && (lead.backup_contact_name || lead.backup_contact_phone) && (
          <InfoCard hideTitle compact className="lg:col-span-2">
            <InfoGrid cols={3}>
              <InfoItem label="备用联系人" value={lead.backup_contact_name} />
              <InfoItem label="电话" value={lead.backup_contact_phone} copyable />
              <InfoItem label="关系" value={lead.backup_contact_relation} />
            </InfoGrid>
          </InfoCard>
        )}
      </div>
    </div>
  )
}

export default LeadInfoDisplay
