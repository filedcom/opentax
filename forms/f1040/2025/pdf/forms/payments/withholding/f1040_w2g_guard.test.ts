import { assertEquals } from "@std/assert";
import { irs1040Pdf } from "../../general/return-assembly/f1040.ts";

Deno.test("Form 1040 PDF preserves sourced line 25c for W-2G attachment", () => {
  const fields = { line25c_total: 250 };
  assertEquals(
    irs1040Pdf.projectFields?.(fields, {
      w2g: {
        w2gs: [{
          payer_name: "Example Casino",
          payer_ein: "12-3456789",
          source_document_reference: "Issued 2025 W-2G Copy B",
          box1_winnings: 1_000,
          box4_federal_withheld: 250,
        }],
      },
    })?.line25c_total,
    250,
  );
});
