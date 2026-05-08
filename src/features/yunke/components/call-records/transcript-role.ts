import type { TranscriptSegment } from '../../types'

export type TranscriptRole = 'staff' | 'customer' | 'unknown'

function getStaffLabel(staffName?: string | null): string {
  return staffName?.trim() || '课程顾问'
}

function getChannelId(segment: TranscriptSegment): number | null {
  const rawChannelId = segment.channel_id ?? segment.channelId
  if (rawChannelId === null || rawChannelId === undefined || rawChannelId === '') return null

  const channelId = Number(rawChannelId)
  return Number.isFinite(channelId) ? channelId : null
}

function getRoleFromSpeaker(segment: TranscriptSegment): TranscriptRole | null {
  const speaker = String(segment.speaker || '').trim().toLowerCase()
  if (!speaker) return null

  if (
    speaker === '0' ||
    speaker.includes('顾问') ||
    speaker.includes('员工') ||
    speaker.includes('老师') ||
    speaker.includes('坐席') ||
    speaker.includes('客服') ||
    speaker.includes('销售') ||
    speaker.includes('agent') ||
    speaker.includes('advisor') ||
    speaker.includes('consultant') ||
    speaker.includes('staff') ||
    speaker.includes('operator') ||
    speaker.includes('sales') ||
    speaker.includes('teacher')
  ) {
    return 'staff'
  }

  if (
    speaker === '1' ||
    speaker.includes('客户') ||
    speaker.includes('家长') ||
    speaker.includes('学生') ||
    speaker.includes('customer') ||
    speaker.includes('client') ||
    speaker.includes('parent') ||
    speaker.includes('student')
  ) {
    return 'customer'
  }

  return null
}

function getRoleFromChannel(segment: TranscriptSegment): TranscriptRole | null {
  const channelId = getChannelId(segment)
  if (channelId === 0) return 'staff'
  if (channelId === 1) return 'customer'
  return null
}

export function getTranscriptRole(segment: TranscriptSegment): TranscriptRole {
  const speakerRole = getRoleFromSpeaker(segment)
  if (speakerRole) return speakerRole

  return getRoleFromChannel(segment) ?? 'unknown'
}

export function getTranscriptRoleShortLabel(segment: TranscriptSegment, staffName?: string | null): string {
  const role = getTranscriptRole(segment)
  if (role === 'staff') return getStaffLabel(staffName)
  if (role === 'customer') return '客户'
  return String(segment.speaker || '未知')
}

export function getTranscriptRoleTextLabel(segment: TranscriptSegment, staffName?: string | null): string {
  const role = getTranscriptRole(segment)
  if (role === 'staff') return getStaffLabel(staffName)
  if (role === 'customer') return '客户'
  return String(segment.speaker || '未知')
}
