const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-csrf-token',
  'proxy-authorization',
  'www-authenticate'
])

const SENSITIVE_INPUT_NAMES = new Set([
  'password',
  'passwd',
  'creditcard',
  'ccnumber',
  'cvv',
  'ssn',
  'secret'
])

export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const redacted: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
      redacted[key] = '[REDACTED]'
    } else {
      redacted[key] = value
    }
  }
  return redacted
}

export function isSensitiveInput(element: HTMLElement): boolean {
  const type = (element.getAttribute('type') || '').toLowerCase()
  const name = (element.getAttribute('name') || '').toLowerCase()
  const id = (element.getAttribute('id') || '').toLowerCase()

  if (type === 'password') return true
  if (SENSITIVE_INPUT_NAMES.has(name) || SENSITIVE_INPUT_NAMES.has(id)) return true
  
  return false
}

export function truncatePayload(payload: string | null | undefined, maxBytes: number = 10000): string | null {
  if (!payload) return null
  if (payload.length > maxBytes) {
    return `${payload.slice(0, maxBytes)}... [TRUNCATED]`
  }
  return payload
}