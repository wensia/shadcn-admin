/**
 * 线索详情信息展示组件
 * 可复用于 LeadDetailSheet 和 ContinuousCallPage
 */

import type { Lead } from '../../types'
import { gradeLabels } from '../../types'
import { formatTime } from '@/lib/utils/time'
import { InfoCard } from './info-card'
import { InfoGrid } from './info-grid'
import { InfoItem } from './info-item'

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

interface LeadInfoDisplayProps {
  lead: Lead
  /** 是否逾期（用于高亮下次跟进时间） */
  isOverdue?: boolean
  /** 是否显示备用联系人 */
  showBackupContact?: boolean
  /** 自定义类名 */
  className?: string
}

/**
 * 线索详情信息展示组件
 * 统一展示线索的客户信息、来源信息、跟进信息等
 */
export function LeadInfoDisplay({
  lead,
  isOverdue = false,
  showBackupContact = true,
  className,
}: LeadInfoDisplayProps) {
  return (
    <div className={className}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 客户信息（儿童+家长） */}
        <InfoCard hideTitle className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 儿童信息 */}
            <InfoGrid cols={1}>
              <InfoItem label="儿童姓名" value={lead.child_name} />
              <InfoItem
                label="性别"
                value={lead.child_gender === 'male' ? '男' : lead.child_gender === 'female' ? '女' : undefined}
              />
              <InfoItem label="年龄" value={lead.age?.toString()} />
              <InfoItem label="生日" value={lead.child_birthday} />
              <InfoItem label="年级" value={lead.grade ? gradeLabels[lead.grade] : undefined} />
              <InfoItem label="学校" value={lead.school_name} />
              <InfoItem label="课程兴趣" value={lead.course_interests?.join('、')} />
            </InfoGrid>
            {/* 家长信息 */}
            <InfoGrid cols={1}>
              <InfoItem label="家长姓名" value={lead.parent_name} />
              <InfoItem label="关系" value={formatParentRelation(lead.parent_relation)} />
              <InfoItem label="手机号" value={lead.parent_phone} copyable />
              <InfoItem label="微信号" value={lead.parent_wechat} copyable />
              <InfoItem label="邮箱" value={lead.parent_email} />
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
        <InfoCard hideTitle>
          <InfoGrid>
            <InfoItem label="负责顾问" value={lead.advisor_name} />
            <InfoItem label="归属校区" value={lead.owner_campus_name} />
            <InfoItem
              label="下次跟进"
              value={lead.next_followup_at ? formatTime(lead.next_followup_at) : undefined}
              highlight={isOverdue}
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
            {lead.notes && (
              <InfoItem label="备注" value={lead.notes} span={2} />
            )}
          </InfoGrid>
        </InfoCard>

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
