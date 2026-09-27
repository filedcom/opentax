import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import { z } from "zod";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { buildStartNode } from "../start.ts";
import { FilingStatus } from "../nodes/types.ts";
import { benefitDetailsSchema } from "../nodes/intermediate/forms/form2441/calculation.ts";
import { inputNodes } from "./inputs.ts";
import { form2441_2026 } from "./nodes/form2441.ts";
import { registry } from "./registry.ts";
import { buildPdfBytes2026 } from "./pdf/builder.ts";

const context = { taxYear: 2026, formType: "f1040" };
const filer = {
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Ada",
  taxpayer_last_name: "Rivera",
  taxpayer_ssn: "111223333",
  taxpayer_dob: "1990-07-12",
  taxpayer_tin_issued_by_due_date: true,
  taxpayer_ssn_valid_for_employment: true,
  taxpayer_ssn_issued_before_due_date: true,
  taxpayer_citizen_national_or_work_authorized: true,
  digital_assets: false,
  address_line1: "10 Main St",
  address_city: "Boston",
  address_state: "MA",
  address_zip: "02108",
};
const details = {
  filing_status: FilingStatus.Single,
  care_providers: [{
    kind: "business" as const,
    name: "Care Center",
    name_control: "CARE",
    ein: "123456789",
    us_address: {
      line1: "100 Main St",
      city: "Boston",
      state: "MA",
      zip: "02108",
    },
    household_employee: false,
    amount_paid: 3_000,
  }],
  qualifying_people: [{
    first_name: "Child",
    last_name: "Rivera",
    name_control: "RIVE",
    ssn: "222334444",
    credit_expenses_paid: 3_000,
  }],
  taxpayer_earned_income: 70_000,
};

// Keep this calculation route outside the public input surface until its
// complete attachment and eligibility facts are implemented.
const testRegistry = {
  ...registry,
  start: buildStartNode([
    ...inputNodes,
    {
      node: form2441_2026,
      inputSchema: z.object({ filing_details: benefitDetailsSchema }).strict(),
      isArray: false as const,
    },
  ]),
};
const plan = buildExecutionPlan(testRegistry);

Deno.test("TY2026 Form 2441 credit uses calculated tax after AGI", async () => {
  const result = execute(plan, testRegistry, {
    general: filer,
    w2: [{ box1_wages: 70_000, box2_fed_withheld: 8_000 }],
    form2441: { filing_details: details },
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f2441.line8, 0.35);
  assertEquals(result.pending.f2441.line9a, 1_050);
  assertEquals(result.pending.f2441.line11, 1_050);
  assertEquals(result.pending.schedule3.line2_childcare_credit, 1_050);
  assertEquals(result.pending.f1040.line20_nonrefundable_credits, 1_050);
  await assertRejects(
    () => buildPdfBytes2026(result.pending),
    Error,
    "needs the Form 2441 attachment",
  );
});

Deno.test("TY2026 W-2 box 10 taxable benefits enter AGI before the credit", () => {
  const result = execute(plan, testRegistry, {
    general: filer,
    w2: [{
      box1_wages: 70_000,
      box2_fed_withheld: 8_000,
      box10_dep_care: 8_000,
    }],
    form2441: {
      filing_details: {
        ...details,
        care_providers: [{ ...details.care_providers[0], amount_paid: 8_000 }],
        qualifying_people: [{
          ...details.qualifying_people[0],
          credit_expenses_paid: 0,
        }],
        total_qualified_expenses_incurred: 8_000,
        dependent_care_plan_limit: 8_000,
      },
    },
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form2441.line26, 500);
  assertEquals(result.pending.f1040.line1e_taxable_dep_care, 500);
  assertEquals(result.pending.f1040.line11a_agi, 70_500);
  assertEquals(result.pending.f2441.line7, 70_500);
  assertEquals(result.pending.f2441.line11, 0);
});

Deno.test("TY2026 Form 2441 credit cannot exceed calculated line 18 tax", () => {
  const result = execute(plan, testRegistry, {
    general: filer,
    w2: [{ box1_wages: 20_000, box2_fed_withheld: 0 }],
    form2441: {
      filing_details: { ...details, taxpayer_earned_income: 20_000 },
    },
  }, context);
  assertEquals(result.diagnostics, []);
  const tax = result.pending.f1040.line18_total_tax_before_credits as number;
  const lines = result.pending.f2441;
  assertEquals(lines.line10, Math.round(tax));
  assertEquals(lines.line11, lines.line10);
  assertEquals(result.pending.f1040.line20_nonrefundable_credits, lines.line11);
});

Deno.test("TY2026 W-2 box 10 requires Form 2441 details", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    w2: [{
      box1_wages: 70_000,
      box2_fed_withheld: 8_000,
      box10_dep_care: 8_000,
    }],
  }, context);
  assertEquals(result.diagnostics.length, 1);
  assertEquals(result.diagnostics[0].nodeType, "form2441");
  assertMatch(result.diagnostics[0].message, /box 10 needs Form 2441/);
  await assertRejects(
    () => buildPdfBytes2026(result.pending),
    Error,
    "needs a completed Form 2441 calculation",
  );
});

Deno.test("TY2026 Form 2441 rejects a filing status mismatch", () => {
  const result = execute(plan, testRegistry, {
    general: filer,
    w2: [{ box1_wages: 70_000, box2_fed_withheld: 8_000 }],
    form2441: {
      filing_details: { ...details, filing_status: FilingStatus.MFJ },
    },
  }, context);
  assertEquals(result.diagnostics.length, 1);
  assertEquals(result.diagnostics[0].nodeType, "form2441");
  assertMatch(result.diagnostics[0].message, /disagrees with Form 1040/);
});
