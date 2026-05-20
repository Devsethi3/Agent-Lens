export function generateId(): string {
  return `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
}