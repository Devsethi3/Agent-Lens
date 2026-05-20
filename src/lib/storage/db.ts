import Dexie, { type Table } from 'dexie'
import type { CaptureEvent } from '../types/events'
import type { RecordingSession } from '../types/session'

export class AgentLensDB extends Dexie {
  sessions!: Table<RecordingSession, string>
  events!: Table<CaptureEvent, string>

  constructor() {
    super('AgentLensDB')
    this.version(1).stores({
      sessions: 'id, status, domain, startedAt',
      events: 'id, sessionId, type, timestamp'
    })
  }
}

export const db = new AgentLensDB()