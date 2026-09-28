import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";

const plan = buildExecutionPlan(registry);

Deno.test("one 1099-MISC box 2 passthrough merges with its Schedule E property without duplicate income", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Morgan",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "987654321",
      taxpayer_dob: "1980-06-15",
    },
    f1099m: [{
      payer_name: "Patent Licensee",
      payer_tin: "123456789",
      recipient_tin: "987654321",
      box2_royalties: 800,
      box2_royalties_routing: "schedule_e",
      box2_nonpassive_portfolio_investment_for_form4952_verified: true,
    }],
    schedule_e: [{
      tsj: "T",
      property_description: "Patent royalty property",
      property_type: 6,
      activity_type: "D",
      fair_rental_days: 0,
      personal_use_days: 0,
      rent_income: 0,
      royalties_income: 800,
      form_1099_payments_made: false,
      f1099m_royalty_source: {
        payer_name: "Patent Licensee",
        payer_tin: "123456789",
        recipient_tin: "987654321",
        box2_gross_royalties: 800,
      },
    }],
    form4952: {
      investment_interest_expense: 300,
      investment_interest_expense_excludes_royalty_attributable_interest: true,
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
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_e?.royalty_income, 800);
  assertEquals(Array.isArray(result.pending.schedule_e?.schedule_es), true);
  assertEquals(result.pending.schedule1?.line5_schedule_e, 800);
  assertEquals(result.pending.f1040?.line8_additional_income, 800);
  assertEquals(result.pending.form4952?.line4a, 800);
  assertEquals(result.pending.form4952?.line8, 300);
});
