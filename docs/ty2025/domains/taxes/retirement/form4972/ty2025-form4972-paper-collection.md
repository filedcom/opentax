# TY2025 Form 4972 collections larger than the MeF limit

The [2025 Form 4972 instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf)
permit separate elections for a filer's own distribution and inherited
distributions from different participants. Their own/mother/father example
requires three Forms 4972. The locally retained TY2025 v5.4
`ReturnData1040.xsd` permits at most two `IRS4972` documents, as recorded in
the [participant collection proof](ty2025-form4972-participant-collections-review.md).
No authorized electronic overflow attachment has been established.

For three or more fully reconciled participant groups, the CLI now offers
`opentax return export --returnId <id> --type form4972-paper`. It runs the
ordinary source graph and PDF guards, prints Form 1040 and every applicable
form page, and writes a companion source manifest with the PDF digest, owner,
participant, plan, elected issued-copy references, election and determined tax
for each Form 4972 copy. The CLI labels the result **PAPER ONLY**. This route
does not construct a MeF return, assert IRS business-rule acceptance, transmit
an A2A package, or treat the manifest as an IRS attachment. A paper filer must
review the retained issuer records, any required statements, signature, and
complete return before filing.

The dedicated paper descriptor uses the same computed forms, source-copy
inventory, election and 1040 tax reconciliation as the native and ordinary PDF
paths. Their two-copy guards remain intact; `--type mef` and `--type pdf` still
reject larger collections, and `--force` or `--draft` cannot open the paper
route. The paper PDF builder retains all other source/PDF guards. A positive
Form 4972 collection with unrelated unsupported filing claims still rejects.

Three public source cases use the existing reviewed participant/plan/issued
Form 1099-R records and independent expected worksheet values:

| Source case | Participants | Issued 1099-R copies | Form 4972 determined tax | Form 1040 line 16 | Paper PDF pages |
| --- | ---: | ---: | ---: | ---: | ---: |
| Own plus parents | 3 | 6 | $7,184 | $7,210 | 7 |
| Joint three | 3 | 6 | $7,184 | $7,184 | 7 |
| Five inherited | 5 | 15 | $21,082 | $21,082 | 9 |

The source test also changes an issued taxable amount and the computed 1040
special tax independently; both changed paper packets reject. An actual stored
return reaches the CLI paper branch and writes a manifest, while the same
stored return still fails MeF at the two-copy bound. Each source packet retains
the input, normalized graph, filer, carry and page origins alongside the
flattened PDF. The three 23-page packets were rendered for visual review;
Form 1040 owner/status/line 16, senior deduction, all Form 4972 owner names,
election boxes, tax lines, order and page legibility were checked. All PDFs
have zero interactive fields. No issuer authentication or IRS acceptance is
implied by these constructed reviewed records.

The wider Form 4972 source, eligibility, prior-election, Schedule J/AMT and
business-rule/ATS parents remain open. A paper packet is a channel-specific
output for the validated collection, not a filing-ready release decision.

## Held evidence

The final source and PDF packets are under
`/tmp/opentax-form4972-paper-evidence-final-oct6`. A separate saved-input
replay reads those exact JSON bytes and regenerates all three return graphs,
carry values, page origins, and PDFs without calling the fixture factory:
`/tmp/opentax-form4972-paper-saved-replay-final-oct6.json`. It also repeats
the ordinary native and direct-PDF max-two rejection. The paper PDFs are
byte-identical to the earlier 23 visually reviewed pages; their SHA-256 values
in source-case order above are
`ecae470b4fdbf5a9475f1d60be8d3ec3d9f65c3a8f7131e6c0f4a800b4c286c5`,
`d763eca88baf771c3952d6f8235f2e11c72979289981320143ad5e9becd90aad`,
and `c55daf3e830e1736266cf1d00cbb33256e966a6f29f1dc3da0aded75b85b1ad4`.
The review contacts are under `/tmp/opentax-form4972-paper-rendered-v2`;
`/tmp/opentax-form4972-paper-final-physical-manifest-oct6.json` records
the held artifact hashes.

The final normal-permissions typed module gate passed **3/0** (log
`/tmp/opentax-form4972-paper-normal-permissions-oct6.log`). It used
`deno test --allow-read --allow-write --allow-run=deno --allow-net=www.irs.gov`
with an 8 GB V8 heap allowance and no special environment permission.
Its fresh `/tmp/opentax-form4972-paper-evidence-final-v2-oct6` outputs have
the same three reviewed PDF bytes and the same source/graph facts apart from
filer timestamps; comparison:
`/tmp/opentax-form4972-paper-normal-final-comparison-oct6.json`. The CLI
subprocess within the test uses `--no-check`; the module and CLI entrypoint
separately passed `deno check` before this typed test. No local XSD result is
claimed for the three paper packets because this path emits no native XML.

The six previously supported collection packets still pass their ordinary
source/native/full-local-XSD/PDF test. Their six regenerated PDFs are exactly
equal to the preserved originals; native XML differs only by `ReturnTs` and
source/pending JSON only by the filer timestamp. See
`/tmp/opentax-form4972-paper-prior-comparison-oct6.json`. The local
`Return1040.xsd` was linked read-only from the main checkout into this
isolated checkout for that preservation test. The initial isolated attempt
failed because that private schema cache was absent, before the link was
made; it was not a tax or projection failure.


## Main terminal verification

Integrated production40a89f5d2. Main ordinary typed four-module `deno task test` passed **55/0 (2m34s)**, terminalexit0, with recorded8GB V8 and normal task permissions. `/tmp/opentax-form4972-paper-main-standard-oct6.log`; all nine ordinary PDFs exactly match reviewed23paper and36electronic pages. The paper wrappers remain intact; staged inputs use separate `.staged.json` names. `/tmp/opentax-form4972-paper-main-standard-source-transfer-oct6.json` records byte transfer and12heldruntime/test hashes. Thirty ordinary artifact/log/transfer/held files physically copied and independently rehashed.

Main actual saved-input replay passed3paperreturns/23pages with full graph/carry/origins/PDF parity and native/defaultPDFmax2 negatives; all original six JSON/PDF files unchanged. Main prior6electronic replay passed36pages with full graph/prepared/carry/origins/PDF parity, native changes onlyReturnTs, freshfullv5.4 XSD and18original sourcefiles unchanged. These replays call no source fixture factory and rewrite no source. Main13paper/34prior/candidate21/rootreview33 physical files rehashed before seal; combined12code hashes exact. Ledger1543 records this paper-only channel, not IRS acceptance, source authentication, broader ScheduleJ/AMT coverage or full regression completion.
