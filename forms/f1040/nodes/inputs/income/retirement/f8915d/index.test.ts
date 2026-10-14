import { assertEquals, assertThrows } from "@std/assert";
import { f8915d } from "./index.ts";

Deno.test("Form 8915-D intake validates the reported distribution", () => {
  assertEquals(
    f8915d.inputSchema.safeParse({
      f8915ds: [{ total_2019_distribution: 10_000 }],
    }).success,
    true,
  );
  assertEquals(
    f8915d.inputSchema.safeParse({
      f8915ds: [{ total_2019_distribution: -1 }],
    }).success,
    false,
  );
});

Deno.test("Form 8915-D rejects both asserted income and repayment before line 8z", () => {
  for (
    const item of [
      { total_2019_distribution: 10_000 },
      { total_2019_distribution: 10_000, repayments_in_2025: 2_000 },
      {},
    ]
  ) {
    assertThrows(
      () =>
        f8915d.compute(
          { taxYear: 2025, formType: "f1040" },
          { f8915ds: [item] },
        ),
      Error,
      "Schedule 1 line 8z income or repayment is unsupported",
    );
  }
});
