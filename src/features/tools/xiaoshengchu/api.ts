/**
 * 小升初志愿模拟 - API
 * 数据/算法在后端，这里只做调用。
 */

const API_URL = import.meta.env.DEV ? (import.meta.env.VITE_API_URL || '') : ''
const API_VERSION = import.meta.env.VITE_API_VERSION || 'v1'
const API_BASE = `${API_URL}/api/${API_VERSION}/tools/xiaoshengchu`

export type SchoolType = 'public' | 'private'
export type SchoolColorType = 'hot' | 'secondThird' | 'unfulfilled' | 'normal'

export interface School {
  id: string
  name: string
  type: SchoolType
  level: string
  district: string
  features: string[]
  description: string
  history: string
  address: string
  admissionTrend: string
  enrollmentRate: string
  highSchoolEnrollmentRate: string
  hasHighSchool: boolean
  canteen: string
  volunteers: string
  enrollment2025: number | null
  colorType: SchoolColorType
  admissionRate?: number | { first: number; other: number } | null
}

export interface District {
  id: string
  name: string
  publicSchools: string[]
  privateSchools: string[]
}

export interface Config {
  districts: District[]
  schools: Record<string, School>
}

export interface Breakdown {
  volunteer_id: number
  school_name: string
  probability: number
  comment: string
}

export interface VolunteerAnalysis {
  overallScore: number
  riskLevel: 'low' | 'medium' | 'high'
  suggestions: string[]
  breakdown: {
    volunteerId: number
    schoolName: string
    probability: number
    comment: string
  }[]
}

async function postJson<T>(path: string, body: Record<string, unknown>, accessTicket?: string): Promise<T> {
  const payload: Record<string, unknown> = { ...body }
  if (accessTicket) payload.access_ticket = accessTicket

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (!accessTicket) {
    const token = localStorage.getItem('access_token')
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  const json = await res.json()
  if (!json.success) {
    const err = new Error(json.message || '请求失败')
    ;(err as Error & { code?: string }).code = json.code
    throw err
  }
  return json.data as T
}

export async function fetchConfig(accessTicket?: string): Promise<Config> {
  return postJson<Config>('/config', {}, accessTicket)
}

export async function analyzeVolunteers(
  districtId: string | null,
  volunteers: (string | null)[],
  accessTicket?: string,
): Promise<VolunteerAnalysis> {
  const d = await postJson<{
    overall_score: number
    risk_level: 'low' | 'medium' | 'high'
    suggestions: string[]
    breakdown: Breakdown[]
  }>('/analyze', { district_id: districtId, volunteers }, accessTicket)

  return {
    overallScore: d.overall_score,
    riskLevel: d.risk_level,
    suggestions: d.suggestions,
    breakdown: d.breakdown.map((b) => ({
      volunteerId: b.volunteer_id,
      schoolName: b.school_name,
      probability: b.probability,
      comment: b.comment,
    })),
  }
}

// ─── 客户端辅助函数（纯函数，依赖从后端拉取的 config） ─────────────────

export function getSchoolsByDistrict(
  config: Config,
  districtId: string,
): { public: School[]; private: School[] } {
  const district = config.districts.find((d) => d.id === districtId)
  if (!district) return { public: [], private: [] }
  return {
    public: district.publicSchools.map((id) => config.schools[id]).filter(Boolean),
    private: district.privateSchools.map((id) => config.schools[id]).filter(Boolean),
  }
}

export function getDistrictSchoolCount(config: Config, districtId: string): number {
  const district = config.districts.find((d) => d.id === districtId)
  if (!district) return 0
  return district.publicSchools.length + district.privateSchools.length
}
