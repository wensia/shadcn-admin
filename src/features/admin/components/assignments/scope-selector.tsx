import { Input, Select } from '@douyinfe/semi-ui-19'
import { scopeLabelByType } from '../../lib/assignment-format'
import type { AssignmentRole } from '../../types'

export type ScopeField =
  | 'campus_id'
  | 'area_id'
  | 'campus_department_id'
  | 'area_department_id'
  | 'district_department_id'

export interface ScopeOption {
  id: string
  label: string
}

export function inferScopeField(role: AssignmentRole): ScopeField {
  if (role === 'principal' || role === 'operation_assistant' || role === 'vice_principal') return 'campus_id'
  if (role === 'area_director') return 'area_id'
  if (role === 'area_manager' || role === 'teaching_supervisor') return 'area_department_id'
  return 'campus_department_id'
}

interface ScopeSelectorProps {
  scopeType: ScopeField
  value: string
  onChange: (v: string) => void
  campuses: Array<{ id: string; name: string; area_name?: string | null }>
  areas: Array<{ id: string; name: string }>
  campusDepts: Array<{
    id: string
    campus_name?: string | null
    department_name?: string | null
  }>
  areaDepts: Array<{
    id: string
    area_name?: string | null
    department_name?: string | null
  }>
  districtDepts: Array<{
    id: string
    district_name?: string | null
    department_name?: string | null
  }>
  disabled?: boolean
}

export function ScopeSelector({
  scopeType,
  value,
  onChange,
  campuses,
  areas,
  campusDepts,
  areaDepts,
  districtDepts,
  disabled,
}: ScopeSelectorProps) {
  const placeholder = `选择${scopeLabelByType(scopeType)}`

  if (scopeType === 'campus_id') {
    return (
      <Select
        value={value}
        onChange={(v) => onChange(v as string)}
        filter
        disabled={disabled}
        style={{ width: '100%' }}
        placeholder={placeholder}
      >
        {campuses.map((c) => (
          <Select.Option key={c.id} value={c.id}>
            {c.area_name ? `${c.area_name} / ` : ''}
            {c.name}
          </Select.Option>
        ))}
      </Select>
    )
  }

  if (scopeType === 'area_id') {
    return (
      <Select
        value={value}
        onChange={(v) => onChange(v as string)}
        filter
        disabled={disabled}
        style={{ width: '100%' }}
        placeholder={placeholder}
      >
        {areas.map((a) => (
          <Select.Option key={a.id} value={a.id}>
            {a.name}
          </Select.Option>
        ))}
      </Select>
    )
  }

  if (scopeType === 'campus_department_id') {
    return (
      <Select
        value={value}
        onChange={(v) => onChange(v as string)}
        filter
        disabled={disabled}
        style={{ width: '100%' }}
        placeholder={placeholder}
      >
        {campusDepts.map((cd) => (
          <Select.Option key={cd.id} value={cd.id}>
            {cd.campus_name || '?'} / {cd.department_name || '?'}
          </Select.Option>
        ))}
      </Select>
    )
  }

  if (scopeType === 'area_department_id') {
    return (
      <Select
        value={value}
        onChange={(v) => onChange(v as string)}
        filter
        disabled={disabled}
        style={{ width: '100%' }}
        placeholder={placeholder}
      >
        {areaDepts.map((ad) => (
          <Select.Option key={ad.id} value={ad.id}>
            {ad.area_name || '?'} / {ad.department_name || '?'}
          </Select.Option>
        ))}
      </Select>
    )
  }

  if (scopeType === 'district_department_id') {
    return (
      <Select
        value={value}
        onChange={(v) => onChange(v as string)}
        filter
        disabled={disabled}
        style={{ width: '100%' }}
        placeholder={placeholder}
      >
        {districtDepts.map((dd) => (
          <Select.Option key={dd.id} value={dd.id}>
            {dd.district_name || '?'} / {dd.department_name || '?'}
          </Select.Option>
        ))}
      </Select>
    )
  }

  return <Input value={value} onChange={onChange} placeholder="作用域未知" disabled />
}
