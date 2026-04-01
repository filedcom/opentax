# 1040 Coverage Plan — Drake Parity

> Generated: 2026-04-01 | Updated: 2026-04-01

## Current State

- **263 screens** tracked in `nodes/inputs/screens.json` (Drake screen-code reference)
- **178 have node implementations** → 67.7% coverage
- **85 screens missing** node coverage (of which ~29 are admin/non-computational)

---

## Gap Classification

Of the 56 remaining computational gaps:

| Category | Count | In Scope |
|---|---|---|
| Complex / international (5471, NR, 965) | ~22 | ✅ Yes — professional coverage |
| Schema extensions (K-1 tabs, QBI, BAN) | ~9 | ⚠️ Partial — extend existing nodes |
| Rare / informational forms | ~10 | ⚠️ Low priority |
| Admin / operational | ~29 | ❌ No — no computation |

**Admin screens excluded** (no tax computation): ELEC, MISC, PRNT, EF, PMT, IFP, PIN/8879/8878,
CONS, USE, DISC, 2848, 4506, 843, 911, COMM, IDS, DOCS, FAQ, FAFS, W-4, W-4P, W-9, W7, 7216,
56, STEX, 8948, HC, PRNT, 8275 (~29 screens).

---

## Completed ✅

### Phase 1: Self-Employed & Business Owner (DONE)

| Screen | Node | Status |
|---|---|---|
| `SEP` | `inputs/sep_retirement` | ✅ Built |
| `LOSS`, `NOL` | `inputs/nol_carryforward` | ✅ Built |
| `3800`, `GBC` | `inputs/f3800` | ✅ Built |
| `2106` | `inputs/f2106` | ✅ Built |
| `BAN` | — | ⚠️ Schema extension (8995/8995a) |
| `K199` | — | ⚠️ Schema extension (k1_partnership, k1_s_corp) |

### Phase 2: Deduction & Credit Worksheets (DONE)

| Screen | Node | Status |
|---|---|---|
| `LTC` | `inputs/ltc_premium` | ✅ Built |
| `STAX` | `inputs/sales_tax_deduction` | ✅ Built |
| `AUTO` | `inputs/auto_expense` | ✅ Built |
| `DEPL` | `inputs/depletion` | ✅ Built |
| `CR` | `intermediate/form8582cr` | ✅ Built |
| `LSSA` | `inputs/lump_sum_ss` | ✅ Built |

### Phase 3: Special Tax Situations (DONE)

| Screen | Node | Status |
|---|---|---|
| `CLGY` | `inputs/clergy` | ✅ Built |
| `915F` | `inputs/f8915f` | ✅ Built |
| `915D` | `inputs/f8915d` | ✅ Built |
| `HOME` | `inputs/f5405` | ✅ Built |
| `HSH` | `inputs/household_wages` | ✅ Built |
| `FEC` | `inputs/fec` | ✅ Built |
| `QSE` | `inputs/qsehra` | ✅ Built |

### Phase 4: Specialty Credits & Rare Forms (DONE)

| Screen | Node | Status |
|---|---|---|
| `8917` | `inputs/f8917` | ✅ Built (expired; no federal output) |
| `8867` | `inputs/f8867` | ✅ Built (compliance checklist) |
| `8859` | `inputs/f8859` | ✅ Built (DC homebuyer credit carryforward) |
| `8820`, `DRUG` | `inputs/f8820` | ✅ Built (Orphan Drug Credit) |
| `8828` | `inputs/f8828` | ✅ Built (mortgage subsidy recapture) |
| `8835` | `inputs/f8835` | ✅ Built (renewable electricity PTC) |
| `8844` | `inputs/f8844` | ✅ Built (empowerment zone credit) |
| `8864` | `inputs/f8864` | ✅ Built (biodiesel/SAF credit) |
| `8896` | `inputs/f8896` | ✅ Built (low-sulfur diesel credit) |
| `8912` | `inputs/f8912` | ✅ Built (tax credit bonds) |
| `8978` | `inputs/f8978` | ✅ Built (BBA partner adjustment tax) |
| `8611` | `inputs/f8611` | ✅ Built (LIHTC recapture) |

### Phase 5: International (Partial)

| Screen | Node | Status |
|---|---|---|
| `8833` | `inputs/f8833` | ✅ Built (treaty disclosure) |
| `8840` | `inputs/f8840` | ✅ Built (closer connection) |
| `8843` | `inputs/f8843` | ✅ Built (exempt individuals) |
| `8854` | `inputs/f8854` | ✅ Built (expatriation) |
| `8805` | `inputs/f8805` | ✅ Built (§1446 withholding credit) |
| `8082` | `inputs/f8082` | ✅ Built (inconsistent treatment notice) |
| `8873` | `inputs/f8873` | ✅ Built (extraterritorial income) |
| `8288` | `inputs/f8288` | ✅ Built (FIRPTA withholding credit) |
| `8621` | `inputs/f8621` | ✅ Built (PFIC/QEF) |

