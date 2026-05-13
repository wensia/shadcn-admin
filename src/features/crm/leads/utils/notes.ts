import type { LeadNoteTimelineEntry } from '../types'

interface LeadNoteFallback {
  created_at?: string | null
  created_by_id?: string | null
  created_by_name?: string | null
}

export function normalizeLeadNotes(
  notes: LeadNoteTimelineEntry[] | string | null | undefined,
  fallback?: LeadNoteFallback
): LeadNoteTimelineEntry[] {
  if (!notes) return []
  if (Array.isArray(notes)) {
    return notes
      .filter((entry) => entry && typeof entry.content === 'string')
      .map((entry) => ({
        ...entry,
        created_at: entry.created_at || fallback?.created_at || '',
        created_by_id: entry.created_by_id ?? fallback?.created_by_id ?? null,
        created_by_name: entry.created_by_name ?? fallback?.created_by_name ?? null,
      }))
  }
  if (typeof notes === 'string' && notes.trim()) {
    return [{
      id: 'legacy-string',
      content: notes.trim(),
      created_at: fallback?.created_at || '',
      created_by_id: fallback?.created_by_id || null,
      created_by_name: fallback?.created_by_name || null,
      source: 'legacy_string',
    }]
  }
  return []
}

export function getLatestLeadNoteText(notes: LeadNoteTimelineEntry[] | string | null | undefined): string {
  const entries = normalizeLeadNotes(notes)
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const content = entries[index]?.content?.trim()
    if (content) return content
  }
  return ''
}

export function getLeadNoteSourceLabel(source: LeadNoteTimelineEntry['source']): string {
  const labels: Record<LeadNoteTimelineEntry['source'], string> = {
    legacy_migration: '历史备注',
    legacy_string: '历史备注',
    create: '创建备注',
    manual_update: '手动追加',
    import: '批量导入',
    public_submit: '公开提交',
  }
  return labels[source] || source
}
