import { assertEquals, assertThrows } from "@std/assert";
import { irs1040Pdf } from "./f1040.ts";

Deno.test("Form 1040 PDF blocks W-2G withholding without payer-issued attachment", () => {
  const fields = { line25c_total: 250 };
  assertThrows(
    () => irs1040Pdf.projectFields?.(fields, {
      w2g: { w2gs: [{ box1_winnings: 1_000, box4_federal_withheld: 250 }] },
    }),
    Error,
    "W-2G withholding cannot render until its payer-issued W-2G attachment is supported",
  );
  assertEquals(
    irs1040Pdf.projectFields?.(fields, {
      w2g: { w2gs: [{ box1_winnings: 1_000, box4_federal_withheld: 0 }] },
    })?.line25c_total,
    250,
  );
});
