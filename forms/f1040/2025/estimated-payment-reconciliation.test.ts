import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { irs1040 } from "./mef/forms/f1040.ts";
import { irs1040Pdf } from "./pdf/forms/f1040.ts";
import { estimatedPaymentTotal } from "../nodes/inputs/f1040es/index.ts";

const source = {
  payment_q1: 400,
  payment_q2: 300,
  payment_q3: 200,
  payment_q4: 100,
  applied_from_prior_year: 250,
};
const pending = { f1040es: source };
const filed = { line26_estimated_tax: 1_250 };

Deno.test("2025 estimated payments and prior-year applied credit reach filed line 26", () => {
  assertEquals(estimatedPaymentTotal(source), 1_250);
  assertStringIncludes(
    irs1040.build(filed, { pending }),
    "<EstimatedTaxPaymentsAmt>1250</EstimatedTaxPaymentsAmt>",
  );
  assertEquals(
    irs1040Pdf.projectFields?.(filed, pending)?.line26_estimated_tax,
    1_250,
  );
});

Deno.test("both Form 1040 exports reject unsourced or changed estimated payments", () => {
  for (
    const [changed, attached, reason] of [
      [filed, {}, "needs its 1040-ES payment source"],
      [{ line26_estimated_tax: 1_249 }, pending, "differs from its 1040-ES"],
      [{ line26_estimated_tax: 1_250 }, {
        f1040es: { ...source, payment_q2: 299 },
      }, "differs from its 1040-ES"],
      [{}, pending, "differs from its 1040-ES"],
    ] as const
  ) {
    assertThrows(
      () => irs1040.build(changed, { pending: attached }),
      Error,
      reason,
    );
    assertThrows(
      () => irs1040Pdf.projectFields?.(changed, attached),
      Error,
      reason,
    );
  }
});
