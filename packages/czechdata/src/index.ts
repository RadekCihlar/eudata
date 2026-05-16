export const VERSION = '0.0.1'

export * from './types.js'
export { company } from './company.js'
export { insolvency } from './insolvency.js'
export { vat } from './vat.js'
export {
  formatICO,
  validateICO,
  assertValidICO,
  validateDIC,
  normalizeDIC,
  decodeLegalForm,
  decodeNACE,
  normalizeAddress,
} from './utils.js'
export { configure, clearCache } from 'eudata-common'
