import type { ProcessedFlow } from '../types/types'

export function generateMarkdown(flow: ProcessedFlow): string {
  const lines: string[] = []

  lines.push(`# App Behavior: ${flow.sessionName}`)
  lines.push(``)
  lines.push(`- **Domain:** ${flow.domain}`)
  lines.push(`- **Start URL:** ${flow.startUrl}`)
  lines.push(`- **Generated:** ${new Date().toISOString()}`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  for (const step of flow.steps) {
    lines.push(`## Step ${step.stepNumber}: ${step.action}`)
    lines.push(``)

    if (step.triggerEvent?.type === 'navigation') {
      lines.push(`- **Route Change:** \`${new URL(step.triggerEvent.to).pathname}\``)
      lines.push(``)
      continue
    }

    if (step.elementLabel) {
      lines.push(`- **Element:** \`${step.elementLabel}\` (${step.elementType || 'unknown'})`)
    }

    // Network Requests
    if (step.networkRequests.length > 0) {
      lines.push(`- **Network Activity:**`)
      for (const req of step.networkRequests) {
        const urlPath = tryExtractPath(req.url)
        lines.push(`  - \`${req.method}\` \`${urlPath}\` → \`${req.statusCode}\``)
        
        if (req.requestBody && req.requestBody !== 'null') {
          lines.push(`    - **Request Body:** \`${truncateJson(req.requestBody)}\``)
        }
        
        if (req.responseBody && req.responseBody !== 'null' && req.statusCode < 400) {
          lines.push(`    - **Response Shape:** \`${truncateJson(req.responseBody)}\``)
        }
      }
    }

    // DOM Mutations
    if (step.domMutations.length > 0) {
      lines.push(`- **UI Updates:**`)
      for (const mut of step.domMutations) {
        let updateDesc = `Element \`${mut.targetSelector}\``
        const changes: string[] = []
        if (mut.addedNodes > 0) changes.push(`${mut.addedNodes} node(s) added`)
        if (mut.removedNodes > 0) changes.push(`${mut.removedNodes} node(s) removed`)
        if (mut.textChanged) changes.push(`text content changed`)
        
        if (changes.length > 0) {
          lines.push(`  - ${updateDesc}: ${changes.join(', ')}`)
        }
      }
    }

    lines.push(``)
  }

  return lines.join('\n')
}

function tryExtractPath(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

function truncateJson(jsonStr: string): string {
  if (jsonStr.length > 150) {
    return `${jsonStr.slice(0, 150)}... (truncated)`
  }
  return jsonStr
}