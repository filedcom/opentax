# TY2025 Schedule H filed wage and withholding cents

Exact source cash, quarterly thresholds and Forms W-2 remain reconciled before filing calculations. Filed Social Security, Medicare, additional Medicare and Section A FUTA wage operands use whole dollars; federal withholding is rounded after its source total is reconciled. This prevents fractional household tax from entering Schedule 2 and Form 1040.

The retained original FICA-only input has wages $2,802.49 and aggregate withholding $50.49. Before correction it was accepted with Social Security $348, Medicare $81 and total tax $479.49. The filed wage amount $2,802 produces Social Security $347, Medicare $81 and withholding $50: total $478, with Form 1040 refund $2,567.

Root exact saved-input replay: `/tmp/opentax-scheduleh-fica-filed-cents-root-after-main-oct6/report.json`. Public calculation, native XML, five-page filled PDF and full local XSD passed; source bytes remain unchanged. All five pages were reviewed, including the one-page FICA-only Schedule H, with no widgets or AcroForm fields. Private source/artifact manifests are `/tmp/opentax-scheduleh-fica-filed-cents-root-preservation-oct6.json` and `/tmp/opentax-scheduleh-fica-filed-cents-positive-preservation-oct6.json`.

Typed focused ordinary task gate passed 1/0, two filtered (324ms): `/tmp/opentax-scheduleh-fica-filed-cents-main-focus-v4-oct6.log`. Earlier test attempts exposed projector signature and absent Section B line26 assertion errors; corrected assertions preserve the actual FICA-only page shape. A mismatched source W-2 withholding remains rejected. Combined payroll verification and a full regression of later production remain required; source hashes and XSD do not establish authenticity or IRS acceptance.

Rounding basis: [2025 Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf), whole-dollar filing convention, and [2025 Schedule H instructions](https://www.irs.gov/pub/irs-prior/i1040sh--2025.pdf).