---

## Remaining Gaps

### Phase 5 (Continued): Complex International

Very high complexity — required for professional firms handling international clients.

| Screen(s) | Form | What | Est. complexity |
|---|---|---|---|
| `5471` + `SCHA`–`SCHR` (11 screens) | Form 5471 + Schedules A/B/C/F/G/H/I-1/J/M/O/P/Q/R | CFC information returns | Very High |
| `NR`, `NR2`, `NR3` | Form 1040-NR + Schedule NEC/OI | Nonresident alien return | Very High |
| `965A/C/D/E` | Forms 965-A/C/D/E | §965 repatriation tax | High |
| `1042` | Form 1042 | Annual withholding for foreign persons | Medium |

### Schema Extensions (No New Nodes)

| Screen | What | Existing Node |
|---|---|---|
| `K1S > Pre-2018 Basis` | Pre-2018 S-corp carryover losses | `k1_s_corp` |
| `K1P > Pre-2018 Basis` | Pre-2018 partner carryover losses | `k1_partnership` |
| `K1S > Pre-2018 At-Risk` | S-corp at-risk basis pre-2018 | `k1_s_corp` |
| `K1P > Pre-2018 At-Risk` | Partner at-risk basis pre-2018 | `k1_partnership` |
| `K1P > Basis Wkst` | Partner basis worksheet | `k1_partnership` |
| `K1S > Basis (7203)` | Form 7203 S-corp stock/debt basis | `k1_s_corp` → new `intermediate/form7203/` |
| `K1F` | Trust K-1 additional fields | `k1_trust` |
| `BAN` | QBI aggregation elections | `intermediate/form8995`, `form8995a` |
| `K199` | QBI amounts from K-1s | `k1_partnership`, `k1_s_corp` |

### Informational / Low Priority

| Screen | Form | What |
|---|---|---|
| `CIDP` | Form 4835 | 4835 additional scenario tab |
| `59E` | Form 1045 AMT | §59(e) unamortized deduction |
| `970` | Form 970 | LIFO inventory method election |
| `3115` | Form 3115 | Accounting method change |
| `4970` | Form 4970 | Trust accumulation distribution tax |
| `8594` | Form 8594 | Asset acquisition statement §1060 |
| `8697` | Form 8697 | Look-back interest (long-term contracts) |
| `8866` | Form 8866 | Look-back interest (income forecast) |
| `8903` | Form 8903 | DPAD (repealed — no output) |
| `8857` | Form 8857 | Innocent spouse relief request |
| `PPP2` | N/A | PPP loan forgiveness (informational) |
| `2120` | Form 2120 | Multiple support declaration |
| `1403` | Form 14039 | Identity theft affidavit |
| `114` | FinCEN 114 | FBAR (filed separately, not with 1040) |
| `RRB2` | RRB-1042S | Nonresident railroad retirement |
| `SSA2` | SSA-1042S | Nonresident SS benefits |
| `W2PR` | W-2PR | Puerto Rico withholding |

---

## Coverage Trajectory

| Milestone | Nodes Added | Coverage |
|---|---|---|
| Baseline | — | 115/247 = **46.6%** |
| Phases 1–3 complete | +18 | 133/263 = ~50.6% |
| Phase 4 complete | +12 | 145/263 = ~55.1% |
| Phase 5 partial (9 intl nodes) | +9 | 154/263 = ~58.6% |
| Duplicate screen tagging | — | 178/263 = **67.7%** ← current |
| + Schema extensions | +0 new nodes | ~185/263 = ~70% |
| + 5471 + NR + 965 | +15–18 | ~200/263 = **~76%** |
| + Informational forms | +8–10 | ~210/263 = **~80%** |

> Remaining ~20% are niche forms (5471 CFC schedules, 1040-NR, 965 repatriation) that represent
> <2% of filed returns but are required for professional-grade completeness.

---

## Verification

```bash
cat forms/f1040/nodes/inputs/screens.json | python3 -c "
import json,sys
d=json.load(sys.stdin)
cov=[s for s in d if s.get('filed_tax_node_type_code')]
print(f'{len(cov)}/{len(d)} covered ({100*len(cov)/len(d):.1f}%)')
"
```

After each phase, run full test suite:
```bash
deno task test
deno check forms/f1040/2025/registry.ts
```
