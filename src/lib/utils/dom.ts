const IGNORED_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'BR', 'HR'])

export function getStableSelector(el: Element): string {
  if (el.id) return `#${CSS.escape(el.id)}`
  if (el instanceof HTMLElement && el.dataset.testid) return `[data-testid="${el.dataset.testid}"]`

  const tag = el.tagName.toLowerCase()
  if (el.className && typeof el.className === 'string') {
    const classes = el.className
      .split(' ')
      .filter((c) => c && !c.startsWith('css-') && !c.startsWith('sc-')) // Filter styled-components/emotion
      .slice(0, 2)
      .join('.')
    if (classes) return `${tag}.${classes}`
  }

  return tag
}

export function isIgnoredNode(node: Node): boolean {
  if (!(node instanceof Element)) return true
  // Don't ignore elements that might be interactive or contain info
  const tagName = node.tagName.toUpperCase()
  if (IGNORED_TAGS.has(tagName)) return true
  if (node.getAttribute('aria-hidden') === 'true') return true
  
  // Ignore purely layout elements with no content and no ID/Class
  if (tagName === 'DIV' && !node.id && !node.className && !node.textContent?.trim()) return true
  
  return false
}

export function findInterestingParent(el: Element): Element {
  let curr: Element | null = el
  while (curr && curr !== document.body) {
    const tagName = curr.tagName.toUpperCase()
    const role = curr.getAttribute('role')
    
    if (
      tagName === 'BUTTON' || 
      tagName === 'A' || 
      tagName === 'INPUT' || 
      tagName === 'SELECT' || 
      tagName === 'TEXTAREA' ||
      tagName === 'SVG' ||
      role === 'button' ||
      role === 'link' ||
      role === 'menuitem' ||
      (curr as any).onclick ||
      curr.hasAttribute('data-testid') ||
      curr.hasAttribute('aria-label')
    ) {
      return curr
    }
    curr = curr.parentElement
  }
  return el
}

export function cleanLabel(text: string | null): string | null {
  if (!text) return null
  // Remove JSON-like content
  if (text.includes('{"') || text.includes('[{')) {
    const match = text.match(/^[^{[]+/)
    if (match) return match[0].trim()
  }
  return text.trim()
}

export function truncateText(text: string | null, maxLength: number = 80): string | null {
  if (!text) return null
  const cleaned = text.replace(/\s+/g, ' ').trim()
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}...` : cleaned
}