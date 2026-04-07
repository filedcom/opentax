# Release Kanban — @filed/tax-engine

> Last updated: 2026-04-07 (updated after v3.1 green suite)
> Goal: Production-grade federal 1040 calculation engine usable by AI agents and releasable as a product.

---

## DONE

| Item | Completed | Notes |
|------|-----------|-------|
| DAG execution engine | 2026-03 | Pure nodes, topological sort, `mergePending` accumulation |
| 184 form/node implementations | 2026-03 | W-2, 1099 series, Schedule C/D/E/F/SE/A, K-1, EITC, AMT, QBID, etc. |
| 51 benchmark scenarios passing | 2026-04 | All $5-tolerance checks pass |
| OutputNodes compile-time routing safety | 2026-03 | Type-safe output routing enforced at compile time |
| USAmountType integer rounding | 2026-04-01 | `Math.round()` in `mef/xml.ts` |
| XML namespace fix (X0000-008) | 2026-04-01 | `xmlns:efile` added to root `<Return>` element |
| Preparer/ERO input node | 2026-04-01 | PTIN, EFIN, firm name/EIN; MeF header emits `<PaidPreparerInfo>` |
| Export gating on reject rules | 2026-04-01 | `return export` blocks on reject-severity validation failures |
| F8812 Part II-B payroll method | 2026-04-01 | ACTC = max(Part II-A, Part II-B) for 3+ children |
| forEach / everyItem / sumOfAll / allDistinct DSL | 2026-04-07 | Phase 17 validation combinators |
| Phase 1-17 nodes complete | 2026-04-07 | All 45 target nodes built and verified |
| v3.0 Drake Parity milestone archived | 2026-04-07 | |
| Fix 121 failing tests | 2026-04-07 | CTC $2,200, std deduction add-ons, SSA routing, AGI aggregator, f8812, f8995, MeF builders |
| Fix AMT MeF XML tag mismatch (f6251) | 2026-04-07 | XSD-correct tags; removed bad guard condition |
| Fix Schedule B MeF builder | 2026-04-07 | TotalInterestAmt / ExcludableSavingsBondIntAmt |
| Fix f8959 MeF builder | 2026-04-07 | Implemented build() stub; XSD nesting corrected |
| Fix MeF builder 29-form presence check | 2026-04-07 | documentId attribute pattern; all 29 forms present |
| Fix MeF header element names | 2026-04-07 | TaxPeriodBeginDt, binaryAttachmentCnt, ReturnTypeCd |
| `returns/` in `.gitignore` | 2026-04-07 | Already present; verified |
| **v3.1 — Green Suite milestone** | 2026-04-07 | 6102/6102 tests passing; 0 failures |

---

## TODO — Fix What's Broken (Phase A · ✅ DONE)

> All P0 items resolved. Remaining P1/P2 items carried forward.

| Priority | Item | Detail |
|----------|------|--------|
| P1 | Verify `returnVersion` string | Cross-check `"2025v3.0"` against IRS Pub 4164; update builder + test |
| P1 | Add rejection e2e tests | 5+ scenarios constructing deliberately invalid returns asserting `canFile === false` |
| P1 | Add capital gains e2e | 1099-B → Schedule D → QDCGT worksheet end-to-end scenario |
| P2 | Add stress tests | 10+ W-2s, 20+ K-1s, 50+ Schedule E properties |
| P2 | Fix `validSSN` dead branch | `predicates.ts` line 106 — unreachable ITIN branch |

---

## TODO — Security Baseline (Phase B · ~2-3 weeks)

| Priority | Item | Detail |
|----------|------|--------|
| ~~P0~~ | ~~Add `returns/` to `.gitignore`~~ | ✅ Already present |
| P0 | Encrypt returns at rest | AES-256 for `./returns/<uuid>/return.json`; key from env var |
| P1 | Add access control to CLI | User identity (even just env-based) before read/write operations |
| P1 | Implement audit log | Append-only log of return access, creation, modification |
| P2 | Document data retention policy | IRS requires 3-year minimum; define deletion workflow |

---

## TODO — E-File Plumbing (Phase C · ~5-7 weeks)

