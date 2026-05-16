/**
 * Minimal XML helpers — no dependencies.
 * Extract values by tag name using regex. Suitable for small SOAP responses.
 * For complex documents, consumers should use a real XML parser.
 */

export function xmlTagText(xml: string, tag: string): string | null {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`<(?:[\\w-]+:)?${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${escaped}>`, 'i')
  const m = re.exec(xml)
  if (!m) return null
  return decodeXmlEntities(m[1]!.trim())
}

export function xmlTagTextAll(xml: string, tag: string): string[] {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`<(?:[\\w-]+:)?${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${escaped}>`, 'gi')
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) out.push(decodeXmlEntities(m[1]!.trim()))
  return out
}

export function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n: string) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
}

export function encodeXmlEntities(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
