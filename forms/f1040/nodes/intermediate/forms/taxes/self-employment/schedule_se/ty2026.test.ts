import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { inputSchema, schedule_se } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return schedule_se.compute(
    { taxYear: 2026, formType: "f1040" },
    inputSchema.parse(input),
  );
}

function fields(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType)?.fields;
}

test("TY2026 social security part uses the $184,500 wage base", () => {
  // Draft 2026 Schedule SE line 7 and Pub 505 (2026) Worksheet 2-3 line 5.
  // $50,000 x 92.35% = $46,175; line 9 $184,500 - $160,000 = $24,500;
  // line 10 $3,038; line 11 $46,175 x 2.9% = $1,339; line 12 $4,377.
  const result = compute({ net_profit_schedule_c: 50_000, w2_ss_wages: 160_000 });
  assertEquals(fields(result, "schedule2")?.line4_se_tax, 4_377);
  assertEquals(fields(result, "schedule1")?.line15_se_deduction, 2_189);
});

test("TY2026 farm optional method uses the draft 2026 Schedule SE Part II amounts", () => {
  // Line 14 $7,560; available with gross farm income up to $11,340 or net
  // farm profits below $8,186 (draft 2026 Schedule SE and its instructions).
  const atGrossLimit = compute({
    net_profit_schedule_f: 8_186,
    gross_farm_income: 11_340,
    farm_optional_method_elected: true,
  });
  assertEquals(fields(atGrossLimit, "form8959")?.se_income, 7_560);
  const belowProfitLimit = compute({
    net_profit_schedule_f: 8_185,
    gross_farm_income: 20_000,
    farm_optional_method_elected: true,
  });
  assertEquals(fields(belowProfitLimit, "form8959")?.se_income, 7_560);
  assertThrows(
    () =>
      compute({
        net_profit_schedule_f: 8_186,
        gross_farm_income: 11_341,
        farm_optional_method_elected: true,
      }),
    Error,
    "$11,340",
  );
});
