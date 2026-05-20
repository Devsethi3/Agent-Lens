import { MESSAGE_ACTIONS, STORAGE_KEYS } from '../lib/constants'
import { db } from '../lib/storage/db'
import { generateId } from '../lib/utils/id'
import type { CaptureEvent } from '../lib/types/events'
import type { RecordingSession } from '../lib/types/session'

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const action = message.action

  switch (action) {
    case MESSAGE_ACTIONS.START_RECORDING:
      handleStartRecording(message.payload).then(sendResponse)
      return true // Keeps message channel open for async

    case MESSAGE_ACTIONS.STOP_RECORDING:
      handleStopRecording().then(sendResponse)
      return true

    case MESSAGE_ACTIONS.GET_STATUS:
      handleGetStatus().then(sendResponse)
      return true

    case MESSAGE_ACTIONS.EVENT_BATCH:
      handleEventBatch(message.payload).then(sendResponse)
      return true

    default:
      sendResponse({ error: 'Unknown action' })
  }
})

async function handleStartRecording(payload: { name: string; url: string }) {
  const sessionId = generateId()
  const domain = new URL(payload.url).hostname

  const session: RecordingSession = {
    id: sessionId,
    name: payload.name || `Session ${Date.now()}`,
    domain,
    startUrl: payload.url,
    status: 'recording',
    startedAt: Date.now(),
    endedAt: null,
    eventCount: 0
  }

  await db.sessions.put(session)
  await chrome.storage.local.set({
    [STORAGE_KEYS.ACTIVE_SESSION_ID]: sessionId,
    [STORAGE_KEYS.RECORDING_STATE]: 'recording',
    'active_event_count': 0
  })

  return { success: true, session }
}

async function handleStopRecording() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_SESSION_ID)
  const sessionId = data[STORAGE_KEYS.ACTIVE_SESSION_ID]

  if (!sessionId) {
    return { error: 'No active recording session' }
  }

  await db.sessions.update(sessionId, {
    status: 'completed',
    endedAt: Date.now()
  })

  await chrome.storage.local.set({
    [STORAGE_KEYS.ACTIVE_SESSION_ID]: null,
    [STORAGE_KEYS.RECORDING_STATE]: 'idle',
    active_event_count: 0
  })

  return { success: true }
}

async function handleEventBatch(events: CaptureEvent[]) {
  if (!events || events.length === 0) return { success: true }

  const data = await chrome.storage.local.get([STORAGE_KEYS.ACTIVE_SESSION_ID, 'active_event_count'])
  const sessionId = data[STORAGE_KEYS.ACTIVE_SESSION_ID]
  if (!sessionId) return { error: 'No active session' }

  // Bulk insert for high performance
  await db.events.bulkPut(events)
  
  const currentCount = data.active_event_count || 0
  const newCount = currentCount + events.length

  await db.sessions.where('id').equals(sessionId).modify((session) => {
    session.eventCount = newCount
  })

  await chrome.storage.local.set({ active_event_count: newCount })

  return { success: true }
}

async function handleGetStatus() {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.ACTIVE_SESSION_ID,
    STORAGE_KEYS.RECORDING_STATE
  ])

  let session = null
  if (data[STORAGE_KEYS.ACTIVE_SESSION_ID]) {
    session = await db.sessions.get(data[STORAGE_KEYS.ACTIVE_SESSION_ID])
  }

  return {
    state: data[STORAGE_KEYS.RECORDING_STATE] || 'idle',
    session
  }
}