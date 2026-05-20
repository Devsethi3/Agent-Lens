import type { ClickEvent, InputEvent, MutationEvent, NavigationEvent, NetworkEvent } from './events'

export interface SemanticStep {
  stepNumber: number
  timestamp: number
  action: string // e.g., "Clicked 'Add to Cart'"
  elementLabel: string | null
  elementType: string | null
  triggerEvent: ClickEvent | InputEvent | NavigationEvent | null
  networkRequests: NetworkEvent[]
  domMutations: MutationEvent[]
}

export interface ProcessedFlow {
  sessionName: string
  domain: string
  startUrl: string
  steps: SemanticStep[]
}