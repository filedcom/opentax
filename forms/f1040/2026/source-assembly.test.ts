import { assertEquals } from "@std/assert";
import { buildStartNode } from "../start.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { inputSchema as w2Schema, w2_2026 } from "./inputs/w2.ts";
import { agi_2026, inputSchema as agiSchema } from "./nodes/agi.ts";
import { f1040_2026_node, inputSchema as returnSchema } from "./nodes/f1040.ts";
import { schedule1_2026 } from "./nodes/schedule1.ts";
import { schedule3a } from "./nodes/schedule3a.ts";
import { FilingStatus } from "../nodes/types.ts";

Deno.test("2026 issued wages feed shared AGI and whole-dollar return settlement in graph order", () => {
  // Internal integration fixture: deduction/tax finalization is supplied here.
  // The full public registry must also resolve every emitted credit/form route.
  const registry = {
    start: buildStartNode([
      { node: w2_2026, inputSchema: w2Schema, isArray: false },
      { node: agi_2026, inputSchema: agiSchema, isArray: false },
      {
        node: f1040_2026_node,
        inputSchema: returnSchema.omit({ line9_total_income: true }),
        isArray: false,
      },
    ]),
    w2: w2_2026,
    agi_aggregator: agi_2026,
    schedule1: schedule1_2026,
    f1040: f1040_2026_node,
    schedule3a,
  };
  const plan = buildExecutionPlan(registry);
  const result = execute(plan, registry, {
    w2: {
      filing_status: FilingStatus.Single,
      taxpayer_ssn: "111223333",
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
    },
    agi_aggregator: { filing_status: FilingStatus.Single },
    f1040: {
      filing_status: FilingStatus.Single,
      deduction_method: "standard",
      standard_deduction: 16_100,
      line16_income_tax: 24_734,
    },
  }, { formType: "f1040", taxYear: 2026 });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line1a_wages, 150_001);
  assertEquals(result.pending.f1040.line9_total_income, 150_001);
  assertEquals(result.pending.f1040.line11b_agi, 150_001);
  assertEquals(result.pending.f1040.line25d_total_withholding, 30_001);
  assertEquals(result.pending.f1040.line35a_refund, 5_267);
  assertEquals(result.pending.w2.issued_w2_sources instanceof Array, true);
  // Make the still-unwired credit routes visible; this is not filing readiness.
  assertEquals(result.pending.eitc.earned_income, 150_000.5);
  assertEquals(result.pending.f8812.auto_agi, 150_001);
});
