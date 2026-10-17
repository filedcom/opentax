# Income — other income inputs

Schedule 1 Part I sources outside business and investments: `f1099g`,
`f1099c`, `alimony_received`, `education_income`, `personal_property_rental`,
`ppp_forgiveness`. Form 982 is computed in
`intermediate/forms/income/other/form982`. Crosswalk:
[../AGENTS.md](../AGENTS.md).

## Flow

Each node sends its Schedule 1 line to `schedule1` and the same field to
`agi_aggregator`:

| Node                       | Schedule 1 field(s)                                                                | Other targets                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `f1099g`                   | `line1_state_refund`, `line7_unemployment`, `line8z_taxable_grants`, `line8z_rtaa` | `f1040` (withholding), `schedule_f` (`farm_sources`), `form6251` (`line2b_tax_refund`) |
| `f1099c`                   | `line8c_cod_income` (taxable part)                                                 | `form982` (`line2_excluded_cod`, `exclusion_type`)                                     |
| `alimony_received`         | `line2a_alimony_received`                                                          | —                                                                                      |
| `education_income`         | `line8r_taxable_scholarships`                                                      | —                                                                                      |
| `personal_property_rental` | `line8l_personal_property_rent`                                                    | —                                                                                      |
| `ppp_forgiveness`          | none (excluded; informational)                                                     | —                                                                                      |

## Traps

- `alimony_received` is taxable only for instruments executed before
  2019-01-01 (`divorce_agreement_date`) and not modified to adopt the post-2018
  treatment (`post_2018_modification_excludes_alimony`).
- `f1099c` throws when box 3 interest exceeds box 2 or lacks a reviewed
  treatment, and when box 7 FMV has no retained/transferred-property answer
  (Schedule D separately refuses to derive a gain from box 7).
- `f1099g` split modules: `grant_source.ts` (box 6 nonbusiness grants),
  `rtaa_source.ts` (box 5 RTAA).
- `alimony_received` and `education_income` have no `index.test.ts` or
  `research/context.md`; they are exercised by
  `2025/domains/income/other/alimony_received_route.test.ts` and the Form 8863
  PDF reviews in `2025/pdf/reviews/credits/individual/`.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/nodes/inputs/income/other`
- `bun test --timeout=1800000 ./forms/f1040/2025/domains/income/other`
