/**
 * 线索详情信息展示组件 - Semi Design 版本
 */

import React, { useState } from 'react'
import { Popover, Button, Toast, Spin, Tag } from '@douyinfe/semi-ui-19'
import { Input } from '@douyinfe/semi-ui-19'
import { IconEdit, IconLoading, IconTick, IconChevronDown } from '@douyinfe/semi-icons'
import type { Lead } from '../../types'
import { gradeLabels, LeadStatus, IntentionLevel } from '../../types'
import { formatTime } from '@/lib/utils/time'
import { InfoItem } from './info-item'
import { LeadStatusBadge, IntentionLevelBadge } from '../status-badges'
import { leadStatusStyles, intentionLevelStyles } from '@/lib/status-styles'
import { showApiErrorToast } from '@/lib/api/error-toast'

const { TextArea } = Input

/** 家长关系映射 */
const parentRelationLabels: Record<string, string> = {
  father: '父亲', mother: '母亲', grandfather: '爷爷', grandmother: '奶奶',
  grandpa_maternal: '外公', grandma_maternal: '外婆', uncle: '叔叔', aunt: '阿姨', other: '其他',
}

function formatParentRelation(relation?: string): string | undefined {
  if (!relation) return undefined
  return parentRelationLabels[relation] || relation
}

const genderOptions = [{ label: '男', value: 'male' }, { label: '女', value: 'female' }]

const gradeOptions = Object.entries(gradeLabels).map(([value, label]) => ({ label, value }))

const relationOptions = Object.entries(parentRelationLabels).map(([value, label]) => ({ label, value }))

