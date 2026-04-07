# Test Critique — Node-by-Node

## What This Is

A tracked todo for systematically auditing and improving every node's test file.
Process 5 nodes at a time in parallel using sub-agents; mark each batch done when complete.

---

## Agent Instructions (read before each batch)

You are a senior tax-software engineer critiquing test files for an IRS-compliant 1040 engine.
Each node lives at `forms/f1040/nodes/{category}/{name}/index.ts` with tests at `index.test.ts`.

### Your job for each node in your batch:
1. Read `index.ts` to understand the actual computation logic.
2. Read `index.test.ts` to assess what is tested.
3. **Delete or rewrite** every superficial test.
4. **Add** tests that cover real business logic.
5. Ensure the file still compiles and runs (`deno test --filter <node_name>`).

---

## Anti-Patterns to Eliminate

| Anti-pattern | Why it's bad | What to do instead |
|---|---|---|
| `assertEquals(parsed.success, true/false)` — testing Zod schema rejection for basic required fields | Tests Zod, not your code | Keep 1-2 schema tests only for non-obvious constraints (e.g. cross-field `refine()`). Delete repetitive "missing field X fails" clones. |
| `assertEquals(out !== undefined, true)` — checking existence without checking value | Passes even if value is wrong | Assert the exact field value: `assertEquals(fields.line1a_wages, 50000)` |
| `assertEquals(Array.isArray(result.outputs), true)` | Passes on empty array | Assert output count and specific node types |
| `assertEquals(credit > 0 && credit <= 649, true)` — loose range checks | Hides regressions | Pin to exact IRS table value: `assertEquals(credit, 649)` |
| Schema validation tests that call `compute()` expecting a throw | Tests infra not logic | Use `inputSchema.safeParse()` for schema tests or drop entirely |
| Only testing happy path with a single item | Misses aggregation bugs | Test 2–3 items to verify summing, deduplication, routing |
| `as Record<string, unknown>` casting on output fields | Bypasses type safety | Use `fieldsOf(result.outputs, targetNode)` or typed helpers |
| Testing one field per test with identical structure | 30 tests for 30 fields = noise | Combine related fields in one focused test; split only when logic branches |

---

## What Good Tests Look Like

```
GOOD: Tests a computed value at an IRS rule boundary
  "no-children EITC phase-out at $18,591 → $0 credit"
  assertEquals(fields.line27_eitc, 0)

GOOD: Tests multi-item aggregation
  "two W-2s with $30k and $20k wages → line1a = $50k"
  assertEquals(fields.line1a_wages, 50_000)

GOOD: Tests routing fork based on domain logic
  "IRA distribution (box7_ira_sep_simple=true) routes to lines 4a/4b, not 5a/5b"
  assertEquals(fields.line4a_ira_gross, 10_000)
  assertEquals(fields.line5a_pension_gross, undefined)

GOOD: Tests an edge case with an IRS-specified threshold
  "investment income at $11,950 still qualifies for EITC; $11,951 disqualifies"

BAD: "missing payerName fails validation" (5 variations of this = delete 4)
BAD: "empty array does not throw" (tests array, not logic)
BAD: "routing to schedule1 exists" (no value check)
```

---

## Prioritization

Higher-priority nodes (more logic, higher tax impact):
- **High**: w2, f1099r, schedule_c, schedule_e, f1099div, f1099int, eitc, schedule_se, form8606, form8889, form8582, form6251, schedule_d (aggregation), agi_aggregator
- **Medium**: f1099b, f1099g, f1099nec, k1_partnership, k1_s_corp, form8962, form8995, form2441, f8812, f8863
- **Lower**: Single-passthrough nodes (f8288, f8609, f8611, etc.) that mostly just relay fields

---

## Batches

Track status: `[ ]` todo → `[~]` in progress → `[x]` done

---

### BATCH 01 — Core payroll income
- [ ] `forms/f1040/nodes/inputs/w2/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/w2g/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/household_wages/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/clergy/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/rrb1099r/index.test.ts`

**Focus:** Multi-W2 wage/withholding aggregation. Box 12 code routing (HSA, FSA, etc.) to correct downstream nodes. Statutory vs. regular employee fork. Housing allowance exclusion (clergy). RRB Medicare tier logic.

---

### BATCH 02 — Self-employment income
- [ ] `forms/f1040/nodes/inputs/schedule_c/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f1099nec/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f1099k/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f1099m/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f1099patr/index.test.ts`

**Focus:** Net profit calculation (gross − expenses). Meals 50%/80% deduction logic. Multiple Sch C businesses summed. 1099-NEC routing to SE. 1099-PATR domestic production deduction trigger.

---

### BATCH 03 — Retirement distributions
- [ ] `forms/f1040/nodes/inputs/f1099r/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/ssa1099/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8915f/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8915d/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/lump_sum_ss/index.test.ts`

