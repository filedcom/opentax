import { test } from "bun:test";
import { assertEquals, assert, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../../../2025/index.ts";
import { f1040_2026 } from "../../../../../../2026/index.ts";
import { assertSstbScheduleCSource } from "../../../../../../2025/mef/forms/deductions/business/f8995a/f8995a-sstb-source.ts";
import { inputSchema as form8995aSchema } from "./index.ts";
import { inputSchema as retirementSchema, PlanType } from "../../../../../inputs/adjustments/retirement/sep_retirement/index.ts";

// Independently chosen fictional cases. Worksheet authorities:
// https://www.irs.gov/publications/p560 (chapter 5)
// https://www.irs.gov/instructions/i8995a (attributable retirement deduction)
// https://www.irs.gov/pub/irs-drop/rp-25-32.pdf (2026 rates and QBI limits)
// https://www.irs.gov/irb/2024-45_IRB (2025 rates)
// https://www.irs.gov/instructions/i1040sse (whole-dollar Schedule SE lines)
function physicianRetirementFixture(wages = 0, lowerProfit = false) {
  const profit = lowerProfit ? 90000 : 575000;
  const retirement = lowerProfit ? 12000 : 65000;
  return {
    general: {
      filing_status: "mfj",
      taxpayer_ssn: "000000002",
      spouse_ssn: "000000003",
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    schedule_c: [{
      line_a_principal_business: "Professional medical services",
      line_b_business_code: "621111",
      line_c_business_name: "Synthetic physician practice",
      line_d_ein: "000000005",
      business_reference: "physician",
      proprietor_recipient: "S",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_1_gross_receipts: profit,
      qbi_specified_service: true,
      qbi_w2_wages: 0,
      qbi_unadjusted_basis: 0,
      qbi_no_other_adjustments_confirmed: false,
      qbi_sstb_filing_review: {
        owner_ssn: "000000003",
        classification_source_reference: "Synthetic physician engagements",
        business_activity_description: "Professional medical services",
        service_classification_review: {
          field: "health",
          engagement_records_reference: "Synthetic medical engagements",
          all_receipts_from_reviewed_services_confirmed: true,
          revenue_records: [{
            invoice_reference: "synthetic-annual-medical-receipts",
            service_description: "Professional medical services",
            amount: profit,
          }],
          medical_services_in_professional_capacity_confirmed: true,
          no_health_club_processing_research_manufacturing_sales_confirmed: true,
        },
        employee_w2_records: [],
        no_business_employees_review: {
          payroll_and_expense_ledger_reference: "Synthetic owner-only ledger",
          sole_proprietor_only_workforce_confirmed: true,
          no_employee_w2_or_business_payroll_confirmed: true,
        },
        all_business_payroll_included_confirmed: true,
        no_other_business_or_aggregation_confirmed: true,
        no_ptp_or_loss_carryforward_confirmed: true,
        qualified_dividends_zero_confirmed: true,
        no_qualified_property_confirmed: true,
        retirement_plan_deduction_review: {
          owner_ssn: "000000003",
          business_reference: "physician",
          deduction_amount: retirement,
          source_document_reference: "Synthetic solo401k contribution records",
          no_other_qbi_adjustments_confirmed: true,
        },
        review_reference: "Synthetic physician QBI review",
        reviewed_by: "Test fixture",
        reviewed_on: "2027-04-01",
      },
    }],
    sep_retirement: [{
      plan_type: "SOLO_401K",
      net_self_employment_compensation: lowerProfit ? 83642 : 555861,
      solo401k_employee_deferral: lowerProfit ? 4000 : 20000,
      solo401k_employer_contribution: lowerProfit ? 8000 : 45000,
    }],
    ...(wages > 0 ? {
      w2: [{
        employer_name: "Synthetic spouse employer",
        employer_ein: "000000004",
        employee_ssn: "000000002",
        source_document_reference: "Synthetic issued W2",
        box1_wages: wages,
        box2_fed_withheld: 0,
        box3_ss_wages: Math.min(wages, 184500),
        box4_ss_withheld: Math.min(wages, 184500) * 0.062,
        box5_medicare_wages: wages,
        box6_medicare_withheld: wages * 0.0145,
      }],
    } : {}),
  };
}

// Independent 2026 worksheet: Schedule SE line 10 is 10306 and line 11 is
// 2410, totaling 12716; deductible half is 6358. QBI is 71642; pre-QBI TI
// is 39442; income cap 7888; income tax 3293; total 16009.
// IRS Pub. 560 chapter 5, i8995, and Rev. Proc. 2025-32.
test("below-threshold physician attributes its retirement deduction", () => {
  const result = f1040_2026.executeReturn(physicianRetirementFixture(0, true));
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line13_qbi_deduction, 7888);
  assertEquals(result.pending.f1040.line24_total_tax, 16009);
});

for (const invalid of ["owner", "business", "amount"] as const) {
  test(`below-threshold physician QBI rejects ${invalid} retirement attribution`, () => {
    const input = physicianRetirementFixture(0, true);
    const review = input.schedule_c[0].qbi_sstb_filing_review
      .retirement_plan_deduction_review;
    if (invalid === "owner") review.owner_ssn = "000000002";
    if (invalid === "business") review.business_reference = "other-business";
    if (invalid === "amount") review.deduction_amount--;
    const result = f1040_2026.executeReturn(input);
    assert(result.diagnostics.some((d) => d.code === "EXECUTOR_NODE_FAILURE"));
  });
}

// IRS i8995: deductible qualified-retirement contributions reduce business QBI.
// 2026 MFJ threshold/range from Rev. Proc. 2025-32 and P.L.119-21.
// Independent whole-dollar Schedule A calculation: no wages/UBIA, so both
// the SSTB applicable percentage and phased wage/property limitation apply.
for (const [wages, qbi, totalTax] of [[0, 39244, 127931], [50000, 8772, 154132]]) {
  test(`2026 physician QBI attributes solo401k deduction with spouse wages ${wages}`, () => {
    const result = f1040_2026.executeReturn(physicianRetirementFixture(wages));
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.f1040.line13_qbi_deduction, qbi);
    assertEquals(result.pending.f1040.line24_total_tax, totalTax);
    assertEquals(result.pending.form8995a.sstb_qbi, 490861);
    const advanced = form8995aSchema.parse(result.pending.form8995a);
    assertEquals(advanced.single_sstb_schedule_c_source
      ?.retirement_plan_deduction, 65000);
    assertSstbScheduleCSource(
      advanced, result.pending, 2026,
    );
    const changed = structuredClone(result.pending);
    changed.schedule1.line16_sep_simple = 64999;
    assertThrows(() => assertSstbScheduleCSource(
      form8995aSchema.parse(changed.form8995a), changed, 2026,
    ));
  });
}

