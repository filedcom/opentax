import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import inputs from "./schedule-r-ctc-credit-limit.fixture.json" with {
  type: "json",
};
import { f1040_2025 } from "../../../index.ts";
import { buildPending } from "../../../mef/execution/pending.ts";

// 2025 Instructions for Schedule 8812, Credit Limit Worksheet A: line 2 adds
// Schedule 3 lines 1, 2, 3, 4, 5b, 6d, 6f, 6l and 6m; line 5 (line 1 less
// line 2) is Schedule 8812 line 13 and limits line 14 (Form 1040 line 19).
// Schedule R (2025): under-65 disability base 5,000 (box 4), reduced by half
// of AGI over 7,500, times 15%.

test("Schedule R and Form 2441 reduce the credit for other dependents limit", () => {
  const result = f1040_2025.executeReturn(structuredClone(inputs));
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending), f = pending.f1040!;
  assertEquals(f.line11_agi, 16_000);
  assertEquals(f.line18_total_tax_before_credits, 758);
  assertEquals(pending.schedule3?.line2_childcare_credit, 272);
  // (5,000 - (16,000 - 7,500) / 2) x 15% = 112.50, rounded to 113.
  assertEquals(pending.schedule3?.line6d_elderly_disabled_credit, 113);
  // ODC 500 limited to 758 - (272 + 113) = 373.
  assertEquals(f.line19_child_tax_credit, 373);
  assertEquals(f.line22_tax_after_credits, 0);
});

test("a hand-entered Credit Limit Worksheet A that omits Schedule R is rejected", () => {
  const result = f1040_2025.executeReturn({
    ...structuredClone(inputs),
    f8812_credit_limit_worksheet: {
      credit_limit_worksheet: {
        schedule3_line1: 0,
        schedule3_line2: 272,
        schedule3_line3: 0,
        schedule3_line4: 0,
        schedule3_line5b: 0,
        schedule3_line6d: 0,
        schedule3_line6f: 0,
        schedule3_line6l: 0,
        schedule3_line6m: 0,
        worksheet_b_applies: false,
      },
    },
  });
  assertEquals(
    result.diagnostics.some((d) =>
      d.message.includes(
        "Credit Limit Worksheet A differs from the return's Schedule 3 credits",
      )
    ),
    true,
  );
});
