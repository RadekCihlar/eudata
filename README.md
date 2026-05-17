# eudata

A TypeScript library for querying EU public business data. Zero runtime dependencies, Node 20+ built-ins only.

Built for due diligence, KYC, supplier checks, sanctions screening, and any other "is this company real / is it in good standing" question you keep having to answer manually.

---

## What you get

### Czech Republic — `czechdata`

- **`company.lookup(ico)`** — full company record from ARES: name, address, legal form, founding date, VAT ID, NACE codes, active status, all registry flags. The single most useful CZ business endpoint.
- **`insolvency.check(ico)`** — insolvency proceedings from ISIR (the official bankruptcy register). Tells you if the company is in active bankruptcy, restructuring, or in the clear.
- **`vin.decode(vin)`** — global VIN decode via NHTSA. Year, make, model, engine, fuel type. Works for any vehicle worldwide, not just Czech.
- **`risk.assess(ico)`** — composite score 0-100 combining company + insolvency + VAT signals. Returns a level (`low`/`medium`/`high`/`critical`) and human-readable flags. The one call you'd make before signing a contract.

### Slovakia — `slovakdata`

- **`company.lookup(ico)`** — pulls the Slovak commercial register (ORSR) via HTML scrape since the country has no public REST API for company data. Returns name, address, legal form, section/vložka, registering court, and statutory board members with roles. Slow (1-2s) but real.

### Poland — `polishdata`

