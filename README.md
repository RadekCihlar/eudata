# eudata

Unified TypeScript library for EU public data — company registries, insolvency, VAT, VIN, LEI across Czech Republic, Slovakia, Poland, and the EU layer.

Zero runtime dependencies. Node 20+ built-ins only. Full TypeScript types. Monorepo with per-country packages.

---

## v0.1 — Honest Scope

The original implementation plan listed 45 data sources. Reality check: roughly two-thirds of EU government registries ship as HTML SPAs, CSV-only downloads, or behind login walls — they have no public REST API despite being legally "open data."

**Currently working (live-verified):**

| Module | Source | Use case |
|---|---|---|
| `czechdata.company` | ARES | CZ company by ICO |
| `czechdata.insolvency` | ISIR | CZ bankruptcy check |
| `czechdata.trade` | ARES (trade flag) | CZ trade license |
| `czechdata.vin` | NHTSA | Global VIN decode |
| `polishdata.company.byKRS` | KRS REST API | PL company by KRS number |
| `polishdata.vat` | White List | PL VAT + bank verification |
| `eudata.lei` | GLEIF | EU Legal Entity Identifier |

**Experimental (endpoint or parser issues):**

- `czechdata.vat` — SOAP envelope needs adjustment
- `czechdata.court` — HTML scraping selectors are placeholders
- `czechdata.risk` — composite score works when underlying sources work
- `eudata.vies` — `ec.europa.eu` blocked from some networks

**Not shipping in v0.1** (no public API / needs key / requires scraping):

- SK: ORSF, ru.justice.sk, FS VAT, debtor lists, otvorenesudy, CRZ, ÚVO, RPVS
- PL: CEIDG (needs API key), REGON BIR (needs key), KRZ, CRBR, UZP
- CZ: CEECR, ISTP, RÚIAN REST, ČÚZK, Monitor v3, Safety Gate, ČHMÚ, RASFF, SZPI, IRZ, ČIŽP, NIPEZ
- EU: consolidated sanctions XML, EUIPO, EPO (needs OAuth)

See [`STATUS.md`](./STATUS.md) for the full per-module breakdown including what would be needed to make each broken module work.

---

## Architecture

```
eudata-monorepo/
├── packages/
│   ├── eudata-common/    Shared HTTP client, errors, checksums, XML helpers
│   ├── czechdata/        CZ modules
│   ├── slovakdata/       SK modules (most modules unshipped; needs scrapers)
│   ├── polishdata/       PL modules
│   ├── eudata/           Unified API + EU layer (VIES, LEI, sanctions, EUIPO)
│   └── web/              Next.js explorer UI
├── STATUS.md             Per-endpoint health doc
└── .claude/IMPLEMENTATION_PLAN.md   Original plan (aspirational)
```

Each country package follows the same shape:

```
src/
├── types.ts       TS interfaces
├── utils.ts       ID validators (NIP, ICO, etc.)
├── <source>.ts    One file per data source
├── risk.ts        Composite scoring across sources
└── index.ts       Public exports
```

Country packages depend on `eudata-common`. The `eudata` umbrella re-exports country namespaces and adds the EU layer.

---

## Quick start

### Node.js

```ts
import { company, insolvency, risk } from 'czechdata'

const info = await company.lookup('64774716')
console.log(info.name) // → "Pavel Krása"

const ins = await insolvency.check('64774716')
console.log(ins.insolvent) // → false

const report = await risk.assess('64774716')
console.log(report.score, report.level) // → 100 "low"
```

```ts
import { vat } from 'polishdata'

const r = await vat.check('5260250274')
console.log(r.status, r.registeredBankAccounts.length)
```

```ts
import { lei, vies } from 'eudata'

const records = await lei.search('PKP')
const validation = await vies.validate('CZ64774716')
```

### Browser

Gov APIs almost universally block CORS. Browser fetch will fail. Use the Next.js explorer (`packages/web`) as a reference for backend proxy pattern.

---

## Run the explorer

```bash
npm install
npm run dev -w web
# → http://localhost:3000
```

Sidebar lists currently-working modules. Each module page has an input, example loader, copy-as-curl, raw JSON viewer, and (for risk pages) score visualization with flags.

---

## Development

```bash
npm install           # install workspace deps
npm run build         # build all packages
npm run test          # run all tests (118 unit tests, mocked fetch)
npm run lint          # type-check all packages
```

Per-package:

```bash
npm run test -w czechdata
npm run build -w polishdata
```

---

## Roadmap

**v0.2** — register for free API keys (CEIDG, REGON BIR), unlock 3-4 more PL modules.

**v0.3** — real HTML scrapers for ORSR (SK), CEECR (CZ executions), justice.cz commercial register.

**v0.4** — bulk-data ETL for debtor lists (SK insurance debtors), EU consolidated sanctions XML.

**v0.5** — verify all remaining endpoints; target ~20 working modules across CZ/SK/PL/EU.

Issues and PRs welcome at https://github.com/RadekCihlar/eudata.

---

## License

MIT.
