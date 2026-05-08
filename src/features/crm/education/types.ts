import type { PaginatedResponse, PaginationParams } from '@/lib/api/types'

export type EducationDomain =
  | 'students'
  | 'parents'
  | 'teachers'
  | 'course-products'
  | 'packages'
  | 'classes'
  | 'lessons'
  | 'consumption'
  | 'balances'
  | 'finance'
  | 'teacher-fees'
  | 'teacher-settlements'

export type EducationFieldValue = string | number | boolean | null | undefined

export interface EducationRecord {
  id: string | number
  name?: string | null
  status?: string | null
  campus_name?: string | null
  created_at?: string | null
  updated_at?: string | null
  [key: string]: EducationFieldValue
}

export interface EducationListParams extends PaginationParams {
  keyword?: string
  campus_id?: string
  status?: string
  date_from?: string
  date_to?: string
}

export type EducationListResponse = PaginatedResponse<EducationRecord>

export type EducationPayload = Record<string, EducationFieldValue>

export interface EducationOption {
  label: string
  value: string
}

export type EducationFieldKind = 'text' | 'number' | 'select' | 'date' | 'textarea'

export interface EducationFieldConfig {
  key: string
  title: string
  width?: number
  ellipsis?: boolean
  kind?: EducationFieldKind
  required?: boolean
  options?: EducationOption[]
  primary?: boolean
  money?: boolean
  datetime?: boolean
  hiddenInTable?: boolean
  hiddenInForm?: boolean
}

export interface EducationPageConfig {
  domain: EducationDomain
  title: string
  documentTitle: string
  emptyText: string
  primaryField: string
  searchPlaceholder: string
  createText?: string
  exportText?: string
  allowCreate?: boolean
  allowEdit?: boolean
  allowDelete?: boolean
  statusOptions?: EducationOption[]
  fields: EducationFieldConfig[]
}
