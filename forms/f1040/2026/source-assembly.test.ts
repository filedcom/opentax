import {
  scopeReview2026,
  zeroExclusions2026,
} from "./nodes/schedule1a.fixture.ts";
import { schedule1a_2026 } from "./nodes/schedule1a.ts";
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

for (const scenario of ["wages", "overtime", "tips-overtime-senior"]) {
  const overtime = scenario !== "wages";
  const seniorTips = scenario === "tips-overtime-senior";
  Deno.test(`2026 ${scenario} feed shared AGI and deduction settlement`, () => {
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
      schedule1a: schedule1a_2026,
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
        taxpayer_dob: seniorTips ? "1962-01-01" : "1980-06-01",
        taxpayer_blind: false,
        taxpayer_can_be_claimed_as_dependent: false,
        taxpayer_citizen_national_or_work_authorized: true,
        taxpayer_ssn_valid_for_employment: true,
        taxpayer_ssn_issued_before_due_date: true,
        taxpayer_tin_issued_by_due_date: true,
        digital_assets: false,
        tax_residency: "full_year_citizen_or_resident",
        short_tax_year_due_to_accounting_change: false,
      },
      ...(overtime
        ? {
          schedule1a: {
            tax_year: 2026,
            source_scope_review: scopeReview2026,
            part1_zero_exclusions_review: zeroExclusions2026,
            ...(seniorTips
              ? {
                employee_tip_reviews: [{
                  source_document_reference: "w2-one",
                  employee_ssn: "111223333",
                  employer_ein: "123456789",
                  allocations: [{
                    occupation_code: "102",
                    qualified_cash_tips: 18_000,
                    occupation_and_tip_records_reference: "tip-log",
                  }],
                  excluded_cash_tips: 2_000,
                  qualification_review_reference: "qualification-records",
                  voluntary_customer_tips_not_service_charges: true,
                  no_recharacterized_wages_or_related_payor_tips: true,
                  services_not_illegal_under_applicable_law: true,
                  sstb_treatment: "not_sstb",
                }],
              }
              : {}),
          },
        }
        : {}),
      cash_gifts: [syntheticCashGift2026],
      w2s: [
        {
          tax_year: 2026,
          employer_ein: "123456789",
          employer_name: "First",
          employee_ssn: "111223333",
          source_document_reference: "w2-one",
          box1_wages: 100_000.25,
          ...(overtime
            ? {
              box12_entries: [
                { code: "TT", amount: 10_000 },
                ...(seniorTips ? [{ code: "TP", amount: 20_000 }] : []),
              ],
              ...(seniorTips ? { box14b_tipped_codes: ["102", "000"] } : {}),
            }
            : {}),
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
        line16_income_tax: seniorTips ? 17_119 : overtime ? 22_214 : 24_614,
      },
    }, { formType: "f1040", taxYear: 2026 });
    assertEquals(result.diagnostics, []);
    assertEquals(
      result.pending.f1040.line13a_schedule1a,
      seniorTips ? 29_500 : overtime ? 10_000 : 0,
    );
    assertEquals(
      result.pending.standard_deduction.schedule1a_line43,
      seniorTips ? 1_500 : 0,
    );
    assertEquals(result.pending.f1040.taxpayer_first_name, "Ada");
    assertEquals(result.pending.w2.taxpayer_ssn, "111223333");
    assertEquals(result.pending.f1040.line1a_wages, 150_001);
    assertEquals(result.pending.f1040.line9_total_income, 150_001);
    assertEquals(result.pending.f1040.line11b_agi, 150_001);
    assertEquals(result.pending.f1040.line25d_total_withholding, 30_001);
    assertEquals(
      result.pending.f1040.line12e_standard_or_itemized,
      seniorTips ? 18_150 : 16_100,
    );
    assertEquals(result.pending.f1040.line12f_nonitemizer_charity, 500);
    assertEquals(
      result.pending.income_tax_calculation.taxable_income,
      seniorTips ? 101_851 : overtime ? 123_401 : 133_401,
    );
    assertEquals(
      result.pending.f1040.line35a_refund,
      seniorTips ? 12_882 : overtime ? 7_787 : 5_387,
    );
    if (seniorTips) {
      assertEquals(
        result.pending.income_tax_calculation.form6251_line1b,
        103_351,
      );
    }
    assertEquals(result.pending.w2.issued_w2_sources instanceof Array, true);
    // Make the still-unwired credit routes visible; this is not filing readiness.
    assertEquals(result.pending.eitc.earned_income, 150_000.5);
    assertEquals(result.pending.f8812.auto_agi, 150_001);
  });
}
