import { assertEquals, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { form4136Pdf } from "./f4136.ts";

const business = {
  qualifying_business_activity: true,
  activity_count: 1,
  business_name: "Example Farm",
  principal_activity_code: "111000",
  equipment_make: "Example",
  equipment_model: "Tractor",
  equipment_type: "farm tractor",
  purchase_records_confirmed: true,
  no_duplicate_excise_claim: true,
};
const certifications = {
  undyed_fuel_confirmed: true,
  right_to_claim_not_waived: true,
  credit_card_issuer_certificate_not_provided: true,
  not_highway_vehicle: true,
} as const;

Deno.test("Form 4136 PDF maps page 1 business and page 4 total widgets", () => {
  const names = Object.fromEntries(
    form4136Pdf.fields.map((field) => [field.domainKey, field.pdfField]),
  );
  assertEquals(names.business_name, "topmostSubform[0].Page1[0].f1_4[0]");
  assertEquals(names.line1a_gallons, "topmostSubform[0].Page1[0].f1_12[0]");
  assertEquals(
    names.line5d_credit_dollars,
    "topmostSubform[0].Page2[0].f2_73[0]",
  );
  assertEquals(names.line11c_gallons, "topmostSubform[0].Page3[0].f3_97[0]");
  assertEquals(
    names.line17_total_cents,
    "topmostSubform[0].Page4[0].f4_125[0]",
  );
});

Deno.test("Form 4136 PDF projects gallons and split dollars/cents from source", () => {
  const result = form4136Pdf.projectFields?.({
    business,
    claims: [
      {
        ...certifications,
        line: "1a",
        qualified_gallons: 100,
        actual_fuel_cost: 300.25,
      },
      {
        ...certifications,
        line: "3b",
        qualified_gallons: 100,
        actual_fuel_cost: 400.10,
      },
    ],
  }, {
    schedule3: { line12_fuel_tax_credit: 42.6 },
  });
  assertEquals(result?.line1a_gallons, 100);
  assertEquals(result?.line1_cost_dollars, "300");
  assertEquals(result?.line1_cost_cents, "25");
  assertEquals(result?.line3_credit_dollars, "24");
  assertEquals(result?.line3_credit_cents, "30");
  assertEquals(result?.line17_total_dollars, "42");
  assertEquals(result?.line17_total_cents, "60");
});

Deno.test("Form 4136 PDF carries multiple uses on a separate statement", async () => {
  const result = form4136Pdf.projectFields?.({
    business,
    claims: [
      {
        ...certifications,
        line: "3a",
        type_of_use: "02",
        qualified_gallons: 100,
        actual_fuel_cost: 300,
      },
      {
        ...certifications,
        line: "3a",
        type_of_use: "06",
        qualified_gallons: 50,
        actual_fuel_cost: 150,
      },
    ],
  }, { schedule3: { line12_fuel_tax_credit: 36.45 } });
  assertEquals(result?.line3a_type, "SEE STMT");
  assertEquals(result?.line3a_gallons, 150);
  const doc = await PDFDocument.create();
  await form4136Pdf.appendSupplementalPages?.(doc, result ?? {}, undefined);
  assertEquals(doc.getPageCount(), 1);
});

Deno.test("Form 4136 PDF rejects a Schedule 3 mismatch", () => {
  assertThrows(
    () =>
      form4136Pdf.projectFields?.({
        business,
        claims: [{
          ...certifications,
          line: "1a",
          qualified_gallons: 100,
          actual_fuel_cost: 300,
        }],
      }, { schedule3: { line12_fuel_tax_credit: 50 } }),
    Error,
    "does not match Schedule 3",
  );
});
