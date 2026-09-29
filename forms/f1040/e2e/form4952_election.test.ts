import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";

const plan = buildExecutionPlan(registry);

function filing(election: number) {
  return execute(plan, registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1980-06-15",
    },
    f1099div: [{
      payerName: "Investment Fund",
      isNominee: false,
      box11: false,
      box1a: 100_000,
      box1b: 1_000,
      investment_property_for_form4952: true,
    }],
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      fincen_form114_required: false,
      foreign_trust_question: false,
    },
    form4952: {
      investment_interest_expense: 20_000,
      investment_income_election: election,
      amt_refigure: {
        prior_year_disallowed_interest: 0,
        interest_on_private_activity_bonds: 0,
        other_gross_income_adjustment: 0,
        qualified_dividends_adjustment: 0,
        net_disposition_gain_adjustment: 0,
        net_capital_gain_adjustment: 0,
        investment_expenses_adjustment: 0,
      },
    },
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("E2E: Form 4952 election changes tax rate without changing dividend income or interest deduction", () => {
  const ordinary = filing(0);
  const elected = filing(1_000);
  assertEquals(ordinary.diagnostics, []);
  assertEquals(elected.diagnostics, []);
  assertEquals(ordinary.pending.form4952?.line8, 20_000);
  assertEquals(elected.pending.form4952?.line8, 20_000);
  assertEquals(elected.pending.form4952?.line4g, 1_000);
  assertEquals(elected.pending.f1040?.line3a_qualified_dividends, 1_000);
  assertEquals(elected.pending.f1040?.line3b_ordinary_dividends, 100_000);
  assertEquals(elected.pending.f1040?.line15_taxable_income, 80_000);
  assertEquals(
    Number(elected.pending.f1040?.line16_income_tax ?? 0) -
      Number(ordinary.pending.f1040?.line16_income_tax ?? 0),
    70,
  );
});
