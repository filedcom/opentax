# Owned current open-account debt and independently limited loss

## Authority and scope

[IRS Form7203 instructions](https://www.irs.gov/instructions/i7203) distinguish
written notes from advances without separate written instruments. Current open
account advances/repayments are netted at year end. A balance exceeding $25,000
at that year end receives separate-note treatment beginning the following tax
year; crossing the threshold temporarily does not cause that transition.
[2025 Treasury regulation §1.1367-2(a)(2), (d)(2)](https://www.govinfo.gov/content/pkg/CFR-2025-title26-vol13/pdf/CFR-2025-title26-vol13-sec1-1367-2.pdf)
and [Treasury's promulgated examples](https://www.irs.gov/irb/2008-47_IRB)
provide the annual netting/transition rule. Treatment as separately tracked debt
does not create a signed written instrument.

The new public contract is `owned_2025_open_account`. It requires the existing
owned original stock/payment/zero prior annual activity, current capital,
corporate ordinary receipts/paid costs, participation, and issued K1/QBI records,
plus a complete direct owner/corporation open principal/bank timeline. The
retained oral-demand terms record has 5% interest, a direct principal/interest
claim, cash methods, and no current interest payments. Principal-only payments
provide no interest deduction, receipt, or unpaid-interest debt basis. These are
constructed current source-contract specimens; neither the record of oral terms
nor a bank reference proves outside contract/issuer/bank authentication.

No fake formal-note ID, execution/maturity instrument or signed note reference is
accepted. Every current transaction retains its real date, owned bank cash
change, corporate cash change, principal amount and closing principal. Netting
is independently recomputed before the supplied calculation envelope is used.
The existing stock/issued/ordinary-account/participation joins remain mandatory.
Shared issuers also bind reciprocal share/book/issued inventories and the
complete corporate bank timeline, with distinct open-account versus formal-note
bank events. Owner/corporation capacity is limited before aggregation.

## Independently expected current results

Each unchanged current corporate/issued loss is $4,000, with original stock
$500 and current capital $1,000. Each return has issued wages $50,000 and
withholding $8,000. Threshold accounts retain their actual larger advances; no
loss or income is changed to evade basis/QBI consequences.

| Packet | Principal advances / repayments | Net open advance | Allowed loss | Basis-suspended loss | Tax | Pages |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| net_advance | 2,000 / 400 / additional 800 | 2,400 | 3,900 | 100 | 3,407 | 8 |
| fully_repaid | 2,000 / 2,000 | 0 | 1,500 | 2,500 | 3,695 | 8 |
| year_end_25000 | 25,000 / 0 | 25,000 | 4,000 | 0 | 3,395 | 8 |
| year_end_25001 | 25,001 / 0 | 25,001 | 4,000 | 0 | 3,395 | 8 |
| peak_not_year_end | 28,000 / 4,000 | 24,000 | 4,000 | 0 | 3,395 | 8 |
| spouse_accounts | primary 2,000; spouse 2,000 / 400 | 2,000; 1,600 | 3,500 + 3,100 | 500 + 900 | 1,193 | 10 |
| shared_mixed_debt | primary actual formal 3,000; spouse open 2,000 / 400 | spouse 1,600 | 4,000 + 3,100 | 0 + 900 | 1,143 | 10 |
| one_owner_two_accounts | primary corp1 3,000; corp2 2,000 / 400 | 3,000; 1,600 | 4,000 + 3,100 | 0 + 900 | 1,143 | 10 |

Allowed debt is min(loss minus the $1,500 stock capacity, year-end principal).
It reduces ending debt basis, not loan face. At $25,000/$25,001, ending debt
basis is $22,500/$22,501. Only the latter gets the next-year separate-debt flag.
The $28,000 peak ends at $24,000/$21,500 basis and keeps open-account treatment.
Current computed carry keys separately identify owner/EIN principal, post-loss
debt basis and next-year treatment (0/1). They are calculation records, not
accepted prior-year basis evidence for a later return.

ScheduleE and Schedule1 report the sum of independently allowable losses;
Form1040 AGI is wages minus that sum, with SD $15,750 single/$31,500 MFJ and no
QBI deduction. Single tax uses the $50 Tax Table midpoint and $11,925 10% bracket
then 12%; joint taxable amounts are within the 10% bracket. Form8995 retains the
current allowed negative QBI and its separate qualified-loss carry; the
basis-suspended portion never joins current QBI. A shared issuer remains one
actual trade after owner limitations, with separate 7203 copies.

PartII line17 is the net advance, line19 has no net repayment in these zero
opening accounts. Native `OpenAccountDebtInd` and the canonical PDF open-account
widget are selected; actual formal primary debt retains its formal checkbox.
A fully repaid current account still requires PartII, but its undefined 0/0
line25 is blank (the XSD percent is optional). Its $2,000 actual gross principal
repayment remains source-bound to issued K1 codeE; it creates no current gain
or restoration. No prior reduced-debt obligation is inferred.

## Executed evidence

- Final source **10/0**, `/tmp/opentax-form7203-open-account-source-v4.log` (42s).
  Eight public calculation/full-native/PDF/full-XSD positives and two labeled
  source/output negative suites.
- Compatibility **224/0**, `/tmp/opentax-form7203-open-account-compat-v1.log` (2m7s runtime; type checking/resource contention preceded execution).
- Immutable originals:
  `/tmp/opentax-form7203-open-account-evidence-terminal-v4`, **8 packets,
  64 files, 70 pages**.
- Every page rendered/reviewed; owner names, checkbox types, net values,
  independent copies, loss/QBI/tax joins and blank 0/0 ratio checked.
  `/tmp/opentax-form7203-open-account-page-review/review-manifest.json`
  SHA256 `574287b0e059738b6fb0e490ed1202d9e07b590ac590b58c2b403f28123d723c`.
  Static PDFs have no fields or Widgets. Packet-file manifest SHA256
  `550af74beeca1daec847faa4ff11b7435ee2468894ed202c7d167adb2c389b1a`.
- New retained raw **8/70 exact**, prior multi **6/66 exact**, prior spouse
  **6/54 exact**, original single **4/32 exact**. Reports are respectively
  `/tmp/opentax-form7203-open-account-retained-v4-replay-v1/report.json`,
  `...-prior-multi-replay-v1/report.json`,
  `...-prior-spouse-replay-v1/report.json`,
  `...-prior-four-replay-v1/report.json`.
  Each checks source immutability, exact pending/carry/origins/PDF, fullXSD and
  XML with ReturnTs alone replaced. No fixture/source generator is called.

Negative evidence includes absent/incorrect oral terms; signed-note fiction;
prior principal/reduced basis/year; guaranteed/corporate debt; owner mismatch;
cash/principal/calendar/ref conflicts; omitted principal repayment; manual net
amount; issued repayment mismatch and reciprocal corporate-bank divergence.
Native and full PDF separately reject copy/source omissions, owner crossjoin,
pretend formal classification, QBI carry, pooled losses and finalized tax changes.

Earlier v1 source run failed type checking (wrong test API), v2 failed 7/10
with named guard/fixture/assertion issues, and v3 passed 10/0 before the final
carry/blank-ratio refinement. Their logs/artifacts remain diagnostic originals.

## Remaining parent boundaries

This proves one new current open account per owner/corporation pair, up to the
existing four MFJ pairs, including distinct issuers, one owner/two issuers and a
shared issuer with separately owned debt types. It does not prove simultaneous
formal and open debt for the same pair, larger formal-note inventories/PartII
overflow, other interest terms/payments, prior nonzero/reduced open-account debt,
positive restoration or repayment gain, or other basis/K1 item types. Existing
prior-history/accepted-return/export guards remain unchanged; no submission,
external authorization/authentication, or IRS acceptance is invented. The wider
Form7203/8995 parent remains open. The historical original eight duplicated
stock-loss archive's whole-pending/8960 and XML-newline qualifications in the
original owned-debt proof remain unchanged and are not relabeled exact.

## Main integration seal

Integrated production `e654fedef` passes the standard14-module `deno task test` gate **234/0 (2m11s)**, `/tmp/opentax-form7203-open-account-main-standard-oct6.log`, with optional artifact permission unset. Actual retained source/filer replays through the integrated main graph are terminal exit0, `/tmp/opentax-form7203-open-account-main-raw-oct6.log`; reports under `/tmp/opentax-form7203-open-account-current-main-replay.V64Eba/{new-eight,prior-multi-six,prior-spouse-six,prior-single-four}/report.json` verify **8/70 +6/66 +6/54 +4/32** packets/pages with exact wholepending, carry, origins, sourcebytes, PDF and XML onlyReturnTs, plus fullXSD. Originals never regenerated or edited. All64 new artifact files independently copied/hash-compared into `.state/research/form7203-open-account-oct6-preserved`. Root reviewed all70 new pages, plus full-size fully-repaid blank ratio, spouse open-account checkbox and25001/22501 face/basis detail; root review manifest `/tmp/opentax-form7203-open-account-root-page-review-oct6.json`. Broader source/terms, same-pair mixed inventories, prior reduced debt and accepted-history boundaries remain open; current calculated carry never authenticates a subsequent-year filing.
