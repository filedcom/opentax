# TY2026 Schedule R elderly/disabled credit graph

Snapshot: September 27, 2026. The pinned IRS [2026 Schedule R draft](corpus/draft/f1040sr.pdf),
SHA-256 `0fcbd9fe296b470b2a0ceadc497380159f7d872f7aa11d86ae856bbd2234f5b6`,
and [2026 instructions](corpus/draft/i1040sr.pdf) define this route. The
[PDF inventory](pdf-fields-f1040sr.csv) has 27 AcroForm widgets, including
all nine Part I choices, the Part II certification and lines 10–22.
Refresh both documents when the final IRS revision appears.

## Source and calculation contract

| Stage | Required source facts | Filed calculation/answer |
| --- | --- | --- |
| Part I | Filing status; each spouse's end-of-2026 age; retired-on-permanent-and-total-disability status; taxable disability income; whether an MFS taxpayer lived apart from spouse for **all** of 2026. | Exactly one qualifying box 1–9. An MFS taxpayer without the lived-apart fact cannot claim by simply selecting age/disability. Under-65 disability requires retirement and taxable disability income, not a disability flag alone. |
| Part II | Prior physician statement/line B history and continued inability to engage in substantial gainful activity, or a new signed statement held for records. | Print the certification checkbox for boxes 2/4/5/6/9 only when its conditions hold. The physician's statement is generally retained, rather than attached. |
| Lines 10–12 | Selected Part I box and taxable disability income of the qualifying spouse(s). | Line 10 is $5,000 for boxes 1/2/4/7, $7,500 for 3/5/6, and $3,750 for 8/9. Line 11 is the printed disability formula: boxes 2/4/9 use the qualifying disability income, box 5 sums both spouses, and **box 6 adds $5,000 to the under-65 spouse's disability income**. Line 12 is the smaller of 10/11 where 11 applies. |
| Lines 13–20 | Nontaxable SSA/RRB from benefit records; qualifying nontaxable pensions/VA benefits from their own statements; 1040 line **11b** AGI. | Lines 13a/13b sum on 13c. Line 15 thresholds are $7,500 for boxes 1/2, $10,000 for 3–7, and $5,000 for 8/9. Line 17 is half the positive AGI excess; line 18 adds it to 13c; line 19 is nonnegative line 12 minus 18; line 20 is 15% of line 19. The printed QSS route is box 1 or 2, so its base and threshold are $5,000/$7,500. |
| Lines 21–22 | 1040 line 18 and Schedule 3 lines **1, 2 and 6l** as specified by the 2026 credit-limit worksheet. | Line 21 is the nonnegative tax liability after those prior credits. Line 22 is the smaller of lines 20/21 and feeds Schedule 3 line **6d**, then its nonrefundable-credit total and 1040 line 20. Resolve credit ordering before computing this worksheet. |

The IRS instructions also describe a choice to let the IRS figure the credit.
That path requires the applicable Part I/II answers and selected Part III
facts, `CFE` next to Schedule 3 line 6d, and the attached Schedule R. If
the product supports this choice, treat it as a distinct filing path; do not
invent a numeric credit on the return.

## Current implementation boundary

The shared [`schedule_r` node](../../forms/f1040/nodes/inputs/schedule_r/index.ts)
accepts manual AGI and benefit totals, computes 15% and sends only a number to
the TY2025 Schedule 3 line 6d key. It has no Part I box selection, MFS
lived-apart proof, disability certification, line-by-line result, liability
worksheet, CFE choice, PDF or MeF serializer. In particular, it treats QSS
like MFJ ($7,500/$10,000), caps **box 6** by disability income alone instead
of $5,000 plus that income, and omits the line 21 limit. The 2026 Schedule 3
node accepts a line 6d amount, but it does not produce or validate the source
Schedule R attachment. Do not register the shared shortcut for TY2026.

## Build and acceptance

1. Derive age/status, disability income, benefits and AGI from their existing
   owner records; require only genuinely external disability and lived-apart
   evidence. Select exactly one box and compute lines 10–22 in printed order.
2. Add the line 21 dependency after 1040 line 18 and Schedule 3 lines 1/2/6l,
   avoiding a credit-limit cycle. Carry the resulting line 22 to Schedule 3
   line 6d and reconcile the 1040 nonrefundable-credit total.
3. Render both Schedule R pages with correct PDF button export values and
   amount widgets, and add the current MeF document/answer route after the
   active 2026 XSD and rules are available. Include the CFE path only with
   its full required filing expression.
4. Test QSS age 65+, MFS not living apart, MFJ box 6 with a small disability
   income, both-under-65 box 5, nontaxable SSA reduction, zero/limited tax,
   prior physician certification and new statement retained for records.
   Compare all printed lines, Schedule 3/1040 amounts and XML, and retain
   the TY2025 calculation regression.
