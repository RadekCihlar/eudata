export type ModuleStatus = 'working' | 'experimental' | 'broken' | 'needs_key'

export interface ModuleSpec {
  country: 'cz' | 'sk' | 'pl' | 'eu'
  slug: string
  label: string
  description: string
  inputLabel: string
  exampleId: string
  status: ModuleStatus
  note?: string
}

export const MODULES: ModuleSpec[] = [
  // CZ
  { country: 'cz', slug: 'company', label: 'Company (ARES)', description: 'Business registry', inputLabel: 'ICO', exampleId: '64949681', status: 'working' },
  { country: 'cz', slug: 'insolvency', label: 'Insolvency (ISIR)', description: 'Bankruptcy proceedings', inputLabel: 'ICO', exampleId: '64949681', status: 'working' },
  { country: 'cz', slug: 'vat', label: 'VAT', description: 'Reliability + bank accounts', inputLabel: 'ICO or DIC', exampleId: 'CZ64949681', status: 'experimental', note: 'SOAP envelope may need adjustment' },
  { country: 'cz', slug: 'trade', label: 'Trade (RŽP)', description: 'Trade license via ARES', inputLabel: 'ICO', exampleId: '64949681', status: 'working' },
  { country: 'cz', slug: 'execution', label: 'Execution (CEECR)', description: 'Debt enforcement', inputLabel: 'ICO', exampleId: '64949681', status: 'broken', note: 'CEECR has no public API; needs HTML scraping with valid selectors' },
  { country: 'cz', slug: 'vehicle', label: 'Vehicle (ISTP)', description: 'STK + odometer', inputLabel: 'Plate', exampleId: '1A23456', status: 'broken', note: 'ISTP requires auth, no public scrape endpoint' },
  { country: 'cz', slug: 'vin', label: 'VIN (NHTSA)', description: 'Decode VIN globally', inputLabel: 'VIN', exampleId: '1HGCM82633A004352', status: 'working' },
  { country: 'cz', slug: 'address', label: 'Address (RÚIAN)', description: 'Validate + geocode', inputLabel: 'Address', exampleId: 'Václavské náměstí 1, Praha', status: 'broken', note: 'RÚIAN distributes data via GML download, no REST API' },
  { country: 'cz', slug: 'court', label: 'Court (justice.cz)', description: 'Commercial register', inputLabel: 'ICO', exampleId: '64949681', status: 'broken', note: 'or.justice.cz uses Apache Wicket with stateful URLs; needs session cookies + form posts, not implementable as simple HTML scrape' },
  { country: 'cz', slug: 'budget', label: 'Budget (Monitor)', description: 'Municipal budgets', inputLabel: 'ICO', exampleId: '00064581', status: 'broken', note: 'Monitor API path changed; needs verification' },
  { country: 'cz', slug: 'cadastre', label: 'Cadastre (ČÚZK)', description: 'Property registry', inputLabel: 'Parcel', exampleId: '729272/parcela=123', status: 'needs_key', note: 'WSDP requires registered credentials' },
  { country: 'cz', slug: 'tenders', label: 'Tenders (Věstník)', description: 'Public procurement', inputLabel: 'Query', exampleId: 'IT services', status: 'broken', note: 'NIPEZ JSON path needs research' },
  { country: 'cz', slug: 'recalls', label: 'Recalls (Safety Gate)', description: 'EU product recalls', inputLabel: 'Query', exampleId: 'toy', status: 'broken', note: 'Safety Gate is SPA — no public JSON API' },
  { country: 'cz', slug: 'weather', label: 'Weather (ČHMÚ)', description: 'Air quality + warnings', inputLabel: 'Location', exampleId: 'Praha', status: 'broken', note: 'ČHMÚ JSON URLs moved; needs new endpoints' },
  { country: 'cz', slug: 'food', label: 'Food (RASFF)', description: 'Food safety alerts', inputLabel: 'Query', exampleId: 'salmonella', status: 'broken', note: 'RASFF Window is SPA — no public JSON API' },
  { country: 'cz', slug: 'environment', label: 'Environment (IRZ)', description: 'Emissions + violations', inputLabel: 'ICO', exampleId: '64949681', status: 'broken', note: 'IRZ has no API; data only via bulk downloads' },
  { country: 'cz', slug: 'risk', label: 'Risk Assessment', description: 'Composite score (ARES+ISIR+VAT)', inputLabel: 'ICO', exampleId: '64949681', status: 'experimental', note: 'Depends on VAT SOAP success' },

  // SK
  { country: 'sk', slug: 'company', label: 'Company (ORSR scrape)', description: 'Slovak commercial register via HTML scrape', inputLabel: 'IČO', exampleId: '35763469', status: 'experimental', note: 'Scrapes orsr.sk (windows-1250 HTML); some fields include date suffixes like "(od: …)" that need post-processing' },
  { country: 'sk', slug: 'insolvency', label: 'Insolvency', description: 'ru.justice.sk', inputLabel: 'IČO', exampleId: '35763469', status: 'broken', note: 'Portal only, no JSON API' },
  { country: 'sk', slug: 'vat', label: 'VAT', description: 'Financial Administration', inputLabel: 'IČO', exampleId: '35763469', status: 'broken', note: 'financnasprava.sk JSON path needs research' },
  { country: 'sk', slug: 'debtors', label: 'Debtors', description: '4 insurance lists', inputLabel: 'IČO', exampleId: '35763469', status: 'broken', note: 'Each source publishes CSV/XLSX only, no JSON' },
  { country: 'sk', slug: 'financial', label: 'Financial', description: 'registeruz.sk statements', inputLabel: 'IČO', exampleId: '35763469', status: 'broken', note: 'registeruz.sk blocks API access from non-browser UAs' },
  { country: 'sk', slug: 'court', label: 'Court (otvorenesudy)', description: 'Decisions', inputLabel: 'IČO', exampleId: '35763469', status: 'broken', note: 'otvorenesudy API deprecated' },
  { country: 'sk', slug: 'contracts', label: 'Contracts (CRZ)', description: 'Public contracts', inputLabel: 'IČO', exampleId: '35763469', status: 'broken', note: 'CRZ API v2 path needs verification' },
  { country: 'sk', slug: 'tenders', label: 'Tenders (ÚVO)', description: 'Procurement', inputLabel: 'IČO', exampleId: '35763469', status: 'broken', note: 'Host unreachable' },
  { country: 'sk', slug: 'ubo', label: 'UBO (RPVS)', description: 'Beneficial owners', inputLabel: 'IČO', exampleId: '35763469', status: 'broken', note: 'Portal only' },
  { country: 'sk', slug: 'risk', label: 'Risk Assessment', description: 'SK composite score', inputLabel: 'IČO', exampleId: '35763469', status: 'broken', note: 'Depends on broken sources' },

  // PL
  { country: 'pl', slug: 'company', label: 'Company (KRS)', description: 'National Court Register', inputLabel: 'KRS', exampleId: '0000010681', status: 'experimental', note: 'Use KRS number not NIP; byNIP requires search flow' },
  { country: 'pl', slug: 'sole-trader', label: 'Sole Trader (CEIDG)', description: 'Sole proprietorships', inputLabel: 'NIP', exampleId: '5260250995', status: 'needs_key', note: 'CEIDG v2 requires free API key from biznes.gov.pl' },
  { country: 'pl', slug: 'vat', label: 'VAT (White List)', description: 'Bank account verification', inputLabel: 'NIP', exampleId: '5260250995', status: 'working' },
  { country: 'pl', slug: 'insolvency', label: 'Insolvency (KRZ)', description: 'Bankruptcy register', inputLabel: 'NIP', exampleId: '5260250995', status: 'broken', note: 'KRZ portal requires session — no public API' },
  { country: 'pl', slug: 'ubo', label: 'UBO (CRBR)', description: 'Beneficial owners', inputLabel: 'NIP', exampleId: '5260250995', status: 'broken', note: 'Portal only' },
  { country: 'pl', slug: 'tenders', label: 'Tenders (UZP)', description: 'Procurement', inputLabel: 'Query', exampleId: 'IT', status: 'broken', note: 'UZP API endpoint unverified' },
  { country: 'pl', slug: 'sanctions', label: 'Sanctions (PL)', description: 'National list', inputLabel: 'Name', exampleId: 'Acme', status: 'broken', note: 'MSWIA endpoint URL needs research' },
  { country: 'pl', slug: 'risk', label: 'Risk Assessment', description: 'PL composite score', inputLabel: 'NIP', exampleId: '5260250995', status: 'experimental', note: 'Mostly depends on White List' },

  // EU
  { country: 'eu', slug: 'universal', label: 'Universal Lookup', description: 'Any ID, any country, all sources at once', inputLabel: 'ICO / NIP / KRS / LEI / name', exampleId: '64949681', status: 'working', note: 'Auto-detects country from ID format; tries all relevant sources in parallel; degrades gracefully when individual sources fail' },
  { country: 'eu', slug: 'vies', label: 'VIES VAT', description: 'EU-wide VAT validation', inputLabel: 'VAT (CC+digits)', exampleId: 'CZ64949681', status: 'experimental', note: 'ec.europa.eu may be blocked by ISP/network — try from different network' },
  { country: 'eu', slug: 'sanctions', label: 'EU Sanctions', description: 'Consolidated list', inputLabel: 'Name', exampleId: 'Putin', status: 'broken', note: 'EU sanctions XML token expired; needs current download URL' },
  { country: 'eu', slug: 'lei', label: 'LEI (GLEIF)', description: 'Legal Entity Identifier', inputLabel: 'LEI or name', exampleId: 'Acme', status: 'working' },
  { country: 'eu', slug: 'trademark', label: 'Trademark (EUIPO)', description: 'EU trademarks', inputLabel: 'Query', exampleId: 'apple', status: 'broken', note: 'EUIPO API blocks external requests' },
]

export const COUNTRY_LABELS: Record<string, string> = {
  cz: 'Czech Republic',
  sk: 'Slovakia',
  pl: 'Poland',
  eu: 'EU-wide',
}

export const COUNTRY_FLAGS: Record<string, string> = {
  cz: 'CZ',
  sk: 'SK',
  pl: 'PL',
  eu: 'EU',
}

export const STATUS_META: Record<ModuleStatus, { label: string; color: string; dot: string }> = {
  working: { label: 'Working', color: 'text-emerald-300', dot: 'bg-emerald-500' },
  experimental: { label: 'Experimental', color: 'text-amber-300', dot: 'bg-amber-500' },
  broken: { label: 'Broken', color: 'text-red-300', dot: 'bg-red-500' },
  needs_key: { label: 'Needs API key', color: 'text-sky-300', dot: 'bg-sky-500' },
}

export function findModule(country: string, slug: string): ModuleSpec | null {
  return MODULES.find((m) => m.country === country && m.slug === slug) ?? null
}
