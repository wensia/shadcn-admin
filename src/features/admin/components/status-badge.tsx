/**
 * Admin 状态标签组件 - Semi Design 版本
 * 使用 Semi Tag + 自定义色值
 */

import { Tag } from '@douyinfe/semi-ui-19'
import { Check, X, CircleDot } from 'lucide-react'
import type { CSSProperties } from 'react'

interface StatusBadgeProps {
  isActive: boolean
  className?: string
  showIcon?: boolean
}

// 启用/停用状态标签
export function StatusBadge({ isActive, showIcon = true }: StatusBadgeProps) {
  return (
    <Tag
      size="small"
      shape="circle"
      style={
        isActive
          ? { backgroundColor: 'rgba(120,140,93,0.1)', color: '#788c5d', borderColor: 'rgba(120,140,93,0.3)' }
          : { backgroundColor: 'rgba(176,174,165,0.1)', color: '#b0aea5', borderColor: 'rgba(176,174,165,0.3)' }
      }
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500 }}>
        {showIcon && (isActive ? <CircleDot size={12} /> : <X size={12} />)}
        {isActive ? '启用' : '停用'}
      </span>
    </Tag>
  )
}

// 员工状态标签 - 在职/离职
export function EmployeeStatusBadge({ isActive, showIcon = true }: StatusBadgeProps) {
  return (
    <Tag
      size="small"
      shape="circle"
      style={
        isActive
          ? { backgroundColor: 'rgba(120,140,93,0.1)', color: '#788c5d', borderColor: 'rgba(120,140,93,0.3)' }
          : { backgroundColor: 'rgba(249,115,22,0.1)', color: '#f97316', borderColor: 'rgba(249,115,22,0.3)' }
      }
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500 }}>
        {showIcon && (isActive ? <Check size={12} /> : <X size={12} />)}
        {isActive ? '在职' : '离职'}
      </span>
    </Tag>
  )
}

// 来源渠道分类标签
const categoryStyles: Record<string, { style: CSSProperties; label: string }> = {
  ONLINE: { style: { backgroundColor: 'rgba(106,155,204,0.1)', color: '#6a9bcc', borderColor: 'rgba(106,155,204,0.3)' }, label: '线上渠道' },
  OFFLINE: { style: { backgroundColor: 'rgba(249,115,22,0.1)', color: '#f97316', borderColor: 'rgba(249,115,22,0.3)' }, label: '线下渠道' },
  REFERRAL: { style: { backgroundColor: 'rgba(120,140,93,0.1)', color: '#788c5d', borderColor: 'rgba(120,140,93,0.3)' }, label: '推荐渠道' },
  EVENT: { style: { backgroundColor: 'rgba(249,115,22,0.1)', color: '#f97316', borderColor: 'rgba(249,115,22,0.3)' }, label: '活动渠道' },
  OTHER: { style: { backgroundColor: 'rgba(176,174,165,0.1)', color: '#b0aea5', borderColor: 'rgba(176,174,165,0.3)' }, label: '其他渠道' },
}

export function SourceChannelCategoryBadge({ category }: { category: string }) {
  const config = categoryStyles[category] || categoryStyles.OTHER
  return (
    <Tag size="small" shape="circle" style={{ ...config.style, fontSize: 12, fontWeight: 500 }}>
      {config.label}
    </Tag>
  )
}

// 职级排序权重标签
export function PositionLevelBadge({ level }: { level: number }) {
  const style: CSSProperties = level >= 4
    ? { backgroundColor: 'rgba(249,115,22,0.1)', color: '#f97316', borderColor: 'rgba(249,115,22,0.3)' }
    : { backgroundColor: 'rgba(176,174,165,0.1)', color: '#b0aea5', borderColor: 'rgba(176,174,165,0.3)' }
  return (
    <Tag size="small" shape="circle" style={{ ...style, fontSize: 12, fontWeight: 500 }}>
      L{level}
    </Tag>
  )
}

// 超级管理员标签
export function SuperuserBadge({ isSuperuser }: { isSuperuser: boolean }) {
  if (!isSuperuser) return null
  return (
    <Tag
      size="small"
      shape="circle"
      style={{ backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fca5a5', fontSize: 12, fontWeight: 500 }}
    >
      超级管理员
    </Tag>
  )
}

// 职位名称标签
const positionKeywordVariants: Array<{ keywords: string[]; style: CSSProperties }> = [
  { keywords: ['总裁', '副总裁', '总经理', 'CEO', 'COO', 'CFO'], style: { backgroundColor: 'rgba(20,20,19,0.1)', color: '#141413', borderColor: 'rgba(20,20,19,0.3)' } },
  { keywords: ['总监', '副总监'], style: { backgroundColor: 'rgba(249,115,22,0.1)', color: '#f97316', borderColor: 'rgba(249,115,22,0.3)' } },
  { keywords: ['经理', '副经理'], style: { backgroundColor: 'rgba(106,155,204,0.1)', color: '#6a9bcc', borderColor: 'rgba(106,155,204,0.3)' } },
  { keywords: ['主管', '组长'], style: { backgroundColor: 'rgba(120,140,93,0.1)', color: '#788c5d', borderColor: 'rgba(120,140,93,0.3)' } },
  { keywords: ['专员', '助理', '顾问'], style: { backgroundColor: 'rgba(232,230,220,0.5)', color: '#141413', borderColor: 'rgba(176,174,165,0.3)' } },
]

function getPositionStyle(name: string): CSSProperties {
  for (const { keywords, style } of positionKeywordVariants) {
    for (const kw of keywords) {
      if (name.includes(kw)) return style
    }
  }
  return { backgroundColor: 'rgba(232,230,220,0.5)', color: '#141413', borderColor: 'rgba(176,174,165,0.3)' }
}

export function PositionNameBadge({ positionName }: { positionName: string }) {
  return (
    <Tag size="small" shape="circle" style={{ ...getPositionStyle(positionName), fontSize: 12, fontWeight: 500 }}>
      {positionName}
    </Tag>
  )
}