**Focus:** IRA vs. pension routing fork (lines 4a/4b vs. 5a/5b). Distribution code branches (code 1 early withdrawal → Form 5329, code 4 death, code G rollover → excluded). SS taxable portion calculation. Qualified disaster distribution spreading.

---

### BATCH 04 — Investment income
- [ ] `forms/f1040/nodes/inputs/f1099div/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f1099int/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f1099b/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f1099oid/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f2439/index.test.ts`

**Focus:** Qualified dividends (box 1b) vs. ordinary (box 1a). Tax-exempt interest routing. Nominee recipient exclusion. Multi-payer aggregation. AMT preference items.

---

### BATCH 05 — Other 1099 income
- [ ] `forms/f1040/nodes/inputs/f1099g/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f1099c/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/fec/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/ppp_forgiveness/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/sep_retirement/index.test.ts`

**Focus:** State refund taxability logic. Cancellation of debt routing (Box 2). FEC foreign currency conversion. PPP forgiveness exclusion. SEP contribution limit calculation.

---

### BATCH 06 — Deductions
- [ ] `forms/f1040/nodes/inputs/schedule_a/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f1098/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f1098e/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/sales_tax_deduction/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f2106/index.test.ts`

**Focus:** SALT $10k cap. Mortgage interest deduction cap (loan > $750k). Student loan interest routing. State/local tax lookup vs. actual. Employee business expense 2%-AGI floor.

---

### BATCH 07 — Rental & real estate
- [ ] `forms/f1040/nodes/inputs/schedule_e/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f4835/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8949/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/depletion/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/auto_expense/index.test.ts`

**Focus:** Rental income/loss aggregation. Passive activity rules trigger. Farm rental vs. active farm. Capital asset classification (short/long term). Standard vs. actual auto mileage rate.

---

### BATCH 08 — K-1 forms
- [ ] `forms/f1040/nodes/inputs/k1_partnership/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/k1_s_corp/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/k1_trust/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8082/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/qbi_aggregation/index.test.ts`

**Focus:** Ordinary income/loss routing. Separately-stated items (charitable contrib, 179, etc.). AT-risk and passive codes. QBI eligible income extraction. Multiple K-1 summation.

---

### BATCH 09 — Education credits
- [ ] `forms/f1040/nodes/inputs/f8863/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8917/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8862/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/educator_expenses/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/ltc_premium/index.test.ts`

**Focus:** AOTC 40% refundable split. LLC non-refundable. Tuition deduction phase-out. Prior-year EIC disallowance re-claim. Educator $250 cap. LTC age-based deductible max.

---

### BATCH 10 — Child & family credits
- [ ] `forms/f1040/nodes/inputs/f8812/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f2441/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8867/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8332/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f2120/index.test.ts`

**Focus:** CTC/ACTC phase-out at $400k (MFJ) / $200k. Dependent care percentage reduction with income. EITC preparer due-diligence routing. Dependency release form routing. Multiple support agreement.

---

### BATCH 11 — Energy & EV credits
- [ ] `forms/f1040/nodes/inputs/f5695/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8911/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8936/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8834/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8864/index.test.ts`

**Focus:** Residential energy credit 30% cap/basis. Alternative fuel vehicle credit limits. EV credit phase-out by manufacturer. Electric vehicle battery credit. Biodiesel credit per-gallon rate.

---

### BATCH 12 — Business/employer credits
- [ ] `forms/f1040/nodes/inputs/f8941/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f5884/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8826/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8903/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f6478/index.test.ts`

**Focus:** Small employer health insurance 50% cap. Work opportunity credit hours threshold. Disabled access credit $10k max. Domestic production deduction (legacy). Alcohol fuel credit rate.

---

### BATCH 13 — Miscellaneous credits
- [ ] `forms/f1040/nodes/inputs/f8873/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8874/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8881/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8882/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8844/index.test.ts`

**Focus:** Extraterritorial income exclusion. New markets credit. Pension plan startup cost 50% cap. Employer childcare credit 25%/10% calculation. Empowerment zone employment credit.

---

### BATCH 14 — Foreign & international
- [ ] `forms/f1040/nodes/inputs/fec/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8938/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f965/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8833/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8843/index.test.ts`

**Focus:** FEC currency conversion. FATCA threshold ($50k single/$100k MFJ). Section 965 inclusion/deduction netting. Treaty-based return disclosure. Days-of-presence counting (substantial presence).

---

### BATCH 15 — Payment & filing
- [ ] `forms/f1040/nodes/inputs/f9465/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/ext/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f2210/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f1040es/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8379/index.test.ts`

**Focus:** Installment payment routing. Extension payment amount. Underpayment penalty threshold ($1k). Estimated tax voucher amounts. Injured spouse allocation proportional routing.

