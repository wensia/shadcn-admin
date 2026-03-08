import { apiClient } from '@/lib/api/client'
import { unwrapData, type ApiResponse } from '@/lib/api/types'

export type AdvisorTaskDateMode = 'today' | 'single' | 'range'
export type AdvisorTaskCandidateStatus = 'not_available' | 'pending_review' | 'approved' | 'rejected'
export type AdvisorTaskReviewStatus = 'pending' | 'approved' | 'rejected'
export type AdvisorTaskFinalStatus = 'auto_pass' | 'pending_review' | 'manual_pass' | 'failed'

export interface AdvisorTaskRuleHit {
  key: string
  label: string
}

export interface AdvisorTaskCandidate {
  key: string
  label: string
  description?: string
  value?: unknown
  status: AdvisorTaskCandidateStatus
  evidenceRequired: boolean
}

export interface AdvisorTaskDashboardSummary {
  qualifiedCount: number
  pendingReviewCount: number
  failedCount: number
  suggestedPenaltyAmount: number
  weeklyVisitedQualifiedCount: number
}

export interface AdvisorTaskRow {
  recordId: string | null
  advisorId: string
  advisorName: string
  campusId?: string | null
  campusName?: string | null
  statScope: string
  statDate: string
  rangeStart: string
  rangeEnd: string
  outboundCallCount: number
  connectedCount: number
  callDurationSeconds: number
  longCall40Count: number
  longCall60Count: number
  promisedCount: number
  visitedCount: number
  paymentCount: number
  paymentAmount: number
  trialPaymentCandidateCount: number
  wechatCandidateCount: number
  weeklyVisitedCount: number
  weeklyPromisedCount: number
  autoRuleHits: AdvisorTaskRuleHit[]
  manualCandidates: AdvisorTaskCandidate[]
  finalStatus: AdvisorTaskFinalStatus
  reviewStatus: AdvisorTaskReviewStatus
  suggestedPenaltyAmount: number
  reviewNote?: string
  evidenceUrl?: string
  editable: boolean
}

export interface AdvisorTaskManualEntry {
  note?: string
  evidenceUrl?: string
  wechatAddedVerifiedCount: number
  momentsDays: number
  visitReceptionMinutesDeduction: number
  wechatDeductionCount: number
  trialPaymentExemption: boolean
  weeklyPromisedExemption: boolean
  promiseScreenshotProvided: boolean
}

export interface AdvisorTaskDashboardData {
  dateMode: AdvisorTaskDateMode
  dateLabel: string
  generatedAt?: string
  summary: AdvisorTaskDashboardSummary
  rows: AdvisorTaskRow[]
}

export interface AdvisorTaskDetailData {
  row: AdvisorTaskRow
  manualEntry: AdvisorTaskManualEntry
}

export interface AdvisorTaskDashboardParams {
  campusId?: string
  dateMode: AdvisorTaskDateMode
  dateFrom: string
  dateTo: string
  accountId?: string
}

export interface AdvisorTaskManualEntryPayload {
  note?: string
  evidence_url?: string
  wechat_added_verified_count?: number
  moments_days?: number
  visit_reception_minutes_deduction?: number
  wechat_deduction_count?: number
  trial_payment_exemption?: boolean
  weekly_promised_exemption?: boolean
  promise_screenshot_provided?: boolean
}

export interface AdvisorTaskManualReviewPayload {
  action: 'approve' | 'reject'
  review_note?: string
  evidence_url?: string
  approved_candidate_keys: string[]
  rejected_candidate_keys: string[]
}

interface AdvisorTaskRuleHitRaw {
  key: string
  label: string
}

interface AdvisorTaskCandidateRaw {
  key: string
  label: string
  description?: string | null
  value?: unknown
  status: AdvisorTaskCandidateStatus
  evidence_required?: boolean
}

interface AdvisorTaskDashboardSummaryRaw {
  qualified_count: number
  pending_review_count: number
  failed_count: number
  suggested_penalty_amount: number | string
  weekly_visited_qualified_count: number
}

