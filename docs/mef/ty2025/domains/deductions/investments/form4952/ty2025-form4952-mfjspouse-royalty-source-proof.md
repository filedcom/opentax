# TY2025 Form 4952: MFJ spouse portfolio royalty checkpoint

The existing expense-free 1099-MISC royalty route rejected a valid spouse-owned
portfolio royalty on a joint return. The public graph calculated the return,
but native and direct PDF export required the Schedule E property's `tsj` to be
`T` and its 1099-MISC recipient to be the primary taxpayer. A separate Form
4952 guard required the royalty and 1099-INT to have the same recipient, even
though they were owned by the two spouses on the same MFJ return.

The bounded route now ties a `T` royalty row to the primary SSN and an `S` row
to the spouse SSN, only for MFJ. It matches the 1099-MISC payer, recipient,
amount, and optional document reference to the Schedule E property. Every
1099-INT contributing to line 4a must belong to either spouse on that return.
The separate direct-use debt trace still identifies the primary owner, actual
taxable-securities purchase, lender, and paid interest. The source explicitly
classifies the spouse's patent license income as a nonbusiness, nonpassive
portfolio royalty, and the Schedule E property has no expenses. Form 4952 line
5 is zero; no unsupported Code B deduction is inferred.

The retained example has an $800 spouse royalty on Schedule E line 4, $500
primary-owned taxable 1099-INT, and $300 primary-owned traced investment
interest. Form 4952 line 4a is $1,300 and line 8 is $300; Schedule E and
Schedule 1 contribute $800 once to Form 1040 line 8. A separately reviewed
synthetic $40,000 home-mortgage source makes the MFJ itemized choice actual:
Schedule A line 9 is $300 and Form 1040 line 12e is $40,300. The completed
return's tax is $3,846 and refund $7,154. A literal saved public source
produced seven pages, full local 2025v5.4 XSD, flattened PDF, and native XML.
The seven pages were rendered and reviewed for owner names/SSNs, MFJ mark,
Schedule E royalty, Schedule A and Form 4952 amounts, and Form 1040 totals.
PDF SHA-256 `faa0b9b196b2709870cad56a1ee21c2587554fb7155ed5c6258de849e651784e`;
source JSON SHA-256 `7f0d05a3c132d0e2c1e458b6ec4c3822b2ec8b030870bad96495c5a107594c2f`.
The ordinary typed source test regenerated the identical filled PDF.

The prechange runtime at `0d2980527` rejects a saved compatible version of
these exact financial/owner facts at both exporters. That control omits only
the newly supported optional 1099-MISC document reference so that the
prechange public schema accepts it. The final saved source itself is rejected
at prechange public parsing because the source reference was not yet allowed
on the Schedule E royalty row. Both original inputs are preserved; neither is
called a prechange positive filing.

The source test rejects MFS, an incorrect final spouse identity, a primary-row
mark for spouse income, altered royalty or interest recipients, a mismatched
issued-copy reference, and changed loan ownership at both native and direct
PDF exporters. These are synthetic reviewed source facts and an issued-copy
*reference*, not authenticated lender, bank, broker, or issuer documents.
Positive K-1 box 20 code B remains guarded: its informational amount alone
cannot establish an independently allowed 2025 deduction, issued supplement,
partner limitation, or filed destination. Other royalty properties, expenses,
nonbusiness classification changes, mixed debts, carryovers, and external IRS
business rules remain in the Form 4952 parent.

Primary authorities: [2025 Form 4952 and instructions](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf)
(line 4a includes nonbusiness royalties; line 8 limits interest),
[2025 Schedule E instructions](https://www.irs.gov/instructions/i1040se)
(royalty income on line 4, one column per property), and
[2025 partner K-1 instructions](https://www.irs.gov/instructions/i1065sk1)
(code B is informational for Form 4952 line 5).

## Evidence and qualifications

- Exact final saved source, prepared packet, normalized graph, carry, origins,
  XML, PDF and full-XSD report: `/tmp/opentax-form4952-mfjspouse-after-v4-oct7/`
  and `/tmp/opentax-form4952-mfjspouse-literal-packet-v2-oct7/`.
- Seven-page render: `/tmp/opentax-form4952-mfjspouse-literal-render-oct7/`.
- Prechange controls: `/tmp/opentax-form4952-mfjspouse-before-oct7/`
  and `/tmp/opentax-form4952-mfjspouse-finalsource-before-v2-oct7/`.
- Initial literal replay failed only because JSON cannot preserve a
  `Uint8Array` instance. V2 rehydrates the unchanged byte values before
  public execution; the source JSON hash is checked before and after.
- Initial checked test failed typechecking seven test-only annotations;
  corrected focused run passed 2/0. No ATS or issuer acceptance is claimed.

## Final bounded qualification — October 7

The original compatibility PID 2855 was absent at resume, and the retained
`compat-v1` log had no terminal summary. The ordinary checked six-module
`deno task test` rerun reached terminal exit 1: 29 passed and two failed solely
because `pdftotext` was missing from the launch PATH. Both failure stacks and
exit status are preserved. The unchanged final module was rerun with
`/tmp/opentax-poppler-env/bin` on PATH and passed all three tests with terminal
exit 0. All 31 distinct tests in those six modules passed across the two
checked runs; this is not reported as a single 31/0 run.

A separate fresh literal replay at
`/tmp/opentax-form4952-mfjspouse-literal-final-oct7/` passed full local XSD
and produced the same seven-page PDF. Source hash, complete normalized graph,
pending packet, prepared packet, carry and page origins are unchanged. XML
is completely equal after excluding only its generated `ReturnTs`; both
original and fresh native files are retained. The received 1099-MISC,
1099-INT and Schedule E property copies equal the saved source, and preparation
preserves them. The direct debt trace and all entered Form 4952 inputs also
match. Arithmetic independently confirms $75,000 wages plus $500 interest
and $800 royalties gives $76,300 AGI, less $40,300 itemized deductions gives
$36,000 taxable income, and $11,000 withholding less $3,846 tax gives the
$7,154 refund. Form 4952 deducts the smaller of $300 traced interest and
$1,300 investment income, with line 5 zero.

The ordinary checked positive test produces the identical PDF; its carry and
origins equal the literal replay as parsed JSON. Its prepared packet differs
only in the synthetic Form 1098 issuer-copy file name in the `start` and
`f1098` branches. The literal replay has exact prepared equality. No broader
ordinary source equality is inferred from the PDF match.

The final private physical archive contains 75 files with the five held
checkpoint code/proof files, exact source, original/final/ordinary packets,
prechange control, failure/success logs and status files, replay scripts,
qualification report and all seven reviewed pages:
`/tmp/opentax-form4952-mfjspouse-final-preservation-oct7/manifest.json`,
SHA-256 `1e61056843b6b89a3d5829e395f54acc7a8aee61ff83aeb74e5afb9f1d9ea540`.
Production and test hashes are unchanged from `f6257fc7e`; this final
qualification updates only this proof document.

The root independent source/Decimal/native oracle and seven-page review are
retained in `.state/research/royalty-root-final-review-oct7/manifest.json`
(20 files), SHA-256
`a309e5c8cd9d499280b46f10d4d4cee7a89347588d26ac9880e24ca550d68e99`.
