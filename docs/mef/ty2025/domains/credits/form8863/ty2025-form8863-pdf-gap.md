# TY2025 Form 8863 positive PDF boundary

## Positive-tax dependent scholarship checkpoint

[Paired education claim and kiddie tax source review](./ty2025-form8863-parent-child-kiddie-tax-review.md)
adds required positive Form 8615 from the child's actual owned taxable grants
and the selected parent's settled public return. Six complete native/XSD/PDF
packets include an exact-half earned-support case and preserve parent AOC/ODC
ordering without placing child income on the parent return. Its ordinary-parent,
one-child and outside-authentication limits are stated in that review.

## Parent/dependent scholarship source checkpoint

[Paired parent and dependent scholarship review](./ty2025-form8863-parent-dependent-scholarship-review.md)
proves the actually claiming parent's tuition/AOC allocation alongside the
child's separate W-2 or Schedule 1 taxable grants and source-derived dependent
standard deduction. Both public returns retain the same owned issued school and
aid packet; child income stays on the child return and duplicate education
credit is rejected. This checkpoint has the review's stated synthetic-source and
filing-scope limits.

## Required-service scholarship claimant checkpoint (2026-10-06)

The
[required-service source proof](./ty2025-form8863-required-service-scholarship-review.md)
adds actual award-condition/performance/disbursement joins, issued-W2 and
Schedule1 reporting, and school-administered taxable box5 reconciliation.
Exact-half/below-half, nonservice same-AGI control, MAGI phaseout and
child-credit ordering have actual full native/XSD/PDF packets. Earlier
nonservice-only scholarship support limits are historical for these reviewed
own-student cases; parent/child separate-income and outside source authenticity
remain open.

## Material-capital claimant support checkpoint (2026-10-06)

The
[material-capital support proof](./ty2025-form8863-material-capital-support-review.md)
adds performed-service/pay-benchmark and deployed-capital source joins, the
reasonable-compensation allowance and 30% ceiling after filed half-SE tax.
Integer and fractional exact-half/below-half support boundaries have actual
public native/XSD and filled PDF packet proof, including education/CTC ordering.
The earlier personal-services-only limit is historical for these reviewed cases;
multiple-business allocation and outside source authentication remain open.

## Self-employed claimant support checkpoint (2026-10-06)

The
[self-employed support proof](./ty2025-form8863-self-employed-support-review.md)
adds actual claimant-owned personal-service Schedule C receipts and costs,
Schedule SE deductions, W-2/business mixtures, and exact-half support
boundaries. Five complete native/XSD and filled PDF packets include taxable
scholarship income, QBI and education/child-credit ordering. The earlier
wage-only limit is historical for these reviewed cases; broader ownership and
source authenticity remain open.

## Dependent ownership and claimant refund evidence (2026-10-06)

The [dependent/claimant proof](./ty2025-form8863-dependent-claimant-review.md)
adds adult-parent and student-own-return packets, actual two-student PDF copies,
claimant age/support computation and source joins, and Schedule 8812 education
credit ordering. Its evidence and limits supersede the historical PDF-only
blocker below for those reviewed cases.

## Mixed school checkpoint (2026-10-06)

One student’s two U.S. institutions now have mixed received/missing Form 1098-T
AOTC and LLC source, income, native/XSD, and actual PDF packet proof. The
required request and scholarship furnishing exceptions are reviewed separately;
the scholarship cases include Schedule 1 income and MAGI phaseout. See the
[mixed school source review](./ty2025-form8863-mixed-school-sources.md) for exact
conditions, evidence and remaining limits. Earlier single/all-received school
restrictions below are historical for these verified routes.

## Current checkpoint (2026-10-04)

The registered two-page TY2025 descriptor now emits a positive, source-guarded
Form 8863 PDF. The earlier preflight-only status below is historical. A selected
five-page Form 1040/Schedule 3/Form 8863 lifetime-learning packet has been
visually reviewed with source and native XML parity; see the
[validation batch](../../../testing/ty2025-form1040-validation-batch.md). The latest field audit
also makes Part III lines 28 and 29 print numeric zero for an American
Opportunity Credit student with $2,000 first-tier expenses, as directed by the
[official form](https://www.irs.gov/pub/irs-prior/f8863--2025.pdf); four focused
PDF tests and three route tests pass. Remaining education-credit eligibility,
evidence, multiple-student, and full-packet branches stay open under the
named-form board item.

## Original preflight assessment

Status: bounded audit, written but unrun. A positive Form 8863 PDF descriptor
was not added. The existing PDF attachment preflight rejects every nonempty
`f8863.f8863s` source collection; native MeF remains separate and is not
suppressed by this PDF-only boundary.

The official [2025 Form 8863](https://www.irs.gov/pub/irs-prior/f8863--2025.pdf)
has two pages: page 1 Parts I and II, and a separate page-2 Part III for each
student, with an extra page 2 limited to institution line 22 when a student has
more than two institutions. The
[2025 instructions](https://www.irs.gov/instructions/i8863) require the
student's name/TIN, institution identity and Form 1098-T answers, AOTC lines
23–30 or LLC line 31, then aggregate lines 1–19. Line 19 comes from the Credit
Limit Worksheet and Schedule 3 line 3; refundable line 8 flows to Form 1040
line 29.

The current calculator/native serializer supplies student credit classification,
adjusted expense amounts, AOTC eligibility answers, structured filing identity
and an unconstrained institution-record array per student, MAGI, phaseout and
worksheet arithmetic. A build-time source-integrity guard now rejects a
duplicate student SSN across AOC and LLC claims, including
hyphenated/unhyphenated spellings, and conflicting or partially supplied
return-level under-24 answers across AOC students. These guards have focused
unrun cases. The PDF would need to bound that array to two institutions or
implement the official additional-page-2 rule. The source model does not
establish receipt of a 2025 Form 1098-T or which IRS exception permits a missing
one, substantiate eligible enrollment and net paid expenses after tax-free
assistance, independently verify four prior AOTC years/disallowance/TIN timing,
or reconcile the supplied credit-limit worksheet to the finalized Form 1040 and
Schedule 3. Those are source/eligibility checks, not merely PDF field names. A
bounded positive PDF route should require explicit source references and return
joins for the subset it accepts rather than treating an absent fact as zero or
false.

The official PDF is readable through the IRS document viewer, but no canonical
TY2025 PDF bytes or AcroForm field tree were available locally. A read-only
attempt to fetch `f8863--2025.pdf` into `/private/tmp` failed immediately with
`curl: (6) Could not resolve host: www.irs.gov`; no field names or widget
appearances were guessed. Before registering a descriptor, inspect the canonical
`/AcroForm/Fields` tree and page widgets, including yes/no export values and
per-student page-2 copy behavior. Then map every active Part I–III line,
required identity and checkbox, verify finalized-return credit values, and
inspect a filled PDF's field values, widget appearances and rendered pages in
the deferred batch.

The existing focused preflight cases in `forms/f1040/2025/pdf/reviews/composed/builder.test.ts`
and `forms/f1040/2025/domains/execution/attachment-coverage.test.ts` assert that a nonempty Form
8863 source rejects PDF export while its MeF export remains eligible. They are
written but have not been run in the shared full batch. No PDF, typecheck, XSD,
end-to-end, IRS business-rule or ATS result is claimed.