- **`company.byKRS(krs)`** — National Court Register lookup by 10-digit KRS number. Full company including directors and supervisory board (names censored by the official API — that's a Polish legal requirement, not a bug).
- **`vat.check(nip)`** — Polish White List (Biała Lista) VAT verification. Critical for invoicing: paying to an unregistered bank account loses you the VAT deduction. This endpoint gives you all the registered accounts for any NIP plus the active/exempt/deregistered status.
- **`vat.verifyAccount(nip, iban)`** — single boolean: is this bank account registered for this NIP today? Use it on every invoice.

### EU-wide — `eudata`

- **`universal.lookup(query)`** — the meta endpoint. Pass it anything (ICO, NIP, KRS, LEI, company name, ID with country prefix) and it auto-detects country + ID type, fans out to all relevant sources in parallel, and returns a single result with company + VAT + insolvency + LEI attached. Falls back gracefully when individual sources are unreachable.
- **`lei.lookup(leiCode)`** / **`lei.search(name)`** — GLEIF Legal Entity Identifier records. Full address, jurisdiction, status, managing LOU.
- **`lei.children(lei)`** / **`lei.ultimateChildren(lei)`** — corporate hierarchy. Direct subsidiaries or the full tree under an ultimate parent.
- **`wikidata.byName(name)`** — pulls a company's Wikidata entry: founding date, headquarters, industry, ticker, ISIN, LEI cross-link, website, parent organization, named subsidiaries. Useful for cross-referencing what registries tell you.
- **`geocode.search(addr)`** / **`geocode.reverse(point)`** — OpenStreetMap Nominatim. Address → lat/lon (or back). Fills the gap where local address registries are gated.
- **`fx.nbp(curr)`** / **`fx.cnb()`** / **`fx.ecb()`** / **`fx.convert(amount, from, to)`** — three central bank FX feeds (Polish NBP, Czech CNB, European ECB). For converting Polish financials to EUR, Czech budget figures to USD, whatever you need.
- **`vies.validate(vatNumber)`** — EU-wide VAT number validation across all 27 member states.
- **`euTenders.search({country, query, limit})`** — TED (Tenders Electronic Daily) full EU public procurement archive. Hundreds of thousands of notices per country. Returns publication numbers + multi-language PDF/XML links.
- **`domain.lookup(name)`** — RDAP domain WHOIS. Registrar, registration and expiry dates, nameservers, registrant organization where the TLD permits. Handy for sanity-checking a company's online presence.
- **`stats.indicator(key, country)`** / **`stats.summary(country)`** — Eurostat economic data: GDP growth, GDP per capita, HICP inflation, unemployment rate, total population, general-government debt. Country-level macro context for risk assessments.
- **`eori.validate(eori)`** / **`eori.lookup(eori)`** — EU customs operator ID. Format validator + live SOAP check against TAXUD. Sibling to VIES for the import/export side.
- **`eurlex.byCelex(celex)`** / **`eurlex.search({query})`** — EU legislation lookup over the Publications Office SPARQL endpoint. Returns title, document date, type, subject matters, and HTML/PDF links across 24 official languages.
- **`cordis.search({query, country, funder})`** — Horizon EU research projects via OpenAIRE. Covers FP7, H2020, Horizon Europe, plus national funder catalogues. Returns code, dates, coordinator, participants, EC contribution.
- **`fundingTenders.search({query, programme, status})`** — EU Funding & Tenders portal (SEDIA) open calls. Programme, deadline, opening date, topic identifier, portal URL.

### Pure utilities (no network)

- **`validateIBAN(iban)`** / **`parseIBAN(iban)`** — ISO 13616 mod-97 checksum for 84 countries, plus extracts the bank code, branch code, and account number where the format permits.
- **`validatePESEL(p)`** / **`parsePESEL(p)`** — Polish 11-digit personal ID. Decodes date of birth (handles 1800-2200 century offsets) and gender.
- **`validateNIP(n)`** — Polish tax ID checksum.
- **`validateICO(i)`** — Czech & Slovak business ID mod-11 checksum.

---

## Why this exists

Every EU country has its own business registry with its own URLs, response formats, encoding quirks, and access patterns. ARES returns JSON. ORSR returns windows-1250 HTML. KRS returns JSON but censors names. CNB publishes pipe-delimited text. RASFF is a SPA. VIES is SOAP with REST grafted on. The Polish White List takes batches of 30 NIPs but the Czech VAT register takes SOAP envelopes.

Nobody wants to learn all of that to find out if their counterparty filed for bankruptcy. This library is the layer that did the learning, so your code calls `company.lookup('64949681')` and gets back a typed `CompanyInfo` regardless of country.

It's also the layer that knows what's worth caching, where rate limits matter, which sources to retry, and which fields are gov-mangled placeholders versus real data. That's the value — not the individual fetches, but the integration of them.

---

## Install

```bash
npm install eudata
# or just the country package you need
npm install czechdata
npm install polishdata
```

---

## Quick examples

```ts
import { company, insolvency, risk } from 'czechdata'

const info = await company.lookup('64949681')
console.log(info.name)            // → "T-Mobile Czech Republic a.s."
console.log(info.address.formatted) // → "Tomíčkova 2144/1, Chodov, 14800 Praha 4"
console.log(info.legalForm)         // → "as"

const r = await risk.assess('64949681')
console.log(r.score, r.level)        // → 100 "low"
console.log(r.flags.map(f => f.message))
```

```ts
import { vat } from 'polishdata'

const v = await vat.check('5260250995')
console.log(v.name)                          // → "ORANGE POLSKA SPÓŁKA AKCYJNA"
console.log(v.status)                        // → "active"
console.log(v.registeredBankAccounts.length) // → 150

const ok = await vat.verifyAccount('5260250995', '17103015080000000503131100')
// → true; safe to invoice
```

```ts
import { universal, lei, wikidata, fx, euTenders, domain, stats } from 'eudata'

const everything = await universal.lookup('T-Mobile Czech Republic')
// → { country: 'CZ', idType: 'name', lei: {...}, ... }

const hierarchy = await lei.children('5299003ILFQKHJYNK282')
const wd = await wikidata.byName('Orange Polska')
const eur = await fx.convert(1000, 'PLN', 'EUR')

const cz = await euTenders.search({ country: 'CZ', limit: 10 })
// → { total: 341928, notices: [{publicationNumber, pdfUrls, ...}] }

const dom = await domain.lookup('orange.pl')
// → { registrar: 'Corporation Service Company', registered: '1999-01-12', ... }

const macro = await stats.summary('CZ')
// → { gdpGrowth: 2.6, inflationHICP: 2.3, unemployment: 33, population: 10909500, ... }
```

```ts
import { eori, eurlex, cordis, fundingTenders } from 'eudata'

const e = await eori.lookup('DE123456789012345')
// → { eori: 'DE123456789012345', valid: false, name: null, ... }

const gdpr = await eurlex.byCelex('32016R0679')
// → { title: 'Regulation (EU) 2016/679 ... General Data Protection Regulation ...',
//     date: '2016-04-27', type: 'REG', subjects: ['PROT', 'INFO', 'ELSJ'], urls: {...} }

const projects = await cordis.search({ query: 'quantum computing', limit: 10 })
// → { projects: [{code, acronym, title, coordinator, ecContribution, ...}], total: ... }

const calls = await fundingTenders.search({ query: 'climate', limit: 20 })
// → { topics: [{identifier: 'LIFE-2022-SAP-CLIMA-CCM', deadline, url, ...}], total: ... }
```

```ts
import { parseIBAN, parsePESEL } from 'eudata'

parseIBAN('CZ6508000000192000145399').bankCode  // → "0800"
parsePESEL('44051401359').dateOfBirth            // → "1944-05-14"
```

---

## Architecture

```
packages/
├── eudata-common/   Shared HTTP client, error classes, checksum validators,
│                    HTML scrape helpers, IBAN/PESEL utilities
├── czechdata/       Czech sources (ARES, ISIR, NHTSA, VAT SOAP, risk)
├── slovakdata/      Slovak sources (ORSR HTML scraper)
├── polishdata/      Polish sources (KRS, White List)
└── eudata/          Unified API + EU layer (LEI, VIES, Wikidata, geocode,
                     FX, universal lookup)
```

Each country package can be installed and used on its own. The `eudata` umbrella re-exports everything and adds the cross-border helpers.

Country packages depend on `eudata-common`, which handles the boring stuff: retries with exponential backoff, in-memory TTL cache, per-source rate limiting, proper error hierarchy (`HttpError`, `TimeoutError`, `ParseError`, etc.), and the universal mod-11 / mod-97 checksums shared across the EU.

---

## Configuration

```ts
import { configure, clearCache } from 'eudata'

configure({
  cacheTTL: 300_000,        // 5 minutes
  timeout: 10_000,
  retries: 2,
  rateLimitPerMinute: 60,
  userAgent: 'MyApp/1.0 (contact@example.com)',
})

clearCache() // wipe all cached responses
```

---

## Browser use

Government APIs almost universally block CORS. Calling them from a browser will fail. Run the lib server-side (Node, Bun, Deno, edge functions, etc.) and expose a thin API to your frontend.

---

## Development

```bash
npm install
npm run build
npm run test
npm run lint
```

Per-package:

```bash
npm run test -w czechdata
npm run build -w polishdata
```

---

## License

MIT.
