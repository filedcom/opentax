# TY2026 instruction availability

Snapshot: September 27, 2026. The [coverage ledger](instruction-coverage.csv)
checks the expected IRS draft instruction URL for each form in the TY2025 PDF
surface and additional active inputs. The form slug is a lookup aid, not
proof that every form has its own instruction booklet. Current result across
71 entries: **27 pinned 2026 drafts**, **20 URLs serving 2025 instructions**,
**12 with no draft at the expected URL**, **6 with 2026 instructions embedded
in their form drafts**, **1 covered by a combined 2026 booklet**, **3 with
current continuous-use instructions**, **1 current older-revision
form/instruction pair**, and **1 current form with embedded instructions**. The
missing and unverified groups are research gates, not unsupported-form
decisions. Schedule A (Form 8936) is covered by the pinned Form 8936 booklet.
Forms 4137, 4952, 4972, 6252, 6781, and 8919 embed their 2026 instructions
in the pinned draft forms.
The 2026 Form 8915-F draft is pinned; its expected draft instruction URL
still serves the December 2025 revision, pinned as a comparator.
The 2026 Form 8960 draft is pinned; its available 2025 instructions are
pinned as a comparator for MAGI, investment-expense and election worksheets.
Form 8912 and its December 2024 instructions explicitly use a continuous-use
revision; the current PDFs are pinned separately from the draft URL.
Form 982 remains on its March 2018 form and December 2021 instructions;
those current products are pinned, with 2026 COD law and MeF still to check.
Form 8834's October 2024 revision explicitly applies to tax years beginning
in 2024 or later and includes its own instructions; the current PDF is pinned.
Form 6252 has its instructions on pages 2–4 of the pinned 2026 draft form;
some references there still name the old Form 4797 lines, so they need
final-source reconciliation before coding.

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
2. Do not treat the current `i1040gi`, `i1040sc`, `i1040sd`, `i8962`, or
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
