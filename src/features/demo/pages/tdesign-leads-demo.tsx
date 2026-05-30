/**
 * TDesign 线索列表 Demo
 * 使用腾讯 TDesign 设计系统的配色和样式
 * 纯 React + Tailwind + inline styles，不依赖 tdesign-react
 */

import { useState, useMemo } from 'react'
import { TextArea } from '@douyinfe/semi-ui-19'
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Eye,
  Filter,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// TDesign Design Tokens
// ============================================================================

const td = {
  // Brand
  brand1: '#F2F3FF',
  brand2: '#D9E1FF',
  brand3: '#B5C7FF',
  brand5: '#618DFF',
  brand6: '#366EF4',
  brand7: '#0052D9',
  brand8: '#003CAB',
  // Error
  error1: '#FFF0ED',
  error6: '#D54941',
  error7: '#AD352F',
  // Warning
  warning1: '#FFF1E9',
  warning5: '#E37318',
  // Success
  success1: '#E3F9E9',
  success5: '#2BA471',
  // Gray
  gray1: '#F3F3F3',
  gray2: '#EEEEEE',
  gray3: '#E7E7E7',
  gray4: '#DCDCDC',
  gray5: '#C5C5C5',
  gray6: '#A6A6A6',
  gray8: '#5A5A5A', // intentionally skipped 7 per TDesign
  gray9: '#4B4B4B',
  gray13: '#212121',
  gray14: '#181818',
  // Text
  textPrimary: 'rgba(0,0,0,0.9)',
  textSecondary: 'rgba(0,0,0,0.6)',
  textPlaceholder: 'rgba(0,0,0,0.4)',
  textDisabled: 'rgba(0,0,0,0.26)',
  textAnti: '#FFFFFF',
  // Background
  bgPage: '#F3F3F3',
  bgContainer: '#FFFFFF',
  bgHover: '#F3F3F3',
  bgActive: '#E7E7E7',
  // Border
  border: '#DCDCDC',
  borderLight: '#E7E7E7',
  // Shadow
  shadow1: '0 1px 10px rgba(0,0,0,0.05), 0 4px 5px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.12)',
  shadow2: '0 3px 14px 2px rgba(0,0,0,0.05), 0 8px 10px 1px rgba(0,0,0,0.06), 0 5px 5px -3px rgba(0,0,0,0.10)',
  shadow3: '0 6px 30px 5px rgba(0,0,0,0.05), 0 16px 24px 2px rgba(0,0,0,0.04), 0 8px 10px -5px rgba(0,0,0,0.08)',
  // Radius
  radiusSm: '2px',
  radiusDefault: '3px',
  radiusMd: '6px',
  radiusLg: '9px',
  radiusXl: '12px',
  // Font
  fontFamily: "'PingFang SC', 'Microsoft YaHei', Arial, sans-serif",
  fontSize: { xs: '12px', sm: '14px', md: '16px', lg: '18px', xl: '20px' },
} as const

// ============================================================================
// TDesign 基础组件
// ============================================================================

function TdButton({
  children,
  variant = 'primary',
  size = 'default',
  icon,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'dashed' | 'text' | 'danger'
  size?: 'small' | 'default' | 'large'
  icon?: React.ReactNode
}) {
  const heights = { small: '28px', default: '32px', large: '36px' }
  const paddings = { small: '0 8px', default: '0 16px', large: '0 20px' }
  const fontSizes = { small: td.fontSize.xs, default: td.fontSize.sm, large: td.fontSize.sm }
  const styles: Record<string, React.CSSProperties> = {
    primary: { backgroundColor: td.brand7, color: td.textAnti, border: 'none' },
    outline: { backgroundColor: 'transparent', color: td.textPrimary, border: `1px solid ${td.border}` },
    dashed: { backgroundColor: 'transparent', color: td.textPrimary, border: `1px dashed ${td.border}` },
    text: { backgroundColor: 'transparent', color: td.brand7, border: 'none' },
    danger: { backgroundColor: td.error6, color: td.textAnti, border: 'none' },
  }
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 whitespace-nowrap',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'hover:opacity-85 active:opacity-70',
        className
      )}
      style={{
        height: heights[size],
        padding: paddings[size],
        fontSize: fontSizes[size],
        borderRadius: td.radiusDefault,
        fontFamily: td.fontFamily,
        fontWeight: 400,
        ...styles[variant],
      }}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}

