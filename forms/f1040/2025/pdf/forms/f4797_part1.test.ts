import { assertEquals, assertThrows } from "@std/assert";
import { form4797Pdf } from "./f4797.ts";

function field(key: string): string | undefined {
  return form4797Pdf.fields.find((entry) => entry.domainKey === key)?.pdfField;
}

Deno.test("Form 4797 Part I uses the official 2025 line 4–9 fields", () => {
  assertEquals(field("gain_form6252"), "topmostSubform[0].Page1[0].f1_35[0]");
  assertEquals(field("gain_form8824"), "topmostSubform[0].Page1[0].f1_36[0]");
  assertEquals(
    field("section_1231_gain"),
    "topmostSubform[0].Page1[0].f1_38[0]",
  );
  assertEquals(
    field("nonrecaptured_1231_loss"),
    "topmostSubform[0].Page1[0].f1_39[0]",
  );
  assertEquals(
    field("pdf_section_1231_line9"),
    "topmostSubform[0].Page1[0].f1_40[0]",
  );
});

Deno.test("Form 4797 prints line 9 only when prior section 1231 losses apply", () => {
  const source = { section_1231_gain: 10_000, gain_form6252: 10_000 };
  const pending = {
    form6252: {
      f6252s: [{
        property_description: "Business land",
        date_acquired: "2020-01-01",
        date_sold: "2025-03-01",
        sold_to_related_party: false,
        selling_price_determinable: true,
        selling_price: 80_000,
        cost_basis: 40_000,
        payments_received: 20_000,
        is_capital_asset: false,
      }],
    },
  };
  assertEquals(
    form4797Pdf.projectFields?.(source, pending).pdf_section_1231_line9,
    undefined,
  );
  assertEquals(
    form4797Pdf.projectFields?.(
      { ...source, nonrecaptured_1231_loss: 4_000 },
      pending,
    )
      .pdf_section_1231_line9,
    6_000,
  );
  assertEquals(
    form4797Pdf.projectFields?.(
      { ...source, nonrecaptured_1231_loss: 12_000 },
      pending,
    )
      .pdf_section_1231_line9,
    0,
  );
  assertThrows(
    () => form4797Pdf.projectFields?.({ nonrecaptured_1231_loss: 4_000 }, {}),
    Error,
    "positive section 1231 line 7 gain",
  );
  assertThrows(
    () => form4797Pdf.projectFields?.(source, {}),
    Error,
    "line 4 needs its Form 6252 source",
  );
  assertThrows(
    () =>
      form4797Pdf.projectFields?.({ ...source, gain_form6252: 9_999 }, pending),
    Error,
    "line 4 must match Form 6252 line 26",
  );
});
