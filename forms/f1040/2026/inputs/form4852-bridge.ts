import { z } from "zod";
import {
  calculateForm4852Sources2026,
  form4852Source2026Schema,
} from "./form4852-source.ts";
import { retirementCopy2026Schema } from "./retirement-statement.ts";
import { DistributionCode } from "../../nodes/inputs/income/retirement/f1099r/distribution-code.ts";
const name = z.string().trim().min(1);
export const form4852Bridge2026Schema = form4852Source2026Schema.extend({
  taxpayer_name: name,
  spouse_name: name.optional(),
}).strict();
export type Form4852Bridge2026 = z.input<typeof form4852Bridge2026Schema>;
export function calculateForm4852Bridge2026(raw: Form4852Bridge2026) {
  const input = form4852Bridge2026Schema.parse(raw);
  const { taxpayer_name, spouse_name, ...source } = input;
  const ledger = calculateForm4852Sources2026(source);
  const retirement = ledger.rows.flatMap(({ source: s }) => {
    if (s.kind !== "1099r") return [];
    const a = s.amounts, spouse = s.owner_tin !== input.taxpayer_ssn;
    const recipient_name = spouse ? spouse_name : taxpayer_name;
    if (!recipient_name) {
      throw Error(
        "Substitute retirement statement needs its actual owner name",
      );
    }
    // These are calculation facts projected from the substitute, never an issued
    // original PDF or invented state wage base/ID. State withholding stays in its
    // source ledger and is routed separately by the retirement node.
    return [
      retirementCopy2026Schema.parse({
        tax_year: 2026,
        source_document_reference: s.source_document_reference,
        statement_identifier: s.source_document_reference,
        current_copy_review_reference: input.claim.record_reference,
        corrected: false,
        payer_name: s.payer_name,
        payer_tin: s.payer_tin,
        payer_address: {
          street: s.payer_address.street,
          city: s.payer_address.city,
          state_or_province: s.payer_address.state,
          postal_code: s.payer_address.postal_code,
          country: "US",
        },
        recipient: spouse ? "spouse" : "taxpayer",
        recipient_name,
        recipient_tin: s.owner_tin,
        recipient_identity_review_reference: input.claim.record_reference,
        account_number: s.account_number,
        box1_gross_distribution: a.gross_distribution,
        box2a_taxable_amount: a.taxable_amount,
        box2b_taxable_amount_not_determined: a.taxable_amount_not_determined,
        box2b_total_distribution: a.total_distribution,
        box3_capital_gain: a.capital_gain,
        box4_federal_withheld: a.federal_withheld,
        box5_employee_contributions: a.employee_contributions,
        box7a_distribution_codes: a.distribution_code.split(
          "",
        ) as DistributionCode[],
        box7b_ira_sep_simple: a.is_ira,
        box7c_trump_account: false,
      }),
    ];
  });
  return {
    source_input: input,
    ledger,
    substitute_retirement_copies: retirement,
    effective_wages: [
      ...ledger.current_issued_wages,
      ...ledger.substitute_wages,
    ],
    effective_retirement_copies: [
      ...ledger.current_issued_retirement_copies,
      ...retirement,
    ],
  };
}
export const form4852Claim2026Schema = form4852Source2026Schema.pick({
  claim: true,
});