| Priority | Item | Detail |
|----------|------|--------|
| P0 | Implement Form 8879 | Input node + validation rules + MeF XML builder; required for any e-file |
| P0 | Build MeF ZIP package format | Manifest + XML + binary attachment bundle; required by all clearinghouses |
| P1 | Integrate with one clearinghouse | Drake, TaxAct, or CrossLink API; avoids direct IRS transmitter path |
| P1 | Implement acknowledgement processing | Parse A-file (accepted), R-file (rejected), P-file (pending); update return state |
| P1 | Register software ID with IRS | IRS Pub 3112 — required before any test submission; 4-8 week admin lead time |
| P2 | Build IRS ATS test scenarios | 0/35 complete; required before clearinghouse approval |
| P2 | Automate XSD validation in CI | Run `xmllint --schema` against IRS XSD files on every test run |
| P2 | Implement Form 4868 XML payload | Standalone extension filing; `ext` node data entry exists, XML builder missing |

---

## TODO — API Layer (Phase D · ~3-4 weeks)

| Priority | Item | Detail |
|----------|------|--------|
| P0 | Build REST API wrapper | POST /returns, POST /returns/{id}/forms, GET /returns/{id}/computed, POST /returns/{id}/export |
| P0 | Export OpenAPI / JSON Schema | Machine-readable schema for every node input — allows AI agents to self-describe inputs |
| P1 | Build `TaxEngine` SDK class | High-level API: `createReturn`, `addForm`, `computeReturn`, `validateReturn`, `exportMeF` |
| P1 | Add authentication layer | JWT or API-key auth; tie to access control |
| P1 | Structured summary output | Human-readable summary of refund/owed/key lines (not raw pending dict) |
| P2 | Bulk form import | Accept W-2/1099 batch JSON rather than one-form-at-a-time |
| P2 | Prior-year AGI storage | Store and auto-populate `priorYearAgi` for IRS identity verification |

---

## TODO — State Returns (Phase E · ~16-24 weeks)

> Each state is roughly 2 weeks: computation nodes + validation rules + MeF XML builder.

| Priority | State | Notes |
|----------|-------|-------|
| P0 | California (CA) | Highest filing volume; Schedule CA, FTB rules |
| P0 | New York (NY) | Schedule IT-201, NYC/Yonkers local |
| P1 | Illinois (IL) | Schedule IL-1040 |
| P1 | Pennsylvania (PA) | Schedule PA-40, local taxes |
| P1 | Virginia (VA) | Schedule 760 |
| P2 | New Jersey (NJ) | Schedule NJ-1040 |
| P2 | Massachusetts (MA) | Schedule MA-1040 |
| P2 | Ohio (OH) | Municipal tax complexity |
| P2 | Michigan (MI) | Schedule MI-1040 |
| P3 | Remaining 34 states + DC | |

---

## TODO — Product / Commercial Readiness (Phase F · ~8-12 weeks)

| Priority | Item | Detail |
|----------|------|--------|
| P1 | PDF generation | IRS AcroForm PDF with computed values; branded output |
| P1 | Form 1040-X (amendment) | Amendment node + workflow + MeF XML |
| P1 | Payment voucher (Form 1040-V) | For filers who owe; EFTPS link |
| P2 | Interview / wizard mode | Guided data entry: "What forms do you have?" |
| P2 | Multi-year support | TY2026 without duplicating entire registry; `YearConfig` abstraction |
| P2 | Prior-year return carryover | NOL, capital loss, basis carryforward from prior return |
| P3 | Payment processing | Stripe / EFTPS integration |
| P3 | Professional mode | PTIN login, bulk filing, client portal |
| P3 | Mobile app | React Native / Expo |

---

## Milestones

| Milestone | Phases | Target | Definition of Done |
|-----------|--------|--------|--------------------|
| ✅ **v3.1 — Green Suite** | A | 2026-04-07 | 6102/6102 passing; 0 failures |
| **v3.2 — Secure Storage** | B | ~5-6 weeks | PII encrypted; gitignored; audit log |
| **v4.0 — Federal API** | A+B+C+D | ~10-13 weeks | REST API live; federal returns e-fileable via clearinghouse |
| **v5.0 — Multi-State** | E (top 5 states) | ~22-26 weeks | CA + NY + IL + PA + VA e-fileable |
| **v6.0 — Commercial** | F | ~30-38 weeks | PDF, amendment, interview, multi-year |
