import type { ClickEvent, InputEvent, NavigationEvent } from '../types/events'
import { truncateText, cleanLabel } from '../utils/dom'

/**
 * Resolves the most human-readable label for an element.
 * Priority: aria-label > data-testid > innerText (truncated) > name/id > tag name
 */
export function resolveElementLabel(event: ClickEvent | InputEvent): string {
  if ('ariaLabel' in event && event.ariaLabel) {
    return cleanLabel(event.ariaLabel) || event.ariaLabel
  }

  if ('testId' in event && event.testId) {
    return event.testId
  }

  if ('textContent' in event && event.textContent) {
    const cleaned = cleanLabel(event.textContent)
    if (cleaned) return truncateText(cleaned, 60) || event.tagName
  }

  if ('name' in event && event.name) {
    return event.name
  }

  return event.tagName.toLowerCase()
}

export function formatAction(event: ClickEvent | InputEvent | NavigationEvent): string {
  if (event.type === 'click') {
    const label = resolveElementLabel(event)
    return `Clicked '${label}'`
  }

  if (event.type === 'input') {
    const label = resolveElementLabel(event)
    return `Entered text into '${label}'`
  }

  if (event.type === 'navigation') {
    return `Navigated to ${new URL(event.to).pathname}`
  }

  return 'Unknown action'
}