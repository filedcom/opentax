# Form 8814 capital distributions with Schedule J, Form 4972 and AMT

The
[2025 Form 8814 instructions](https://www.irs.gov/pub/irs-prior/i8814--2025.pdf)
direct line 10 to Schedule D line 13, or directly to Form 1040 line 7a when
Schedule D is not required. Form 8814 allocates the first $2,700 among child
interest, qualified dividends and capital-gain distributions. The
[2025 Form 6251 instructions](https://www.irs.gov/pub/irs-prior/i6251--2025.pdf)
require Form 1040 line 16 to be refigured without Schedule J, including Form
8814 tax, and excluding Form 4972 tax. These are separate source and tax joins.

A reviewed child capital-distribution record now binds its box 2a gross amount
to the elected child and explicitly records box 2b–2f as zero. It is a
structured ordinary-source review; it does not authenticate an issuer copy.
Nominee, section 1250, 28%-rate, section 1202 and section 897 distribution
categories remain guarded for this AMT Part III path. The finalized Form 8814
line 10 must agree with the source-derived Schedule D line 13 or direct Form
1040 line 7a. For a separately sourced ordinary long-term capital sale, every
Form 8949 transaction is replayed into Schedule D and its filed line 16. The
candidate requires distinct sale and broker references, unchanged regular/AMT
basis, no adjustments or special gain categories. The current return then joins
the finalized capital amount to the advanced farm QBI capital limit and to Form
6251 Part III.

| Reviewed current-return fact                          |    Direct line 7a | Schedule D + sale | Parent and child distributions + sale |
| ----------------------------------------------------- | ----------------: | ----------------: | ------------------------------------: |
| Child Form 8814 line 4 / line 10 / line 15            | 4,700 / 426 / 135 | 4,700 / 426 / 135 |                     4,700 / 426 / 135 |
| Separate ordinary long-term sale                      |                 — |             1,000 |                                 1,000 |
| Parent 1099-DIV box 2a                                |                 — |                 — |                                 1,200 |
| Form 1040 line 7a or Schedule D line 16               |               426 |             1,426 |                                 2,626 |
| Form 8995-A qualified dividends plus net capital gain |            31,213 |            32,213 |                                33,413 |
| Schedule J line 23 / Form 1040 line 16                |   68,947 / 71,850 |   69,097 / 72,000 |                       69,277 / 72,180 |
| Form 6251 line 10 refigured tax / AMT                 |   72,589 / 53,392 |   72,739 / 53,392 |                       72,919 / 53,392 |
| Form 1040 total tax, retained / filed                 | 142,202 / 142,202 | 142,390 / 142,390 |                  142,615.60 / 142,616 |

These calculations use the retained Ada farm, nonfarm W-2, parent 1099-DIV, ISO,
and two participant Form 4972 source groups from the prior reviewed packet. The
reviewed child capital, parent capital and ordinary sale records are separate
source variants; the prior $135-child-tax and zero-child-tax packets remain
untouched. An independently executed no-Schedule-J return establishes each Form
6251 line 10 tax. The 2025
[Schedule D instructions](https://www.irs.gov/pub/irs-prior/i1040sd--2025.pdf)
permit the ordinary Box D sale with reported basis and no adjustment on Schedule
D line 8a, so the filled packet does not require an additional Form 8949 PDF for
that row. The parent/child/sale variant retains $1,489.60 precise NIIT; the
filed Form 8960 and Schedule 2 NIIT line is $1,490 and Form 1040 total tax is
$142,616, consistent with the
[2025 Form 1040 rounding instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf).

The new source test is
`forms/f1040/2025/form8814_capital_schedulej_source.test.ts`. It covers all
three public calculations, native Form 8814 / Schedule D / Form 6251 / Form 4972
joins, direct filled PDFs, full TY2025 v5.4 XSD, and public wrong-owner/source
conflicts. Native and direct PDF export reject wrong child or parent box 2a,
special box 2b, missing reviewed child distribution, altered Form 8814 line 10,
mismatched sale basis, and altered Schedule D totals. The initial two-source v2
packet remains immutable at
`/tmp/opentax-form8814-capital-schedulej-source-v2-oct6`. The final three-source
archive `/tmp/opentax-form8814-capital-schedulej-source-v4-oct6` holds 24, 26,
and 26 page public, native, and PDF packets.
`/tmp/opentax-form8814-capital-schedulej-final-v4-physical-oct6.json` binds all
76 freshly rendered pages to their source and PDF hashes; every page was
visually reviewed, and all PDFs have zero form fields and widgets. The first two
final PDFs are byte-identical to v2. The third PDF has SHA-256
`096d6ea603e0238480269cdce095ae413ae03d59940b1e07a49e0203edb57110`. The no-check
source gate passed 3/0 with full local XSD, and exact saved-source replay passed
all three: source bytes, normalized pending, carry, page origins, PDF, and
native XML except `ReturnTs`. `deno check` passed, and the ordinary typechecked
three-case source gate passed 3/0 in 1m19s; its three PDF hashes match the
reviewed v4 packet byte for byte. The prior positive and zero-child- tax Form
8814/Schedule J packets and both old Form 8814 packets were replayed against
their actual retained source and PDF bytes. The third variant's raw Form 8960
NIIT is $1,489.60 and filed NIIT is $1,490; filed Form 1040 tax $142,616 equals
its rounded line 16, line 17, and line 23 components.

The wider Form 8814, Form 6251, Schedule J and Form 4972 parents remain open.
This bounded source review neither authenticates issuer or broker records nor
establishes IRS acceptance.


## Main integration verification

Production `226bb645e` passed the normal ten-module `deno task test` gate: **26 passed / 0 failed (7m41s)** with the recorded 8 GB heap and normal task permissions. All fifteen ordinary PDFs match **236 reviewed pages**; source/graph/carry/origin JSON agrees with the final three-case archive or prior ordinary gate, and native XML differs only by `ReturnTs`. The current thirteen-file held manifest updates overlapping child-tax files without rewriting their earlier manifest.

Main actual saved-source replay passed **three returns / 76 pages**, with exact normalized pending, carry, origins, PDF bytes and timestamp-only native changes plus fresh full local XSD. Twelve older saved-source returns passed **126 pages** with fresh XSD and unchanged reviewed PDFs. Eight AMT and two Schedule J wrappers have no saved carry values; two earlier child returns retain the separately qualified added source-derived dividend QBI provenance and exact saved carry values. All original packet hashes remain unchanged.

Physical preservation records retain 82 ordinary files, 32 new-source files, 88 prior-source files and 444 integration files including final source/render/review/gate/failure artifacts and six exact final tracked code copies. Initial stale page renders are not reused as final PDF review; the fresh 76-page provenance and independent Decimal oracle qualify the final bytes. Broader parents and IRS acceptance remain open.
