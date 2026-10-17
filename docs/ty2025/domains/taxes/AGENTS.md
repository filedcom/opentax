# docs/ty2025/domains/taxes

TY2025 research notes for Taxes forms: source proofs, gap decisions and
filing boundaries. Code counterparts for each form: [section
map](../../../../forms/f1040/nodes/inputs/taxes/AGENTS.md).

| Folder                                                 | What the notes cover                                                                                                                                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `amt/form6251/`                                        | Form 6251 adjustment gaps (8949 AMT basis, circulation and mining costs, houseboat interest, ISO/Form 3921, long-term contracts, negative adjustments) and the remaining-scope decision |
| `credit-recapture/form4255/`, `form8611/`, `form8828/` | Form 4255 and 8611 PDF boundaries, 8611 issued partnership K-1 recapture, 8828 source reconciliation stage                                                                              |
| `employment/form8959/`                                 | Form 8959 native source-to-print contract                                                                                                                                               |
| `foreign/form965/`                                     | Form 965-A printable-return gap                                                                                                                                                         |
| `household-employment/`                                | Schedule H payroll sources: FICA cents, FUTA, family and parent employees, state rates and contributions, child turning 21                                                              |
| `income-averaging/`                                    | Schedule J source and integration gaps, fishing/farm and joint QBI phase-in proofs, preferential-rate sources                                                                           |
| `interest/`                                            | §453A installment-sale interest workpaper                                                                                                                                               |
| `passthrough/form8978/`                                | Form 8978 and Schedule A reviewed-source filing                                                                                                                                         |
| `retirement/form4972/`                                 | Form 4972 coverage gap, beneficiary/NUA/annuity/estate source reviews, paper collections, AMT and Schedule J composition                                                                |
| `self-employment/`                                     | Schedule SE owner and spouse-owned farm gaps                                                                                                                                            |
| `underpayment/form2210/`                               | Form 2210 mandatory filing paths and the Form 2210-F gap (both notes live here)                                                                                                         |

Rules for these files are in [../../AGENTS.md](../../AGENTS.md); a note on a
form whose effect lands elsewhere (Form 4972 sources from 1099-R, credit
originals for 4255/8611) still belongs here when the tax is the subject.

## Verify

- `bun run fmt:check`
- Recount before citing a number:
  `find docs/ty2025/domains/taxes -name '*.md' ! -name AGENTS.md | wc -l`