/** 解析来源渠道额外信息 */
function parseSourceExtraInfo(obj: Record<string, unknown>): Array<{ label: string; value: string }> {
  const result: Array<{ label: string; value: string }> = []
  for (const [_key, fieldData] of Object.entries(obj)) {
    if (fieldData && typeof fieldData === 'object' && !Array.isArray(fieldData) && 'label' in fieldData && 'value' in fieldData) {
      const field = fieldData as { label: string; value: unknown }
      result.push({ label: String(field.label || _key), value: formatFieldValue(field.value) })
    } else {
      result.push({ label: _key, value: formatFieldValue(fieldData) })
    }
  }
  return result
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (Array.isArray(value)) { if (value.length === 0) return '-'; return value.map(formatFieldValue).join('、') }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** 线索状态选项 */
const leadStatusOptions = Object.entries(leadStatusStyles).map(([value, config]) => ({ value: value as LeadStatus, label: config.label, color: config.color }))
const statusColorMap: Record<string, string> = { green: '#00b42a', orange: '#ff7d00', red: '#f53f3f', gray: '#86909c' }

/** 可编辑的线索状态选择器 */
function EditableLeadStatus({ status, editable, onSave }: { status: LeadStatus; editable?: boolean; onSave?: (value: string) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const selectedOption = leadStatusOptions.find(o => o.value === status)
  const selectedColor = selectedOption ? statusColorMap[selectedOption.color] || statusColorMap.gray : statusColorMap.gray

  const handleSelect = async (newStatus: LeadStatus) => {
    if (!onSave || newStatus === status) { setOpen(false); return }
    setIsSaving(true)
    try {
      await onSave(newStatus)
      setOpen(false)
      Toast.success('线索状态已更新')
    } catch (error: any) {
      showApiErrorToast(error, '更新失败')
    } finally { setIsSaving(false) }
  }

  if (!editable) return <LeadStatusBadge status={status} />

  return (
    <Popover
      visible={open}
      onVisibleChange={(visible) => { if (isSaving && !visible) return; setOpen(visible) }}
      trigger="click"
      position="bottomLeft"
      content={
        <div style={{ padding: 8, position: 'relative' }}>
          {isSaving && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
              <Spin size="small" />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {leadStatusOptions.map(option => {
              const isSelected = status === option.value
              const color = statusColorMap[option.color] || statusColorMap.gray
              return (
                <Button
                  key={option.value}
                  theme="borderless"
                  size="small"
                  style={{ justifyContent: 'flex-start', color, backgroundColor: isSelected ? color + '20' : 'transparent', fontWeight: isSelected ? 500 : 400 }}
                  onClick={() => handleSelect(option.value)}
                  disabled={isSaving}
                >
                  {isSelected && <IconTick style={{ marginRight: 4, fontSize: 12 }} />}
                  {option.label}
                </Button>
              )
            })}
          </div>
        </div>
      }
    >
      <button
        type="button"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
          borderRadius: 12, border: `1px solid ${selectedColor}`, cursor: 'pointer',
          background: selectedColor + '15', color: selectedColor, fontSize: 12,
          transition: 'opacity 0.2s',
        }}
        disabled={isSaving}
      >
        {isSaving ? <IconLoading spin style={{ fontSize: 12 }} /> : <>{selectedOption?.label || status}<IconChevronDown style={{ fontSize: 12 }} /></>}
      </button>
    </Popover>
  )
}

/** 意向等级选项 */
const intentionLevelOptions = Object.entries(intentionLevelStyles).map(([value, config]) => ({ value: value as IntentionLevel, label: config.label, color: config.color }))
const intentionColorMap: Record<string, string> = { green: '#00b42a', orange: '#ff7d00', gray: '#86909c' }

/** 可编辑的意向等级选择器 */
function EditableIntentionLevel({ level, editable, onSave }: { level: IntentionLevel; editable?: boolean; onSave?: (value: string) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const selectedOption = intentionLevelOptions.find(o => o.value === level)
  const selectedColor = selectedOption ? intentionColorMap[selectedOption.color] || intentionColorMap.gray : intentionColorMap.gray

  const handleSelect = async (newLevel: IntentionLevel) => {
    if (!onSave || newLevel === level) { setOpen(false); return }
    setIsSaving(true)
    try {
      await onSave(newLevel)
      setOpen(false)
      Toast.success('意向等级已更新')
    } catch (error: any) {
      showApiErrorToast(error, '更新失败')
    } finally { setIsSaving(false) }
  }

  if (!editable) return <IntentionLevelBadge level={level} />

  return (
    <Popover
      visible={open}
      onVisibleChange={(visible) => { if (isSaving && !visible) return; setOpen(visible) }}
      trigger="click"
      position="bottomLeft"
      content={
        <div style={{ padding: 8, position: 'relative' }}>
          {isSaving && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
              <Spin size="small" />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {intentionLevelOptions.map(option => {
              const isSelected = level === option.value
              const color = intentionColorMap[option.color] || intentionColorMap.gray
              return (
                <Button
                  key={option.value}
                  theme="borderless"
                  size="small"
                  style={{ justifyContent: 'flex-start', color, backgroundColor: isSelected ? color + '20' : 'transparent', fontWeight: isSelected ? 500 : 400 }}
                  onClick={() => handleSelect(option.value)}
                  disabled={isSaving}
                >
                  {isSelected && <IconTick style={{ marginRight: 4, fontSize: 12 }} />}
                  {option.label}
                </Button>
              )
            })}
          </div>
        </div>
      }
    >
      <button
        type="button"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
          borderRadius: 12, border: `1px solid ${selectedColor}`, cursor: 'pointer',
          background: selectedColor + '15', color: selectedColor, fontSize: 12,
        }}
        disabled={isSaving}
      >
        {isSaving ? <IconLoading spin style={{ fontSize: 12 }} /> : <>{selectedOption?.label || level}<IconChevronDown style={{ fontSize: 12 }} /></>}
      </button>
    </Popover>
  )
}

/** 内联备注组件 - 用于表格行内展示 */
function NotesInline({ notes, editable, onSave }: { notes?: string; editable?: boolean; onSave?: (value: string) => Promise<void> }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(notes || '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!onSave) return
    setIsSaving(true)
    try {
      await onSave(editValue)
      setIsEditing(false)
      Toast.success('备注已更新')
    } catch (error: any) {
      showApiErrorToast(error, '保存失败')
    } finally { setIsSaving(false) }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <p style={{ fontSize: 13, color: notes ? 'var(--semi-color-text-1)' : 'var(--semi-color-text-2)', whiteSpace: 'pre-wrap', margin: 0, flex: 1, lineHeight: 1.6 }}>
        {notes || '暂无备注'}
      </p>
      {editable && onSave && (
        <Popover
          visible={isEditing}
          onVisibleChange={(visible) => { setIsEditing(visible); if (visible) setEditValue(notes || '') }}
          trigger="click"
          position="bottomRight"
          content={
            <div style={{ padding: 12, width: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--semi-color-text-2)' }}>编辑备注</div>
              <TextArea value={editValue} onChange={(val) => setEditValue(val)} placeholder="请输入备注信息" autosize={{ minRows: 3 }} autoFocus />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button size="small" theme="light" onClick={() => setIsEditing(false)} disabled={isSaving}>取消</Button>
                <Button size="small" theme="solid" onClick={handleSave} disabled={isSaving}>
                  {isSaving && <IconLoading spin style={{ marginRight: 4 }} />}保存
                </Button>
              </div>
            </div>
          }
        >
          <button
            type="button"
            style={{ color: 'var(--semi-color-text-2)', padding: 4, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', flexShrink: 0 }}
            title="编辑备注"
          >
            <IconEdit style={{ fontSize: 14 }} />
          </button>
        </Popover>
      )}
    </div>
  )
}

/** 区域标题行样式 */
const sectionHeaderStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--semi-color-text-0)',
  background: 'var(--semi-color-fill-0)',
  borderBottom: '1px solid var(--semi-color-border)',
}

/** 数据行背景（配合单元格边框，不需要交替色） */
const getRowBg = (_index: number): string => 'transparent'

interface LeadInfoDisplayProps {
  lead: Lead
  isOverdue?: boolean
  showBackupContact?: boolean
  compact?: boolean
  className?: string
  onFieldUpdate?: (field: string, value: string) => Promise<void>
}

export function LeadInfoDisplay({ lead, isOverdue = false, showBackupContact = true, compact = false, className, onFieldUpdate }: LeadInfoDisplayProps) {
  const createSaveHandler = (field: string) => {
    if (!onFieldUpdate) return undefined
    return async (value: string) => { await onFieldUpdate(field, value) }
  }

  const editable = !!onFieldUpdate

  // 来源额外字段
  const sourceExtraItems = lead.source_extra_info ? parseSourceExtraInfo(lead.source_extra_info) : []

  return (
    <div className={className}>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', border: '1px solid var(--semi-color-border)', borderRadius: 6, overflow: 'hidden' }}>
        <tbody>
          {/* ===== 客户信息 ===== */}
          <tr><td colSpan={8} style={sectionHeaderStyle}>客户信息</td></tr>
          <tr style={{ backgroundColor: getRowBg(0) }}>
            <InfoItem label="儿童姓名" value={lead.child_name} rawValue={lead.child_name || ''} editable={editable} fieldType="text" maxLength={10} onSave={createSaveHandler('child_name')} />
            <InfoItem label="性别" value={lead.child_gender === 'male' ? '男' : lead.child_gender === 'female' ? '女' : undefined} rawValue={lead.child_gender || ''} editable={editable} fieldType="select" options={genderOptions} onSave={createSaveHandler('child_gender')} />
            <InfoItem label="年龄" value={lead.age?.toString()} rawValue={lead.age?.toString() || ''} editable={editable} fieldType="number" onSave={createSaveHandler('age')} />
            <InfoItem label="生日" value={lead.child_birthday} rawValue={lead.child_birthday || ''} editable={editable} fieldType="date" onSave={createSaveHandler('child_birthday')} />
          </tr>
          <tr style={{ backgroundColor: getRowBg(1) }}>
            <InfoItem label="年级" value={lead.grade ? gradeLabels[lead.grade] : undefined} rawValue={lead.grade || ''} editable={editable} fieldType="select" options={gradeOptions} onSave={createSaveHandler('grade')} />
            <InfoItem label="学校" value={lead.school_name} rawValue={lead.school_name || ''} editable={editable} fieldType="async-select" asyncSelectConfig={{ apiEndpoint: '/admin/schools', searchParam: 'search', labelKey: 'name', valueKey: 'name', creatable: true, createFieldName: 'name' }} onSave={createSaveHandler('school_name')} />
            {!compact && <InfoItem label="课程兴趣" value={lead.course_interests?.join('、')} rawValue={lead.course_interests?.join('、') || ''} editable={editable} fieldType="text" onSave={createSaveHandler('course_interests')} />}
            {compact && <><td /><td /></>}
            <td /><td />
          </tr>
          <tr style={{ backgroundColor: getRowBg(2) }}>
            <InfoItem label="家长姓名" value={lead.parent_name} rawValue={lead.parent_name || ''} editable={editable} fieldType="text" onSave={createSaveHandler('parent_name')} />
            <InfoItem label="关系" value={formatParentRelation(lead.parent_relation)} rawValue={lead.parent_relation || ''} editable={editable} fieldType="select" options={relationOptions} onSave={createSaveHandler('parent_relation')} />
            <InfoItem label="手机号" value={lead.parent_phone} copyable />
            {!compact
              ? <InfoItem label="微信号" value={lead.parent_wechat} rawValue={lead.parent_wechat || ''} copyable editable={editable} fieldType="text" onSave={createSaveHandler('parent_wechat')} />
              : <><td /><td /></>
            }
          </tr>
          {!compact && (
            <tr style={{ backgroundColor: getRowBg(3) }}>
              <InfoItem label="邮箱" value={lead.parent_email} rawValue={lead.parent_email || ''} editable={editable} fieldType="text" onSave={createSaveHandler('parent_email')} />
              <td /><td /><td /><td /><td /><td />
            </tr>
          )}

          {/* ===== 来源信息 ===== */}
          <tr><td colSpan={8} style={sectionHeaderStyle}>来源信息</td></tr>
          <tr style={{ backgroundColor: getRowBg(0) }}>
            <InfoItem label="来源渠道" value={lead.source_channel_name} />
            <InfoItem label="来源详情" value={lead.source_detail} />
            <InfoItem label="创建人" value={lead.created_by_name} />
            <InfoItem label="创建时间" value={formatTime(lead.created_at)} />
          </tr>
          <tr style={{ backgroundColor: getRowBg(1) }}>
            <InfoItem label="激活人" value={lead.activated_by_name} />
            <InfoItem label="激活时间" value={lead.activated_at ? formatTime(lead.activated_at) : undefined} />
            {sourceExtraItems.length >= 1
              ? <InfoItem label={sourceExtraItems[0].label} value={sourceExtraItems[0].value} />
              : <><td /><td /></>
            }
            {sourceExtraItems.length >= 2
              ? <InfoItem label={sourceExtraItems[1].label} value={sourceExtraItems[1].value} />
              : <><td /><td /></>
            }
          </tr>
          {/* 额外来源字段（每行4个，从第3个开始） */}
          {sourceExtraItems.length > 2 && (() => {
            const remaining = sourceExtraItems.slice(2)
            const rows: Array<typeof remaining> = []
            for (let i = 0; i < remaining.length; i += 4) rows.push(remaining.slice(i, i + 4))
            return rows.map((row, ri) => (
              <tr key={`extra-${ri}`} style={{ backgroundColor: getRowBg(ri + 2) }}>
                {row.map((item, ci) => <InfoItem key={ci} label={item.label} value={item.value} />)}
                {row.length < 4 && Array.from({ length: 4 - row.length }).map((_, i) => <React.Fragment key={`pad-${i}`}><td /><td /></React.Fragment>)}
              </tr>
            ))
          })()}

          {/* ===== 跟进信息 ===== */}
          <tr><td colSpan={8} style={sectionHeaderStyle}>跟进信息</td></tr>
          <tr style={{ backgroundColor: getRowBg(0) }}>
            <InfoItem label="线索状态" value={lead.status ? <EditableLeadStatus status={lead.status} editable={editable} onSave={createSaveHandler('status')} /> : undefined} />
            <InfoItem label="意向等级" value={lead.intention_level ? <EditableIntentionLevel level={lead.intention_level} editable={editable} onSave={createSaveHandler('intention_level')} /> : undefined} />
            <InfoItem
              label="负责顾问"
              value={lead.advisor_name ? lead.advisor_name : lead.is_in_pool ? (
                <Tag size="small" style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>公海</Tag>
              ) : (
                <span style={{ color: 'var(--semi-color-text-2)' }}>待分配</span>
              )}
            />
            <InfoItem
              label="归属校区"
              value={lead.is_in_pool && lead.owner_campus_name ? (
                <Tag size="small" style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>{lead.owner_campus_name} 公海</Tag>
              ) : lead.owner_campus_name}
            />
          </tr>
          <tr style={{ backgroundColor: getRowBg(1) }}>
            <InfoItem label="下次跟进" value={lead.next_followup_at ? formatTime(lead.next_followup_at) : undefined} rawValue={lead.next_followup_at || ''} highlight={isOverdue} editable={editable} fieldType="datetime" onSave={createSaveHandler('next_followup_at')} />
            <InfoItem label="最后跟进" value={lead.last_followup_at ? formatTime(lead.last_followup_at) : undefined} />
            <InfoItem label="省市区" value={[lead.province, lead.city, lead.district].filter(Boolean).join(' ') || undefined} />
            <InfoItem label="详细地址" value={lead.address_detail} />
          </tr>

          {/* ===== 备注 ===== */}
          <tr><td colSpan={8} style={sectionHeaderStyle}>备注</td></tr>
          <tr>
            <td colSpan={8} style={{ padding: '8px 12px' }}>
              <NotesInline notes={lead.notes} editable={editable} onSave={createSaveHandler('notes')} />
            </td>
          </tr>

          {/* ===== 备用联系人 ===== */}
          {showBackupContact && (lead.backup_contact_name || lead.backup_contact_phone) && (
            <>
              <tr><td colSpan={8} style={sectionHeaderStyle}>备用联系人</td></tr>
              <tr style={{ backgroundColor: getRowBg(0) }}>
                <InfoItem label="姓名" value={lead.backup_contact_name} />
                <InfoItem label="电话" value={lead.backup_contact_phone} copyable />
                <InfoItem label="关系" value={lead.backup_contact_relation} />
                <td /><td />
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default LeadInfoDisplay
