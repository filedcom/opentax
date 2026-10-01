import { assertEquals } from "@std/assert";
import { irs1040Pdf } from "./f1040.ts";

Deno.test("Form 1040 PDF preserves sourced line 25c for W-2G attachment", () => {
  const fields = { line25c_total: 250 };
  assertEquals(
    irs1040Pdf.projectFields?.(fields, {
      w2g: { w2gs: [{ box1_winnings: 1_000, box4_federal_withheld: 250 }] },
    })?.line25c_total,
    250,
  );
});
