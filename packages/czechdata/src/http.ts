import {
  fetchJSON as commonFetchJSON,
  fetchText as commonFetchText,
  fetchXML as commonFetchXML,
  type FetchInit,
  type RequestOptions,
} from 'eudata-common'

export const CZ_SOURCE = 'czechdata'

export function czFetchJSON<T>(url: string, source: string, opts?: RequestOptions): Promise<T> {
  return commonFetchJSON<T>(url, withSource(source, opts))
}

export function czFetchText(url: string, source: string, opts?: RequestOptions): Promise<string> {
  return commonFetchText(url, withSource(source, opts))
}

export function czFetchXML(url: string, source: string, opts?: RequestOptions): Promise<string> {
  return commonFetchXML(url, withSource(source, opts))
}

export function czFetchSoap(
  url: string,
  source: string,
  body: string,
  opts?: RequestOptions
): Promise<string> {
  const init: FetchInit = {
    ...withSource(source, opts),
    method: 'POST',
    body,
    contentType: 'text/xml; charset=utf-8',
    headers: { soapaction: '""', ...(opts?.headers ?? {}) },
  }
  return commonFetchXML(url, init)
}

function withSource(source: string, opts: RequestOptions | undefined): FetchInit {
  return { ...(opts ?? {}), source: `cz:${source}` }
}
