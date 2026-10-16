# TY2025 owned current shareholder notes, basis-limited loss and QBI carry

## Verified scope

The existing single-owner, ordinary-loss route now accepts
`owned_2025_formal_notes` with mandatory retained current records. A legacy
`new_2025_formal_notes` input that supplies those records must also reconcile
and use them. Removing the owned records from the new kind rejects the source.
Legacy paths and the prior reduced-note export guard remain in place.

The records independently join the shareholder, corporation, executed
instrument, personal cash debit, corporate cash credit, principal ledger, and
each actual repayment. Opening stock basis is derived from original shares times
cash price, matched bank payment and corporate receipt, and complete annual
zero-activity basis records. Missing years and nonzero unproved prior activity
reject. Optional current cash capital joins its separate paid-bank and
corporate-capital records to the stock ledger. Corporate receipts of $6,000 and
paid ordinary costs of $10,000 reconcile to the issued $4,000 loss. Twelve
monthly service logs total 600 hours and support the retained nonpassive
classification. The issued section 199A statement is independently joined to the
corporation and actual K-1.

These are constructed, retained source-contract specimens. Instrument references
containing “signed” are not proof of an externally authenticated signature,
issuer verification or an accepted IRS filing. No generated acknowledgement is
used.

[Form7203 instructions](https://www.irs.gov/instructions/i7203) require bona
fide indebtedness directly to the shareholder, separate formal-note
calculations, and principal repayments before current loss allocation. Here
opening debt face and basis are both zero: line23 restoration is genuinely zero,
line25 is 1.0000, principal repayment is nontaxable, and end-of-year basis is
exhausted by losses. The
[2025 Form8995 instructions](https://www.irs.gov/instructions/i8995) exclude
basis-suspended losses from current QBI and require tracking them separately.

## Independent full-return cases

All cases retain original wages $50,000, withholding $8,000, K-1 loss $4,000,
opening stock $500, primary shareholder identity, and corporation identity.

| Case              | Current capital |      Advances | Principal repaid | Allowed stock/debt | Basis-suspended loss | Current QBI loss carry | AGI / taxable income |  Tax / refund |
| ----------------- | --------------: | ------------: | ---------------: | -----------------: | -------------------: | ---------------------: | -------------------: | ------------: |
| new_note          |           1,000 |         2,000 |                0 |      1,500 / 2,000 |                  500 |                  3,500 |      46,500 / 30,750 | 3,455 / 4,545 |
| partial_repayment |           1,000 |         2,000 |              400 |      1,500 / 1,600 |                  900 |                  3,100 |      46,900 / 31,150 | 3,503 / 4,497 |
| two_repayments    |               0 |         2,000 |        200 + 200 |        500 / 1,600 |                1,900 |                  2,100 |      47,900 / 32,150 | 3,623 / 4,377 |
| two_notes         |               0 | 2,000 + 1,000 |        400 + 200 |        500 / 2,400 |                1,100 |                  2,900 |      47,100 / 31,350 | 3,527 / 4,473 |

The allowed loss reaches ScheduleE, Schedule1 line5 and Form1040 line8. The
$15,750 standard deduction and zero QBI deduction give the shown taxable
incomes; 2025 single Tax Table rows use their $50 interval midpoints. These
S-corporation losses do not generate ScheduleSE. Form8995 line1/2 contains only
the allowed negative qualified loss, line4/15 is zero, and line16 carries its
magnitude. `qbi_loss_carryforward` preserves the existing positive-magnitude
output convention. `basis_suspended_scorp_qbi_loss_7203` separately tracks the
qualified portion excluded under section1366(d); it is not added to current
Form8995.

Native and PDF guards replay the same actual K-1 and basis records and require
both actual Form7203 and Form8995 copies, even at zero QBI deduction. Source,
owner, bank, principal, stock-history, corporate-cost, service-log, capital,
calendar and issued-statement conflicts reject; detached carry, allowed loss,
taxable income and missing copies reject in both export paths. Arbitrary manual
QBI is not a source substitute.

## Terminal evidence

- Source gate: **8/0**, `/tmp/opentax-form7203-owned-debt-source-v8.log`.
- Ten-module compatibility: **200/0**,
  `/tmp/opentax-form7203-owned-debt-compat-v3.log`.
- Immutable new packet originals:
  `/tmp/opentax-form7203-owned-debt-evidence-terminal-v6`. Four complete local
  TY2025v5.4 XSD-valid packets, **28 packet files / 32 pages**. Each has one
  Form7203 (two pages), one Form8995, ScheduleE page2, Schedule1 (two pages),
  and Form1040 (two pages); issued W2 is native XML. No binary attachment is
  required for these basis workpapers.
- Poppler-rendered all-page review: `review/manifest.json`, four contact sheets
  and 32 page PNGs, with selected Form7203/Form8995 full-page zooms. Identity,
  note columns, repayment/gain, stock/debt/carry columns, QBI loss/carry, tax
  and refund reviewed.
- Actual raw-input replay, without regenerating records:
  `/tmp/opentax-form7203-owned-debt-held-v3.log` and
  `/tmp/opentax-form7203-owned-debt-retained-v6-replay-v3/report.json`. Four
  packets / **24 comparable files**: original source, pending, carry, origins
  and PDF exact; native XML exact except ReturnTs; full XSD passes. The four
  independently expected calculation JSON files remain immutable.

Eight historical legacy packet occurrences were preserved by copying all **24
original files** into `/tmp/opentax-form7203-owned-debt-prior-preservation`.
They have three unique file digests and one unique seven-page packet (56 page
occurrences). Every retained PDF is byte-identical. Their whole archived pending
is **not** unchanged: old `form8960:{filing_status:'single',magi:46500}` is now
absent. Archived XML also has one terminal newline not present in freshly
serialized bundles. Independent clean `27b82647d` execution produces the same
pre-existing differences. Clean base versus this patch is exact for pending,
carry, origins and PDF, and XML differs only in ReturnTs. Diagnostics and
originals are preserved; no general normalization or source editing was used.

## Commands and retained-input replay

Run from the isolated checkout with
`PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:$PATH`:

```sh
deno test -A forms/f1040/2025/domains/income/business/form7203/form7203_owned_debt_source.test.ts

deno test -A forms/f1040/nodes/inputs/income/rental-passthrough/k1_s_corp/index.test.ts forms/f1040/nodes/intermediate/forms/income/business/form7203/debt-note.test.ts forms/f1040/nodes/intermediate/forms/income/business/form7203/index.test.ts forms/f1040/nodes/intermediate/forms/deductions/business/form8995/index.test.ts forms/f1040/2025/domains/income/business/form7203/form7203_capital_and_debt.test.ts forms/f1040/2025/mef/forms/income/business/f7203_stock_loss.test.ts forms/f1040/2025/pdf/forms/income/business/f7203_stock_loss.test.ts forms/f1040/2025/mef/forms/deductions/business/f8995/f8995.test.ts forms/f1040/2025/mef/forms/deductions/business/f8995/f8995_reit_only.test.ts forms/f1040/2025/domains/deductions/business/form8995/form8995_zero_source.test.ts
```

`FORM7203_OWNED_DEBT_EVIDENCE_DIR` optionally writes the four packets to a new
output directory; omitted/ungranted optional environment access leaves all
source/calculation/XSD/PDF checks active.

Outside-checkout replayer:
`/tmp/opentax-form7203-owned-debt-retained-replay.ts`. Its positional arguments
are checkout, retained archive, fresh output, `owned` (or `baseline` for the
legacy archive), and optional PDF cache directory:

```sh
deno run -A --config CHECKOUT/deno.json /tmp/opentax-form7203-owned-debt-retained-replay.ts CHECKOUT /tmp/opentax-form7203-owned-debt-evidence-terminal-v6 FRESH_OUTPUT owned PDF_CACHE
```

It reads the retained public inputs, executes the actual return, validates full
XSD, compares each source/pending/carry/origin/PDF and timestamp-only XML, and
fails on a mismatch. It does not call the source factory.

## Remaining existing parent boundaries

Nonzero prior debt restoration and taxable repayment of reduced-basis debt still
require the existing prior note, basis, filed-return and accepted-history byte
proof. No trusted accepted archive was available; that guard is preserved. Prior
nonzero stock-basis activity, prior basis/QBI loss consumption, above-threshold
Form8995-A and additional-owner/business combinations are not proved by these
four packets. Whole-dollar current note allocation retains its existing bounds.
This is a current owned-source and carry-ordering slice, not blanket Form7203,
shareholder-debt, history-authentication or IRS-acceptance completion.

## Main integration evidence

Main standard-task combined gate passes208/0. Actual four retained packets replay exactly across all32 reviewed pages using a private PDF cache, including pending, carry, PDF and origins; native XML differs only by timestamp. Main before/after replay also preserves the older seven-page legacy packet exactly. The old archive differs only by its independently checked pre-existing below-threshold Form8960 removal and historical XML terminal newline. All24 original files were rehashed at both original and preserved paths. Main logs and the exact preservation manifest are recorded in the October6 status archive.
