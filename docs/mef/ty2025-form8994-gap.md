# TY2025 Form 8994 direct employer route and export boundary

The bounded direct Schedule C source calculates paid family and medical leave
credit from the written policy, eligible employee records, wage replacement
rates, and qualifying employer payments. It now sends Form 8994 line 3 to Form
3800 Part III line 4j as a specified current credit. Form 3800 retains source
identity through its tax-use order and prepares line 4j and Part V native/PDF
rows. The applied amount must match the explicit Form 3800 allocation. The
Schedule C wage deduction is reduced by the full determined Form 8994 line 1
credit before SE and QBI, independently of the amount used against current tax.

The [Form 8994 instructions](https://www.irs.gov/instructions/i8994) direct the
credit to Form 3800. The locally cached official TY2025 v5.4
`Shared/IRS8994/IRS8994.xsd` defines the four policy indicators and lines 1–3;
the locally cached `IndividualIncomeTax/Ind1040/ReturnData1040.xsd` places
IRS8994 after IRS8993 and before IRS8995. These XSDs are ignored research
artifacts, not checked in or reproducible from the repository. The native
descriptor and
[official PDF descriptor](https://www.irs.gov/pub/irs-pdf/f8994.pdf) are
registered with exact source, Form 3800 allocation, and Schedule C wage joins.
Form 3800 requires one reserved IRS8994 document ID. The public Form 8994 source
requires one reviewed policy/payroll packet. Native and PDF export check it
against the same validated attachment bytes.

Public source fixtures now execute through the complete calculation, native
bundle, and PDF packet for full, partial, and zero current tax use.
Pass-through, controlled-group, and other employer paths remain outside this
direct source.

A Form 8994-specific evidence helper reviews one written policy, one Schedule C
gross wage ledger, and each employee's leave payroll and 2024 compensation
record. It matches employer EIN, policy dates and terms, employee SSNs, leave
dates/hours, wage replacement rates, paid wages, prior compensation, and wage
totals exactly to the direct source. Every distinct document reference names one
submitted PDF attachment with matching validated bytes and SHA-256; missing,
duplicate, or changed bytes fail. Unrelated form attachments are allowed.
Terminal positive and tamper tests cover both native and PDF exports.

The required packet lives inside the single public `f8994` source shape.
`buildMefBundle` verifies it against the bundle's validated PDF attachments
before XML construction. `buildPdfBytes` rechecks it against the prepared MeF
bundle's attachments before rendering. Direct `buildMefXml` and standalone PDF
calls with Form 8994 fail closed because they carry no validated attachment
bytes. Other forms retain their existing entrypoints. Hashes bind reviewed facts
to supplied bytes; they do not authenticate an employer's policy, payroll
issuer, signatures, leave purpose, or wage-overlap assertions.

## Completed public source and held review proof (2026-10-06)

The [Form 8994 line 1 instructions](https://www.irs.gov/instructions/i8994)
require the full determined wage deduction reduction even when some or all of
the credit cannot be used currently. The direct input now supplies a distinct
business-referenced reduction to Schedule C, preserving gross payroll and
applying the reduction before SE, Schedule 1, and QBI. Form 1040 finalizes the
sole direct Form 8994 source's actual Form 3800 tax-use amount after the
[Form 3800 limitations](https://www.irs.gov/instructions/i3800). Export
separately reconciles determined credit, gross payroll, reduced wages, and
current use. Existing Form 8941 premium and Form 5884 wage conventions are
retained.

The reusable `single-form8994-direct-employer-full`, `-partial`, and `-zero`
fixtures contain primary-owned Boise Design sources, a written policy, two
employee leave records, their prior-year compensation records, and the gross
payroll ledger. Six deterministic, explicitly synthetic PDF review records print
their actual retained facts and supply the attachment bytes required by the
generator. No SE, QBI, Form 3800 allocation, or Form 1040 result is staged. Each
source retains gross wages 50,000, determined credit 1,250, and deductible wages
48,750. The actual source graph produces:

| Current use | Receipts | Schedule C profit | Half SE |    AGI | QBI deduction | Taxable income | Credit used | Total tax |
| ----------- | -------: | ----------------: | ------: | -----: | ------------: | -------------: | ----------: | --------: |
| Full        |  100,000 |            51,250 |   3,621 | 47,629 |         6,376 |         25,503 |       1,250 |     8,817 |
| Partial     |   75,000 |            26,250 |   1,855 | 24,395 |         1,729 |          6,916 |         693 |     3,709 |
| Zero        |   65,000 |            16,250 |   1,148 | 15,102 |             0 |              0 |           0 |     2,296 |

Cents positives retain receipts 75,000.49 and 75,000.50, raw Schedule C/Schedule
1 profits 26,250.49 and 26,250.50, and raw AGI 24,395.49 and 24,395.50. Filed
AGI is 24,395 and 24,396 respectively; both have QBI deduction 1,729 and current
credit use 693. Both complete native returns validate against the full local
TY2025 v5.4 Return1040 schema and render through the prepared bundle.

The public packet exposed two previously unrun integration defects: native Form
8994 required an already-reserved Form 3800 ID during discovery, and an appended
projected Schedule C field changed its canonical source comparison. Discovery
now retains source reconciliation and requires the exact reserved Form 3800 ID
on final emission; the wage projection uses the item schema's canonical field
order. No generic builder change was needed.

Terminal evidence on isolated base `6d53aa586`:

- Typed focused tests: **19 passed, 0 failed**; public full/partial/zero and
  cents returns, native/PDF identity, business, payroll, full-reduction,
  current-use, tax/SE/QBI, policy/employee/compensation and attachment-byte
  conflicts, plus the existing direct employer/evidence/descriptor tests.
- Related regression: **232 passed, 0 failed** across Schedule C, Form 3800,
  Form 1040, Form 8941, public WOTC coexistence, and Form 8995 cents export.
- Registered held packets: full and partial **23 pages each**, zero **21
  pages**. All **67 tax pages** and the **six distinct source-record pages**
  were rendered with Poppler and visually reviewed for owner, form/revision,
  values against XML, applicable checkboxes, unused sections, order, clipping,
  and legibility. All three complete XML returns passed the full local v5.4 XSD.
  The selected review checker verifies replay, hashes, validated source
  attachment bytes, native/PDF provenance, and every page's review record.

Ignored evidence directory:
`.state/research/ty2025-filled-pdf-review/2026-10-06-form8994-direct`; rendered
sheets and source PDFs are in the adjacent `-rendered` directory. Terminal logs
are `/tmp/opentax-form8994-focus.log`, `/tmp/opentax-form8994-regression.log`,
`/tmp/opentax-form8994-generate.log`, and `/tmp/opentax-form8994-selected.log`.
Research artifacts and IRS templates are not committed.

This completes the single primary-owned direct Schedule C employer route with
reviewed attachment bytes and sole-credit current-use allocation. Competing
credit sources' automatic allocation, pass-through/controlled-group/other
employer routes, and broader owner routes remain outside this proof. Unused
credit 557 or 1,250 is not proof of an accepted future carryover return.
Reviewed hashes do not authenticate issuer signatures, FMLA purpose, or wage
overlap; local XSD acceptance is not IRS business-rule, ATS, or production
acceptance.
