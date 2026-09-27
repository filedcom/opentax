# TY2026 Form 4852 substitute wage and pension statements

Snapshot: September 27, 2026. The currently published [September 2020
continuous-use Form 4852](corpus/authorities/f4852--2020.pdf), including its
printed instructions, is pinned at SHA-256
`810e5e4df3022cf5421094b1d19dcf47eee020c751c47585b72d3249309cd066`.
The expected draft URL still serves that 2020 revision. The [PDF field
inventory](pdf-fields-f4852.csv) has **34 widgets**, all on the form's first
page and in its field tree; the second page contains printed instructions.
Check for a superseding form and the selected MeF release before filing.
The [public TY2026 accepted-forms and attachments inventories](MEF-V1-DRIFT.md#what-the-public-september-24-inventory-already-establishes)
have no Form 4852 entry. That does not establish whether the selected
release permits another documented attachment method; do not name or build
one until the XSD, active rules and IRS filing guidance are checked.

## When a substitute is appropriate

Form 4852 substitutes for an unavailable or uncorrected W-2/W-2c or 1099-R.
For each employer/payer and tax year, retain the missing/incorrect form
status, payer identity/TIN/address, attempts to obtain the original or
correction, IRS contact and the evidence used for each estimate (final pay
stub, account statement, prior-year payer ID, etc.). Print the form's year,
W-2-or-1099-R checkbox, lines 5–8, **line 9 estimation method** and
**line 10 efforts to obtain the statement**. When the corrected original
later arrives, compare it to the filed estimate and route any required
amendment through Form 1040-X. Do not count an original and its substitute
as two payments.

The Form 4852 line labels are **not** W-2 or 1099-R box numbers:

| Form 4852 line | Source and destination |
| --- | --- |
| 7a–7i, W-2 substitute | 7a wages/tips/compensation, 7b Social Security wages, 7c Medicare wages/tips, 7d Social Security tips, **7e federal withholding**, 7f–7g state/local withholding, 7h Social Security tax withheld, 7i Medicare tax withheld. Send the derived wage and federal withholding amounts through the same 2026 return owners as an actual W-2, with a stable employer ID. Reconcile Form 8959 and the 2026 Social Security wage base across real and substitute W-2s. Do not credit the entire Social Security withholding amount as excess tax or the entire Medicare withholding amount as *additional* Medicare withholding. |
| 8a–8j, 1099-R substitute | 8a gross distribution, **8b taxable amount**, 8c taxable-not-determined checkbox, 8d total-distribution checkbox, 8e capital gain included in 8b, **8f federal withholding**, 8g–8h state/local withholding, 8i employee contributions, 8j distribution codes. Route to the existing 1099-R owner to derive IRA versus pension 1040 lines, basis/rollover, Form 8606/5329 and withholding. Do not subtract 8i from an already taxable 8b. A code 1 alone is insufficient to decide every Form 5329 exception. |
| Lines 9–10 | Print source of estimated amounts and chronology of attempts to obtain the missing/corrected document. These explanations are part of the filed form, not merely internal notes. |

The published form has no W-2 boxes 12/13/14 or 1099-R IRA/SEP/SIMPLE
checkbox. Obtain plan type and any TY2026 tip/overtime/SIMPLE or other
special treatment from separate evidence; do not infer it from a Form 4852
amount. Any W-2 box 12 code TP/TT or 1099-R box 7 classification that cannot
be substantiated is an intake/validation question for those owners, not a
default on this substitute.

## PDF widget map

The fields have no tooltip text, so the names below were matched to the
rendered first page and their coordinates. Every field begins with
`topmostSubform[0].Page1[0].`; the CSV preserves full names and rectangles.

| Form area | Field suffixes |
| --- | --- |
| Lines 1–6 | `f1_1` name, `f1_2` SSN, `f1_3` address, `f1_4` tax year, `c1_1[0/1]` W-2/1099-R choice, `f1_5` payer name/address, `f1_6` payer TIN. |
| W-2 lines 7a–e | `Line7Lft[0].f1_7` through `f1_11` in printed order. |
| W-2 lines 7f–i | `Line7Rght[0].f1_12` state withholding, `f1_13` state name, `f1_14` local withholding, `f1_15` locality name, `f1_16` Social Security withholding, `f1_17` Medicare withholding. |
| 1099-R lines 8a–e | `Line8Lft[0].f1_18` gross, `f1_19` taxable, `c1_2[0]` taxable not determined, `c1_3[0]` total distribution, `f1_20` included capital gain. |
| 1099-R lines 8f–j | `Line8Rght[0].f1_21` federal withholding, `f1_22` state withholding, `f1_23` state name, `f1_24` local withholding, `f1_25` locality name, `f1_26` employee contributions, `f1_27` distribution codes. `f1_28` is an additional fillable text widget below the printed 8j line with no visible label; inspect its behavior before binding it. |
| Lines 9–10 | `f1_29` estimation method and `f1_30` efforts to obtain the statement. |

## Current code boundary

The shared [`f4852` node](../../forms/f1040/nodes/inputs/f4852/index.ts)
is registered for TY2025 but has no PDF descriptor or MeF serializer. It
routes user-entered values to 1040, Form 8959, Form 5329 and Schedule 3,
without source evidence, form printing, or replacement-of-original
reconciliation. Its comments call federal W-2 withholding line **7b** and
1099-R withholding line **8c**; the pinned form says **7e** and **8f**. The
node treats a provided taxable distribution as subject to another employee
contribution subtraction, uses a generic `is_ira` not present on the form,
and sends aggregate Social Security withholding from two substitutes as
`line11_excess_ss` without computing the actual excess. Its Medicare route
needs the ordinary-versus-Additional Medicare withholding split. The
`capital_gain` value is accepted but not routed to the proper tax worksheet.
Review these paths against the [2026 W-2 intake](ATS-SCENARIO-02.md),
[1099-R graph](FORM1099R-GRAPH.md), [Form 8959](FORM8959-GRAPH.md), and
[credit/withholding](PDF-SCHEDULE3-MAP.md) contracts before registration.

## Build and acceptance

1. Use one canonical wage/distribution source ID per payer/year and mark
   whether the filed evidence is an original, corrected original, or 4852.
   Require lines 9/10 evidence and prevent double counting. Keep the
   form's reported values and the independently derived taxable values
   separate.
2. Derive 2026 wages, pension/IRA taxable amounts, Form 8959 tax and
   withholding, Form 5329 exceptions, and any excess Social Security credit
   using all real and substitute statements by owner and employer. Reconcile
   every 1040 line to the source ledger and withholdings to statement lines.
3. Use the 34-widget map, confirm the unlabeled `f1_28` field, and print one
   Form 4852 per substituted payer/form.
   Determine from the selected v4-or-later MeF package whether Form 4852 is
   structured XML, a binary attachment, or subject to another filing rule;
   validate required explanations, payer TIN handling, and repeatability.
4. Test missing and incorrect W-2/1099-R, corrected original arriving
   before/after filing, two employers with mixed real/substitute W-2s,
   federal versus FICA withholding, unknown payer TIN, IRA/pension/rollover
   and basis, 8c taxable-not-determined, code 1 with an exception, capital
   gain, PDF explanations and current XSD/business-rule acceptance.
