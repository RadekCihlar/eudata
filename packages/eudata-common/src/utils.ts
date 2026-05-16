export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function padLeft(s: string, length: number, char = '0'): string {
  if (s.length >= length) return s
  return char.repeat(length - s.length) + s
}

export function stripNonDigits(s: string): string {
  return s.replace(/\D/g, '')
}

export function isAllDigits(s: string): boolean {
  return /^\d+$/.test(s)
}

export function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

export function parseIsoDate(s: string | null | undefined): string | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  const dmY = /^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/.exec(s.trim())
  if (dmY) {
    const day = padLeft(dmY[1]!, 2)
    const month = padLeft(dmY[2]!, 2)
    return `${dmY[3]}-${month}-${day}`
  }
  return null
}
