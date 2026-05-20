import type { PlasmoCSConfig } from 'plasmo'
import { MESSAGE_ACTIONS, CAPTURE_EVENTS_BATCH_INTERVAL_MS, STORAGE_KEYS } from '../lib/constants'
import { generateId } from '../lib/utils/id'
import { getStableSelector, isIgnoredNode, truncateText, findInterestingParent } from '../lib/utils/dom'
import { isSensitiveInput } from '../lib/utils/privacy'
import type { ClickEvent, InputEvent, MutationEvent, NavigationEvent, CaptureEvent } from '../lib/types/events'

export const config: PlasmoCSConfig = {
  matches: ['<all_urls>'],
  run_at: 'document_idle'
}

const NETWORK_CHANNEL = 'AGENTLENS_NETWORK'
let eventBuffer: CaptureEvent[] = []
let sessionId: string | null = null
let intervalId: number | null = null
let mutationTimeoutId: number | null = null
let pendingMutations: MutationRecord[] = []

// Initialization check
chrome.storage.local.get([STORAGE_KEYS.ACTIVE_SESSION_ID], (data) => {
  if (data[STORAGE_KEYS.ACTIVE_SESSION_ID]) {
    sessionId = data[STORAGE_KEYS.ACTIVE_SESSION_ID]
    startCapture()
  }
})

// Listen for storage changes to start/stop capture across tabs
chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEYS.ACTIVE_SESSION_ID]) {
    const newSessionId = changes[STORAGE_KEYS.ACTIVE_SESSION_ID].newValue
    if (newSessionId && !sessionId) {
      sessionId = newSessionId
      startCapture()
    } else if (!newSessionId && sessionId) {
      stopCapture()
      flushEvents()
      sessionId = null
    }
  }
})

// Message listener for lifecycle events
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === MESSAGE_ACTIONS.START_RECORDING) {
    sessionId = message.payload.session.id
    startCapture()
  } else if (message.action === MESSAGE_ACTIONS.STOP_RECORDING) {
    stopCapture()
    flushEvents()
    sessionId = null
  }
})

// Network listener from MAIN world
window.addEventListener('message', (event) => {
  if (event.source !== window || event.data?.channel !== NETWORK_CHANNEL) return
  if (!sessionId) return

  const payload = event.data.payload
  eventBuffer.push({
    id: generateId(),
    sessionId,
    timestamp: payload.timestamp,
    type: 'network',
    method: payload.method,
    url: payload.url,
    requestBody: payload.requestBody,
    statusCode: payload.statusCode,
    responseBody: payload.responseBody,
    initiatorType: payload.initiatorType,
    duration: payload.duration
  })
})

let isHistoryPatched = false

function startCapture() {
  if (intervalId) return // Already capturing

  document.addEventListener('click', handleClick, true)
  document.addEventListener('input', handleInput, true)
  window.addEventListener('popstate', handleNavigation)
  window.addEventListener('hashchange', handleNavigation)
  window.addEventListener('beforeunload', flushEvents)

  // Patch history to detect SPA navigations (pushState/replaceState)
  if (!isHistoryPatched) {
    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState

    window.history.pushState = function(...args) {
      originalPushState.apply(this, args)
      handleNavigation()
    }
    window.history.replaceState = function(...args) {
      originalReplaceState.apply(this, args)
      handleNavigation()
    }
    isHistoryPatched = true
  }

  // Record initial page load or session start as a navigation event
  if (sessionId) {
    const event: NavigationEvent = {
      id: generateId(),
      sessionId,
      timestamp: Date.now(),
      type: 'navigation',
      from: window.document.referrer || 'unknown',
      to: window.location.href
    }
    eventBuffer.push(event)
    flushEvents()
  }

  startMutationObserver()
  startBatching()
  console.log('[AgentLens] Full capture started')
}

function stopCapture() {
  document.removeEventListener('click', handleClick, true)
  document.removeEventListener('input', handleInput, true)
  window.removeEventListener('popstate', handleNavigation)
  window.removeEventListener('hashchange', handleNavigation)
  window.removeEventListener('beforeunload', flushEvents)

  if (mutationTimeoutId) clearTimeout(mutationTimeoutId)
  if (mutationObserver) {
    mutationObserver.disconnect()
    mutationObserver = null
  }
  
  stopBatching()
  console.log('[AgentLens] Full capture stopped')
}