function TdInput({
  className,
  prefix,
  suffix,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> & {
  prefix?: React.ReactNode
  suffix?: React.ReactNode
}) {
  return (
    <div
      className={cn('inline-flex items-center w-full', className)}
      style={{
        height: '32px',
        border: `1px solid ${td.border}`,
        borderRadius: td.radiusDefault,
        backgroundColor: td.bgContainer,
        transition: 'border-color 0.2s',
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = td.brand7
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = td.border
      }}
    >
      {prefix && <span className="pl-2 flex items-center" style={{ color: td.textPlaceholder }}>{prefix}</span>}
      <input
        className="flex-1 h-full px-2 text-sm bg-transparent outline-none min-w-0"
        style={{ fontFamily: td.fontFamily, color: td.textPrimary, fontSize: td.fontSize.sm }}
        {...props}
      />
      {suffix && <span className="pr-2 flex items-center" style={{ color: td.textPlaceholder }}>{suffix}</span>}
    </div>
  )
}

function TdSelect({
  children,
  placeholder,
  className,
  value,
  onChange,
}: {
  children: React.ReactNode
  placeholder?: string
  className?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
}) {
  return (
    <div className={cn('relative inline-flex items-center', className)}>
      <select
        className="w-full h-8 pl-2 pr-7 text-sm bg-transparent outline-none cursor-pointer appearance-none"
        style={{
          fontFamily: td.fontFamily,
          color: td.textPrimary,
          border: `1px solid ${td.border}`,
          borderRadius: td.radiusDefault,
          fontSize: td.fontSize.sm,
        }}
        value={value}
        onChange={onChange}
        defaultValue={!value ? '' : undefined}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {children}
      </select>
      <ChevronDown
        className="absolute right-2 pointer-events-none"
        style={{ color: td.textPlaceholder, width: '14px', height: '14px' }}
      />
    </div>
  )
}

// TDesign Tag component
function TdTag({
  children,
  variant = 'default',
  theme = 'default',
  className,
}: {
  children: React.ReactNode
  variant?: 'default' | 'light' | 'outline'
  theme?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  className?: string
}) {
  const themeColors = {
    default: { bg: td.gray1, color: td.textSecondary, border: td.border, lightBg: td.gray1 },
    primary: { bg: td.brand7, color: td.textAnti, border: td.brand7, lightBg: td.brand1 },
    success: { bg: td.success5, color: td.textAnti, border: td.success5, lightBg: td.success1 },
    warning: { bg: td.warning5, color: td.textAnti, border: td.warning5, lightBg: td.warning1 },
    danger: { bg: td.error6, color: td.textAnti, border: td.error6, lightBg: td.error1 },
  }
  const c = themeColors[theme]
  const styleMap: Record<string, React.CSSProperties> = {
    default: { backgroundColor: c.bg, color: c.color, border: `1px solid transparent` },
    light: {
      backgroundColor: c.lightBg,
      color: theme === 'default' ? td.textSecondary : (theme === 'primary' ? td.brand7 : theme === 'success' ? td.success5 : theme === 'warning' ? td.warning5 : td.error6),
      border: `1px solid transparent`,
    },
    outline: { backgroundColor: 'transparent', color: c.color === td.textAnti ? c.bg : c.color, border: `1px solid ${c.border}` },
  }
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0 whitespace-nowrap', className)}
      style={{
        height: '22px',
        fontSize: td.fontSize.xs,
        lineHeight: '20px',
        borderRadius: td.radiusDefault,
        fontFamily: td.fontFamily,
        ...styleMap[variant],
      }}
    >
      {children}
    </span>
  )
}

