export interface RequestOptions {
  timeout?: number
  retries?: number
  cacheTTL?: number
  noCache?: boolean
  signal?: AbortSignal
  headers?: Record<string, string>
  userAgent?: string
}

export interface GeoPoint {
  latitude: number
  longitude: number
}

export interface BaseAddress {
  formatted: string
  street?: string | null
  houseNumber?: string | null
  city?: string | null
  postalCode?: string | null
  country: string
}

export interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export interface GlobalConfig {
  cacheTTL: number
  timeout: number
  retries: number
  rateLimitPerMinute: number
  userAgent: string
}
