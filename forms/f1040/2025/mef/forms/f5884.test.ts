import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { TargetGroup } from "../../../nodes/inputs/f5884/index.ts";
import { form5884 } from "./f5884.ts";
import { form5884ControlledGroupStatement } from "./f5884_controlled_group_statement.ts";
import { form5884DeductionDifferentiationStatement } from "./f5884_deduction_differentiation_stmt.ts";

export const workOpportunitySource = {
  subject_to_passive_activity_limit: false,
  f5884s: [{
    employee_reference: "EMP-001",
    target_group: TargetGroup.TanfRecipient,
    hired_on: "2025-01-15",
    certification: {
      path: "certified_by_start",
      swa_certification_reference: "SWA-001",
      certification_received_on: "2025-01-15",
      certification_received_before_claim_confirmed: true,
      revocation: { status: "no_notice_received" },
    },
    qualified_wages_confirmed: true,
    not_prior_employee_confirmed: true,
    not_related_or_dependent_confirmed: true,
    more_than_half_wages_for_trade_or_business_confirmed: true,
    excluded_wages_removed_confirmed: true,
    wage_records: [{
      payroll_record_reference: "PAY-001",
      deduction_location: {
        kind: "schedule_c",
        business_reference: "BUSINESS-1",
      },
      service_period_start_on: "2025-02-01",
      service_period_end_on: "2025-02-28",
      paid_or_incurred_on: "2025-02-28",
      qualified_wages: 6_000,
    }],
    hours_worked: 400,
  }],
};

Deno.test("Form 5884 emits source wages and credit only when bundled with Form 3800", () => {
  assertEquals(form5884.build({}), "");
  const xml = form5884.build(workOpportunitySource, {
    documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
  });
  assertStringIncludes(
    xml,
    "<Wages400OrMoreHoursAmt>6000</Wages400OrMoreHoursAmt>",
  );
  assertStringIncludes(
    xml,
    "<Wages400OrMoreHoursCreditAmt>2400</Wages400OrMoreHoursCreditAmt>",
  );
  assertStringIncludes(xml, "<TotalCreditsAmt>2400</TotalCreditsAmt>");
  assertThrows(
    () =>
      form5884.build(workOpportunitySource, {
        documentIdsByPendingKey: { f3800: [] },
      }),
    Error,
    "needs attached Form 3800",
  );
  assertThrows(
    () =>
      form5884.build({
        ...workOpportunitySource,
        subject_to_passive_activity_limit: true,
      }),
    Error,
    "needs Form 8582-CR",
  );
});

Deno.test("Form 5884 full-return export reconciles its wage deduction", () => {
  const business = {
    schedule_cs: [{
      business_reference: "BUSINESS-1",
      line_a_principal_business: "Retail store",
      line_b_business_code: "459999",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_1_gross_receipts: 30_000,
      line_26_wages: 6_000,
    }],
    wotc_wage_reductions: [{
      business_reference: "BUSINESS-1",
      credit_amount: 2_400,
    }],
  };
  assertStringIncludes(
    form5884.build(workOpportunitySource, {
      pending: { schedule_c: business },
    }),
    "<TotalWagesAmt>2400</TotalWagesAmt>",
  );
  assertThrows(
    () =>
      form5884.build(workOpportunitySource, {
        pending: {},
      }),
    Error,
    "does not reconcile to Schedule C wages",
  );
  assertThrows(
    () =>
      form5884.build(workOpportunitySource, {
        pending: {
          schedule_c: {
            ...business,
            schedule_cs: [{
              ...business.schedule_cs[0],
              line_26_wages: 3_000,
            }],
          },
        },
      }),
    Error,
    "payroll exceeds linked Schedule C gross wages",
  );
  const twoEmployees = {
    ...workOpportunitySource,
    f5884s: [
      workOpportunitySource.f5884s[0],
      {
        ...workOpportunitySource.f5884s[0],
        employee_reference: "EMP-002",
        wage_records: [{
          ...workOpportunitySource.f5884s[0].wage_records[0],
          payroll_record_reference: "PAY-002",
        }],
      },
    ],
  };
  assertThrows(
    () =>
      form5884.build(twoEmployees, {
        pending: {
          schedule_c: {
            ...business,
            schedule_cs: [{
              ...business.schedule_cs[0],
              line_26_wages: 10_000,
            }],
            wotc_wage_reductions: [{
              business_reference: "BUSINESS-1",
              credit_amount: 4_800,
            }],
          },
        },
      }),
    Error,
    "payroll exceeds linked Schedule C gross wages",
  );
  assertThrows(
    () =>
      form5884.build(workOpportunitySource, {
        pending: {
          schedule_c: {
            ...business,
            wotc_wage_reductions: [{
              business_reference: "BUSINESS-1",
              credit_amount: 1_000,
            }],
          },
        },
      }),
    Error,
    "does not reconcile to Schedule C wages",
  );
  const farmSource = {
    ...workOpportunitySource,
    f5884s: [{
      ...workOpportunitySource.f5884s[0],
      wage_records: [{
        ...workOpportunitySource.f5884s[0].wage_records[0],
        deduction_location: { kind: "schedule_f", farm_id: "FARM-1" },
      }],
    }],
  };
  assertStringIncludes(
    form5884.build(farmSource, {
      pending: {
        schedule_f: {
          schedule_fs: [{
            farm_id: "FARM-1",
            line_a_principal_crop_activity: "GRAIN FARMING",
            line_b_agricultural_activity_code: "111100",
            line_e_material_participation: true,
            accounting_method: "cash",
            line1_sales_livestock_resale: 0,
            line22_labor_hired: 6_000,
          }],
          wotc_wage_reductions: [{ farm_id: "FARM-1", credit_amount: 2_400 }],
        },
      },
    }),
    "<TotalWagesAmt>2400</TotalWagesAmt>",
  );
  assertThrows(
    () =>
      form5884.build(farmSource, {
        pending: {
          schedule_f: {
            schedule_fs: [{
              farm_id: "FARM-1",
              line_a_principal_crop_activity: "GRAIN FARMING",
              line_b_agricultural_activity_code: "111100",
              line_e_material_participation: true,
              accounting_method: "cash",
              line1_sales_livestock_resale: 0,
              line22_labor_hired: 3_000,
            }],
            wotc_wage_reductions: [{
              farm_id: "FARM-1",
              credit_amount: 2_400,
            }],
          },
        },
      }),
    Error,
    "payroll exceeds linked Schedule F gross labor hired",
  );
});

