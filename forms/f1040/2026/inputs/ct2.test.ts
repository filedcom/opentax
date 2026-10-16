import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../nodes/types.ts";
import { ct2_2026 } from "./ct2.ts";
import { calculateForm8959_2026 } from "../nodes/form8959.ts";
const identity = {
  filing_status: FilingStatus.Single,
  taxpayer_ssn: "111223333",
};
const context = { taxYear: 2026, formType: "f1040" };
function records() {
  return [1, 2, 3, 4].map((quarter) => ({
    tax_year: 2026 as const,
    recipient: "taxpayer" as const,
    recipient_ssn: "111223333",
    quarter,
    source_document_reference: `ct2-q${quarter}`,
    line2_tier1_medicare_compensation: 60_000,
    line3_additional_medicare_compensation: quarter === 4 ? 40_000 : 0,
    line3_additional_medicare_tax_paid: quarter === 4 ? 360 : 0,
    ...(quarter === 4 ? { payment_reference: "ct2-q4-payment" } : {}),
  }));
}
Deno.test("2026 CT-2 reuses quarterly evidence checks and supplies RRTA income and paid tax", () => {
  const output =
    ct2_2026.compute(context, { ...identity, ct2s: records() }).outputs;
  const result = calculateForm8959_2026({
    ...identity,
    ...output.find((o) => o.nodeType === "form8959")!.fields,
  });
  assertEquals([
    result.lines.line8,
    result.lines.line11,
    result.lines.line23,
    result.lines.line24,
  ], [240_000, 360, 360, 360]);
});
Deno.test("2026 CT-2 rejects missing quarters, unsupported partial payments and unrelated owners", () => {
  for (
    const change of [
      "missing",
      "duplicate",
      "partial",
      "reference",
      "owner",
    ] as const
  ) {
    const ct2s = records();
    if (change === "missing") ct2s.pop();
    if (change === "duplicate") ct2s[1] = ct2s[0];
    if (change === "partial") ct2s[3].line3_additional_medicare_tax_paid = 180;
    if (change === "reference") ct2s[3].payment_reference = undefined;
    if (change === "owner") ct2s[0].recipient_ssn = "999887777";
    assertThrows(() => ct2_2026.compute(context, { ...identity, ct2s }));
  }
});
