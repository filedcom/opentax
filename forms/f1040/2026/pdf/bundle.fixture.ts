import { investmentGraphInput2026 } from "../investment-assembly.fixture.ts";
import { syntheticPropertyTax2026 } from "../schedule-a.fixture.ts";
import { scheduleBFixture2026 } from "./schedule_b.fixture.ts";

/** Synthetic source inventory with multiple forms and payer continuation pages. */
export function draftBundleFixture2026() {
  const input = investmentGraphInput2026(250000);
  const source = scheduleBFixture2026();
  input.investment_income.f1099ints = source.f1099ints!;
  input.investment_income.f1099divs = source.f1099divs!;
  input.investment_income.f1099ints[0].box2 = 100;
  return {
    ...input,
    schedule_a: {
      ...input.schedule_a,
      tax_payments: [{ ...syntheticPropertyTax2026(), payer_ssn: "123456789" }],
    },
  };
}
