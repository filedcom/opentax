import { assertEquals } from "@std/assert";
import {
  inputSchema as scheduleDInputSchema,
  schedule_d,
} from "../schedule_d/index.ts";
import { schedule_d_final } from "./index.ts";

const ctx = { taxYear: 2025, formType: "f1040" } as const;

Deno.test("active-rental sale uses provisional and final Schedule D capital-loss caps", () => {
  const provisionalInput = scheduleDInputSchema.parse({
    line_6_carryover: 10_000,
    line_11_form2439: 8_000,
    pending_active_4797: true,
  });
  const provisional = schedule_d.compute(ctx, provisionalInput);
  assertEquals(
    provisional.outputs.find((row) => row.nodeType === "agi_aggregator")
      ?.fields.line7_capital_gain,
    -2_000,
  );
  assertEquals(
    provisional.outputs.some((row) => row.nodeType === "f1040"),
    false,
  );
  const final = schedule_d_final.compute(ctx, {
    provisional_input: provisionalInput,
    capital_reduction: 3_000,
  });
  assertEquals(
    final.outputs.find((row) => row.nodeType === "agi_final")
      ?.fields.final_capital_gain,
    -3_000,
  );
  assertEquals(
    final.outputs.find((row) => row.nodeType === "f1040")
      ?.fields.line7_capital_gain,
    -3_000,
  );
  assertEquals(final.finalizations?.[0]?.nodeType, "schedule_d");
  assertEquals(final.finalizations?.[0]?.fields.line_11_form2439, 5_000);
});

Deno.test("final Schedule D clears the gross source when Part I stays zero", () => {
  const final = schedule_d_final.compute(ctx, {
    provisional_input: scheduleDInputSchema.parse({
      pending_active_4797: true,
      line_11_form2439: 0,
    }),
    capital_reduction: 0,
  });
  assertEquals(final.finalizations?.length ?? 0, 1);
  assertEquals(final.finalizations?.[0]?.fields.line_11_form2439, 0);
  assertEquals(
    final.finalizations?.[0]?.fields.active_4797_final_no_schedule_d,
    true,
  );
  assertEquals(
    final.outputs.find((row) => row.nodeType === "agi_final")
      ?.fields.final_capital_gain,
    0,
  );
});
