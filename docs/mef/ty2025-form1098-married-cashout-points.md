# TY2025 married cash-out refinance with improvement and points

This route applies the existing one-old/one-new first-of-month mixed-use Pub.
936 worksheet to actual joint and separate filers.
[2025 Publication 936](https://www.irs.gov/publications/p936) Table 1 line 8
uses $750,000 for a joint return and $375,000 for a married person filing
separately. A joint return can include a mortgage taken out by either spouse. A
separate return in this bounded route includes only the taxpayer's
noncommunity-property mortgage and interest paid by that taxpayer; the spouse's
separate debt and payments are not pooled.

Each married source includes retained SHA-256-bound JSON bytes for title, both
mortgage notes and a dated lender-interest payment ledger. The title names the
owners and property; each note names the lender, recipient, borrower, closing,
property and principal; the payment ledger joins every lender statement
reference, month, interest amount and payer. The two independently printable
Form 1098 Copy B PDFs, closing/payoff disbursements, contractor invoice and bank
payment, personal-use ledger and own-funds points debit remain separately
joined. Native and direct PDF export bind the ownership record to the actual
filing status, taxpayer and spouse TINs. This establishes internal consistency
of reviewed retained records, not issuer or bank authentication.

The reviewed July joint and separate cases each have $400,000 old acquisition
principal and a $500,000 refinance: $400,000 payoff, $50,000 direct structural
roof improvement and $50,000 personal cash-out. Six $10,000 monthly principal
repayments extinguish personal debt first. The old mortgage average is $400,000
over its six secured months. The mixed new total closing balance is
$2,790,000/12 = $232,500; the new qualified closing balance is $2,690,000/12 =
$224,166.67. Table 1 ratios are .987 joint and .593 separate. Paid old interest
is $12,000 and paid new interest $14,250. The joint new note and
improvement/points payments name Sam, while the old note/interest payments name
Alex; the separate packet names Alex on title, both notes, both interest
ledgers, improvement and points payments. Its Sam TIN is bound to the return but
does not appear as a borrower or payer.

The joint packet deducts $25,909 of interest and $642 of points; the separate
packet deducts $15,566 of interest and $385 of points. The proof packets at
`/tmp/opentax-1098-married-evidence-oct6/{mfj,mfs}` retain original public
inputs, prepared pending, two printable issuer copies, title/notes/payment
ledger, invoice/payment bytes, native XML and filled return PDF. Their SHA-256,
form/page and amount inventory is
`/tmp/opentax-1098-married-evidence-oct6/review-manifest.json`; all six filled
pages were visually reviewed on
`/tmp/opentax-1098-married-rendered-oct6/contact.png`. Focused
source/native/full TY2025v5.4 XSD/PDF and negative gates are in
`/tmp/opentax-1098-married-focused-oct6.log`. Missing/mutated source bytes,
inconsistent borrower/recipient, changed paid interest, wrong filing spouse and
changed filed allocation are rejected. The prior nine mortgage packets and 30
reviewed pages replay exactly in
`/tmp/opentax-1098-married-prior9-raw-oct6/comparison.json` (nine packets and 30
PDF pages, native XML except ReturnTs, full XSD, and seven comparable
whole-pending records).

The final seven-module standard gate passed 92/0 with Poppler available on `PATH` (`/tmp/opentax-1098-married-standard-v2-oct6.log`). The raw replay from actual retained complete public input JSON and separately saved Form 1098 and JSON document bytes passed 11/11 packets and 36/36 filled PDF pages, native XML equal except ReturnTs, full TY2025v5.4 XSD, and all nine comparable prepared pending records exactly (`/tmp/opentax-1098-married-all11-raw-oct6/comparison.json`, terminal log `/tmp/opentax-1098-married-all11-raw-v2-oct6.log`). The two earlier no-points cases do not have saved pending records. The first generated married `source.json` files omitted the `schedule_a.force_itemized` input and were separately preserved under `/tmp/opentax-1098-married-incomplete-source-superseded-oct6`; only the final complete public inputs are used in this proof. The two filled PDFs covering six pages, pending, issuer copies, invoice/payment records, and ownership records were byte-identical across that correction; native XML changed only in ReturnTs.

## Main integration seal

Root read entireboard and compacted3b463031b before integrationa294e738f. Main standardsevenmodule `deno task test`92/0/0ignored(1m12s), `/tmp/opentax-1098-married-main-standard-oct6.log`. Actualretained11/36 replay terminalexit0, `/tmp/opentax-1098-married-main-raw-oct6/comparison.json` andmatchinglog, exactPDF/nativeonlyReturnTs/fullXSD, ninecomparablepending andthreepriororigins exact. No snapshot equality is asserted where originals lack it. Root viewedallsixfilledpages plusfullsizebothScheduleA, `/tmp/opentax-1098-married-root-review-oct6.json`. Twentyfourpacketfiles plusreviewmanifest privatelycopied/hashcompared before andafterreplay in `.state/research/form1098-married-oct6-preserved`, `/tmp/opentax-1098-married-root-preservation-oct6.json`. Supersededmissingforceitemized publicmetadata remains separate; complete finalactualinputs replayed. Widercrossloan/ownership/authentication andIRS parents remainopen.
