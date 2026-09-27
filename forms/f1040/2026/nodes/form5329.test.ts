import { assertEquals, assertThrows } from "@std/assert";
import { form5329_2026 } from "./form5329.ts";

const context = { taxYear: 2026, formType: "f1040" };

Deno.test("TY2026 Form 5329 Part I applies 25% to early SIMPLE IRA", () => {
  const result = form5329_2026.compute(context, {
    recipient: "taxpayer",
    regular_early_distribution: 2_000,
    early_simple_ira_distribution: 5_000,
  });
  const lines = result.outputs.find((output) => output.nodeType === "form5329")
    ?.fields;
  assertEquals(lines?.line1_early_distributions, 7_000);
  assertEquals(lines?.line3_subject_to_tax, 7_000);
  assertEquals(lines?.line4_early_distribution_tax, 1_450);
  assertEquals(
    result.outputs.find((output) => output.nodeType === "schedule2")?.fields
      .line5_form5329_early_tax,
    1_450,
  );
  assertThrows(
    () =>
      form5329_2026.compute(context, {
        recipient: "taxpayer",
        regular_early_distribution: 5_000,
        early_simple_ira_distribution: 0,
      }),
    Error,
    "needs early SIMPLE IRA tax",
  );
});
