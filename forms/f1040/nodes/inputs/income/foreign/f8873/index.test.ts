import { assertEquals, assertThrows } from "@std/assert";
import { f8873 } from "./index.ts";

const claim = {
  qualifying_foreign_trade_income: 30_000,
  extraterritorial_income_excluded: 10_000,
};

Deno.test("Form 8873 intake validates the reported exclusion", () => {
  assertEquals(f8873.inputSchema.safeParse({ f8873s: [claim] }).success, true);
  assertEquals(
    f8873.inputSchema.safeParse({
      f8873s: [{ ...claim, extraterritorial_income_excluded: -1 }],
    }).success,
    false,
  );
});

Deno.test("Form 8873 rejects populated input before a line 8z reduction", () => {
  for (const excluded of [0, 10_000]) {
    assertThrows(
      () =>
        f8873.compute(
          { taxYear: 2025, formType: "f1040" },
          {
            f8873s: [{ ...claim, extraterritorial_income_excluded: excluded }],
          },
        ),
      Error,
      "Schedule 1 line 8z exclusion is unsupported",
    );
  }
});
