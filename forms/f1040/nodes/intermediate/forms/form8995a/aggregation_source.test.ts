import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../types.ts";
import { FilingStatus as HeaderFilingStatus } from "../../../../mef/header.ts";
import {
  buildStagedAggregatedIRS8995A,
  form8995a as form8995aMef,
} from "../../../../2025/mef/forms/f8995a.ts";
import {
  buildStagedIRS8995AScheduleB,
  form8995aScheduleB as scheduleBMef,
} from "../../../../2025/mef/forms/f8995a_schedule_b.ts";
import {
  form8995aPdf,
  projectStagedAggregatedParentPdf,
} from "../../../../2025/pdf/forms/f8995a.ts";
import { form8995aScheduleBPdf } from "../../../../2025/pdf/forms/f8995a_schedule_b.ts";
import {
  form8995a,
  inputSchema,
  validateTwoBusinessAggregationSource,
} from "./index.ts";

function aggregationInput() {
  const north = {
    line_a_principal_business: "Retail",
    line_b_business_code: "459999",
    line_c_business_name: "North Store",
    line_d_ein: "123456789",
    business_reference: "north-2025",
    proprietor_recipient: "T" as const,
    line_f_accounting_method: "cash" as const,
    line_g_material_participation: true,
    line_32_at_risk: "a" as const,
    line_1_gross_receipts: 120_000,
    line_26_wages: 20_000,
    qbi_specified_service: false,
    qbi_w2_wages: 20_000,
    qbi_unadjusted_basis: 100_000,
  };
  const south = {
    line_a_principal_business: "Retail",
    line_b_business_code: "459999",
    line_c_business_name: "South Store",
    line_d_ein: "987654321",
    business_reference: "south-2025",
    proprietor_recipient: "T" as const,
    line_f_accounting_method: "cash" as const,
    line_g_material_participation: true,
    line_32_at_risk: "a" as const,
    line_1_gross_receipts: 90_000,
    line_26_wages: 10_000,
    qbi_specified_service: false,
    qbi_w2_wages: 10_000,
    qbi_unadjusted_basis: 100_000,
  };
  return inputSchema.parse({
    filing_status: FilingStatus.Single,
    taxable_income: 300_000,
    net_capital_gain: 0,
    qbi: 171_000,
    w2_wages: 30_000,
    unadjusted_basis: 200_000,
    qbi_no_prior_loss_or_suspended_loss_confirmed: true,
    aggregation_groups: [{
      group_name: "Retail Group",
      business_names: ["North Store", "South Store"],
      combined_for_limitation: true,
    }],
    aggregation_filing_details: {
      group_name: "Retail Group",
      group_description:
        "Two commonly owned retail stores sharing personnel and purchasing",
      common_owner_ssn: "123456789",
      tax_year_end: "2025-12-31",
      tax_year_end_source_reference: "calendar-year-ledger",
      election_history: {
        status: "new_2025",
        no_prior_election_confirmed: true,
      },
      rpe_aggregation_present: false,
      no_other_business_adjustments_confirmed: true,
      qualified_dividends_zero_confirmed: true,
      operational_factors: [{
        factor: "common_products",
        explanation: "Both stores sell the same merchandise",
        source_reference: "inventory-catalog",
      }, {
        factor: "shared_facilities_or_functions",
        explanation: "Both stores share purchasing and payroll staff",
        source_reference: "operations-ledger",
      }],
      members: [{
        business_reference: "north-2025",
        business_name: "North Store",
        ein: "123456789",
        qbi: 95_000,
        w2_wages: 20_000,
        ubia: 100_000,
        owner_share_pct: 100,
        ownership_start_date: "2020-01-01",
        owned_on_2025_12_31: true,
        ownership_source_reference: "north-ownership-ledger",
        qbi_adjustments: {
          deductible_se_tax: 5_000,
          self_employed_health_insurance: 0,
          qualified_retirement_plan: 0,
          no_other_attributable_adjustments_confirmed: true,
          allocation_method_description:
            "Deductible SE tax allocated by each store's net profit share",
          allocation_worksheet_reference: "se-allocation-2025",
          allocation_worksheet_reviewed_by: "Tax reviewer",
          allocation_worksheet_review_date: "2026-02-01",
        },
        source_schedule_c: north,
      }, {
        business_reference: "south-2025",
        business_name: "South Store",
        ein: "987654321",
        qbi: 76_000,
        w2_wages: 10_000,
        ubia: 100_000,
        owner_share_pct: 100,
        ownership_start_date: "2025-01-01",
        owned_on_2025_12_31: true,
        ownership_source_reference: "south-ownership-ledger",
        qbi_adjustments: {
          deductible_se_tax: 4_000,
          self_employed_health_insurance: 0,
          qualified_retirement_plan: 0,
          no_other_attributable_adjustments_confirmed: true,
          allocation_method_description:
            "Deductible SE tax allocated by each store's net profit share",
          allocation_worksheet_reference: "se-allocation-2025",
          allocation_worksheet_reviewed_by: "Tax reviewer",
          allocation_worksheet_review_date: "2026-02-01",
        },
        source_schedule_c: south,
      }],
    },
  });
}

