# opentax product board

Live state of the TY2025 Form 1040 MeF release. The full checklist as of
October 18, 2026 (52 open main rows, 154 deferred `future_todo` rows, each with
its evidence) is the [archive](./docs/mef/ty2025/readiness/product-board-archive-2026-10-18.md).
A row closes only with the proof `AGENTS.md` asks for.

## MeF readiness

- **ATS scenarios offline-clean: 8/8.** `bun run check:ats` passes TY2025
  scenarios 1, 2, 3, 4, 5, 8, 12 and 13: no reject-level finding, each return
  valid against the 2025v5.4 `Return1040.xsd`, 71/90 packet values matching and
  the other 19 documented packet conflicts (scenarios 12 and 13). See
  [ATS preparation](./docs/ats/ty2025.md).
- **Schema:** returns declare 2025v5.4, the ATS-valid TY2025 package
  ([`irs/README.md`](./irs/README.md)).
- **Business rules:** no rule under `forms/` uses the `alwaysPass` or
  `irsSide` placeholder any more. #106 implemented the ATS documents' rules;
  #107–#110 replaced the return-assembly, foreign, envelope and form/schedule
  placeholders with offline checks.
- **Submission and transmission:** `opentax return export --type
  mef-submission` writes the Pub 4164 submission ZIP (#105). #112 adds the
  MeF A2A client for WSDL 10.9 and `opentax mef login-check`, `send`,
  `status`, `acks` and `ats-run`, tested against a local mock IRS server
  ([A2A transmission](./docs/mef/transmission.md)).
- **Engine:** #111 fixed self-rental income, the Schedule 8812 credit limit
  worksheet and Form 8960 line 10, and `opentax node list` now shows keyed inputs.

## Blockers

- [ ] **IRS credentials.** ETIN, EFIN, Software ID, ASID and the
  strong-authentication certificate and key, set up as in
  [What the owner provides](./docs/mef/transmission.md#what-the-owner-provides).
- [ ] **Live ATS run.** Nothing has been sent to the IRS. Run
  `opentax mef login-check`, `bun run ats:stage` and `opentax mef ats-run`,
  then confirm the 14
  [first-run assumptions](./docs/mef/transmission.md#assumptions-to-confirm-on-the-first-live-ats-run).
  No local pass substitutes for an accepted acknowledgment.
- [ ] **TY2026 schemas.** `irs/` has only 2026v1.0, which is not ATS-valid;
  TY2026 ATS uses 2026v3.0, then 2026v4.0 from 2026-11-01. Install them as new
  `irs/mef/<version>/` packages and move the TY2026 return and Form 4868 to them.
- [ ] **CLI usability.** The JSON return store cannot hold scenario 2's Form
  1098 source copy, so `ats:stage` skips 1040-02; a user cannot yet prepare
  that return end to end through `opentax`.
- [ ] **State returns.** Only federal Form 1040 and Form 4868 exist under
  `forms/`. No state return is computed; the STATE rules only check a state
  manifest sent alongside the federal return.

## Open engine items

Each links to the domain note that records its source evidence and remaining
scope; the archive has the full row.

- [ ] Form 8283: FMV-reduction statements, appraisals and carryovers ([gap](./docs/mef/ty2025/domains/deductions/charitable/form8283/ty2025-form8283-fmv-reduction-gap.md)).
- [ ] Form 1116: baskets, K-3 combinations and Schedules B/C ([Schedule C](./docs/mef/ty2025/domains/credits/foreign/form1116/ty2025-form1116-schedule-c-gap.md), [main PDF](./docs/mef/ty2025/domains/credits/foreign/form1116/ty2025-form1116-main-pdf-gap.md)).
- [ ] Form 6251: remaining AMT adjustments and Part III ([scope](./docs/mef/ty2025/domains/taxes/amt/form6251/ty2025-form6251-remaining-scope.md)).
- [ ] Form 8962: household MAGI, policy months and shared policies ([dependent MAGI](./docs/mef/ty2025/domains/credits/health/form8962/ty2025-form8962-dependent-magi-gap.md), [policy month](./docs/mef/ty2025/domains/credits/health/form8962/ty2025-form8962-policy-month-gap.md)).
- [ ] Forms 8889/5329: owner-specific HSA eligibility and excess ([paired HSA](./docs/mef/ty2025/domains/adjustments/health/form8889/ty2025-form8889-paired-hsa-gap.md)).
- [ ] Form 8582: activity IDs, dispositions and the next-year ledger ([activity ledger](./docs/mef/ty2025/domains/income/business/form8582/ty2025-form8582-activity-id-gap.md), [entire gain](./docs/mef/ty2025/domains/income/business/form8582/ty2025-form8582-entire-overall-gain-gap.md)).
- [ ] Form 4952: debt tracing, K-1 code B and elections ([gap](./docs/mef/ty2025/domains/deductions/investments/form4952/ty2025-form4952-gap.md)).
- [ ] Form 4972: beneficiary, NUA and Schedule J AMT routes ([gap](./docs/mef/ty2025/domains/taxes/retirement/form4972/ty2025-form4972-gap.md)).
- [ ] Form 3800 and Form 8835: every retained credit source ([Form 3800](./docs/mef/ty2025/domains/credits/business/form3800/ty2025-form3800-pdf-gap.md), [Form 8835](./docs/mef/ty2025/domains/credits/business/form8835/ty2025-form8835-pdf-gap.md)).
- [ ] Forms 8995/8995-A: positive QBI export and Schedules A–D ([gap](./docs/mef/ty2025/domains/deductions/business/form8995/ty2025-form8995-positive-export-gap.md)).
- [ ] Form 8990: debt tracing and interest/ATI inputs ([gap](./docs/mef/ty2025/domains/deductions/business/form8990/ty2025-form8990-gap.md)).
- [ ] Form 8839: carryforward, exclusion and credit ordering ([gap](./docs/mef/ty2025/domains/credits/individual/form8839/ty2025-form8839-gap.md)).
- [ ] Form 7203, Form 9465 and Schedule J ([7203](./docs/mef/ty2025/domains/income/business/form7203/ty2025-form7203-stock-loss-gap.md), [9465](./docs/mef/ty2025/domains/payments/installments/form9465/ty2025-form9465-filing-boundary.md), [Schedule J](./docs/mef/ty2025/domains/taxes/income-averaging/ty2025-schedule-j-integration-gap.md)).
- [ ] The other registered forms' unsupported branches and PDF parity ([form audit](./docs/mef/ty2025/domains/general/return-assembly/form1040/ty2025-form1040-form-audit.md), [registry parity](./docs/mef/ty2025/testing/ty2025-native-pdf-registry-parity.md)).
- [ ] Unregistered IRS document roots and coverage decisions ([root crosswalk](./docs/mef/ty2025/inventory/ty2025-unregistered-root-applicability.md), [coverage queue](./docs/mef/ty2025/domains/general/return-assembly/form1040/ty2025-form1040-coverage-decisions.md)).
