import type { z } from "zod";
import {
  type adoptionIncomeBridge2026Schema,
  replayAdoptionIncome2026,
} from "./adoption-settlement.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
import { sumSourceMoney } from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";

/** IRC 1(g)(2)/911(d)(2) support compensation is distinct from taxable wages.
 * Restore the signed adoption adjustment, then add actual current compensation
 * received under reviewed programs, not the larger special-needs exclusion.
 * This does not change gross income, the dependent deduction or Form 8615 line 1.
 */
export function adoptionSupportWages2026(
  raw: z.input<typeof adoptionIncomeBridge2026Schema>,
  owners: { filing_status: string; taxpayer_ssn: string; spouse_ssn?: string },
  wages: number,
  inventoryReference: string | undefined,
) {
  const adoption = replayAdoptionIncome2026(raw, owners),
    s = adoption.source_input;
  if (inventoryReference !== s.claim.record_reference) {
    throw Error(
      "Adoption support review needs the actual adoption inventory reference",
    );
  }
  const baseWages = wages - adoption.line1f_taxable_adoption_benefits;
  const issued = roundWholeDollars(
    sumSourceMoney(
      s.wage_sources.filter((w) => !w.box13_statutory_employee).map((w) =>
        w.box1_wages
      ),
    ),
  );
  if (!Number.isSafeInteger(wages) || baseWages < issued) {
    throw Error(
      "Adoption support wages must reconcile the actual issued wages before exclusion",
    );
  }
  const programs = new Map(
    s.claim.programs.map((p) => [p.record_reference, p]),
  );
  const payments = s.claim.children.flatMap((ch) =>
    ch.current_benefits.map((b) => {
      const program = programs.get(b.program_reference)!;
      if (!program.personal_services_review) {
        throw Error(
          "Adoption support compensation needs the employer personal-services review",
        );
      }
      return {
        child_reference: ch.record_reference,
        payment_reference: b.record_reference,
        program_reference: b.program_reference,
        review_reference: program.personal_services_review.record_reference,
        owner_tin: program.owner_tin,
        amount: b.amount,
      };
    })
  );
  const compensation = roundWholeDollars(
    sumSourceMoney(payments.map((p) => p.amount)),
  );
  return {
    adoption,
    payments,
    taxable_adoption_adjustment: adoption.line1f_taxable_adoption_benefits,
    wages_before_adoption_adjustment: baseWages,
    current_adoption_compensation: compensation,
    wages_for_support: baseWages + compensation,
  };
}