// --- Event Handlers ---

function handleClick(e: MouseEvent) {
  if (!sessionId) return
  let target = e.target as Element
  if (isIgnoredNode(target)) return

  // Find the interactive element if we clicked a child
  target = findInterestingParent(target)

  const event: ClickEvent = {
    id: generateId(),
    sessionId,
    timestamp: Date.now(),
    type: 'click',
    tagName: target.tagName,
    textContent: truncateText(target.textContent),
    ariaLabel: target.getAttribute('aria-label'),
    testId: target.getAttribute('data-testid'),
    cssSelector: getStableSelector(target),
    boundingRect: target.getBoundingClientRect().toJSON()
  }
  eventBuffer.push(event)
  
  // Flush immediately on click to avoid losing event during navigation
  flushEvents()
}

function handleInput(e: Event) {
  if (!sessionId) return
  const target = e.target as HTMLInputElement
  if (isIgnoredNode(target) || isSensitiveInput(target)) return

  const event: InputEvent = {
    id: generateId(),
    sessionId,
    timestamp: Date.now(),
    type: 'input',
    tagName: target.tagName,
    inputType: target.type,
    name: target.name || target.id,
    value: truncateText(target.value, 120),
    ariaLabel: target.getAttribute('aria-label'),
    testId: target.getAttribute('data-testid')
  }
  eventBuffer.push(event)
}

function handleNavigation() {
  if (!sessionId) return
  const event: NavigationEvent = {
    id: generateId(),
    sessionId,
    timestamp: Date.now(),
    type: 'navigation',
    from: window.document.referrer || 'unknown',
    to: window.location.href
  }
  eventBuffer.push(event)
}

// --- Mutation Observer (Optimized) ---

let mutationObserver: MutationObserver | null = null

function startMutationObserver() {
  mutationObserver = new MutationObserver((mutations) => {
    const filtered = mutations.filter((m) => {
      const target = m.target as Element
      return !isIgnoredNode(target)
    })
    if (filtered.length > 0) {
      pendingMutations.push(...filtered)
      debounceMutations()
    }
  })

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: false // Skip attribute changes to reduce noise for V1
  })
}

function debounceMutations() {
  if (mutationTimeoutId) clearTimeout(mutationTimeoutId)
  mutationTimeoutId = window.setTimeout(processMutations, 150)
}

function processMutations() {
  if (!sessionId || pendingMutations.length === 0) return

  // Group mutations by parent selector to reduce event noise
  const grouped = new Map<string, { added: number; removed: number; textChanged: boolean }>()

  for (const mutation of pendingMutations) {
    const target = mutation.target as Element
    const selector = getStableSelector(target)
    
    const current = grouped.get(selector) || { added: 0, removed: 0, textChanged: false }
    current.added += mutation.addedNodes.length
    current.removed += mutation.removedNodes.length
    if (mutation.type === 'characterData') current.textChanged = true
    grouped.set(selector, current)
  }

  for (const [selector, data] of grouped) {
    const event: MutationEvent = {
      id: generateId(),
      sessionId,
      timestamp: Date.now(),
      type: 'mutation',
      targetSelector: selector,
      addedNodes: data.added,
      removedNodes: data.removed,
      attributeChanged: false,
      textChanged: data.textChanged
    }
    eventBuffer.push(event)
  }

  pendingMutations = []
}

// --- Batching & Flushing ---

function startBatching() {
  if (intervalId) return
  intervalId = window.setInterval(flushEvents, CAPTURE_EVENTS_BATCH_INTERVAL_MS)
}

function stopBatching() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

function flushEvents() {
  if (eventBuffer.length === 0) return
  const batch = [...eventBuffer]
  eventBuffer = []

  try {
    chrome.runtime.sendMessage({
      action: MESSAGE_ACTIONS.EVENT_BATCH,
      payload: batch
    })
  } catch (e) {
    // Context invalidated (e.g., page navigated/reloaded), silently fail
    console.warn('[AgentLens] Failed to send batch, context likely invalidated.')
  }
}