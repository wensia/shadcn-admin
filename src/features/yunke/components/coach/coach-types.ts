export type CoachMode = 'text' | 'voice'

export interface TrainingCatalogItem {
  key: string
  label: string
  description?: string | null
}

export interface TrainingCatalog {
  scenes: TrainingCatalogItem[]
  personas: TrainingCatalogItem[]
  difficulties: TrainingCatalogItem[]
  persona_groups?: Array<{
    key: string
    label: string
    count: number
  }> | null
  scene_persona_recommendations?: Record<string, string[]> | null
}

export interface TrainingSession {
  id: string
  mode: CoachMode
  title: string
  scene_key: string
  persona_key: string
  difficulty: string
  status: string
  current_stage?: string | null
  subject?: string | null
  student_grade?: string | null
  goal?: string | null
  last_message_at?: string | null
  created_at: string
}

export interface TrainingMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  source: string
  sequence_no: number
  stage?: string | null
  metadata_json?: Record<string, unknown> | null
  created_at: string
  isStreaming?: boolean
  thinking?: string
}

export interface TrainingVoiceStatus {
  status: string
  phase: string
  elapsed_seconds: number
  transcript_ready: boolean
  last_error?: string | null
}

export interface TrainingReview {
  id: string
  overall_score: number
  dimension_scores: {
    opening: number
    discovery: number
    pitch: number
    objection: number
    closing: number
    communication?: number
    rhythm?: number
  }
  strengths: string[]
  improvements: string[]
  next_recommendation: string
  grade?: string | null
  highlight_quotes?: Array<{
    quote: string
    comment: string
  }> | null
  review_model?: string | null
  review_prompt_version?: string | null
  created_at: string
}

export interface TrainingSessionDetail {
  session: TrainingSession
  messages: TrainingMessage[]
  voice_status?: TrainingVoiceStatus | null
  review?: TrainingReview | null
}

export interface TrainingCreatePayload {
  mode: CoachMode
  scene_key: string
  persona_key: string
  difficulty: string
  subject?: string
  student_grade?: string
  goal?: string
}

export interface TrainingSetupForm {
  mode: CoachMode
  scene_key: string
  persona_key: string
  difficulty: string
  subject: string
  student_grade: string
  goal: string
}

/** 实时语音 WebSocket 事件类型。 */
export type RealtimeEventType =
  | 'ready'
  | 'asr'
  | 'chat'
  | 'tts_start'
  | 'tts_end'
  | 'error'
  | 'finished'

export interface RealtimeEvent {
  type: RealtimeEventType
  [key: string]: unknown
}

