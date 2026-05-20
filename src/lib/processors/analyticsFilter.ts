const ANALYTICS_SUBSTRINGS = [
  'google-analytics.com',
  'googletagmanager.com',
  'segment.io',
  'segment.com',
  'mixpanel.com',
  'hotjar.com',
  'fullstory.com',
  'logrocket.io',
  'sentry.io',
  '/analytics',
  '/tracking',
  '/telemetry',
  'nr-data.net',
  'newrelic.com',
  'amplitude.com',
  'hubspot.com',
  'facebook.net',
  'fbcdn.net',
  'doubleclick.net'
]

export function isAnalyticsRequest(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    const path = new URL(url).pathname
    return ANALYTICS_SUBSTRINGS.some(
      (substr) => hostname.includes(substr) || path.includes(substr)
    )
  } catch {
    return false
  }
}