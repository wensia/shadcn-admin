import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { toast } from '@/lib/toast'
import {
  advisorTaskApi,
  type AdvisorTaskCandidate,
  type AdvisorTaskCandidateRaw,
  type AdvisorTaskDashboardData,
  type AdvisorTaskDashboardParams,
  type AdvisorTaskDashboardResponseRaw,
  type AdvisorTaskDetailData,
  type AdvisorTaskDetailResponseRaw,
  type AdvisorTaskFinalStatus,
  type AdvisorTaskManualEntry,
  type AdvisorTaskManualEntryPayload,
  type AdvisorTaskManualReviewPayload,
  type AdvisorTaskReviewStatus,
  type AdvisorTaskRow,
  type AdvisorTaskRowRaw,
  type AdvisorTaskRuleHit,
  type AdvisorTaskRuleHitRaw,
} from '../api/advisor-task-api'

const EMPTY_DASHBOARD: AdvisorTaskDashboardData = {
  dateMode: 'today',
  dateLabel: '',
  generatedAt: '',
  summary: {
    qualifiedCount: 0,
    pendingReviewCount: 0,
    failedCount: 0,
    suggestedPenaltyAmount: 0,
    weeklyVisitedQualifiedCount: 0,
  },
  rows: [],
}

function toSafeNumber(value: unknown) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : 0
}

function pickString(...values: unknown[]) {
  const matched = values.find((value) => typeof value === 'string' && value.trim().length > 0)
  return typeof matched === 'string' ? matched : ''
}

function pickBoolean(...values: unknown[]) {
  const matched = values.find((value) => typeof value === 'boolean')
  return typeof matched === 'boolean' ? matched : false
}

function normalizeFinalStatus(value: unknown): AdvisorTaskFinalStatus {
  if (value === 'auto_pass' || value === 'manual_pass' || value === 'failed') {
    return value
  }

  return 'pending_review'
}

function normalizeReviewStatus(value: unknown): AdvisorTaskReviewStatus {
  if (value === 'approved' || value === 'rejected') {
    return value
  }

  return 'pending'
}

function normalizeRuleHit(input: Partial<AdvisorTaskRuleHitRaw> | string, index: number): AdvisorTaskRuleHit {
  if (typeof input === 'string') {
    return {
      key: input,
      label: input,
    }
  }

  return {
    key: pickString(input.key, `rule-${index}`),
    label: pickString(input.label, input.key, `规则 ${index + 1}`),
  }
}

function normalizeCandidate(input: Partial<AdvisorTaskCandidateRaw> & Record<string, unknown>, index: number): AdvisorTaskCandidate {
  const nextStatus = input.status
  const status = nextStatus === 'approved' || nextStatus === 'rejected' || nextStatus === 'not_available'
    ? nextStatus
    : 'pending_review'

  return {
    key: pickString(input.key, `candidate-${index}`),
    label: pickString(input.label, `候选项 ${index + 1}`),
    description: pickString(input.description),
    value: input.value,
    status,
    evidenceRequired: pickBoolean(input.evidence_required),
  }
}

function normalizeRow(input: AdvisorTaskRowRaw): AdvisorTaskRow {
  const autoRuleHits = Array.isArray(input.auto_rule_hits)
    ? input.auto_rule_hits.map((rule, index) => normalizeRuleHit(rule, index))
    : []

  const manualCandidates = Array.isArray(input.manual_candidates)
    ? input.manual_candidates.map((candidate, index) =>
        normalizeCandidate(candidate as Partial<AdvisorTaskCandidateRaw> & Record<string, unknown>, index))
    : []

  return {
    recordId: input.record_id || null,
    advisorId: input.advisor_id,
    advisorName: input.advisor_name,
    campusId: input.campus_id || null,
    campusName: input.campus_name || null,
    statScope: input.stat_scope,
    statDate: input.stat_date,
    rangeStart: input.range_start,
    rangeEnd: input.range_end,
    outboundCallCount: toSafeNumber(input.outbound_call_count),
    connectedCount: toSafeNumber(input.connected_count),
    callDurationSeconds: toSafeNumber(input.call_duration_seconds),
    longCall40Count: toSafeNumber(input.long_call_40_count),
    longCall60Count: toSafeNumber(input.long_call_60_count),
    promisedCount: toSafeNumber(input.promised_count),
    visitedCount: toSafeNumber(input.visited_count),
    paymentCount: toSafeNumber(input.payment_count),
    paymentAmount: toSafeNumber(input.payment_amount),
    trialPaymentCandidateCount: toSafeNumber(input.trial_payment_candidate_count),
    wechatCandidateCount: toSafeNumber(input.wechat_candidate_count),
    weeklyVisitedCount: toSafeNumber(input.weekly_visited_count),
    weeklyPromisedCount: toSafeNumber(input.weekly_promised_count),
    autoRuleHits,
    manualCandidates,
    finalStatus: normalizeFinalStatus(input.final_status),
    reviewStatus: normalizeReviewStatus(input.review_status),
    suggestedPenaltyAmount: toSafeNumber(input.suggested_penalty_amount),
    reviewNote: pickString(input.review_note),
    evidenceUrl: pickString(input.evidence_url),
    editable: Boolean(input.editable),
  }
}

