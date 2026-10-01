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
  assertEquals(field("pdf_line12"), "topmostSubform[0].Page1[0].f1_70[0]");
  assertEquals(field("pdf_line17"), "topmostSubform[0].Page1[0].f1_75[0]");
  assertEquals(field("ordinary_gain"), "topmostSubform[0].Page1[0].f1_77[0]");
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
  const partial = form4797Pdf.projectFields?.(
    { ...source, nonrecaptured_1231_loss: 4_000 },
    pending,
  );
  assertEquals(partial?.pdf_section_1231_line9, 6_000);
  assertEquals(partial?.pdf_line12, 4_000);
  assertEquals(partial?.pdf_line17, 4_000);
  assertEquals(partial?.ordinary_gain, 4_000);
  const full = form4797Pdf.projectFields?.(
    { ...source, nonrecaptured_1231_loss: 12_000 },
    pending,
  );
  assertEquals(full?.pdf_section_1231_line9, 0);
  assertEquals(full?.pdf_line12, 10_000);
  assertEquals(full?.pdf_line17, 10_000);
  assertEquals(full?.ordinary_gain, 10_000);
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
  assertThrows(
    () =>
      form4797Pdf.projectFields?.(
        { section_1231_gain: 10_000, nonrecaptured_1231_loss: 4_000 },
        {},
      ),
    Error,
    "prior-loss recapture needs only linked line 4/5",
  );
  assertThrows(
    () =>
      form4797Pdf.projectFields?.(
        { ...source, nonrecaptured_1231_loss: 4_000, ordinary_gain: 1_000 },
        pending,
      ),
    Error,
    "prior-loss recapture needs only linked line 4/5",
  );
});

Deno.test("Form 4797 line 5 reconciles its section 1231 exchange source", () => {
  const fields = { section_1231_gain: 20_000, gain_form8824: 20_000 };
  const exchange = {
    relinquished_basis: 40_000,
    received_fmv: 100_000,
    cash_received: 20_000,
    gain_type: "section_1231",
  };
  assertEquals(
    form4797Pdf.projectFields?.(fields, { form8824: exchange }).gain_form8824,
    20_000,
  );
  assertThrows(
    () => form4797Pdf.projectFields?.(fields, {}),
    Error,
    "line 5 needs its Form 8824 source",
  );
  assertThrows(
    () =>
      form4797Pdf.projectFields?.(fields, {
        form8824: { ...exchange, cash_received: 10_000 },
      }),
    Error,
    "line 5 must match Form 8824 line 22",
  );
});