Deno.test("Form 5884 omits the taxpayer form for pass-through-only credit and prints line 3 for mixed credit", () => {
  const passThrough = {
    source_type: "partnership" as const,
    entity_ein: "123456789",
    source_document_reference: "2025 K-1 box 15 code J",
    credit_amount: 1_250,
    subject_to_passive_activity_limit: false,
  };
  assertEquals(
    form5884.build({
      subject_to_passive_activity_limit: false,
      f5884s: [],
      pass_through_credits: [passThrough],
    }),
    "",
  );
  const mixed = form5884.build({
    ...workOpportunitySource,
    pass_through_credits: [passThrough],
  }, {
    documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
  });
  assertStringIncludes(mixed, "<TotalWagesAmt>2400</TotalWagesAmt>");
  assertStringIncludes(
    mixed,
    "<PassThruWorkOpportunityCrAmt>1250</PassThruWorkOpportunityCrAmt>",
  );
  assertStringIncludes(mixed, "<TotalCreditsAmt>3650</TotalCreditsAmt>");
});

Deno.test("Form 5884 controlled-group share links both calculation statements", () => {
  const groupSource = {
    ...workOpportunitySource,
    controlled_group: {
      kind: "controlled_corporations" as const,
      group_classification_document_reference: "2025 group ownership schedule",
      taxpayer_member_ein: "123456789",
      members: [
        { ein: "123456789", business_name: "Taxpayer Company" },
        { ein: "987654321", business_name: "Affiliate Company" },
      ],
    },
    f5884s: [
      {
        ...workOpportunitySource.f5884s[0],
        employee_reference: "GROUP-1",
        employer_ein: "123456789",
        hours_worked: 200,
      },
      {
        ...workOpportunitySource.f5884s[0],
        employee_reference: "GROUP-2",
        employer_ein: "987654321",
        wage_records: [{
          ...workOpportunitySource.f5884s[0].wage_records[0],
          deduction_location: { kind: "entity_return" },
        }],
        hours_worked: 400,
      },
    ],
  };
  const context = {
    pending: {
      f5884: groupSource,
      schedule_c: {
        schedule_cs: [{
          business_reference: "BUSINESS-1",
          line_a_principal_business: "Retail store",
          line_b_business_code: "459999",
          line_f_accounting_method: "cash",
          line_g_material_participation: true,
          line_1_gross_receipts: 30_000,
          line_26_wages: 6_000,
        }],
        wotc_wage_reductions: [{
          business_reference: "BUSINESS-1",
          credit_amount: 1_950,
        }],
      },
    },
    documentIdsByPendingKey: {
      f3800: ["IRS3800_1"],
      f5884_controlled_group_statement: ["ControlledGroupMemberStatement2"],
      f5884_deduction_differentiation_stmt: ["DeductionDifferentiationStmt3"],
    },
  };
  const xml = form5884.build(groupSource, context);
  assertStringIncludes(xml, "<TotalWagesAmt referenceDocumentId=");
  assertStringIncludes(
    xml,
    "ControlledGroupMemberStatement2 DeductionDifferentiationStmt3",
  );
  assertStringIncludes(xml, ">1950</TotalWagesAmt>");
  assertStringIncludes(xml, "<TotalCreditsAmt>1950</TotalCreditsAmt>");
  const members = form5884ControlledGroupStatement.build([], context);
  assertStringIncludes(members, "<ShareOfCreditAmt>1950</ShareOfCreditAmt>");
  assertStringIncludes(members, "Taxpayer Company");
  assertStringIncludes(members, "Affiliate Company");
  const explanation = form5884DeductionDifferentiationStatement.build(
    [],
    context,
  );
  assertStringIncludes(explanation, "group qualified wages 12000");
  assertStringIncludes(explanation, "group credit 3900");
  assertThrows(
    () =>
      form5884.build(groupSource, {
        documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
      }),
    Error,
    "needs both linked statements",
  );
});