function normalizeManualEntry(input?: AdvisorTaskDetailResponseRaw['manual_entry']): AdvisorTaskManualEntry {
  return {
    note: pickString(input?.note),
    evidenceUrl: pickString(input?.evidence_url),
    wechatAddedVerifiedCount: toSafeNumber(input?.wechat_added_verified_count),
    momentsDays: toSafeNumber(input?.moments_days),
    visitReceptionMinutesDeduction: toSafeNumber(input?.visit_reception_minutes_deduction),
    wechatDeductionCount: toSafeNumber(input?.wechat_deduction_count),
    trialPaymentExemption: pickBoolean(input?.trial_payment_exemption),
    weeklyPromisedExemption: pickBoolean(input?.weekly_promised_exemption),
    promiseScreenshotProvided: pickBoolean(input?.promise_screenshot_provided),
  }
}

function normalizeDashboard(input?: AdvisorTaskDashboardResponseRaw): AdvisorTaskDashboardData {
  if (!input) return EMPTY_DASHBOARD

  return {
    dateMode: input.date_mode,
    dateLabel: pickString(input.date_label),
    generatedAt: pickString(input.generated_at),
    summary: {
      qualifiedCount: toSafeNumber(input.summary?.qualified_count),
      pendingReviewCount: toSafeNumber(input.summary?.pending_review_count),
      failedCount: toSafeNumber(input.summary?.failed_count),
      suggestedPenaltyAmount: toSafeNumber(input.summary?.suggested_penalty_amount),
      weeklyVisitedQualifiedCount: toSafeNumber(input.summary?.weekly_visited_qualified_count),
    },
    rows: Array.isArray(input.rows) ? input.rows.map((row) => normalizeRow(row)) : [],
  }
}

function normalizeDetail(input?: AdvisorTaskDetailResponseRaw): AdvisorTaskDetailData | null {
  if (!input) return null

  return {
    row: normalizeRow(input.row),
    manualEntry: normalizeManualEntry(input.manual_entry),
  }
}

function buildQueryKey(prefix: string, params: AdvisorTaskDashboardParams, advisorId?: string | null) {
  return [
    prefix,
    advisorId ?? 'all',
    params.campusId ?? 'all',
    params.dateMode,
    params.dateFrom,
    params.dateTo,
    params.accountId ?? 'no-account',
  ] as const
}

export function useAdvisorTaskDashboard(params: AdvisorTaskDashboardParams, enabled = true) {
  const query = useQuery({
    queryKey: buildQueryKey('crm-advisor-task-dashboard', params),
    queryFn: () => advisorTaskApi.getDashboard(params),
    enabled,
    staleTime: 60 * 1000,
    retry: false,
  })

  const data = useMemo(() => normalizeDashboard(query.data), [query.data])

  return {
    data,
    serviceUnavailable: Boolean(query.error),
    error: query.error,
    isError: query.isError,
    isFetched: query.isFetched,
    isFetching: query.isFetching,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
  }
}

export function useAdvisorTaskDetail(
  advisorId: string | null,
  params: AdvisorTaskDashboardParams,
  enabled: boolean,
) {
  const query = useQuery({
    queryKey: buildQueryKey('crm-advisor-task-detail', params, advisorId),
    queryFn: () => advisorTaskApi.getAdvisorRecord(advisorId!, params),
    enabled: enabled && Boolean(advisorId),
    staleTime: 30 * 1000,
    retry: false,
  })

  const data = useMemo(() => normalizeDetail(query.data), [query.data])

  return {
    data,
    serviceUnavailable: Boolean(query.error),
    error: query.error,
    isError: query.isError,
    isFetched: query.isFetched,
    isFetching: query.isFetching,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
  }
}

export function useAdvisorTaskActions(params: AdvisorTaskDashboardParams) {
  const queryClient = useQueryClient()

  const invalidate = async (advisorId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: buildQueryKey('crm-advisor-task-dashboard', params),
      }),
      queryClient.invalidateQueries({
        queryKey: buildQueryKey('crm-advisor-task-detail', params, advisorId),
      }),
    ])
  }

  const manualEntryMutation = useMutation({
    mutationFn: ({ recordId, payload }: { recordId: string; advisorId: string; payload: AdvisorTaskManualEntryPayload }) =>
      advisorTaskApi.submitManualEntry(recordId, payload),
    onSuccess: async (_, variables) => {
      toast.success('补录信息已保存')
      await invalidate(variables.advisorId)
    },
    onError: (error: unknown) => {
      showApiErrorToast(error, '补录保存失败')
    },
  })

  const manualReviewMutation = useMutation({
    mutationFn: ({ recordId, payload }: { recordId: string; advisorId: string; payload: AdvisorTaskManualReviewPayload }) =>
      advisorTaskApi.submitManualReview(recordId, payload),
    onSuccess: async (_, variables) => {
      toast.success(variables.payload.action === 'approve' ? '主管确认已提交' : '驳回结果已提交')
      await invalidate(variables.advisorId)
    },
    onError: (error: unknown) => {
      showApiErrorToast(error, '主管审核提交失败')
    },
  })

  return {
    manualEntryMutation,
    manualReviewMutation,
  }
}