for (const invalid of ["owner", "business", "amount", "missing-review"] as const) {
  test(`physician retirement QBI rejects ${invalid} attribution`, () => {
    const input = physicianRetirementFixture();
    const review = input.schedule_c[0].qbi_sstb_filing_review
      .retirement_plan_deduction_review;
    if (invalid === "owner") review.owner_ssn = "000000002";
    if (invalid === "business") review.business_reference = "other-business";
    if (invalid === "amount") review.deduction_amount--;
    if (invalid === "missing-review") review.source_document_reference = "";
    const result = f1040_2026.executeReturn(input);
    assert(result.diagnostics.some((d) => d.code === "EXECUTOR_NODE_FAILURE"));
  });
}

test("physician filing source replays the actual retirement plan and earnings", () => {
  const result = f1040_2026.executeReturn(physicianRetirementFixture(50000));
  assertEquals(result.diagnostics, []);
  for (const invalid of ["earnings", "contribution", "plan-type", "missing-plan"] as const) {
    const plans = retirementSchema.parse(result.pending.sep_retirement).sep_retirements;
    assert(plans);
    if (invalid === "earnings") plans[0].net_self_employment_compensation = 555862;
    if (invalid === "contribution") plans[0].solo401k_employer_contribution = 44999;
    if (invalid === "plan-type") plans[0].plan_type = PlanType.SEP;
    const changed = {
      ...result.pending,
      sep_retirement: {
        sep_retirements: invalid === "missing-plan" ? [] : plans,
      },
    };
    assertThrows(() => assertSstbScheduleCSource(
      form8995aSchema.parse(result.pending.form8995a), changed, 2026,
    ));
  }
});

test("2025 physician QBI retirement attribution uses that year's constants", () => {
  const input = physicianRetirementFixture(50000);
  input.sep_retirement[0].net_self_employment_compensation = 556382;
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  // Independently: profit 575000 - half-SE 18618 - retirement 65000 gives
  // QBI 491382. Pre-QBI TI 509882 exceeds the 2025 SSTB endpoint 494600.
  // Rev. Proc. 2024-40: 35% bracket base 114462 gives income tax 117553;
  // Schedule SE 37235 plus Additional Medicare 2979 yields total 157767.
  assertEquals(result.pending.f1040.line13_qbi_deduction ?? 0, 0);
  assertEquals(result.pending.f1040.line24_total_tax, 157767);
});