interface AdvisorTaskRowRaw {
  record_id: string | null
  advisor_id: string
  advisor_name: string
  campus_id?: string | null
  campus_name?: string | null
  stat_scope: string
  stat_date: string
  range_start: string
  range_end: string
  outbound_call_count: number
  connected_count: number
  call_duration_seconds: number
  long_call_40_count: number
  long_call_60_count: number
  promised_count: number
  visited_count: number
  payment_count: number
  payment_amount: number | string
  trial_payment_candidate_count: number
  wechat_candidate_count: number
  weekly_visited_count: number
  weekly_promised_count: number
  auto_rule_hits: AdvisorTaskRuleHitRaw[]
  manual_candidates: AdvisorTaskCandidateRaw[]
  final_status: AdvisorTaskFinalStatus
  review_status: AdvisorTaskReviewStatus
  suggested_penalty_amount: number | string
  review_note?: string | null
  evidence_url?: string | null
  editable: boolean
}

interface AdvisorTaskDashboardResponseRaw {
  date_mode: AdvisorTaskDateMode
  date_label: string
  summary: AdvisorTaskDashboardSummaryRaw
  rows: AdvisorTaskRowRaw[]
  generated_at?: string
}

interface AdvisorTaskDetailResponseRaw {
  row: AdvisorTaskRowRaw
  manual_entry: {
    note?: string | null
    evidence_url?: string | null
    wechat_added_verified_count?: number | null
    moments_days?: number | null
    visit_reception_minutes_deduction?: number | null
    wechat_deduction_count?: number | null
    trial_payment_exemption?: boolean | null
    weekly_promised_exemption?: boolean | null
    promise_screenshot_provided?: boolean | null
  }
}

function buildDateParams(params: AdvisorTaskDashboardParams, options?: { includeCampus?: boolean }) {
  const nextParams: Record<string, string> = {
    date_mode: params.dateMode,
  }

  if (options?.includeCampus && params.campusId && params.campusId !== 'all') {
    nextParams.campus_id = params.campusId
  }

  if (params.accountId) {
    nextParams.account_id = params.accountId
  }

  if (params.dateMode === 'range') {
    nextParams.date_from = params.dateFrom
    nextParams.date_to = params.dateTo
  } else {
    nextParams.date = params.dateFrom
  }

  return nextParams
}

export const advisorTaskApi = {
  async getDashboard(params: AdvisorTaskDashboardParams): Promise<AdvisorTaskDashboardResponseRaw> {
    const response = await apiClient.get<ApiResponse<AdvisorTaskDashboardResponseRaw>>(
      '/crm/advisor-task-dashboard',
      { params: buildDateParams(params, { includeCampus: true }) },
    )

    return unwrapData(response)
  },

  async getAdvisorRecord(advisorId: string, params: AdvisorTaskDashboardParams): Promise<AdvisorTaskDetailResponseRaw> {
    const response = await apiClient.get<ApiResponse<AdvisorTaskDetailResponseRaw>>(
      `/crm/advisor-task-records/${advisorId}`,
      { params: buildDateParams(params) },
    )

    return unwrapData(response)
  },

  async submitManualEntry(recordId: string, data: AdvisorTaskManualEntryPayload): Promise<AdvisorTaskDetailResponseRaw> {
    const response = await apiClient.post<ApiResponse<AdvisorTaskDetailResponseRaw>>(
      `/crm/advisor-task-records/${recordId}/manual-entry`,
      data,
    )

    return unwrapData(response)
  },

  async submitManualReview(recordId: string, data: AdvisorTaskManualReviewPayload): Promise<AdvisorTaskDetailResponseRaw> {
    const response = await apiClient.post<ApiResponse<AdvisorTaskDetailResponseRaw>>(
      `/crm/advisor-task-records/${recordId}/manual-review`,
      data,
    )

    return unwrapData(response)
  },
}

export type {
  AdvisorTaskDashboardResponseRaw,
  AdvisorTaskDetailResponseRaw,
  AdvisorTaskRowRaw,
  AdvisorTaskDashboardSummaryRaw,
  AdvisorTaskCandidateRaw,
  AdvisorTaskRuleHitRaw,
}
