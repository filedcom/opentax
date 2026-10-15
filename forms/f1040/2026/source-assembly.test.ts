import { mortgage_interest_2026 } from "./inputs/mortgage-interest.ts";
import {
  syntheticMortgage2026,
  syntheticMortgageRefinance2026,
} from "./inputs/mortgage.fixture.ts";
import { schedule_a_2026 } from "./nodes/schedule-a.ts";
import {
  itemizedClaim2026,
  syntheticMedical2026,
  syntheticPropertyTax2026,
} from "./schedule-a.fixture.ts";
import { syntheticForm8919_2026 } from "./inputs/form8919.fixture.ts";
import { form8919_2026 } from "./inputs/form8919.ts";
import { form8959_2026 } from "./nodes/form8959.ts";
import { ct2_2026 } from "./inputs/ct2.ts";
import { form4137_2026 } from "./inputs/form4137.ts";
import { syntheticForm4137_2026 } from "./inputs/form4137.fixture.ts";
import { schedule2_2026 } from "./nodes/schedule2.ts";
import { vehicle_loan_interest_2026 } from "./inputs/vehicle-loan-interest.ts";
import { syntheticVehicleLoan2026 } from "./inputs/vehicle-loan.fixture.ts";
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

for (
  const scenario of [
    "wages",
    "itemized",
    "mortgage",
    "mortgage-refinance",
    "overtime",
    "tips-overtime-senior",
    "vehicle",
    "unreported-tips",
    "medicare",
    "ct2",
    "misclassified-with-tips",
  ]
) {
  const refinance = scenario === "mortgage-refinance";
  const mortgage = scenario === "mortgage" || refinance;
  const mortgageDeduction = refinance ? 24092 : 24000;
  const itemized = scenario === "itemized";
  const overtime = scenario === "overtime" ||
    scenario === "tips-overtime-senior";
  const vehicle = scenario === "vehicle";
  const misclassified = scenario === "misclassified-with-tips";
  const unreported = scenario === "unreported-tips" || misclassified;
  const medicare = scenario === "medicare";
  const ct2 = scenario === "ct2";
  const expectedWages = vehicle ? 80_001 : 150_001;
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
      schedule_a: schedule_a_2026,
      mortgage_interest: mortgage_interest_2026,
      vehicle_loan_interest: vehicle_loan_interest_2026,
      w2: w2_2026,
      form4137: form4137_2026,
      form8919: form8919_2026,
      form8959: form8959_2026,
      ct2: ct2_2026,
      schedule2: schedule2_2026,
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
      ...(overtime || vehicle || unreported
        ? {
          schedule1a: {
            tax_year: 2026,
            source_scope_review: {
              ...scopeReview2026,
              has_vehicle_loan_interest: vehicle,
              has_form4137_tips: unreported,
            },
            part1_zero_exclusions_review: zeroExclusions2026,
            ...(seniorTips || unreported
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
      ...(mortgage
        ? {
          mortgage_interest: (() => {
            const {
              filing_status: _status,
              taxpayer_ssn: _taxpayer,
              spouse_ssn: _spouse,
              ...claim
            } = refinance
              ? syntheticMortgageRefinance2026(true)
              : syntheticMortgage2026();
            return claim;
          })(),
        }
        : {}),
      schedule_a: {
        ...itemizedClaim2026,
        ...(mortgage
          ? {
            source_scope_review: {
              ...itemizedClaim2026.source_scope_review,
              no_mortgage_or_investment_interest: undefined,
              has_mortgage_interest_sources: true,
              no_investment_interest: true,
            },
          }
          : {}),
        ...(itemized
          ? {
            medical_payments: [syntheticMedical2026()],
            tax_payments: [syntheticPropertyTax2026()],
          }
          : {}),
      },
      cash_gifts: [{
        ...syntheticCashGift2026,
        ...(itemized ? { amount_paid: 10_100 } : {}),
      }],
      ...(misclassified
        ? {
          form8919: {
            tax_year: 2026,
            evidence_review_date: "2027-02-10",
            forms: syntheticForm8919_2026().forms,
          },
        }
        : {}),
      ...(ct2
        ? {
          ct2s: [1, 2, 3, 4].map((quarter) => ({
            recipient: "taxpayer",
            recipient_ssn: "111223333",
            tax_year: 2026,
            quarter,
            source_document_reference: `ct2-quarter-${quarter}`,
            line2_tier1_medicare_compensation: 60_000,
            line3_additional_medicare_compensation: quarter === 4 ? 40_000 : 0,
            line3_additional_medicare_tax_paid: quarter === 4 ? 360 : 0,
            payment_reference: "ct2-payment",
          })),
        }
        : {}),
      ...(vehicle ? { vehicle_loans: [syntheticVehicleLoan2026()] } : {}),
      ...(unreported
        ? {
          form4137: {
            tax_year: 2026,
            forms: syntheticForm4137_2026().forms!.map((form) => ({
              ...form,
              employers: form.employers.map((row) => ({
                ...row,
                name: "First",
                qualification_review: {
                  ...row.qualification_review!,
                  source_document_reference: "w2-one",
                },
              })),
            })),
          },
        }
        : {}),
      w2s: [
        {
          tax_year: 2026,
          employer_ein: "123456789",
          employer_name: "First",
          employee_ssn: "111223333",
          source_document_reference: "w2-one",
          box3_ss_wages: misclassified ? 130_000 : 100_000,
          box5_medicare_wages: medicare ? 250_000 : vehicle ? 30_000 : 100_000,
          box6_medicare_withheld: medicare ? 4075 : vehicle ? 435 : 1450,
          ...(unreported ? { box8_allocated_tips: 2000 } : {}),
          box1_wages: vehicle ? 30_000.25 : 100_000.25,
          ...(overtime || unreported
            ? {
              box12_entries: [
                ...(overtime ? [{ code: "TT", amount: 10_000 }] : []),
                ...(seniorTips || unreported
                  ? [{ code: "TP", amount: 20_000 }]
                  : []),
              ],
              ...(seniorTips || unreported
                ? { box14b_tipped_codes: ["102", "000"] }
                : {}),
            }
            : {}),
          box2_fed_withheld: 20_000.25,
          ...(itemized
            ? {
              box17_state_withheld: 8_000,
              box19_local_withheld: 1_000,
              box14a_entries: [{
                description: "SDI",
                amount: 500,
                is_state_sdi_pfml: true,
              }],
            }
            : {}),
        },
        {
          tax_year: 2026,
          employer_ein: "987654321",
          employer_name: "Second",
          employee_ssn: "111223333",
          source_document_reference: "w2-two",
          box1_wages: 50_000.25,
          box3_ss_wages: 50_000,
          box5_medicare_wages: 50_000,
          box6_medicare_withheld: 725,
          box2_fed_withheld: 10_000.25,
        },
      ],
      f1040: {
        line16_income_tax: unreported
          ? 20_342
          : vehicle
          ? 7_736
          : seniorTips
          ? 17_119
          : overtime
          ? 22_214
          : 24_614,
      },
    }, { formType: "f1040", taxYear: 2026 });
    assertEquals(result.diagnostics, []);
    assertEquals(
      result.pending.f1040.line13a_schedule1a,
      misclassified
        ? 18_800
        : unreported
        ? 19_800
        : vehicle
        ? 4_200
        : seniorTips
        ? 29_500
        : overtime
        ? 10_000
        : 0,
    );
    assertEquals(
      result.pending.standard_deduction.schedule1a_line43,
      seniorTips ? 1_500 : 0,
    );
    assertEquals(result.pending.f1040.taxpayer_first_name, "Ada");
    assertEquals(result.pending.w2.taxpayer_ssn, "111223333");
    assertEquals(result.pending.f1040.line1a_wages, expectedWages);
    assertEquals(
      result.pending.f1040.line9_total_income,
      expectedWages + (unreported ? 2000 : 0) + (misclassified ? 10_000 : 0),
    );
    assertEquals(
      result.pending.f1040.line11b_agi,
      expectedWages + (unreported ? 2000 : 0) + (misclassified ? 10_000 : 0),
    );
    assertEquals(
      result.pending.f1040.line25d_total_withholding,
      misclassified ? 31_001 : medicare ? 30_451 : ct2 ? 30_361 : 30_001,
    );
    assertEquals(
      result.pending.f1040.line12e_standard_or_itemized,
      mortgage
        ? mortgageDeduction
        : itemized
        ? 53_250
        : seniorTips
        ? 18_150
        : 16_100,
    );
    assertEquals(
      result.pending.f1040.line12f_nonitemizer_charity,
      itemized || mortgage ? 0 : 500,
    );
    if (mortgage) {
      assertEquals(result.pending.f1040.deduction_method, "itemized");
      assertEquals(
        result.pending.standard_deduction.itemized_before_overall_limit,
        mortgageDeduction,
      );
      assertEquals(result.pending.income_tax_calculation.form6251_line2a, 0);
    }
    if (itemized) {
      assertEquals(result.pending.f1040.deduction_method, "itemized");
      assertEquals(
        result.pending.income_tax_calculation.form6251_line2a,
        38_750,
      );
      assertEquals(
        result.pending.standard_deduction.itemized_before_overall_limit,
        53_250,
      );
    }
    assertEquals(
      result.pending.income_tax_calculation.taxable_income,
      mortgage
        ? expectedWages - mortgageDeduction
        : itemized
        ? 96_751
        : misclassified
        ? 126_601
        : unreported
        ? 115_601
        : vehicle
        ? 59_201
        : seniorTips
        ? 101_851
        : overtime
        ? 123_401
        : 133_401,
    );
    assertEquals(
      result.pending.f1040.line35a_refund,
      misclassified
        ? 10206
        : medicare
        ? 4937
        : unreported
        ? 9506
        : vehicle
        ? 22_265
        : seniorTips
        ? 12_882
        : overtime
        ? 7_787
        : 5_387,
    );
    if (ct2) {
      assertEquals(result.pending.f1040.line23_other_taxes, 360);
      assertEquals(result.pending.f1040.line25c_other_withheld, 360);
      assertEquals(result.pending.f1040.schedule2_line20, 360);
      assertEquals(result.pending.form8959.file_form8959, true);
    }
    if (medicare) {
      assertEquals(result.pending.f1040.line23_other_taxes, 900);
      assertEquals(result.pending.f1040.line25c_other_withheld, 450);
      assertEquals(result.pending.f1040.schedule2_line20, 900);
      assertEquals(result.pending.form8959.file_form8959, true);
    }
    if (unreported) {
      assertEquals(result.pending.f1040.line1c_unreported_tips, 2000);
      assertEquals(
        result.pending.f1040.line23_other_taxes,
        misclassified ? 453 : 153,
      );
      assertEquals(
        result.pending.f1040.schedule2_line20,
        misclassified ? 453 : 153,
      );
      assertEquals(result.pending.schedule3a, undefined); // No refundable credits in this fixture.
      assertEquals(
        (result.pending.form8959.calculation_2026 as ReturnType<
          typeof import("./nodes/form8959.ts").calculateForm8959_2026
        >).lines.line2,
        2000,
      );
    }
    if (misclassified) {
      assertEquals(result.pending.f1040.line1g_wages_8919, 10_000);
      assertEquals(result.pending.f1040.line25b_withheld_1099, 1000);
      assertEquals(result.pending.schedule2.line16b_form8919_wage_tax, 300);
      const form = (result.pending.form8919.calculation_2026 as ReturnType<
        typeof import("./inputs/form8919.ts").calculateForm8919_2026
      >).forms[0];
      assertEquals([form.line8, form.line10], [182_000, 2500]);
      assertEquals(
        (result.pending.form8959.calculation_2026 as ReturnType<
          typeof import("./nodes/form8959.ts").calculateForm8959_2026
        >).lines.line3,
        10_000,
      );
    }
    if (seniorTips) {
      assertEquals(
        result.pending.income_tax_calculation.form6251_line1b,
        103_351,
      );
    }
    assertEquals(result.pending.w2.issued_w2_sources instanceof Array, true);
    // Make the still-unwired credit routes visible; this is not filing readiness.
    assertEquals(
      result.pending.eitc.earned_income,
      misclassified
        ? [expectedWages - 0.5, 2000, 10_000]
        : unreported
        ? [expectedWages - 0.5, 2000]
        : expectedWages - 0.5,
    );
    assertEquals(
      result.pending.f8812.auto_agi,
      expectedWages + (unreported ? 2000 : 0) + (misclassified ? 10_000 : 0),
    );
  });
}