function stagedContext() {
  const input = aggregationInput();
  const filer = {
    primarySSN: "123456789",
    nameLine1: "TAXPAYER ALEX",
    nameControl: "TAXP",
    filingStatus: HeaderFilingStatus.Single,
    address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
  };
  const pending = {
    form8995a: input,
    form8995a_schedule_b: input,
    schedule_c: {
      schedule_cs: input.aggregation_filing_details!.members.map((member) =>
        member.source_schedule_c
      ),
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
    },
    schedule1: { line15_se_deduction: 9_000 },
    f1040: {
      line3a_qualified_dividends: 0,
      line7_capital_gain: 0,
      line13_qbi_deduction: 15_000,
      line15_taxable_income: 285_000,
    },
  };
  return { input, filer, pending, context: { filer, pending } };
}

Deno.test("Schedule B evidence derives two member totals and emits companion", () => {
  const input = aggregationInput();
  const derived = validateTwoBusinessAggregationSource(input);
  assertEquals(derived.qbi, 171_000);
  assertEquals(derived.w2Wages, 30_000);
  assertEquals(derived.ubia, 200_000);
  const output = form8995a.compute({ taxYear: 2025, formType: "f1040" }, input);
  assertEquals(
    output.outputs.find((item) => item.nodeType === "form8995a_schedule_b")
      ?.fields,
    input,
  );
});

Deno.test("Schedule B source rejects changed member amounts and duplicate factors", () => {
  const input = aggregationInput();
  assertThrows(
    () =>
      validateTwoBusinessAggregationSource(inputSchema.parse({
        ...input,
        aggregation_filing_details: {
          ...input.aggregation_filing_details,
          members: input.aggregation_filing_details!.members.map((
            member,
            index,
          ) => index === 0 ? { ...member, qbi: member.qbi + 1 } : member),
        },
      })),
    Error,
    "member QBI, wages, UBIA",
  );
  assertThrows(
    () =>
      validateTwoBusinessAggregationSource(inputSchema.parse({
        ...input,
        aggregation_filing_details: {
          ...input.aggregation_filing_details,
          operational_factors: [
            input.aggregation_filing_details!.operational_factors[0],
            input.aggregation_filing_details!.operational_factors[0],
          ],
        },
      })),
    Error,
    "distinct sourced operational factors",
  );
});

Deno.test("Schedule B requires reviewed allocation and no other business adjustments", () => {
  const input = aggregationInput();
  assertThrows(() =>
    inputSchema.parse({
      ...input,
      aggregation_filing_details: {
        ...input.aggregation_filing_details,
        no_other_business_adjustments_confirmed: false,
      },
    })
  );
  assertThrows(() =>
    inputSchema.parse({
      ...input,
      aggregation_filing_details: {
        ...input.aggregation_filing_details,
        members: input.aggregation_filing_details!.members.map((
          member,
          index,
        ) =>
          index === 0
            ? {
              ...member,
              qbi_adjustments: {
                ...member.qbi_adjustments,
                allocation_worksheet_reviewed_by: "",
              },
            }
            : member
        ),
      },
    })
  );
});