---

### BATCH 16 — Special situations A
- [ ] `forms/f1040/nodes/inputs/f4852/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8958/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/general/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/preparer/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f1310/index.test.ts`

**Focus:** Substitute W-2 routing (same as W-2). Community property allocation. General context routing. Preparer PTIN passthrough. Deceased taxpayer refund claim.

---

### BATCH 17 — Niche forms A
- [ ] `forms/f1040/nodes/inputs/f8275/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8283/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8288/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f3115/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f3468/index.test.ts`

**Focus:** Disclosure statement. Non-cash charitable deduction >$500. FIRPTA withholding credit. Accounting method change adjustment. Investment credit components.

---

### BATCH 18 — Niche forms B
- [ ] `forms/f1040/nodes/inputs/f4255/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f4970/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f5471/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f56/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f59e/index.test.ts`

**Focus:** Recapture of investment credit. Application of trust rules. CFC income inclusion. Fiduciary relationship. Section 168(i)(4) recapture.

---

### BATCH 19 — Niche forms C
- [ ] `forms/f1040/nodes/inputs/f843/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8594/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8609/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8611/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8621/index.test.ts`

**Focus:** Abatement claim routing. Asset acquisition statement (Section 1060). Low-income housing credit. Recapture of low-income credit. PFIC annual election.

---

### BATCH 20 — Niche forms D
- [ ] `forms/f1040/nodes/inputs/f8697/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8801/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8805/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8814/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8820/index.test.ts`

**Focus:** Interest computed under look-back method. Prior-year AMT credit. Withholding on partnership income. Child election to include child's income — kiddie tax threshold. Orphan drug credit.

---

### BATCH 21 — Niche forms E
- [ ] `forms/f1040/nodes/inputs/f8822/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8828/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8835/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8840/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8854/index.test.ts`

**Focus:** Address change passthrough. Recapture of federal mortgage subsidy. Renewable electricity production credit. Closer-connection exception. Expatriation mark-to-market.

---

### BATCH 22 — Niche forms F
- [ ] `forms/f1040/nodes/inputs/f8857/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8859/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8866/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8888/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8896/index.test.ts`

**Focus:** Innocent spouse relief routing. D.C. first-time homebuyer credit. Interest computation on deferred liability. Refund split into multiple accounts. Low sulfur diesel credit.

---

### BATCH 23 — Niche forms G
- [ ] `forms/f1040/nodes/inputs/f8908/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8912/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8994/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8997/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f114/index.test.ts`

**Focus:** Energy-efficient homes credit. Credit to holders of tax credit bonds. Employer paid family leave credit (12.5%–25%). Opportunity zone gain deferral. FBAR routing (passthrough / no tax).

---

### BATCH 24 — Misc inputs A
- [ ] `forms/f1040/nodes/inputs/f14039/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f3903/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f4136/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/nol_carryforward/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8965/index.test.ts`

**Focus:** Identity theft passthrough. Moving expense (military only). Federal tax paid on fuels credit. NOL carryforward deduction routing. Health coverage exemption passthrough.

---

### BATCH 25 — Misc inputs B
- [ ] `forms/f1040/nodes/inputs/schedule_j/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/schedule_r/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8978/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/qsehra/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f6765/index.test.ts`

**Focus:** Farm income averaging 3-year computation. Credit for elderly/disabled income thresholds. BBA audit adjustment passthrough. QSEHRA reimbursement inclusion/exclusion. R&D credit computation.

---

### BATCH 26 — Misc inputs C
- [ ] `forms/f1040/nodes/inputs/f7207/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8866/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f911/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f970/index.test.ts`
- [ ] `forms/f1040/nodes/inputs/f8696/index.test.ts` *(if exists)*

**Focus:** Advanced manufacturing credit. Interest on deferred liability. Emergency financial aid exclusion. Application of accumulated trust corpus. Verify each node routes to correct downstream.

---

### BATCH 27 — Intermediate: SE, retirement, IRA
- [ ] `forms/f1040/nodes/intermediate/forms/schedule_se/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form8606/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form5329/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form8889/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form8853/index.test.ts`

**Focus:** SE tax = 92.35% × net × 15.3%. IRA basis tracking non-deductible contributions. Early withdrawal 10% penalty exceptions (codes 01–12). HSA contribution limit enforcement ($4,150/$8,300). Archer MSA contribution.

---

### BATCH 28 — Intermediate: Capital gains
- [ ] `forms/f1040/nodes/intermediate/forms/form8949/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form8815/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form4952/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form6781/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form8824/index.test.ts`

**Focus:** Short vs. long-term classification. Wash sale disallowance. EE bond interest exclusion income limit. Investment interest expense deduction. Section 1256 60/40 rule. Like-kind exchange gain deferral.

