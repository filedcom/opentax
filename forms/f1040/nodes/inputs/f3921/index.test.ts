import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildStartNode, inputNodes } from "../../../2025/start.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";
import { form6251 as mef6251 } from "../../../2025/mef/forms/f6251.ts";
import { form6251Pdf } from "../../../2025/pdf/forms/f6251.ts";
import { f3921, itemSchema } from "./index.ts";

const ctx = { taxYear: 2025, formType: "f1040" } as const;
const exercise = {
  box2_date_option_exercised: "2025-06-02",
  box3_exercise_price_per_share: 10,
  box4_fmv_per_share: 25,
  box5_shares_transferred: 100,
  rights_transferable_and_not_subject_to_substantial_risk_on_exercise: true,
  shares_disposed_during_exercise_year: 0,
  amount_paid_for_option: 0,
} as const;

Deno.test("Form 3921 boxes 3–5 route a vested, retained ISO spread to Form 6251 line 2i", () => {
  const start = buildStartNode(inputNodes);
  const source = start.compute(ctx, { f3921: [exercise] });
  assertEquals(source.outputs[0].nodeType, "f3921");
  const result = f3921.compute(ctx, { f3921s: [exercise, {
    ...exercise,
    box3_exercise_price_per_share: 12.5,
    box4_fmv_per_share: 20,
    box5_shares_transferred: 20,
  }] });
  assertEquals(result.outputs[0].fields.iso_adjustment, 1_650);
  const amt = form6251.compute(ctx, form6251.inputSchema.parse({
    filing_status: "single",
    regular_tax_income: 200_000,
    regular_tax: 0,
    ...result.outputs[0].fields,
  }));
  const filed = amt.outputs.find((row) => row.nodeType === "form6251")?.fields;
  assertEquals(filed?.iso_adjustment, 1_650);
  assertEquals(filed?.amti, 201_650);
  assertStringIncludes(mef6251.build(filed ?? {}), "<IncentiveStockOptionsAmt>1650</IncentiveStockOptionsAmt>");
  assertEquals(form6251Pdf.fields.find((row) => row.domainKey === "iso_adjustment")?.pdfField,
    "topmostSubform[0].Page1[0].f1_13[0]");
});

Deno.test("Form 3921 blocks a sold, unvested, or extra-cost exercise", () => {
  for (const change of [
    { shares_disposed_during_exercise_year: 1 },
    { rights_transferable_and_not_subject_to_substantial_risk_on_exercise: false },
    { amount_paid_for_option: 50 },
  ]) {
    assertEquals(itemSchema.safeParse({ ...exercise, ...change }).success, false);
  }
});

Deno.test("Form 3921 rejects an exercise outside 2025 and ignores a nonpositive spread", () => {
  assertThrows(() => f3921.compute(ctx, { f3921s: [{
    ...exercise,
    box2_date_option_exercised: "2024-06-02",
  }] }), Error, "must occur in 2025");
  assertEquals(f3921.compute(ctx, { f3921s: [{
    ...exercise,
    box4_fmv_per_share: 8,
  }] }).outputs, []);
});
