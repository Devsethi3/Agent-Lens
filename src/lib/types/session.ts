export type SessionStatus = 'recording' | 'paused' | 'completed' | 'processing'

export interface RecordingSession {
  id: string
  name: string
  domain: string
  startUrl: string
  status: SessionStatus
  startedAt: number
  endedAt: number | null
  eventCount: number
}