Deno.test("Schedule B source rejects short ownership and mismatched election names", () => {
  const input = aggregationInput();
  assertThrows(
    () =>
      validateTwoBusinessAggregationSource(inputSchema.parse({
        ...input,
        aggregation_filing_details: {
          ...input.aggregation_filing_details,
          members: input.aggregation_filing_details!.members.map((
            member,
            index,
          ) =>
            index === 1
              ? { ...member, ownership_start_date: "2025-07-03" }
              : member
          ),
        },
      })),
    Error,
    "majority-year ownership",
  );
  assertThrows(
    () =>
      validateTwoBusinessAggregationSource(inputSchema.parse({
        ...input,
        aggregation_groups: [{
          ...input.aggregation_groups![0],
          business_names: ["North Store", "Unknown"],
        }],
      })),
    Error,
    "member identities",
  );
});

Deno.test("staged Schedule B and aggregated parent derive matching native and PDF values", () => {
  const { input, filer, pending, context } = stagedContext();
  const parentXml = buildStagedAggregatedIRS8995A(input, context);
  const scheduleXml = buildStagedIRS8995AScheduleB(input, context);
  assertEquals(form8995aMef.build(input, context), parentXml);
  assertEquals(scheduleBMef.build(input, context), scheduleXml);
  assertStringIncludes(parentXml, "<AggregatedInd>X</AggregatedInd>");
  assertStringIncludes(
    parentXml,
    "<BusinessNameLine1Txt>Retail Group</BusinessNameLine1Txt>",
  );
  assertStringIncludes(
    parentXml,
    "<QualifiedBusinessIncomeDedAmt>15000</QualifiedBusinessIncomeDedAmt>",
  );
  assertStringIncludes(scheduleXml, "<EIN>123456789</EIN>");
  assertStringIncludes(scheduleXml, "<EIN>987654321</EIN>");
  assertEquals(scheduleXml.includes("<PriorYearChangeDesc>"), false);
  assertStringIncludes(
    scheduleXml,
    "<TotQlfyBusinessIncomeOrLossAmt>171000</TotQlfyBusinessIncomeOrLossAmt>",
  );
  const parentPdf = projectStagedAggregatedParentPdf(input, filer, pending);
  assertEquals(form8995aPdf.instances?.(input, filer, pending), [parentPdf]);
  const [schedulePdf] = form8995aScheduleBPdf.instances?.(
    input,
    filer,
    pending,
  ) ?? [];
  assertEquals(parentPdf.business_name, "Retail Group");
  assertEquals(parentPdf.aggregated, true);
  assertEquals(parentPdf.line39, 15_000);
  assertEquals(schedulePdf?.row1_qbi, 95_000);
  assertEquals(schedulePdf?.row2_qbi, 76_000);
  assertEquals(schedulePdf?.total_qbi, 171_000);
});

Deno.test("staged Schedule B refuses missing companion, changed Schedule C, and wrong filer", () => {
  const { input, filer, pending, context } = stagedContext();
  assertThrows(
    () =>
      buildStagedIRS8995AScheduleB(input, {
        ...context,
        pending: { ...pending, form8995a_schedule_b: undefined },
      }),
    Error,
    "matching parent, companion, filer",
  );
  assertThrows(
    () =>
      buildStagedAggregatedIRS8995A(input, {
        ...context,
        pending: {
          ...pending,
          schedule_c: {
            ...pending.schedule_c,
            schedule_cs: pending.schedule_c.schedule_cs.map((item, index) =>
              index === 0 ? { ...item, line_1_gross_receipts: 120_001 } : item
            ),
          },
        },
      }),
    Error,
    "member differs from the retained Schedule C",
  );
  assertThrows(
    () =>
      form8995aScheduleBPdf.instances?.(
        input,
        { ...filer, primarySSN: "222334444" },
        pending,
      ),
    Error,
    "matching parent, companion, filer",
  );
  assertThrows(
    () =>
      buildStagedIRS8995AScheduleB(input, {
        ...context,
        pending: { ...pending, schedule1: { line15_se_deduction: 8_999 } },
      }),
    Error,
    "per-member QBI adjustments",
  );
  assertThrows(
    () =>
      buildStagedIRS8995AScheduleB(input, {
        ...context,
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line3a_qualified_dividends: 100 },
        },
      }),
    Error,
    "income limit, dividends",
  );
});
