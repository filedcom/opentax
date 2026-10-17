# inputs/taxes/credit-recapture

Recapture of credits claimed in earlier years. Each node takes filed-source
facts, recomputes the form's lines in exported pure functions, and routes only
to `schedule2`. The original credits live under `inputs/credits/`.

| Node    | Form                                           | Schedule 2 field (line)                                                                                                                                                    | CLI shape                                    |
| ------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `f4255` | 4255 Part I rows 1d (3468 Part IV) / 2a (8933) | `line1d_form4255_net_epe` (1d, row 2a col l), `line1e_form4255_excessive_payment` (1e), `line1f_form4255_20_percent_ep` (1f), `line19_form4255_net_epe` (19, row 1d col l) | `inputSchema` `{ rows }`, not an array input |
| `f8611` | 8611, one item per building BIN                | `line16_lihtc_recapture` = sum of Form 8611 line 14                                                                                                                        | `isArray`, `f8611s`                          |
| `f8828` | 8828 (Rev. Nov 2024), one item per disposition | `line17b_mortgage_subsidy_recapture` = sum of line 23                                                                                                                      | `isArray`, `f8828s`                          |

## Rules found in the code

- Sources are evidence, not totals. `f4255` rows must match a
  `prior_credit_evidence` record (original form, columns a–e) and, for any
  excessive payment, an IRS determination notice whose 20% amount is
  `round(EP × 0.2)` unless reasonable cause was accepted; columns (j), (k) and
  (n)(2) are `z.literal(0)` (unsupported routes). One row per credit line.
- `f8611` requires distinct BINs, `recapture_year === ctx.taxYear`, the bond
  answer to agree with bond details, and own-credit line 2 worksheets for
  distinct earlier years. Recapture percentages are the form's printed
  three-decimal values (`recapturePercentage`). `partnership_source.ts`
  (issued K-1 recapture) is also read by
  `2025/mef/forms/taxes/credit-recapture/f8611_issuer_source.ts` and
  `2025/return-processing/attachment_coverage.ts`.
- `f8828` takes lines 16, 19 and 20 from the issuer notification and throws
  for a gift without `reviewed_gift` evidence; co-ownership shares scale the
  sale amounts.
- Schedule 2 throws on a generic `line17a_investment_credit_recapture`; use the
  `f4255` row fields.
- Export gates (`attachment_coverage.ts`): `f8828` blocks MeF and PDF; `f4255`
  blocks PDF; `f8611` blocks PDF unless every item has an `issuer_source`.
  Form 8828 MeF/PDF descriptors are staged (not in `ALL_MEF_FORMS`/`ALL_PDF_FORMS`).

## Verify

- `bun test ./forms/f1040/nodes/inputs/taxes/credit-recapture --timeout=1800000`
- `bun test ./forms/f1040/2025/mef/forms/taxes/credit-recapture --timeout=1800000`
- Section map: [../AGENTS.md](../AGENTS.md).
