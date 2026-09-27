import { assertEquals, assertThrows } from "@std/assert";
import { calculateSchedule2_2026 } from "./schedule2.ts";

Deno.test("2026 Schedule 2 separates Part I, income tax, and employment tax", () => {
  const lines = calculateSchedule2_2026({
    line1a_excess_advance_premium: 100,
    line2_amt: 200,
    line4_self_employment_tax: 300,
    line13h_section409a_tax: 400,
    line16a_form4137_tip_tax: 153,
    line16b_form8919_wage_tax: 25,
    line17c_w2_uncollected_fica: 50,
    line18_form5329_excess_tax: 75,
  });
  assertEquals(lines.line1z_additions, 100);
  assertEquals(lines.line3_part1_tax, 300);
  assertEquals(lines.line14_other_income_taxes, 400);
  assertEquals(lines.line15_additional_income_taxes, 700);
  assertEquals(lines.line16c_additional_fica, 178);
  assertEquals(lines.line17d_other_employment_taxes, 50);
  assertEquals(lines.line20_employment_and_other_taxes, 303);
  assertEquals(lines.line21_total_additional_taxes, 1_003);
});

Deno.test("2026 Schedule 2 holds ambiguous section 965 installment", () => {
  assertThrows(
    () => calculateSchedule2_2026({ line12_section965_installment: 100 }),
    Error,
    "final placement",
  );
});

Deno.test("2026 Schedule 2 rejects unknown 2025 line names", () => {
  assertThrows(
    () => calculateSchedule2_2026({ line5_unreported_tip_tax: 100 } as never),
    Error,
    "Unrecognized key",
  );
});
