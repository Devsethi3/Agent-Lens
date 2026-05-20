import type { CaptureEvent, ClickEvent, InputEvent, MutationEvent, NavigationEvent, NetworkEvent } from '../types/events'
import type { SemanticStep } from '../types/types'
import { formatAction, resolveElementLabel } from './labeler'
import { isAnalyticsRequest } from './analyticsFilter'

const NETWORK_WINDOW_MS = 800
const MUTATION_WINDOW_MS = 1200

export function correlateEvents(events: CaptureEvent[]): SemanticStep[] {
  const steps: SemanticStep[] = []
  let currentStep: SemanticStep | null = null
  let stepNumber = 1

  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp)

  for (const event of sortedEvents) {
    // 1. Trigger a new step on User Action or Navigation
    if (event.type === 'click' || event.type === 'input' || event.type === 'navigation') {
      if (currentStep) {
        steps.push(currentStep)
      }

      currentStep = {
        stepNumber: stepNumber++,
        timestamp: event.timestamp,
        action: formatAction(event),
        elementLabel: extractLabel(event),
        elementType: 'tagName' in event ? event.tagName.toLowerCase() : null,
        triggerEvent: event,
        networkRequests: [],
        domMutations: []
      }
      continue
    }

    // 2. Attach Network Events to the current step
    if (event.type === 'network' && currentStep) {
      const timeDiff = event.timestamp - currentStep.timestamp
      if (timeDiff <= NETWORK_WINDOW_MS && timeDiff >= 0) {
        if (!isAnalyticsRequest(event.url)) {
          currentStep.networkRequests.push(event)
        }
      }
      continue
    }

    // 3. Attach Mutation Events to the current step
    if (event.type === 'mutation' && currentStep) {
      const timeDiff = event.timestamp - currentStep.timestamp
      if (timeDiff <= MUTATION_WINDOW_MS && timeDiff >= 0) {
        currentStep.domMutations.push(event)
      }
      continue
    }
  }

  // Push the final step
  if (currentStep) {
    steps.push(currentStep)
  }

  return deduplicateMutations(steps)
}

function extractLabel(event: ClickEvent | InputEvent | NavigationEvent): string | null {
  if (event.type === 'navigation') return null
  return resolveElementLabel(event)
}

// Summarize mutations to prevent massive markdown files (e.g., "3 mutations on .cart-list")
function deduplicateMutations(steps: SemanticStep[]): SemanticStep[] {
  return steps.map((step) => {
    const mutationMap = new Map<string, { added: number; removed: number; textChanged: boolean }>()

    for (const mut of step.domMutations) {
      const existing = mutationMap.get(mut.targetSelector) || { added: 0, removed: 0, textChanged: false }
      existing.added += mut.addedNodes
      existing.removed += mut.removedNodes
      existing.textChanged = existing.textChanged || mut.textChanged
      mutationMap.set(mut.targetSelector, existing)
    }

    const summarizedMutations: MutationEvent[] = Array.from(mutationMap.entries()).map(
      ([selector, data]) => ({
        id: '',
        sessionId: '',
        timestamp: 0,
        type: 'mutation',
        targetSelector: selector,
        addedNodes: data.added,
        removedNodes: data.removed,
        attributeChanged: false,
        textChanged: data.textChanged
      })
    )

    return { ...step, domMutations: summarizedMutations }
  })
}