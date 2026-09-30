# TY2025 Form 4797 K-1 line 2 filled-return review

On 2026-09-30, synthetic partnership box 10 and S corporation box 9 section
1231 amounts were taken through their public K-1 inputs, the TY2025 graph,
Form 4797, Schedule D, Form 1040, native MeF, local v5.4 XSD, and filled PDF.
Each nonzero source now requires an issuer EIN, issued K-1 reference, and
recipient TIN. The Form 4797 MeF and PDF paths recheck the row against the
pending K-1, and the final filer check rejects a recipient outside the filer
or joint-filing spouse. The parent Form 4797 prints source EINs in its four
Part I line 2 rows; a fifth or later source prints on a paginated continuation
with issuer name, EIN, source reference, recipient, and signed amount.

The first return has a $10,000 partnership gain and a $3,000 S corporation
loss. Both line 2 rows and the $7,000 line 7 total print on Form 4797; the
same net gain reaches Schedule D and Form 1040 line 7a. The full return passes
local XSD. Its six-page PDF snapshot is
`.state/research/ty2025-filled-pdf-review/2026-09-30-form4797-two-k1-line2/filled-return.pdf`
with SHA-256
`d89f6acf03a9ba94f309cf750ff92e0c1dcc5effaf106142f71a213eb508e97a`.

The second return has six partnership K-1 amounts totaling $16,000. The
printed Form 4797 shows the first three direct rows and $5,000 on row 4 as
"See attached"; the continuation lists rows 4–6 with $3,000, ($2,000), and
$4,000. Its $5,000 subtotal and $16,000 line 7 reconcile to the native rows,
Schedule D, and Form 1040. Local XSD passes. The seven-page PDF snapshot is
`.state/research/ty2025-filled-pdf-review/2026-09-30-form4797-six-k1-line2/filled-return.pdf`
with SHA-256
`a42702d7a72b5d5e9a4bbd87e1a266cf9065371070cd68524169f7675027bd14`.
The Form 4797 parent pages and continuation were rendered and visually
inspected. A focused 50-source case verifies statement pagination.

These are synthetic source facts; the issued K-1 bytes and underlying
partnership or corporation property transactions were not authenticated.
Section 179 property detail, passive limitations, prior section 1231 loss
history, other mixed Form 4797 sources, IRS business rules, and ATS acceptance
remain open. The [2025 Form 4797 instructions](https://www.irs.gov/pub/irs-prior/i4797--2025.pdf)
direct partnership box 10 and S corporation box 9 amounts to Part I.
