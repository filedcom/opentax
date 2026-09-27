# TY2026 instruction availability

Snapshot: September 27, 2026. The [coverage ledger](instruction-coverage.csv)
checks the expected IRS draft instruction URL for each form in the TY2025 PDF
surface and four additional active inputs. The form slug is a lookup aid, not
proof that every form has its own instruction booklet. Current result across
67 entries: **26 pinned 2026 drafts**, **20 URLs serving 2025 instructions**,
**19 with no draft at the expected URL**, and **2 whose year was not
established from the title**. The latter groups are research gates, not
unsupported-form decisions.

The pinned PDFs include 2026 Schedules E, F, SE, R, and 8812 and Forms 2106,
2441, 2555, 4835, 5329, 5695, 7206, 8606, 8615, 8814, 8815, 8829, 8853,
8863, 8888, 8889, 8936, 8959, and 8995, plus Schedule B and H instructions.
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
