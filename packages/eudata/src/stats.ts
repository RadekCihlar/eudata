import { fetchJSON } from 'eudata-common'
import type { RequestOptions } from './types.js'

const EUROSTAT_BASE = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data'

/**
 * Canonical Eurostat dataset codes for common indicators.
 * Full catalogue at https://ec.europa.eu/eurostat/web/main/data/database
 */
export const DATASETS = {
  gdpGrowth: 'tec00115',         // Real GDP growth rate, % change y/y
  gdpPerCapita: 'sdg_08_10',     // GDP per capita
  inflationHICP: 'tec00118',      // Inflation, annual HICP
  unemployment: 'une_rt_a',       // Unemployment rate, annual
  population: 'tps00001',         // Total population
  govtDebt: 'gov_10dd_edpt1',     // General government gross debt
}

export type DatasetKey = keyof typeof DATASETS

interface JsonStatResponse {
  label?: string
  source?: string
  updated?: string
  value?: Record<string, number> | number[]
  id?: string[]
  size?: number[]
  dimension?: Record<string, {
    label?: string
    category?: {
      index?: Record<string, number>
      label?: Record<string, string>
    }
  }>
}

export interface StatsResult {
  dataset: string
  label: string
  source: string
  updated: string
  country: string
  observations: Array<{ time: string; value: number; unit?: string }>
}

function flatten(res: JsonStatResponse, country: string): StatsResult {
  const obs: StatsResult['observations'] = []
  const dimensions = res.dimension ?? {}
  const timeIndex = dimensions['time']?.category?.index ?? {}
  const timeLabels = dimensions['time']?.category?.label ?? {}
  const value = res.value ?? {}

  const ids = res.id ?? []
  const sizes = res.size ?? []
  const timeAxis = ids.indexOf('time')

  for (const [timeCode, timeIdx] of Object.entries(timeIndex)) {
    let cellIdx = 0
    for (let dim = 0; dim < ids.length; dim++) {
      const dimName = ids[dim]!
      const dimIndex = dim === timeAxis ? timeIdx : 0
      cellIdx = cellIdx * (sizes[dim] ?? 1) + dimIndex
      void dimName
    }
    const v = Array.isArray(value) ? value[cellIdx] : value[String(cellIdx)]
    if (typeof v === 'number') {
      obs.push({ time: timeLabels[timeCode] ?? timeCode, value: v })
    }
  }

  return {
    dataset: '',
    label: res.label ?? '',
    source: res.source ?? 'ESTAT',
    updated: res.updated ?? '',
    country,
    observations: obs.sort((a, b) => a.time.localeCompare(b.time)),
  }
}

async function fetchDataset(dataset: string, country: string, opts?: RequestOptions): Promise<StatsResult> {
  const url = `${EUROSTAT_BASE}/${dataset}?format=JSON&geo=${encodeURIComponent(country)}`
  const res = await fetchJSON<JsonStatResponse>(url, { ...(opts ?? {}), source: 'eu:eurostat' })
  const flat = flatten(res, country)
  flat.dataset = dataset
  return flat
}

export const stats = {
  async indicator(key: DatasetKey, country: string, opts?: RequestOptions): Promise<StatsResult> {
    return fetchDataset(DATASETS[key], country, opts)
  },

  async byDataset(dataset: string, country: string, opts?: RequestOptions): Promise<StatsResult> {
    return fetchDataset(dataset, country, opts)
  },

  async summary(country: string, opts?: RequestOptions): Promise<Record<DatasetKey, number | null>> {
    const keys = Object.keys(DATASETS) as DatasetKey[]
    const results = await Promise.allSettled(keys.map((k) => stats.indicator(k, country, opts)))
    const out: Record<string, number | null> = {}
    keys.forEach((k, i) => {
      const r = results[i]
      if (r?.status === 'fulfilled') {
        const latest = r.value.observations[r.value.observations.length - 1]
        out[k] = latest?.value ?? null
      } else {
        out[k] = null
      }
    })
    return out as Record<DatasetKey, number | null>
  },
}
