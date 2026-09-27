# TY2026 instruction availability

Snapshot: September 27, 2026. The [coverage ledger](instruction-coverage.csv)
maps the instruction **owner and actual IRS slug** for 96 form/source rows.
It distinguishes a missing 2026 publication from a nonexistent per-schedule
instruction URL. There are **28 pinned 2026 instruction drafts**, **21 draft
URLs still serving 2025**, **5 schedules whose 2025 instructions are in the
combined Form 1040 booklet**, **1 new Schedule 3-A instruction owner to
confirm**, **1 corrected Schedule A slug still serving 2025**, and **2
unresolved expected draft URLs**. The other rows include embedded,
continuous-use, combined-form, final 2026, and prior-year authorities; the
CSV records their individual status. These research gates do not imply that
a form is unsupported. Schedule A (Form 8936) is covered by the pinned Form
8936 booklet.

The pinned [2025 Form 1040 instruction booklet](corpus/authorities/i1040gi--2025.pdf)
contains instructions for Schedules **1, 1-A, 2, and 3**, plus EIC line and
Schedule EIC filing guidance. Their `i1040s1`, `i1040s1a`, `i1040s2`,
`i1040s3`, and `i1040sei` probes were false missing-publication signals;
their owner is `i1040gi`. Schedule **3-A is new in 2026** and cannot be
validated from that comparator; inspect the eventual 2026 combined booklet
or a separate IRS publication. Schedule A has its own `i1040sca` booklet,
not `i1040sa`. The pinned [2025 Schedule A instructions](corpus/authorities/i1040sca--2025.pdf)
are a method comparator while the correct 2026 draft URL still serves 2025.
The [IRS draft listing](https://www.irs.gov/draft-tax-forms) and
[Form 1040 product page](https://www.irs.gov/forms-pubs/about-form-1040)
were checked for these instruction owners on 2026-09-27.
The current [Form 172 and instructions](FORM172-NOL-GRAPH.md) remain
December 2024 revisions; the published form's blank year header supports
the NOL ledger while 2026 law and filing rules still need current review.
Forms 4137, 4952, 4972, 6252, 6781, 8396, 8859, 8880, and 8919 embed their 2026 instructions
in the pinned draft forms.
The 2026 Form 8915-F draft is pinned; its expected draft instruction URL
still serves the December 2025 revision, pinned as a comparator.
The 2026 Form 8960 draft is pinned; its available 2025 instructions are
pinned as a comparator for MAGI, investment-expense and election worksheets.
The 2026 Form 8839 draft is pinned; its available 2025 instructions are
pinned as a comparator for adoption timing and credit-limit worksheets.
Form 8912 and its December 2024 instructions explicitly use a continuous-use
revision; the current PDFs are pinned separately from the draft URL.
Form 982 remains on its March 2018 form and December 2021 instructions;
those current products are pinned, with 2026 COD law and MeF still to check.
Form 8834's October 2024 revision explicitly applies to tax years beginning
in 2024 or later and includes its own instructions; the current PDF is pinned.
Form 7217's December 2024 revision and instructions apply to 2024 and later;
the April 2026 IRS update changes its K-1 box 19 source codes for 2025 onward.
Form 8826's September 2017 current revision embeds instructions; Form 8835's
published form and instructions are still for 2025, so its 2026 facility
credit needs a new publication check and the 2026 section 45 rate notice.
Form 8911's December 2025 form, Schedule A and instructions apply to years
beginning in 2025 or later; Form 8978's January 2023 form/Schedule A and
December 2024 instructions remain current, with 2026 return-line checks.
Form 5884's current March 2021 instructions need the pre-2026 hire cutoff;
Form 6765's current form/instructions add Section G for many 2026 filers.
Form 8994's earlier form/instructions predate the premium method in the
pinned Notice 2026-28, so their filed 2026 expression is a source gate.
Form 3468's published form/instructions are for 2025; the corrected §48D
rate and Notice 2026-15 provide current guidance but do not supply a
TY2026 PDF or MeF shape.
Form 4255's December 2025 revision is currently served; its full recapture
columns require the revised 2026 Schedule 2 and current MeF cross-check.
Form 965-A and its January 2021 instructions remain current. The pinned
2026 Schedule 2 prints its installment on line 12, while line 15 omits line
12 from the addition instruction; see the [liability plan](FORM965A-GRAPH.md).
The 2026 Schedule J draft is pinned, but its expected instruction URL
still serves 2025. The prior-year instructions are retained only as a
method comparator; see the [base-year plan](SCHEDULEJ-GRAPH.md).
Form 1099-K's final December 2026 form and instructions are pinned; they
add cash-tip and occupation-code boxes and restore the $20,000-plus-200
TPSO issuer test. See the [recipient intake plan](FORM1099K-GRAPH.md).
Forms 1099-MISC and 1099-NEC share final December 2026 instructions.
Their new included cash-tip, occupation-code and overtime fields feed
Schedule 1-A; see the [source plan](FORM1099MISC-NEC-GRAPH.md).
Form 1099-G's final December 2026 instructions add box 10 state family
leave and renumber its state-only boxes; Revenue Ruling 2025-4 distinguishes
family from medical leave. See the [source plan](FORM1099G-GRAPH.md).
The current Form 1098 is an April 2025 continuous-use statement with
December 2026 instructions. Form 1098-E and its combined instructions are
2026 revisions. Their [source plan](FORM1098-1098E-GRAPH.md) identifies
Schedule A 8a/8c reported-points routing, the returned 8d mortgage
insurance deduction, and Schedule 1 line 21 student-loan phaseout.
Forms 1099-INT and 1099-OID and their combined January 2024 instructions
are continuous-use. Their [interest plan](INTEREST-GRAPH.md) includes
negative TIPS OID, premium reporting methods, tax-exempt/PAB separation,
and basis/market-discount reconciliation.
The final 2026 Form 1098-T shares instructions with Form 1098-E. Its
box 1/4/5/6/7/8/9/10 handoff to Form 8863 is in the
[education-credit plan](FORM8862-8863-EIC-GRAPH.md).
The new [Form 1098-VLI plan](FORM1098VLI-GRAPH.md) pins the final 2026
form/instructions and final vehicle-interest regulations. Its source boxes
feed Schedule 1-A Part IV and mixed-use activity-interest allocation.
Form 6252 has its instructions on pages 2–4 of the pinned 2026 draft form;
some references there still name the old Form 4797 lines, so they need
final-source reconciliation before coding.
The 2026 Form 3903 draft and separate instructions are pinned. They add
intelligence-community relocation, a certification checkbox, split-year
moving mileage, Schedule 1 storage-only treatment and taxable excess
reimbursement. See the [moving/educator plan](FORM3903-EDUCATOR-GRAPH.md).
Form 8938 has a December 2026 draft with 131 PDF widgets, while both the
published instructions and the expected draft instruction URL remain
November 2021 continuous-use revisions. See the [foreign asset disclosure
plan](FORM8938-GRAPH.md) for threshold, asset and continuation work.
Form 4852's September 2020 continuous-use form embeds instructions and is
pinned with 34 PDF widgets. Its printed W-2 and 1099-R line positions differ
from comments in the shared node; see the [substitute statement
plan](FORM4852-GRAPH.md).

The pinned PDFs include 2026 Schedules E, F, SE, R, and 8812 and Forms 2106,
2441, 2555, 4835, 5329, 5695, 7206, 8606, 8615, 8814, 8815, 8829, 8853,
8863, 8888, 8889, 8936, 8959, and 8995, plus Form 3800 and Schedule B and H instructions.
Their URLs, lengths, and SHA-256 hashes are in
[`corpus/manifest.json`](corpus/manifest.json); the downloader lists every
verified slug. A draft instruction remains subject to final-version review.

## Coding consequences

1. Use a pinned 2026 instruction with its matching 2026 form when implementing
   the corresponding graph route. Record the exact line and worksheet source
   in the route contract or test. The presence of a PDF is not evidence that
   the TY2025 calculation can be registered unchanged.
2. Do not treat the current `i1040gi`, `i1040sca`, `i1040sc`, `i1040sd`, `i8962`, or
   `i8995a` draft URLs as TY2026 authority: they currently return 2025
   instructions. The 2026 Form 1040 itself is pinned, but its full 2026
   instruction booklet is not yet available. Recheck the IRS publication
   before resolving changed 1040 lines, Schedule C/D, premium tax credit,
   and QBI Worksheet A details.
3. Some form families may put instructions on the form or in a combined
   booklet. For a ledger row marked “no draft at expected URL,” inspect the
   form and the official IRS product page before deciding that instructions
   are absent. Record a different official URL if one exists.
4. Recheck all non-2026 rows and each pinned draft on final publication.
   Keep version changes explicit in `SOURCES.md` and the corpus manifest;
   then run the relevant graph, PDF, MeF, and ATS fixtures.

The current MeF v4.0 package remains separate from these public PDFs and
requires authorized IRS e-Services/SOR access. The instruction inventory
does not close the XML or ATS filing gate.
