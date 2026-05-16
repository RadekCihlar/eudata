export interface ModuleSpec {
  country: 'cz' | 'sk' | 'pl' | 'eu'
  slug: string
  label: string
  description: string
  inputLabel: string
  exampleId: string
}

export const MODULES: ModuleSpec[] = [
  // CZ
  { country: 'cz', slug: 'company', label: 'Company (ARES)', description: 'Business registry', inputLabel: 'ICO', exampleId: '64774716' },
  { country: 'cz', slug: 'insolvency', label: 'Insolvency (ISIR)', description: 'Bankruptcy proceedings', inputLabel: 'ICO', exampleId: '64774716' },
  { country: 'cz', slug: 'vat', label: 'VAT', description: 'Reliability + bank accounts', inputLabel: 'ICO or DIC', exampleId: 'CZ64774716' },
  { country: 'cz', slug: 'trade', label: 'Trade (RŽP)', description: 'Trade license', inputLabel: 'ICO', exampleId: '64774716' },
  { country: 'cz', slug: 'execution', label: 'Execution (CEECR)', description: 'Debt enforcement', inputLabel: 'ICO', exampleId: '64774716' },
  { country: 'cz', slug: 'vehicle', label: 'Vehicle (ISTP)', description: 'STK + odometer', inputLabel: 'Plate', exampleId: '1A23456' },
  { country: 'cz', slug: 'vin', label: 'VIN (NHTSA)', description: 'Decode VIN globally', inputLabel: 'VIN', exampleId: '1HGCM82633A004352' },
  { country: 'cz', slug: 'address', label: 'Address (RÚIAN)', description: 'Validate + geocode', inputLabel: 'Address', exampleId: 'Václavské náměstí 1, Praha' },
  { country: 'cz', slug: 'court', label: 'Court (justice.cz)', description: 'Commercial register', inputLabel: 'ICO', exampleId: '64774716' },
  { country: 'cz', slug: 'budget', label: 'Budget (Monitor)', description: 'Municipal budgets', inputLabel: 'ICO', exampleId: '00064581' },
  { country: 'cz', slug: 'cadastre', label: 'Cadastre (ČÚZK)', description: 'Property registry', inputLabel: 'Parcel', exampleId: '729272/parcela=123' },
  { country: 'cz', slug: 'tenders', label: 'Tenders (Věstník)', description: 'Public procurement', inputLabel: 'Query', exampleId: 'IT services' },
  { country: 'cz', slug: 'recalls', label: 'Recalls (Safety Gate)', description: 'EU product recalls', inputLabel: 'Query', exampleId: 'toy' },
  { country: 'cz', slug: 'weather', label: 'Weather (ČHMÚ)', description: 'Air quality + warnings', inputLabel: 'Location', exampleId: 'Praha' },
  { country: 'cz', slug: 'food', label: 'Food (RASFF)', description: 'Food safety alerts', inputLabel: 'Query', exampleId: 'salmonella' },
  { country: 'cz', slug: 'environment', label: 'Environment (IRZ)', description: 'Emissions + violations', inputLabel: 'ICO', exampleId: '64774716' },
  { country: 'cz', slug: 'risk', label: 'Risk Assessment', description: 'Composite score', inputLabel: 'ICO', exampleId: '64774716' },

  // SK
  { country: 'sk', slug: 'company', label: 'Company (ORSF)', description: 'Unified registry', inputLabel: 'IČO', exampleId: '36421928' },
  { country: 'sk', slug: 'insolvency', label: 'Insolvency', description: 'ru.justice.sk', inputLabel: 'IČO', exampleId: '36421928' },
  { country: 'sk', slug: 'vat', label: 'VAT', description: 'Financial Administration', inputLabel: 'IČO or IČ DPH', exampleId: '36421928' },
  { country: 'sk', slug: 'debtors', label: 'Debtors', description: '4 insurance lists', inputLabel: 'IČO', exampleId: '36421928' },
  { country: 'sk', slug: 'financial', label: 'Financial', description: 'Statements', inputLabel: 'IČO', exampleId: '36421928' },
  { country: 'sk', slug: 'court', label: 'Court (otvorenesudy)', description: 'Decisions', inputLabel: 'IČO', exampleId: '36421928' },
  { country: 'sk', slug: 'contracts', label: 'Contracts (CRZ)', description: 'Public contracts', inputLabel: 'IČO', exampleId: '36421928' },
  { country: 'sk', slug: 'tenders', label: 'Tenders (ÚVO)', description: 'Procurement', inputLabel: 'IČO', exampleId: '36421928' },
  { country: 'sk', slug: 'ubo', label: 'UBO (RPVS)', description: 'Beneficial owners', inputLabel: 'IČO', exampleId: '36421928' },
  { country: 'sk', slug: 'risk', label: 'Risk Assessment', description: 'SK composite score', inputLabel: 'IČO', exampleId: '36421928' },

  // PL
  { country: 'pl', slug: 'company', label: 'Company (KRS)', description: 'National Court Register', inputLabel: 'NIP', exampleId: '5213003798' },
  { country: 'pl', slug: 'sole-trader', label: 'Sole Trader (CEIDG)', description: 'Sole proprietorships', inputLabel: 'NIP', exampleId: '5213003798' },
  { country: 'pl', slug: 'vat', label: 'VAT (White List)', description: 'Bank account verification', inputLabel: 'NIP', exampleId: '5213003798' },
  { country: 'pl', slug: 'insolvency', label: 'Insolvency (KRZ)', description: 'Bankruptcy register', inputLabel: 'NIP', exampleId: '5213003798' },
  { country: 'pl', slug: 'ubo', label: 'UBO (CRBR)', description: 'Beneficial owners', inputLabel: 'NIP', exampleId: '5213003798' },
  { country: 'pl', slug: 'tenders', label: 'Tenders (UZP)', description: 'Procurement', inputLabel: 'Query', exampleId: 'IT' },
  { country: 'pl', slug: 'sanctions', label: 'Sanctions (PL)', description: 'National list', inputLabel: 'Name', exampleId: 'Acme' },
  { country: 'pl', slug: 'risk', label: 'Risk Assessment', description: 'PL composite score', inputLabel: 'NIP', exampleId: '5213003798' },

  // EU
  { country: 'eu', slug: 'vies', label: 'VIES VAT', description: 'EU-wide VAT validation', inputLabel: 'VAT (CC+digits)', exampleId: 'CZ64774716' },
  { country: 'eu', slug: 'sanctions', label: 'EU Sanctions', description: 'Consolidated list', inputLabel: 'Name', exampleId: 'Acme' },
  { country: 'eu', slug: 'lei', label: 'LEI (GLEIF)', description: 'Legal Entity Identifier', inputLabel: 'LEI or name', exampleId: 'Acme Corp' },
  { country: 'eu', slug: 'trademark', label: 'Trademark (EUIPO)', description: 'EU trademarks', inputLabel: 'Query', exampleId: 'apple' },
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

export function findModule(country: string, slug: string): ModuleSpec | null {
  return MODULES.find((m) => m.country === country && m.slug === slug) ?? null
}
