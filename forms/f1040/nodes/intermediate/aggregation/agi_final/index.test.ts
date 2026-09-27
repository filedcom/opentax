import { assertEquals } from "@std/assert";
import {
  agi_aggregator,
  inputSchema as agiInputSchema,
} from "../agi_aggregator/index.ts";
import { agi_final } from "./index.ts";

const ctx = { taxYear: 2025, formType: "f1040" } as const;

Deno.test("active-rental MAGI is provisional while AGI uses final Form 8582 PAL", () => {
  const provisionalInput = agiInputSchema.parse({
    line1a_wages: 200_000,
    line7_capital_gain: -2_000,
    line4_other_gains: 500,
    pal_current_4797_gain: 1_500,
    pal_prior_unallowed: 5_000,
    pal_rental_loss: 5_000,
    pal_active_participation: true,
    pal_pending_active_4797: true,
  });
  const provisional = agi_aggregator.compute(ctx, provisionalInput);
  assertEquals(
    provisional.outputs.find((row) => row.nodeType === "form8582")
      ?.fields.modified_agi,
    198_500,
  );
  assertEquals(
    provisional.outputs.some((row) => row.nodeType === "f1040"),
    false,
  );
  const final = agi_final.compute(ctx, {
    pre_pal_input: provisionalInput,
    capital_finalized: true,
    final_capital_gain: -3_000,
    allowed_part_i: 1_000,
    allowed_part_ii: 500,
    allowed_total: 1_500,
    part_i_ordinary_loss: 0,
  });
  assertEquals(
    final.outputs.find((row) => row.nodeType === "f1040")?.fields.line11_agi,
    197_000,
  );
  assertEquals(
    final.outputs.some((row) => row.nodeType === "form8582"),
    false,
  );
});
