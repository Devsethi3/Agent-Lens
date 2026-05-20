export type EventType = 'click' | 'input' | 'navigation' | 'network' | 'mutation'

export interface BaseEvent {
  id: string
  sessionId: string
  timestamp: number
  type: EventType
}

export interface ClickEvent extends BaseEvent {
  type: 'click'
  tagName: string
  textContent: string | null
  ariaLabel: string | null
  testId: string | null
  cssSelector: string
  boundingRect: DOMRect
}

export interface InputEvent extends BaseEvent {
  type: 'input'
  tagName: string
  inputType: string
  name: string | null
  value: string | null // Will be sanitized for passwords
  ariaLabel: string | null
  testId: string | null
}

export interface NavigationEvent extends BaseEvent {
  type: 'navigation'
  from: string
  to: string
}

export interface NetworkEvent extends BaseEvent {
  type: 'network'
  method: string
  url: string
  requestHeaders?: Record<string, string>
  requestBody?: string | null
  statusCode: number
  responseBody?: string | null
  initiatorType: string
  duration: number
}

export interface MutationEvent extends BaseEvent {
  type: 'mutation'
  targetSelector: string
  addedNodes: number
  removedNodes: number
  attributeChanged: boolean
  textChanged: boolean
}

export type CaptureEvent = ClickEvent | InputEvent | NavigationEvent | NetworkEvent | MutationEvent