import { parse, type HTMLElement } from 'node-html-parser'
import { fetchBuffer, type FetchInit } from './http.js'

export type { HTMLElement }

/**
 * Fetch + decode + parse HTML in one call.
 * Encoding defaults to UTF-8 but accepts any encoding supported by Node's
 * TextDecoder (e.g. 'windows-1250' for legacy Slovak/Czech sites).
 */
export async function fetchHTML(
  url: string,
  init: FetchInit & { encoding?: string }
): Promise<HTMLElement> {
  const buf = await fetchBuffer(url, init)
  const encoding = init.encoding ?? 'utf-8'
  const html = new TextDecoder(encoding).decode(buf)
  return parse(html, {
    blockTextElements: { script: false, noscript: false, style: false, pre: true },
  })
}

/**
 * Parse a pre-fetched HTML string (used by tests with fixtures).
 */
export function parseHTML(html: string): HTMLElement {
  return parse(html, {
    blockTextElements: { script: false, noscript: false, style: false, pre: true },
  })
}

/**
 * Collapse whitespace and trim. Useful after stripping tags from a cell.
 */
export function normalizeText(s: string): string {
  return s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Return all sibling cells of a <td> labelled by `labelText` (exact match
 * after normalization). Useful for two-column registry layouts:
 * <td>Label:</td><td>VALUE</td>
 */
export function cellsAfterLabel(root: HTMLElement, labelText: string): HTMLElement[] {
  const tds = root.querySelectorAll('td')
  const out: HTMLElement[] = []
  for (let i = 0; i < tds.length; i++) {
    const cell = tds[i]
    if (!cell) continue
    if (normalizeText(cell.text).replace(/:\s*$/, '') === labelText) {
      let j = i + 1
      while (j < tds.length) {
        const next = tds[j]
        if (!next) break
        out.push(next)
        if (next.classList.contains('ra') || next.text.trim() !== '') break
        j++
      }
    }
  }
  return out
}

/**
 * Return the trimmed text of the first sibling cell following `labelText`.
 */
export function textAfterLabel(root: HTMLElement, labelText: string): string | null {
  const cells = cellsAfterLabel(root, labelText)
  const cell = cells[0]
  return cell ? normalizeText(cell.text) : null
}
