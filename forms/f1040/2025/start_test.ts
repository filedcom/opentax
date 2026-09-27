import { assertEquals } from "@std/assert";
import { buildStartNode, inputNodes } from "./start.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "./registry.ts";
import {
  form8582cr,
  inputSchema as form8582crInputSchema,
  PassiveCreditCategory,
  PassiveCreditReportingRoute,
  PassiveCreditSourceOrigin,
} from "../nodes/intermediate/forms/form8582cr/index.ts";

Deno.test("start node routes an explicit public input key to its declared node", () => {
  const startNode = buildStartNode([{
    node: form8582cr,
    inputKey: "passive_credit_facts",
    inputSchema: form8582crInputSchema,
    isArray: false,
  }]);
  const facts = {
    credit_sources: [],
    regular_tax_all_income: 0,
    regular_tax_without_passive: 0,
  };
  assertEquals(
    startNode.inputSchema.safeParse({ passive_credit_facts: facts }).success,
    true,
  );
  assertEquals(
    startNode.compute(
      { taxYear: 2025, formType: "f1040" },
      { passive_credit_facts: facts },
    ).outputs,
    [{ nodeType: "form8582cr", fields: facts }],
  );
});

Deno.test("inputNodes has expected structure (array + singleton entries)", () => {
  const arrayEntries = inputNodes.filter((e) => e.isArray === true);
  const singletonEntries = inputNodes.filter((e) => e.isArray === false);
  // qbi_aggregation is a singleton; verify it is registered
  const hasQbiAgg = singletonEntries.some((e) =>
    e.node.nodeType === "qbi_aggregation"
  );
  assertEquals(hasQbiAgg, true);
  // Total count must be array + singleton
  assertEquals(
    inputNodes.length,
    arrayEntries.length + singletonEntries.length,
  );
});

Deno.test("buildStartNode returns a node with nodeType 'start'", () => {
  const startNode = buildStartNode(inputNodes);
  assertEquals(startNode.nodeType, "start");
});

Deno.test("empty input produces no outputs", () => {
  const startNode = buildStartNode(inputNodes);
  const result = startNode.compute({ taxYear: 2025, formType: "f1040" }, {});
  assertEquals(result.outputs.length, 0);
});

Deno.test("single w2 item routes to w2 node", () => {
  const startNode = buildStartNode(inputNodes);
  const w2Item = {
    box1_wages: 50000,
    box2_fed_withheld: 5000,
  };
  const result = startNode.compute({ taxYear: 2025, formType: "f1040" }, {
    w2: [w2Item],
  });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "w2");
});

Deno.test("singleton general entry routes to general node", () => {
  const startNode = buildStartNode(inputNodes);
  const generalInput = { filing_status: "single" as const };
  const result = startNode.compute({ taxYear: 2025, formType: "f1040" }, {
    general: generalInput,
  });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "general");
});

Deno.test("singleton Schedule F entry routes farm records to its calculation node", () => {
  const startNode = buildStartNode(inputNodes);
  const input = {
    schedule_fs: [{
      farm_id: "north",
      line_a_principal_crop_activity: "GRAIN FARMING",
      line_b_agricultural_activity_code: "111100",
      line_e_material_participation: true,
      accounting_method: "cash",
      line1_sales_livestock_resale: 0,
      line2_sales_products_raised: 1_000,
    }],
  };
  const result = startNode.compute(
    { taxYear: 2025, formType: "f1040" },
    { schedule_f: input },
  );
  assertEquals(result.outputs, [{ nodeType: "schedule_f", fields: input }]);
});

Deno.test("Form 8582-CR passive credit facts reach the calculation node", () => {
  const startNode = buildStartNode(inputNodes);
  const facts = {
    credit_sources: [],
    regular_tax_all_income: 0,
    regular_tax_without_passive: 0,
  };
  const result = startNode.compute(
    { taxYear: 2025, formType: "f1040" },
    { form8582cr: facts },
  );
  assertEquals(result.outputs, [{ nodeType: "form8582cr", fields: facts }]);
});

Deno.test("Form 8582-CR source input reaches Form 3800 in the return plan", () => {
  const source = {
    activity_reference: "Clinical activity",
    source_form: "Form 8820",
    source_document_reference: "2025 clinical credit statement",
    source_origin: { kind: PassiveCreditSourceOrigin.Self },
    category: PassiveCreditCategory.Other,
    reporting_route: PassiveCreditReportingRoute.Form3800Line3,
    form3800_credit_line: "1h" as const,
    current_year_credit: 500,
    prior_unallowed_credits: [],
    publicly_traded_partnership: false,
  };
  const result = execute(buildExecutionPlan(registry), registry, {
    form8582cr: {
      credit_sources: [source],
      regular_tax_all_income: 0,
      regular_tax_without_passive: 0,
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.pending.form8582cr.credit_sources, [source]);
  assertEquals(result.pending.f3800.passive_source_allocations, [{
    ...source,
    source_statement_reference: undefined,
    total_credit: 500,
    special_allowed_credit: 0,
    unallowed_credit: 500,
    allowed_credit: 0,
  }]);
  assertEquals(
    result.diagnostics.some((item) =>
      item.nodeType === "form8582cr" || item.nodeType === "f3800"
    ),
    false,
  );
});

Deno.test("singleton Form 8824 exchange routes to its calculation node", () => {
  const startNode = buildStartNode(inputNodes);
  const exchange = {
    relinquished_basis: 100_000,
    received_fmv: 200_000,
    gain_type: "capital" as const,
  };
  const result = startNode.compute(
    { taxYear: 2025, formType: "f1040" },
    { form8824: exchange },
  );
  assertEquals(result.outputs, [{ nodeType: "form8824", fields: exchange }]);
});

Deno.test("singleton Form 8936 keeps one MAGI record with its vehicle array", () => {
  const startNode = buildStartNode(inputNodes);
  const form = {
    current_year_magi: { adjusted_gross_income: 90_000 },
    prior_year_magi: { adjusted_gross_income: 85_000 },
    filing_status: "single" as const,
    prior_year_filing_status: "single" as const,
    f8936s: [{ credit_kind: "new_clean_vehicle", vin: "1HGCM82633A004352" }],
  };
  const result = startNode.compute(
    { taxYear: 2025, formType: "f1040" },
    { f8936: form },
  );
  assertEquals(result.outputs, [{ nodeType: "f8936", fields: form }]);
});

Deno.test("singleton Schedule 1-A claim routes taxpayer-entered deductions", () => {
  const startNode = buildStartNode(inputNodes);
  const result = startNode.compute(
    { taxYear: 2025, formType: "f1040" },
    {
      schedule1a: {
        taxpayer_qualified_overtime_compensation: 3_000,
        vehicle_loans: [{
          vin: "1HGCM82633A004352",
          qualified_interest_paid: 1_200,
        }],
      },
    },
  );
  assertEquals(result.outputs, [{
    nodeType: "schedule1a",
    fields: {
      taxpayer_qualified_overtime_compensation: 3_000,
      vehicle_loans: [{
        vin: "1HGCM82633A004352",
        qualified_interest_paid: 1_200,
      }],
    },
  }]);
});
