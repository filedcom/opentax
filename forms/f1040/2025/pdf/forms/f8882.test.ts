import { assertEquals, assertThrows } from "@std/assert";
import { form8882PreparedFixture } from "../../mef/forms/f8882.fixture.ts";
import { form8882Pdf } from "./f8882.ts";

Deno.test("staged Form 8882 PDF projects inspected AcroForm fields", () => {
  const { source, pending } = form8882PreparedFixture();
  const fields = form8882Pdf.projectFields!(source, pending);
  assertEquals(form8882Pdf.pageIndices!(fields), [0]);
  assertEquals(fields.line1, 40_000);
  assertEquals(fields.line2, 10_000);
  assertEquals(fields.line3, 10_000);
  assertEquals(fields.line4, 1_000);
  assertEquals(fields.line5, 0);
  assertEquals(fields.line6, 11_000);
  assertEquals(fields.line7, 11_000);
  assertEquals(
    form8882Pdf.fields[0].pdfField,
    "topmostSubform[0].Page1[0].p1-t3[0]",
  );
  assertEquals(
    form8882Pdf.fields[6].pdfField,
    "topmostSubform[0].Page1[0].p1-t15[0]",
  );
});

Deno.test("staged Form 8882 PDF refuses changed filed source", () => {
  const { source, pending } = form8882PreparedFixture();
  assertThrows(() =>
    form8882Pdf.projectFields!(source, {
      ...pending,
      f8882: {
        ...source,
        referral_contract: {
          ...source.referral_contract,
          gross_expenditure_usd: 20_000,
        },
      },
    })
  );
});
