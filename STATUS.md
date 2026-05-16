# eudata — endpoint status

Live API status as of testing session. Many endpoints in IMPLEMENTATION_PLAN.md are
specifications, not verified URLs. This file tracks reality.

Legend:
- ✅ Verified working
- 🟡 Endpoint correct, parser may need tweaks
- ❌ Endpoint broken / wrong URL / needs different approach
- 🔒 Requires API key / OAuth
- 📄 HTML scraping — no public API

---

## CZ — czechdata

| Module | Status | URL | Issue |
|---|---|---|---|
| company (ARES) | 🟡 needs test | ares.gov.cz/.../ekonomicke-subjekty | Endpoint correct, retry |
| insolvency (ISIR) | 🟡 needs test | isir.justice.cz/.../stat.do | Returns HTML in some cases |
| vat (CRPDPH SOAP) | 🟡 | adisws.mfcr.cz | SOAP envelope may differ |
| trade (RŽP) | ✅ via ARES | ares.gov.cz | Uses ARES stavZdrojeRzp |
| execution (CEECR) | ❌ 404 | ceecr.cz/search | Wrong URL; site uses different paths |
| vehicle (ISTP) | ❌ 404 | mdcr.cz/istp | URL guessed; ISTP has no public scrape endpoint |
| vin (NHTSA) | ✅ | vpic.nhtsa.dot.gov | Works globally |
| address (RÚIAN) | ❌ 404 | vdp.cuzk.cz/vdp/ruian/rest | Real RÚIAN is GML download, no REST API |
| court (justice.cz) | 📄 | or.justice.cz | HTML scraping, selectors placeholder |
| budget (Monitor) | ❌ 404 | monitor.statnipokladna.cz/api | Real API is at /api/v3/ with different paths |
| cadastre (ČÚZK) | ❌ 404 | vdp.cuzk.cz | Real API requires WSDP credentials |
| tenders (NIPEZ) | ❌ | portal.nipez.cz/api | Returns HTML; need real NIPEZ JSON endpoint |
| recalls (Safety Gate) | ❌ HTML | ec.europa.eu/safety-gate-alerts | Returns HTML — real API uses different path |
| weather (ČHMÚ) | ❌ 404 | chmi.cz/files/portal | Files moved; need new air-quality JSON URL |
| food (RASFF) | ❌ HTML | webgate.ec.europa.eu | Returns HTML; need rasff-window API |
| environment (IRZ) | ❌ 404 | irz.cz/api | No public API; data only via downloads |
| risk | depends on above | — | Works only when underlying sources work |

## SK — slovakdata

| Module | Status | Issue |
|---|---|---|
| company (ORSF) | ❌ 404 | api.orsf.sk DNS / not public yet |
| insolvency (ru.justice.sk) | ❌ HTML | No JSON API — portal only |
| vat (FS) | ❌ 404 | financnasprava.sk has no JSON API at /api/v1 |
| debtors (4 sources) | ❌ | No JSON APIs; only download CSV/XLSX |
| financial (registeruz.sk) | ❌ HTML | Different REST path needed |
| court (otvorenesudy.sk) | ❌ 404 | API moved or deprecated |
| contracts (CRZ) | ❌ 404 | api.crz.gov.sk path wrong |
| tenders (ÚVO) | ❌ network | Wrong host |
| ubo (RPVS) | ❌ 404 | Portal only, no API |
| risk | depends | — |

## PL — polishdata

| Module | Status | Issue |
|---|---|---|
| company (KRS) | ❌ 404 | api-krs.ms.gov.pl path wrong; real is /OdpisAktualny/{KRS} — needs KRS not NIP |
| sole-trader (CEIDG) | ❌ 404 / 🔒 | Requires API key, different endpoint |
| vat (White List) | ✅ likely | wl-api.mf.gov.pl works, may need retry |
| insolvency (KRZ) | ❌ 401 | Requires session; KRZ portal not public API |
| ubo (CRBR) | ❌ 404 | Portal only |
| tenders (UZP) | ❌ network | Wrong domain |
| sanctions (PL) | ❌ | mswia.gov.pl/sanctions URL wrong |
| risk | ❌ 404 | depends on above |

## EU — eudata

| Module | Status | Issue |
|---|---|---|
| vies | ❌ 403 | REST API requires correct headers/CORS bypass |
| sanctions | ❌ 404 | data.europa.eu URL outdated |
| lei (GLEIF) | ✅ likely | api.gleif.org works |
| trademark (EUIPO) | ❌ network | euipo.europa.eu/copla API wrong path |
| epo | 🔒 | Requires OAuth2 |

---

## Fix priority

1. **VIES** — fix 403 (real public REST endpoint)
2. **ARES** — confirm working
3. **NHTSA** — confirm working
4. **GLEIF LEI** — confirm working
5. **PL White List** — confirm working
6. **CZ ISIR** — find correct JSON endpoint
7. **EU Safety Gate / RASFF** — find correct API
8. **EU Sanctions** — find correct URL
9. **PL KRS** — fix byNIP path
10. Disable broken HTML scrapers (mark as "not implemented")

---

## Strategy

For modules with real APIs: fix endpoint + parser.
For modules that are HTML-only or behind auth: mark UI as "manual scrape" and disable.
For modules requiring API keys: add config support, document key acquisition.
