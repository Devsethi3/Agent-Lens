import { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import { LoadingOverlay } from '../components/shared/LoadingOverlay'
import { MESSAGE_ACTIONS, STORAGE_KEYS } from '../lib/constants'
import { db } from '../lib/storage/db'
import type { RecordingSession } from '../lib/types/session'
import { correlateEvents } from '../lib/processors/correlator'
import { generateMarkdown } from '../lib/generators/markdownGenerator'
import { enhanceMarkdown } from '../lib/llm/openrouterClient'
import { saveFileToSystem } from '../lib/utils/fileSystem'
import type { ProcessedFlow } from '../lib/types/types'

type RecordingState = 'idle' | 'recording' | 'paused'
type GenerationMode = 'raw' | 'enhanced'

export function App() {
  const [state, setState] = useState<RecordingState>('idle')
  const [activeSession, setActiveSession] = useState<RecordingSession | null>(null)
  const [sessionName, setSessionName] = useState('')
  const [pastSessions, setPastSessions] = useState<RecordingSession[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState<string>('')

  useEffect(() => {
    loadInitialState()

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes['active_event_count'] && activeSession) {
        setActiveSession(prev => prev ? { ...prev, eventCount: changes['active_event_count'].newValue } : null)
      }
      if (changes[STORAGE_KEYS.RECORDING_STATE]) {
        setState(changes[STORAGE_KEYS.RECORDING_STATE].newValue === 'recording' ? 'recording' : 'idle')
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [activeSession])

  async function loadInitialState() {
    chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.GET_STATUS }, (response) => {
      if (response?.state) {
        setState(response.state === 'recording' ? 'recording' : 'idle')
        setActiveSession(response.session)
      }
    })
    loadPastSessions()
  }

  async function loadPastSessions() {
    const sessions = await db.sessions
      .where('status')
      .equals('completed')
      .reverse()
      .sortBy('endedAt')
    setPastSessions(sessions)
  }

  const handleStartRecording = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.url || !tab.id || !tab.url.startsWith('http')) return

    chrome.runtime.sendMessage(
      { action: MESSAGE_ACTIONS.START_RECORDING, payload: { name: sessionName, url: tab.url } },
      (response) => {
        if (response?.success) {
          setState('recording')
          setActiveSession(response.session)
        }
      }
    )
  }

  const handleStopRecording = () => {
    chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.STOP_RECORDING }, async (response) => {
      if (response?.success) {
        setState('idle')
        setActiveSession(null)
        setSessionName('')
        await loadPastSessions()
      }
    })
  }

  const handleGenerate = async (session: RecordingSession, mode: GenerationMode) => {
    setProcessingId(session.id)
    setLoadingMessage('Correlating events...')

    try {
      const events = await db.events.where('sessionId').equals(session.id).sortBy('timestamp')
      if (events.length === 0) {
        alert('No events captured for this session.')
        setProcessingId(null)
        return
      }

      const steps = correlateEvents(events)
      const flow: ProcessedFlow = {
        sessionName: session.name,
        domain: session.domain,
        startUrl: session.startUrl,
        steps
      }

      let finalMarkdown = generateMarkdown(flow)

      if (mode === 'enhanced') {
        setLoadingMessage('Enhancing with AI (Nemotron)... This may take a few seconds.')
        const result = await enhanceMarkdown(finalMarkdown)
        if (result.success && result.data) {
          finalMarkdown = result.data
        } else {
          alert(`AI Enhancement failed: ${result.error}\n\nFalling back to raw generation.`)
        }
      }

      setLoadingMessage('Saving file...')
      await saveFileToSystem(finalMarkdown, `${session.name.replace(/\s+/g, '_')}_BEHAVIOR.md`)
    } catch (error) {
      console.error('[AgentLens] Generation failed:', error)
    } finally {
      setProcessingId(null)
      setLoadingMessage('')
    }
  }

  return (
    <div className="relative flex flex-col p-6 gap-6 max-h-[600px] overflow-y-auto">
      {processingId && <LoadingOverlay message={loadingMessage} />}

      <header className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
            <span className="text-xs text-primary-foreground font-bold">A</span>
          </div>
          <h1 className="text-lg font-semibold">AgentLens</h1>
        </div>
        {state === 'recording' && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
            </span>
            REC
          </div>
        )}
      </header>

      <main className="flex flex-col gap-6 flex-1">
        {state === 'idle' ? (
          <div className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Flow name (e.g., 'User Checkout')"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground"
            />
            <Button onClick={handleStartRecording} className="w-full">
              Start Recording
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="bg-foreground/5 p-4 rounded-md border border-border">
              <p className="text-sm font-medium truncate">{activeSession?.name}</p>
              <p className="text-xs text-foreground/60 mt-1 truncate">{activeSession?.startUrl}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-foreground/80">
                <span>Events captured:</span>
                <span className="font-mono font-semibold">{activeSession?.eventCount || 0}</span>
              </div>
            </div>
            <Button variant="destructive" onClick={handleStopRecording} className="w-full">
              Stop Recording
            </Button>
          </div>
        )}

        {pastSessions.length > 0 && (
          <div className="flex flex-col gap-3 border-t pt-4">
            <h2 className="text-sm font-semibold text-foreground/80">Past Recordings</h2>
            <div className="flex flex-col gap-3">
              {pastSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col p-3 rounded-md border border-border bg-background hover:bg-foreground/5 transition-colors gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col overflow-hidden mr-4">
                      <span className="text-sm font-medium truncate">{session.name}</span>
                      <span className="text-xs text-foreground/50">
                        {session.eventCount} events •{' '}
                        {new Date(session.endedAt!).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleGenerate(session, 'raw')}
                      disabled={processingId === session.id}
                    >
                      Raw Generate
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleGenerate(session, 'enhanced')}
                      disabled={processingId === session.id}
                    >
                      Enhance with AI
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="text-[10px] text-foreground/40 text-center border-t pt-4">
        Record flows. Generate context. Empower AI.
      </footer>
    </div>
  )
}
