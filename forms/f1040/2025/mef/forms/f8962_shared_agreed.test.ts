import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { f1095a } from "../../../nodes/inputs/f1095a/index.ts";
import {
  form8962 as form8962Calculation,
  inputSchema as form8962InputSchema,
} from "../../../nodes/intermediate/forms/form8962/index.ts";
import { FilingStatus as SourceFilingStatus } from "../../../nodes/types.ts";
import { form8962Pdf } from "../../pdf/forms/f8962.ts";
import { form8962 } from "./f8962.ts";

const nodeContext = { taxYear: 2025, formType: "f1040" };
const source = {
  f1095as: [{
    issuer_name: "Texas Marketplace",
    policy_number: "SHARED-ADULTS",
    coverage_state: "TX",
    covered_individual_ssns: ["123456789", "222334444"],
    monthly_premiums: Array<number>(12).fill(500),
    monthly_slcsps: Array<number>(12).fill(600),
    monthly_aptcs: Array<number>(12).fill(200),
    shared_policy_periods: [{
      basis: "other_agreed" as const,
      situations_1_to_3_reviewed_and_inapplicable: true as const,
      other_taxpayer_ssn: "222334444",
      start_month: 1,
      end_month: 12,
      allocation_pct: 0.5,
    }],
  }],
};
const sourceFields =
  f1095a.compute(nodeContext, source).outputs.find((row) =>
    row.nodeType === "form8962"
  )!.fields;
const calculated = form8962Calculation.compute(
  nodeContext,
  form8962InputSchema.parse({
    ...sourceFields,
    taxpayer_modified_agi: 75_300,
    dependents_modified_agi: 0,
    household_size: 1,
    fpl_region: "contiguous",
    filing_status: SourceFilingStatus.Single,
    dependent_income_complete: true,
  }),
).outputs.find((row) => row.nodeType === "form8962")!.fields;
const context = {
  filer: {
    primarySSN: "123456789",
    nameLine1: "TAXPAYER TEST",
    nameControl: "TAXP",
    address: {
      line1: "1 Test Way",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    filingStatus: FilingStatus.Single,
  },
  pending: {
    f1095a: source,
    general: {
      filing_status: "single",
      taxpayer_ssn: "123456789",
      address_state: "TX",
    },
    f1040: { line11_agi: 75_300, line17_additional_taxes: 1_200 },
    schedule2: { line1a_excess_advance_premium: 1_200 },
  },
};

Deno.test("agreed Situation 4 shared policy files sourced monthly amounts and Part IV", () => {
  const xml = form8962.build(calculated, context);
  assertStringIncludes(xml, "<MonthlyPremiumAmt>250</MonthlyPremiumAmt>");
  assertStringIncludes(
    xml,
    "<MonthlyPremiumSLCSPAmt>300</MonthlyPremiumSLCSPAmt>",
  );
  assertStringIncludes(
    xml,
    "<MonthlyAdvancedPTCAmt>100</MonthlyAdvancedPTCAmt>",
  );
  assertStringIncludes(xml, "<PolicyNum>SHARED-ADULTS</PolicyNum>");
  assertStringIncludes(xml, "<SSN>222334444</SSN>");
  assertStringIncludes(xml, "<MonthlyPremiumPct>0.50</MonthlyPremiumPct>");
  assertStringIncludes(
    xml,
    "<MonthlyPremiumSLCSPPct>0.50</MonthlyPremiumSLCSPPct>",
  );
  assertStringIncludes(
    xml,
    "<MonthlyAdvancedPTCPct>0.50</MonthlyAdvancedPTCPct>",
  );
  assertStringIncludes(
    xml,
    "<PremiumTaxCreditTaxLiabAmt>1200</PremiumTaxCreditTaxLiabAmt>",
  );
});

Deno.test("agreed shared policy carries a net credit to finalized Schedule 3", () => {
  const creditFields = form8962Calculation.compute(
    nodeContext,
    form8962InputSchema.parse({
      ...sourceFields,
      taxpayer_modified_agi: 30_000,
      dependents_modified_agi: 0,
      household_size: 1,
      fpl_region: "contiguous",
      filing_status: SourceFilingStatus.Single,
      dependent_income_complete: true,
    }),
  ).outputs.find((row) => row.nodeType === "form8962")!.fields;
  const credit = creditFields.net_premium_tax_credit as number;
  assertEquals(credit, 1_800);
  const xml = form8962.build(creditFields, {
    ...context,
    pending: {
      ...context.pending,
      f1040: { line11_agi: 30_000, line31_additional_payments: credit },
      schedule2: {},
      schedule3: { line9_premium_tax_credit: credit },
    },
  });
  assertStringIncludes(
    xml,
    `<ReconciledPremiumTaxCreditAmt>${credit}</ReconciledPremiumTaxCreditAmt>`,
  );
  assertStringIncludes(xml, "<SharedPolicyAllocationGrp>");
});

Deno.test("shared-policy filing rejects allocation and covered-person drift", () => {
  assertThrows(
    () =>
      form8962.build({
        ...calculated,
        shared_policy_allocations: [{
          ...(calculated.shared_policy_allocations as NonNullable<
            Parameters<typeof form8962.build>[0]["shared_policy_allocations"]
          >)[0],
          premium_pct: 0.6,
        }],
      }, context),
    Error,
    "reviewed nonoverlapping periods",
  );
  assertThrows(
    () =>
      form8962.build(calculated, {
        ...context,
        pending: {
          ...context.pending,
          f1095a: {
            f1095as: [{
              ...source.f1095as[0],
              covered_individual_ssns: ["123456789", "999887777"],
            }],
          },
        },
      }),
    Error,
    "both covered taxpayers",
  );
});

Deno.test("shared-policy filing rejects source dollars and finalized repayment drift", () => {
  assertThrows(
    () => form8962.build({ ...calculated, total_advance_ptc: 1_201 }, context),
    Error,
    "differ from source allocation",
  );
  assertThrows(
    () =>
      form8962.build(calculated, {
        ...context,
        pending: {
          ...context.pending,
          schedule2: { line1a_excess_advance_premium: 1_199 },
        },
      }),
    Error,
    "differs from finalized return",
  );
});

Deno.test("shared-policy PDF uses the same source and return reconciliation", () => {
  const projected = form8962Pdf.projectFields?.(
    calculated,
    context.pending,
  ) ?? {};
  assertStringIncludes(
    String(projected.pdf_allocation_1_premium_pct),
    "0.50",
  );
  form8962Pdf.instances?.(projected, context.filer, context.pending);
  assertThrows(
    () =>
      form8962Pdf.instances?.(projected, context.filer, {
        ...context.pending,
        schedule2: { line1a_excess_advance_premium: 1_199 },
      }),
    Error,
    "differs from finalized return",
  );
});
