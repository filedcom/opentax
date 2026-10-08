# Repository organization

Public entrypoints remain `mod.ts`, `catalog.ts`, `cli/main.ts`, and `forms/f1040/2025/index.ts`. Tax form and node identifiers and registry APIs retain their meaning.

Tax files use seven familiar return sections: **General, Income, Adjustments, Deductions, Credits, Taxes, and Payments**. Business, investments, retirement, foreign, and health are subgroups within the section affected by the form. The same categories appear within node roles, year-specific source reconciliation, native/PDF projections, review fixtures, E2E tests, business rules, and tax-domain research.

| Section | Primary responsibility | Examples |
| --- | --- | --- |
| General | Identity, information reporting, and whole-return assembly | Form 1040, whole Schedule 1/3, foreign information forms |
| Income | Income, exclusions, and net-income reconciliation | Wages, Schedule C/F/E, capital gains, retirement distributions |
| Adjustments | Deductions before AGI | Employee expenses 2106, health 7206, historical tuition/fees 8917 |
| Deductions | Deductions after AGI | Schedule A/1-A, depreciation 4562, investment interest 4952, QBI 8995 |
| Credits | Credit claims and limitations | Foreign tax 1116, health 8962, business 3800/7207/8609 |
| Taxes | Tax, recapture, interest, and penalties | Retirement tax 4972, AMT 6251, employment tax, underpayment |
| Payments | Withholding, payments, and refund instructions | Estimated/extension payments, investment credit 2439, refund 8888 |

These sections reflect familiar tax-software navigation rather than a universal filesystem standard: [Drake navigation](https://kb.drakesoftware.com/kb/Drake-Tax/20051.htm), [ProConnect inputs](https://accountants.intuit.com/support/en-us/help-article/tax-return/enter-tax-return-data-find-inputs-proconnect-tax/L2be1XcKB_US_en_US), and [ProConnect foreign-tax-credit navigation](https://accountants.intuit.com/support/en-us/help-article/form-1116/entering-foreign-taxes-paid-generating-form-1116/L9Eu9abmF_US_en_US). Vendor menus differ; this repository applies the user-requested seven sections consistently.

| Boundary | Where to read next |
| --- | --- |
| Engine and CLI | `core/runtime`, `core/types`, `core/validation`; `cli/commands`, `cli/store`, `cli/utils` |
| Source and calculation nodes | `forms/f1040/nodes/inputs/<section>/<group>/<family>` and `intermediate/{forms,worksheets,aggregation}/<section>/<group>/<family>` |
| Final assembly nodes | `forms/f1040/nodes/outputs/general/return-assembly` |
| Year-specific source contracts | [TY2025 domains](../../forms/f1040/2025/domains/README.md) |
| Native and printed forms | [MeF forms](../../forms/f1040/2025/mef/forms/README.md), [PDF forms](../../forms/f1040/2025/pdf/forms/README.md) |
| Review fixtures and complete returns | [PDF reviews](../../forms/f1040/2025/pdf/reviews/README.md), [E2E scenarios](../../forms/f1040/e2e/README.md); ATS stays together |
| Business-rule registry | [Rule sections](../../forms/f1040/validation/rules/README.md) |
| Research evidence | [TY2025 documents](../mef/ty2025/README.md) |
| Testing, research, maintenance and release tools | [Scripts](../../scripts/README.md) |

One whole form has one canonical home. Cross-effects are documented: Forms 8889/8853 also affect Income/Taxes; 8962 includes tax repayment; 2439 includes capital gains; 8621 includes tax/interest; 8997 is informational gain tracking. Focused tests can live in a different section from a whole-return serializer when they verify a specific effect. Mixed complete-return fixtures live under General/composed-returns.

Runtime, source processing, transport, PDF support, and testing infrastructure remain under their role boundaries outside tax-domain categories. Tests, fixtures, and family research travel with their source family. Role indexes and public entrypoints remain easy to find; internal imports and resources follow the physical files.

Private `.state` and `.pdf-cache` evidence remains in place. Folder changes do not establish tax correctness or IRS acceptance; current verification status belongs in the readiness documents.
