import { cash_charity_2026 } from "./inputs/cash-charity.ts";
import { syntheticCashGift2026 } from "./inputs/cash-charity.fixture.ts";
import { assertEquals } from "@std/assert";
import { buildStartNode } from "../start.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { w2_2026 } from "./inputs/w2.ts";
import { agi_2026 } from "./nodes/agi.ts";
import { f1040_2026_node, inputSchema as returnSchema } from "./nodes/f1040.ts";
import { schedule1_2026 } from "./nodes/schedule1.ts";
import { schedule3a } from "./nodes/schedule3a.ts";
import { inputNodes } from "./inputs.ts";
import { general_2026 } from "./inputs/general.ts";
import { standard_deduction_2026 } from "./nodes/standard_deduction.ts";
import { FilingStatus } from "../nodes/types.ts";

Deno.test("2026 issued wages feed shared AGI and whole-dollar return settlement in graph order", () => {
  // Internal integration fixture: income-tax finalization is still supplied here.
  // The full public registry must also resolve every emitted credit/form route.
  const registry = {
    start: buildStartNode([
      ...inputNodes,
      {
        node: f1040_2026_node,
        inputSchema: returnSchema.pick({ line16_income_tax: true }),
        isArray: false,
      },
    ]),
    general: general_2026,
    cash_charity: cash_charity_2026,
    w2: w2_2026,
    agi_aggregator: agi_2026,
    standard_deduction: standard_deduction_2026,
    schedule1: schedule1_2026,
    f1040: f1040_2026_node,
    schedule3a,
  };
  const plan = buildExecutionPlan(registry);
  const result = execute(plan, registry, {
    general: {
      tax_year: 2026,
      filing_status: FilingStatus.Single,
      taxpayer_ssn: "111223333",
      taxpayer_first_name: "Ada",
      taxpayer_last_name: "Rivera",
      taxpayer_dob: "1980-06-01",
      taxpayer_blind: false,
      taxpayer_can_be_claimed_as_dependent: false,
      taxpayer_citizen_national_or_work_authorized: true,
      digital_assets: false,
      tax_residency: "full_year_citizen_or_resident",
      short_tax_year_due_to_accounting_change: false,
    },
    cash_gifts: [syntheticCashGift2026],
    w2s: [
      {
        tax_year: 2026,
        employer_ein: "123456789",
        employer_name: "First",
        employee_ssn: "111223333",
        source_document_reference: "w2-one",
        box1_wages: 100_000.25,
        box2_fed_withheld: 20_000.25,
      },
      {
        tax_year: 2026,
        employer_ein: "987654321",
        employer_name: "Second",
        employee_ssn: "111223333",
        source_document_reference: "w2-two",
        box1_wages: 50_000.25,
        box2_fed_withheld: 10_000.25,
      },
    ],
    f1040: {
      line16_income_tax: 24_614,
    },
  }, { formType: "f1040", taxYear: 2026 });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.taxpayer_first_name, "Ada");
  assertEquals(result.pending.w2.taxpayer_ssn, "111223333");
  assertEquals(result.pending.f1040.line1a_wages, 150_001);
  assertEquals(result.pending.f1040.line9_total_income, 150_001);
  assertEquals(result.pending.f1040.line11b_agi, 150_001);
  assertEquals(result.pending.f1040.line25d_total_withholding, 30_001);
  assertEquals(result.pending.f1040.line12e_standard_or_itemized, 16_100);
  assertEquals(result.pending.f1040.line12f_nonitemizer_charity, 500);
  assertEquals(result.pending.income_tax_calculation.taxable_income, 133_401);
  assertEquals(result.pending.f1040.line35a_refund, 5_387);
  assertEquals(result.pending.w2.issued_w2_sources instanceof Array, true);
  // Make the still-unwired credit routes visible; this is not filing readiness.
  assertEquals(result.pending.eitc.earned_income, 150_000.5);
  assertEquals(result.pending.f8812.auto_agi, 150_001);
});
