# TY2026 Form 8997 QOF deferral and inclusion contract

Source snapshot: pinned [2026 draft Form 8997](corpus/draft/f8997.pdf),
SHA-256 `3b773741f45044061bcdc3a02f319b02e6c2ce10890a061be513f7e4c581163f`;
[Notice 2026-40](corpus/authorities/n-26-40.pdf), SHA-256
`4df687daf79373c8c9ed96913ebe77ad49bbcc8fea122964dc6c7efc97b8d148`;
and the [2025 final Form 8997 with embedded instructions](corpus/authorities/f8997--2025.pdf),
SHA-256 `97589000d39b67737c516763bc4b89a167a3c18b47163517e98490144f4f5a4b`,
as a **prior-year comparator only**. The expected 2026 `i8997--dft.pdf`
returns 404 in this snapshot. Obtain final 2026 instructions and current
Form 8949/Schedule D guidance before implementing unsettled form codes,
adjustments or filed XML.

## Investment ledger and TY2026 transition

Maintain each QOF investment as a lot keyed by taxpayer, QOF EIN, acquisition
date and original gain transaction. Store the original gain's short/long
character, special-gain code, original deferral, prior inclusions, 5-/7-year
basis adjustments if applicable, adjusted basis, year-end and event-date fair
market value, noninclusion transfer history, continuing ownership and any
10-year appreciation election. These are separate from gain/loss on disposal
of the QOF interest itself. Reconcile opening lots to the preceding year's
Form 8997 ending lots or attach the printed explanation for differences.

For a qualifying investment made **on or before December 31, 2026**,
Notice 2026-40 says any remaining deferred gain is included in the taxable
year containing December 31, 2026, unless an earlier inclusion event applied.
The deemed included gain cannot be elected into a new deferral. Continued
ownership can still support a later 10-year appreciation election, so the lot
and its post-deferral basis survive into Part V. The notice separately permits
eligible gain realized in 2026 to be invested **on or after January 1, 2027**
within its timely-investment rules; that is a later investment cohort with a
different five-year inclusion clock. Do not apply the legacy deadline to it.

## Printed form and graph routes

| Area | TY2026 contract |
| --- | --- |
| Part I | Report opening legacy deferred-gain holdings by QOF EIN, date, description, special-gain code and remaining short/long deferred gain. Sum continuation rows and columns, and explain mismatch with prior ending holdings. |
| Part II | Report 2026 gains newly deferred through QOF investments, retaining original short/long character and special-gain code. Match each deferral to the originating gain and a Form 8949 election entry. Check the foreign eligible taxpayer and irrevocable treaty-benefit waiver questions before permitting a deferral. |
| Part III A | Report inclusion events and certain transfers **before** the end of the deferral period. Keep date, remaining deferred gain, FMV, code and recognized short/long amounts. Reconcile an investment disposition separately to Form 8949 and the form's checkbox for a disposed investment without Form 1099-B. |
| Part III B | Report remaining deferred gain recognized because the deferral period ends, with a separate FMV, special-gain code and adjustment column. For calendar-year legacy holdings this is the December 31, 2026 event. Sum Section A and B in Part III line 5 and reconcile the included gains to Form 8949 and Schedule D. Never recognize the same deferred slice twice. |
| Part IV/V | Part IV's columns are **reserved for future use** on the 2026 draft; do not populate it with the old year-end deferral rows. Part V reports qualifying QOF investments held after the end of the deferral period with QOF EIN, acquisition date, description, post-deferral basis and event code. Retain the surviving lot for future dispositions and any valid 10-year appreciation election. |

Preserve original deferred-gain character when inclusion is reported. Form
8949/Schedule D, Form 4797 §1231 gain and QOF investment disposition must be
modeled as distinct events. Deferral and inclusion amounts need coordinated
Form 8949 entries; Form 8997 is the annual holding and event disclosure, not
a substitute for those transactions. Include QOF activity in the return-wide
Schedule D filing decision and qualified-dividend/capital-gain tax worksheet.

## Current code boundary

- Shared `f8997` accepts Part I–IV arrays based on the old form and sends
  Part III inclusions to Schedule D transaction output. It has no end-of-
  deferral Section B, Part V, basis/FMVs or 2026 statement checks. Its
  Part IV model conflicts with the reserved 2026 page.
- A second shared `form8997` node accepts one aggregate deferred-gain amount
  per investment and routes every inclusion as **long-term** gain on generic
  `schedule_d.line_11_form2439`. That loses original short/long character and
  does not produce a Form 8949 event or printed Form 8997 record. The two
  node shapes must be resolved into one source-keyed contract before 2026
  registration; neither can be reused unchanged.
- There is no TY2025 Form 8997 PDF or MeF serializer in the inventories.
  The [2026 draft field inventory](pdf-fields-f8997.csv) contains **461
  terminal widgets**, all in the field tree: 456 text and five buttons over
  four printed pages after the draft cover. Rows, continuation totals,
  foreign taxpayer/waiver answers and 1099-B disposition checkbox need a
  structured 2026 PDF and current MeF route.

## Build order and acceptance

1. Pin final 2026 Form 8997/instructions and the selected current MeF
   schema/rules. Verify Part III B adjustment and special-gain codes against
   those instructions; retain Notice 2026-40 as the transition authority.
2. Implement the cross-year lot ledger with cohort, original gain character,
   basis and event chronology. Reconcile opening holdings and all Part II/
   III/V rows; reject duplicate inclusion, unsupported deferral of a deemed
   December 31 gain, and incomplete treaty/foreign answers.
3. Build paired Form 8949 deferral/inclusion entries, separate QOF investment
   disposition, Schedule D/4797/tax-worksheet routes and annual Form 8997
   disclosure. Reconcile row totals, basis after inclusion and future lots.
4. Fill/render all 461 widgets with continuation statements; serialize the
   same record under current 2026 MeF and validate active rules. Exercise
   opening mismatch explanation, multiple lots, short/long gain, partial
   inclusion, FMV below deferred gain, 2026 deadline without disposal,
   pre-deadline disposition, treaty waiver, 1099-B absence, future 10-year
   election and a gain realized in 2026 but invested in 2027. Run TY2025
   regressions for shared Schedule D/Form 8949 changes.

This is a source and implementation contract, not registered TY2026 filing
support.