// TDesign Checkbox
function TdCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked?: boolean
  indeterminate?: boolean
  onChange?: (checked: boolean) => void
}) {
  return (
    <div
      className="flex items-center justify-center w-4 h-4 rounded-sm cursor-pointer transition-all"
      style={{
        border: checked || indeterminate ? 'none' : `1px solid ${td.gray5}`,
        backgroundColor: checked || indeterminate ? td.brand7 : 'transparent',
      }}
      onClick={() => onChange?.(!checked)}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {indeterminate && !checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 6H9" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </div>
  )
}

// TDesign Dialog
function TdDialog({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = '480px',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ fontFamily: td.fontFamily }}>
      <div
        className="absolute inset-0 animate-in fade-in-0 duration-200"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />
      <div
        className="relative z-10 flex flex-col w-[calc(100%-2rem)] animate-in fade-in-0 zoom-in-95 duration-200"
        style={{
          maxWidth,
          maxHeight: '85vh',
          backgroundColor: td.bgContainer,
          borderRadius: td.radiusXl,
          boxShadow: td.shadow3,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h3 className="text-base font-semibold" style={{ color: td.textPrimary, fontSize: td.fontSize.md }}>{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors cursor-pointer"
            style={{ color: td.textPlaceholder }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = td.bgHover }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div className="px-6 pb-6 pt-2 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// TDesign Popup (简化的下拉菜单)
function TdDropdown({
  trigger,
  items,
}: {
  trigger: React.ReactNode
  items: { label: string; icon?: React.ReactNode; danger?: boolean; onClick: () => void }[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative inline-flex">
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1 z-50 py-1 min-w-[120px] animate-in fade-in-0 zoom-in-95 duration-150"
            style={{
              backgroundColor: td.bgContainer,
              borderRadius: td.radiusMd,
              boxShadow: td.shadow2,
              border: `1px solid ${td.borderLight}`,
            }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors cursor-pointer"
                style={{
                  color: item.danger ? td.error6 : td.textPrimary,
                  fontFamily: td.fontFamily,
                  fontSize: td.fontSize.sm,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = td.bgHover }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                onClick={() => { item.onClick(); setOpen(false) }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// Mock Data
// ============================================================================

type MockLead = {
  id: string
  childName: string
  parentPhone: string
  parentName: string
  age: number
  grade: string
  source: string
  status: string
  intentionLevel: string
  advisorName: string
  campus: string
  createdAt: string
}

const STATUS_MAP: Record<string, { label: string; theme: 'default' | 'primary' | 'success' | 'warning' | 'danger' }> = {
  new: { label: '新线索', theme: 'primary' },
  contacted: { label: '已联系', theme: 'primary' },
  interested: { label: '有意向', theme: 'warning' },
  following_up: { label: '跟进中', theme: 'warning' },
  in_trial: { label: '试听中', theme: 'success' },
  converted: { label: '已转化', theme: 'success' },
  invalid: { label: '无效', theme: 'default' },
  lost: { label: '已流失', theme: 'danger' },
}

const INTENTION_MAP: Record<string, { label: string; theme: 'default' | 'primary' | 'success' | 'warning' | 'danger' }> = {
  high: { label: '高意向', theme: 'danger' },
  medium: { label: '中等', theme: 'warning' },
  low: { label: '低意向', theme: 'default' },
}

const MOCK_LEADS: MockLead[] = [
  { id: '1', childName: '张小明', parentPhone: '138****1001', parentName: '张强', age: 6, grade: '一年级', source: '小红书', status: 'new', intentionLevel: 'high', advisorName: '李老师', campus: '总部校区', createdAt: '2026-02-25' },
  { id: '2', childName: '王思琪', parentPhone: '139****2002', parentName: '王丽', age: 8, grade: '三年级', source: '抖音', status: 'contacted', intentionLevel: 'medium', advisorName: '张老师', campus: '东区校区', createdAt: '2026-02-24' },
  { id: '3', childName: '李浩然', parentPhone: '137****3003', parentName: '李华', age: 5, grade: '学前', source: '老带新', status: 'following_up', intentionLevel: 'high', advisorName: '李老师', campus: '总部校区', createdAt: '2026-02-23' },
  { id: '4', childName: '刘欣怡', parentPhone: '136****4004', parentName: '刘洋', age: 7, grade: '二年级', source: '地推', status: 'in_trial', intentionLevel: 'high', advisorName: '王老师', campus: '西区校区', createdAt: '2026-02-22' },
  { id: '5', childName: '陈子轩', parentPhone: '135****5005', parentName: '陈明', age: 9, grade: '四年级', source: '小红书', status: 'interested', intentionLevel: 'medium', advisorName: '张老师', campus: '东区校区', createdAt: '2026-02-21' },
  { id: '6', childName: '赵雨晴', parentPhone: '133****6006', parentName: '赵芳', age: 4, grade: '学前', source: '微信公众号', status: 'new', intentionLevel: 'low', advisorName: '李老师', campus: '总部校区', createdAt: '2026-02-20' },
  { id: '7', childName: '孙一诺', parentPhone: '131****7007', parentName: '孙伟', age: 10, grade: '五年级', source: '抖音', status: 'converted', intentionLevel: 'high', advisorName: '王老师', campus: '西区校区', createdAt: '2026-02-19' },
  { id: '8', childName: '周子墨', parentPhone: '130****8008', parentName: '周琳', age: 6, grade: '一年级', source: '老带新', status: 'lost', intentionLevel: 'low', advisorName: '张老师', campus: '东区校区', createdAt: '2026-02-18' },
  { id: '9', childName: '吴悦彤', parentPhone: '158****9009', parentName: '吴刚', age: 7, grade: '二年级', source: '地推', status: 'following_up', intentionLevel: 'medium', advisorName: '李老师', campus: '总部校区', createdAt: '2026-02-17' },
  { id: '10', childName: '郑博文', parentPhone: '159****0010', parentName: '郑晓', age: 8, grade: '三年级', source: '小红书', status: 'invalid', intentionLevel: 'low', advisorName: '王老师', campus: '西区校区', createdAt: '2026-02-16' },
]

// ============================================================================
// 子组件
// ============================================================================

// 创建线索对话框
function CreateLeadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <TdDialog
      open={open}
      onClose={onClose}
      title="新建线索"
      maxWidth="600px"
      footer={
        <>
          <TdButton variant="outline" onClick={onClose}>取消</TdButton>
          <TdButton onClick={onClose}>确认</TdButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: td.textPrimary, fontFamily: td.fontFamily }}>
              儿童姓名 <span style={{ color: td.error6 }}>*</span>
            </label>
            <TdInput placeholder="请输入儿童姓名" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: td.textPrimary, fontFamily: td.fontFamily }}>性别</label>
            <TdSelect placeholder="请选择" className="w-full">
              <option value="male">男</option>
              <option value="female">女</option>
            </TdSelect>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: td.textPrimary, fontFamily: td.fontFamily }}>年龄</label>
            <TdInput type="number" placeholder="请输入年龄" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: td.textPrimary, fontFamily: td.fontFamily }}>年级</label>
            <TdSelect placeholder="请选择年级" className="w-full">
              <option value="pre">学前</option>
              <option value="g1">一年级</option>
              <option value="g2">二年级</option>
              <option value="g3">三年级</option>
              <option value="g4">四年级</option>
              <option value="g5">五年级</option>
            </TdSelect>
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: td.borderLight }} />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: td.textPrimary, fontFamily: td.fontFamily }}>
              家长姓名
            </label>
            <TdInput placeholder="请输入家长姓名" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: td.textPrimary, fontFamily: td.fontFamily }}>
              手机号 <span style={{ color: td.error6 }}>*</span>
            </label>
            <TdInput placeholder="请输入11位手机号" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: td.textPrimary, fontFamily: td.fontFamily }}>来源渠道 <span style={{ color: td.error6 }}>*</span></label>
            <TdSelect placeholder="请选择来源" className="w-full">
              <option value="xhs">小红书</option>
              <option value="dy">抖音</option>
              <option value="ref">老带新</option>
              <option value="push">地推</option>
              <option value="wx">微信公众号</option>
            </TdSelect>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: td.textPrimary, fontFamily: td.fontFamily }}>归属校区 <span style={{ color: td.error6 }}>*</span></label>
            <TdSelect placeholder="请选择校区" className="w-full">
              <option value="hq">总部校区</option>
              <option value="east">东区校区</option>
              <option value="west">西区校区</option>
            </TdSelect>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm" style={{ color: td.textPrimary, fontFamily: td.fontFamily }}>备注</label>
          <TextArea
            placeholder="请输入备注信息"
            autosize={{ minRows: 3, maxRows: 6 }}
          />
        </div>
      </div>
    </TdDialog>
  )
}

