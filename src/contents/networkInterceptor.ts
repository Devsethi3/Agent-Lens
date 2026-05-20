import type { PlasmoCSConfig } from 'plasmo'

export const config: PlasmoCSConfig = {
  matches: ['<all_urls>'],
  world: 'MAIN',
  run_at: 'document_start'
}

const CHANNEL_NAME = 'AGENTLENS_NETWORK'

interface NetworkPayload {
  method: string
  url: string
  requestHeaders?: Record<string, string>
  requestBody?: string | null
  statusCode: number
  responseBody?: string | null
  initiatorType: string
  duration: number
  timestamp: number
}

// Patch Fetch
const originalFetch = window.fetch
window.fetch = async function (input, init) {
  const startTime = performance.now()
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const method = init?.method || 'GET'
  const requestBody = init?.body ? truncatePayload(String(init.body)) : null

  try {
    const response = await originalFetch.apply(this, [input, init])
    const duration = Math.round(performance.now() - startTime)
    
    // Clone response to read body without consuming it
    const clonedResponse = response.clone()
    let responseBody: string | null = null
    try {
      const contentType = clonedResponse.headers.get('content-type')
      if (contentType?.includes('application/json') || contentType?.includes('text/')) {
        responseBody = truncatePayload(await clonedResponse.text())
      }
    } catch { /* ignore body read errors */ }

    postNetworkEvent({
      method,
      url,
      requestBody,
      statusCode: response.status,
      responseBody,
      initiatorType: 'fetch',
      duration,
      timestamp: Date.now()
    })

    return response
  } catch (error) {
    const duration = Math.round(performance.now() - startTime)
    postNetworkEvent({
      method,
      url,
      requestBody,
      statusCode: 0, // Network error
      responseBody: (error as Error).message,
      initiatorType: 'fetch',
      duration,
      timestamp: Date.now()
    })
    throw error
  }
}

// Patch XMLHttpRequest
const originalXHROpen = XMLHttpRequest.prototype.open
const originalXHRSend = XMLHttpRequest.prototype.send

XMLHttpRequest.prototype.open = function (method: string, url: string, ...rest: any[]) {
  ;(this as any)._agentLensData = { method, url, startTime: performance.now() }
  return originalXHROpen.apply(this, [method, url, ...rest] as any)
}

XMLHttpRequest.prototype.send = function (body?) {
  const data = (this as any)._agentLensData
  if (data) {
    data.requestBody = body ? truncatePayload(String(body)) : null
    
    this.addEventListener('load', function () {
      const duration = Math.round(performance.now() - data.startTime)
      let responseBody: string | null = null
      try {
        const contentType = this.getResponseHeader('content-type')
        if (contentType?.includes('application/json') || contentType?.includes('text/')) {
          responseBody = truncatePayload(this.responseText)
        }
      } catch { /* ignore */ }

      postNetworkEvent({
        method: data.method,
        url: data.url,
        requestBody: data.requestBody,
        statusCode: this.status,
        responseBody,
        initiatorType: 'xhr',
        duration,
        timestamp: Date.now()
      })
    })
  }
  return originalXHRSend.apply(this, [body])
}

function truncatePayload(payload: string | null, maxBytes: number = 10000): string | null {
  if (!payload) return null
  if (payload.length > maxBytes) return `${payload.slice(0, maxBytes)}... [TRUNCATED]`
  return payload
}

function postNetworkEvent(payload: NetworkPayload) {
  window.postMessage({ channel: CHANNEL_NAME, payload }, '*')
}