---

### BATCH 29 — Intermediate: ACA & credits
- [ ] `forms/f1040/nodes/intermediate/forms/form8962/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form8396/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form8880/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form2441/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form8839/index.test.ts`

**Focus:** PTC computation from benchmark plan premium. Mortgage interest credit. Saver's credit tiers (10/20/50%). Dependent care expense cap ($3k/$6k). Adoption credit phase-out calculation.

---

### BATCH 30 — Intermediate: Business deductions
- [ ] `forms/f1040/nodes/intermediate/forms/form_8829/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form4562/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form8990/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form8995/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form8995a/index.test.ts`

**Focus:** Home office percentage calculation. Section 179 limit ($1.16M) + bonus depreciation. Business interest deduction 30%-ATI limit. QBI 20% deduction. W-2 wage limitation on QBI.

---

### BATCH 31 — Intermediate: Passive activity
- [ ] `forms/f1040/nodes/intermediate/forms/form8582/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form6198/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form461/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form4684/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form7203/index.test.ts`

**Focus:** Passive loss suspension vs. allowable. At-risk loss limitation. Excess business loss $289k cap. Casualty/theft loss threshold (10% AGI). S-corp basis tracking for loss deduction.

---

### BATCH 32 — Intermediate: AMT & taxes
- [ ] `forms/f1040/nodes/intermediate/forms/form6251/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form8959/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form8960/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form_1116/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form4137/index.test.ts`

**Focus:** AMT exemption phase-out ($1.22M). NIIT 3.8% on lesser of net investment income or MAGI excess. Foreign tax credit limitation (income category baskets). Tip income SS/Medicare tax calculation.

---

### BATCH 33 — Intermediate: Other computations
- [ ] `forms/f1040/nodes/intermediate/forms/form5695/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form8615/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form4972/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form8919/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form7206/index.test.ts`

**Focus:** Residential energy credit 30% computation. Kiddie tax — unearned income threshold. Lump-sum distribution 10-year averaging. Uncollected SS/Medicare on wages. SE health insurance deduction.

---

### BATCH 34 — Intermediate: Foreign
- [ ] `forms/f1040/nodes/intermediate/forms/form2555/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form6252/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form4797/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form982/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/schedule_f/index.test.ts`

**Focus:** FEIE $126,500 exclusion + housing. Installment sale gross profit percentage. Section 1231 gain/loss characterization. COD income exclusion under insolvency. Farm profit/loss routing.

---

### BATCH 35 — Intermediate: Household & schedules
- [ ] `forms/f1040/nodes/intermediate/forms/schedule_h/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form8582cr/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form6198/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/forms/form8960/index.test.ts` *(if not done)*
- [ ] `forms/f1040/nodes/intermediate/forms/form8853/index.test.ts` *(if not done)*

**Focus:** Household employer SS/Medicare threshold ($2,700). Passive activity credit limitation. At-risk remaining basis. NIIT high-income routing. MSA deduction limit.

---

### BATCH 36 — EITC node (standalone — high impact)
- [ ] `forms/f1040/nodes/intermediate/forms/eitc/index.test.ts`

**Focus (this is the most critical computation node):**
- Pin exact credit amounts to 2025 IRS EITC table for all 4 child counts × 2 filing status groups
- Test phase-in at rate breakpoint (7.65% × earned income)
- Test max credit plateau (earned income at max credit amount)
- Test phase-out start and end for each child count
- Test `agi` vs `earned_income` — use lower (as IRS requires)
- Test investment income disqualifier at $11,950 boundary
- Test MFJ vs single thresholds differ correctly
- Remove all `credit > 0 && credit <= 649` range checks; replace with exact values

---

### BATCH 37 — Aggregation layer
- [ ] `forms/f1040/nodes/intermediate/aggregation/agi_aggregator/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/aggregation/schedule_b/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/aggregation/schedule_d/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/aggregation/schedule2/index.test.ts`
- [ ] `forms/f1040/nodes/intermediate/aggregation/schedule3/index.test.ts`

**Focus:** Multi-source AGI summation with all income types present. Schedule B interest/dividend $1,500 threshold (triggers). Schedule D netting (short loss against long gain). Net capital loss $3k deduction cap + carryover. Schedule 2/3 credit/tax aggregation correctness.

---

## Progress Summary

| Category | Batches | Done |
|---|---|---|
| Input nodes — payroll/income | 01–05 | 0/5 |
| Input nodes — deductions/credits | 06–13 | 0/8 |
| Input nodes — foreign/special | 14–26 | 0/13 |
| Intermediate nodes | 27–35 | 0/9 |
| EITC (special focus) | 36 | 0/1 |
| Aggregation | 37 | 0/1 |
| **Total** | **37 batches** | **0/37** |