// 删除确认对话框
function DeleteConfirmDialog({
  open,
  onClose,
  count,
}: {
  open: boolean
  onClose: () => void
  count: number
}) {
  return (
    <TdDialog
      open={open}
      onClose={onClose}
      title="确认删除"
      maxWidth="420px"
      footer={
        <>
          <TdButton variant="outline" onClick={onClose}>取消</TdButton>
          <TdButton variant="danger" onClick={onClose}>删除</TdButton>
        </>
      }
    >
      <div className="flex gap-3">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
          style={{ backgroundColor: td.error1 }}
        >
          <AlertTriangle className="h-5 w-5" style={{ color: td.error6 }} />
        </div>
        <div>
          <p className="text-sm" style={{ color: td.textPrimary, fontFamily: td.fontFamily }}>
            即将删除 <strong>{count}</strong> 条线索，删除后将无法恢复。
          </p>
          <p className="text-sm mt-2" style={{ color: td.textSecondary, fontFamily: td.fontFamily }}>
            确定要继续吗？
          </p>
        </div>
      </div>
    </TdDialog>
  )
}

// 详情抽屉
function DetailDrawer({
  open,
  onClose,
  lead,
}: {
  open: boolean
  onClose: () => void
  lead: MockLead | null
}) {
  if (!open || !lead) return null
  const s = STATUS_MAP[lead.status]
  const intention = INTENTION_MAP[lead.intentionLevel]
  return (
    <div className="fixed inset-0 z-50 flex" style={{ fontFamily: td.fontFamily }}>
      <div
        className="flex-1 animate-in fade-in-0 duration-200"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />
      <div
        className="w-[520px] h-full flex flex-col animate-in slide-in-from-right duration-300"
        style={{ backgroundColor: td.bgContainer, boxShadow: td.shadow3 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${td.borderLight}` }}>
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold" style={{ color: td.textPrimary }}>{lead.childName}</h3>
            <TdTag variant="light" theme={s.theme}>{s.label}</TdTag>
            <TdTag variant="light" theme={intention.theme}>{intention.label}</TdTag>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded cursor-pointer transition-colors"
            style={{ color: td.textPlaceholder }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = td.bgHover }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* 基本信息 */}
          <div>
            <h4 className="text-sm font-semibold mb-3" style={{ color: td.textPrimary }}>基本信息</h4>
            <div className="grid grid-cols-2 gap-y-3 gap-x-6">
              {[
                ['家长姓名', lead.parentName],
                ['手机号', lead.parentPhone],
                ['年龄', `${lead.age}岁`],
                ['年级', lead.grade],
                ['来源渠道', lead.source],
                ['创建时间', lead.createdAt],
              ].map(([label, value]) => (
                <div key={label as string} className="flex flex-col gap-0.5">
                  <span className="text-xs" style={{ color: td.textPlaceholder }}>{label}</span>
                  <span className="text-sm" style={{ color: td.textPrimary }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
          {/* 归属信息 */}
          <div>
            <h4 className="text-sm font-semibold mb-3" style={{ color: td.textPrimary }}>归属信息</h4>
            <div className="grid grid-cols-2 gap-y-3 gap-x-6">
              {[
                ['课程顾问', lead.advisorName],
                ['所属校区', lead.campus],
              ].map(([label, value]) => (
                <div key={label as string} className="flex flex-col gap-0.5">
                  <span className="text-xs" style={{ color: td.textPlaceholder }}>{label}</span>
                  <span className="text-sm" style={{ color: td.textPrimary }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
          {/* 操作区 */}
          <div className="flex gap-2">
            <TdButton variant="outline" icon={<Phone className="h-3.5 w-3.5" />}>外呼</TdButton>
            <TdButton variant="outline" icon={<Pencil className="h-3.5 w-3.5" />}>编辑</TdButton>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// 主页面
// ============================================================================

export default function TDesignLeadsDemo() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLead, setDetailLead] = useState<MockLead | null>(null)

  // 筛选数据
  const filteredLeads = useMemo(() => {
    return MOCK_LEADS.filter((lead) => {
      if (search && !lead.childName.includes(search) && !lead.parentPhone.includes(search) && !lead.parentName.includes(search)) {
        return false
      }
      if (statusFilter && lead.status !== statusFilter) return false
      return true
    })
  }, [search, statusFilter])

  const total = filteredLeads.length
  const totalPages = Math.ceil(total / pageSize)
  const displayLeads = filteredLeads.slice((page - 1) * pageSize, page * pageSize)

  const allSelected = displayLeads.length > 0 && displayLeads.every((l) => selectedIds.has(l.id))
  const someSelected = displayLeads.some((l) => selectedIds.has(l.id)) && !allSelected

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(displayLeads.map((l) => l.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: td.fontFamily, backgroundColor: td.bgPage }}>
      {/* 页面头部 */}
      <div className="px-6 pt-5 pb-4" style={{ backgroundColor: td.bgContainer }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs" style={{ color: td.textPlaceholder }}>CRM</span>
          <span className="text-xs" style={{ color: td.textDisabled }}>/</span>
          <span className="text-xs" style={{ color: td.textPrimary }}>线索管理</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold" style={{ color: td.textPrimary }}>线索管理</h1>
          <div className="flex items-center gap-2">
            <TdButton variant="outline" size="small" icon={<Upload className="h-3.5 w-3.5" />}>导入</TdButton>
            <TdButton variant="outline" size="small" icon={<Download className="h-3.5 w-3.5" />}>导出</TdButton>
            <TdButton size="small" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreateOpen(true)}>新建线索</TdButton>
          </div>
        </div>
      </div>

      {/* 工具栏 */}
      <div
        className="px-6 py-3 flex flex-wrap items-center gap-3"
        style={{ backgroundColor: td.bgContainer, borderBottom: `1px solid ${td.borderLight}` }}
      >
        <TdInput
          placeholder="搜索姓名 / 手机号"
          className="w-[240px]"
          prefix={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        />
        <TdSelect
          placeholder="线索状态"
          className="w-[140px]"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
        >
          <option value="">全部状态</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </TdSelect>
        <TdButton variant="outline" size="small" icon={<Filter className="h-3.5 w-3.5" />}>高级筛选</TdButton>
        <TdButton variant="text" size="small" icon={<RefreshCw className="h-3.5 w-3.5" />} title="刷新" aria-label="刷新" />

        {/* 批量操作 */}
        {selectedIds.size > 0 && (
          <div
            className="flex items-center gap-2 ml-auto px-3 py-1.5 rounded"
            style={{ backgroundColor: td.brand1, border: `1px solid ${td.brand2}` }}
          >
            <span className="text-xs" style={{ color: td.brand7 }}>已选 {selectedIds.size} 项</span>
            <TdButton size="small" variant="text" onClick={() => setDeleteOpen(true)}>批量删除</TdButton>
            <TdButton
              size="small"
              variant="text"
              onClick={() => setSelectedIds(new Set())}
              icon={<X className="h-3 w-3" />}
            >
              取消
            </TdButton>
          </div>
        )}
      </div>

      {/* 表格区域 */}
      <div className="flex-1 min-h-0 px-6 py-4">
        <div
          className="h-full flex flex-col rounded-lg overflow-hidden"
          style={{ backgroundColor: td.bgContainer, border: `1px solid ${td.borderLight}`, boxShadow: td.shadow1 }}
        >
          <div className="flex-1 overflow-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: td.fontSize.sm }}>
              <thead>
                <tr style={{ backgroundColor: td.gray1, borderBottom: `1px solid ${td.borderLight}` }}>
                  <th className="w-[48px] px-3 py-2.5 text-center">
                    <TdCheckbox checked={allSelected} indeterminate={someSelected} onChange={toggleSelectAll} />
                  </th>
                  {['儿童姓名', '家长电话', '年龄', '年级', '来源渠道', '线索状态', '意向等级', '课程顾问', '所属校区', '创建时间', '操作'].map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2.5 text-left font-medium whitespace-nowrap"
                      style={{ color: td.textSecondary, fontSize: td.fontSize.sm }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayLeads.map((lead, i) => {
                  const s = STATUS_MAP[lead.status]
                  const intention = INTENTION_MAP[lead.intentionLevel]
                  const isSelected = selectedIds.has(lead.id)
                  return (
                    <tr
                      key={lead.id}
                      className="transition-colors cursor-pointer"
                      style={{
                        borderBottom: `1px solid ${td.borderLight}`,
                        backgroundColor: isSelected ? td.brand1 : (i % 2 === 1 ? td.gray1 : td.bgContainer),
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = td.bgHover
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = i % 2 === 1 ? td.gray1 : td.bgContainer
                      }}
                      onClick={() => { setDetailLead(lead); setDetailOpen(true) }}
                    >
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <TdCheckbox checked={isSelected} onChange={() => toggleSelect(lead.id)} />
                      </td>
                      <td className="px-3 py-2 font-medium" style={{ color: td.brand7 }}>{lead.childName}</td>
                      <td className="px-3 py-2" style={{ color: td.textPrimary }}>{lead.parentPhone}</td>
                      <td className="px-3 py-2" style={{ color: td.textPrimary }}>{lead.age}</td>
                      <td className="px-3 py-2" style={{ color: td.textPrimary }}>{lead.grade}</td>
                      <td className="px-3 py-2" style={{ color: td.textPrimary }}>{lead.source}</td>
                      <td className="px-3 py-2">
                        <TdTag variant="light" theme={s.theme}>{s.label}</TdTag>
                      </td>
                      <td className="px-3 py-2">
                        <TdTag variant="outline" theme={intention.theme}>{intention.label}</TdTag>
                      </td>
                      <td className="px-3 py-2" style={{ color: td.textPrimary }}>{lead.advisorName}</td>
                      <td className="px-3 py-2" style={{ color: td.textPrimary }}>{lead.campus}</td>
                      <td className="px-3 py-2" style={{ color: td.textSecondary }}>{lead.createdAt}</td>
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            className="p-1 rounded transition-colors cursor-pointer"
                            style={{ color: td.brand7 }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = td.brand1 }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                            title="查看"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            className="p-1 rounded transition-colors cursor-pointer"
                            style={{ color: td.brand7 }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = td.brand1 }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                            title="编辑"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <TdDropdown
                            trigger={
                              <button
                                className="p-1 rounded transition-colors cursor-pointer"
                                style={{ color: td.textPlaceholder }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = td.bgHover }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            }
                            items={[
                              { label: '外呼', icon: <Phone className="h-3.5 w-3.5" />, onClick: () => {} },
                              { label: '删除', icon: <Trash2 className="h-3.5 w-3.5" />, danger: true, onClick: () => {} },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {displayLeads.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-16 text-center" style={{ color: td.textPlaceholder }}>
                      暂无数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ borderTop: `1px solid ${td.borderLight}` }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: td.textSecondary }}>
                共 <strong>{total}</strong> 条
              </span>
              <span style={{ color: td.borderLight }}>|</span>
              <span className="text-xs" style={{ color: td.textSecondary }}>每页</span>
              <TdSelect
                className="w-[72px]"
                value={String(pageSize)}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </TdSelect>
              <span className="text-xs" style={{ color: td.textSecondary }}>条</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                className="w-7 h-7 flex items-center justify-center rounded cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ border: `1px solid ${td.border}`, color: td.textSecondary }}
                disabled={page <= 1}
                onClick={() => setPage(1)}
                onMouseEnter={(e) => { if (page > 1) e.currentTarget.style.borderColor = td.brand7 }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = td.border }}
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>
              <button
                className="w-7 h-7 flex items-center justify-center rounded cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ border: `1px solid ${td.border}`, color: td.textSecondary }}
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                onMouseEnter={(e) => { if (page > 1) e.currentTarget.style.borderColor = td.brand7 }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = td.border }}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className="w-7 h-7 flex items-center justify-center rounded text-xs cursor-pointer transition-colors"
                  style={{
                    backgroundColor: p === page ? td.brand7 : 'transparent',
                    color: p === page ? td.textAnti : td.textPrimary,
                    border: p === page ? 'none' : `1px solid ${td.border}`,
                    fontWeight: p === page ? 600 : 400,
                  }}
                  onClick={() => setPage(p)}
                  onMouseEnter={(e) => { if (p !== page) e.currentTarget.style.borderColor = td.brand7 }}
                  onMouseLeave={(e) => { if (p !== page) e.currentTarget.style.borderColor = td.border }}
                >
                  {p}
                </button>
              ))}

              <button
                className="w-7 h-7 flex items-center justify-center rounded cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ border: `1px solid ${td.border}`, color: td.textSecondary }}
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                onMouseEnter={(e) => { if (page < totalPages) e.currentTarget.style.borderColor = td.brand7 }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = td.border }}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                className="w-7 h-7 flex items-center justify-center rounded cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ border: `1px solid ${td.border}`, color: td.textSecondary }}
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                onMouseEnter={(e) => { if (page < totalPages) e.currentTarget.style.borderColor = td.brand7 }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = td.border }}
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CreateLeadDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <DeleteConfirmDialog open={deleteOpen} onClose={() => { setDeleteOpen(false); setSelectedIds(new Set()) }} count={selectedIds.size} />
      <DetailDrawer open={detailOpen} onClose={() => setDetailOpen(false)} lead={detailLead} />
    </div>
  )
}
