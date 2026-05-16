export const VERSION = '0.0.1'

export * from './types.js'
export { vies } from './vies.js'
export { sanctions } from './sanctions.js'
export { lei } from './lei.js'
export { trademark } from './trademark.js'
export type { EUTrademark, TrademarkSearchOptions } from './trademark.js'
export { epo } from './epo.js'
export type { EUPatent, EUPatentDetail, PatentSearchOptions } from './epo.js'
export { recalls } from 'czechdata'
export { food } from 'czechdata'
export { detectCountry, stripCountryPrefix } from './router.js'
export { company, vat, insolvency, risk } from './unified.js'
export { universal } from './universal.js'
export type { UniversalResult } from './universal.js'
export { fx } from './fx.js'
export type { FxRate, FxSource } from './fx.js'
export { geocode } from './geocode.js'
export type { GeocodeResult, GeocodeSearchOptions } from './geocode.js'
export { wikidata } from './wikidata.js'
export type { WikidataCompany } from './wikidata.js'
export { validateIBAN, parseIBAN, formatIBAN, validatePESEL, parsePESEL } from 'eudata-common'
export type { IBANInfo, PESELInfo } from 'eudata-common'

export * as cz from 'czechdata'
export * as sk from 'slovakdata'
export * as pl from 'polishdata'

export {
  configure,
  clearCache,
  setRateLimit,
  resetRateLimit,
  EuDataError,
  HttpError,
  TimeoutError,
  ValidationError,
  NotFoundError,
  ParseError,
} from 'eudata-common'
