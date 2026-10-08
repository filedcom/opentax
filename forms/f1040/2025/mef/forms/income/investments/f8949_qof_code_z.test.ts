import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form8949 } from "./f8949.ts";

const codeZ = {
  part: "C",
  description: "123456789",
  source_transaction_id: "qof-z-1",
  date_acquired: "2025-03-20",
  date_sold: "",
  proceeds: 0,
  cost_basis: 0,
  adjustment_codes: "Z",
  adjustment_amount: -20_000,
  gain_loss: -20_000,
  is_long_term: false,
};

Deno.test("Form 8949 native code Z emits EIN and omits blank sale columns", () => {
  const xml = form8949.build([codeZ]);
  assertStringIncludes(xml, "<EIN>123456789</EIN>");
  assertStringIncludes(xml, "<AcquiredDt>2025-03-20</AcquiredDt>");
  assertStringIncludes(xml, "<AdjustmentsToGainOrLossCd>Z</AdjustmentsToGainOrLossCd>");
  assertStringIncludes(xml, "<AdjustmentsToGainOrLossAmt>-20000</AdjustmentsToGainOrLossAmt>");
  for (const omitted of [
    "SoldOrDisposedDt",
    "ProceedsSalesPriceAmt",
    "CostOrOtherBasisAmt",
    "TotalProceedsSalesPriceAmt",
    "TotalCostOrOtherBasisAmt",
  ]) {
    assertEquals(xml.includes(omitted), false);
  }
});

Deno.test("Form 8949 native code Z rejects a sale row disguised as a deferral", () => {
  assertThrows(
    () => form8949.build([{ ...codeZ, date_sold: "2025-03-20" }]),
    Error,
    "separate identified QOF EIN row",
  );
});
