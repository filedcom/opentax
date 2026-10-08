import {
  form8882Fixture,
  form8882ScheduleCFixture,
} from "../../../../nodes/inputs/f8882/fixture.ts";
import { FilingStatus } from "../../../../nodes/types.ts";

export function form8882PreparedFixture() {
  const source = form8882Fixture();
  return {
    source,
    pending: {
      f8882: source,
      f1040: { taxpayer_ssn: "111223333" },
      schedule_c: form8882ScheduleCFixture(),
      f3800: {
        f8882_direct_employer_credit: {
          credit_amount: 11_000,
          schedule_c_business_reference: source.schedule_c_business_reference,
          subject_to_passive_activity_limit: false as const,
        },
        tax_context: {
          filingStatus: FilingStatus.Single,
          regularTax: 40_000,
          alternativeMinimumTax: 0,
          foreignTaxCredit: 0,
          priorAllowableCredits: 0,
          tentativeMinimumTax: 20_000,
          standardCredit: 11_000,
          specifiedCredit: 0,
          standardCarryforward: 0,
          specifiedCarryforward: 0,
        },
        allowed_credit: 11_000,
      },
    },
  };
}
