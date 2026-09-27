import { assertEquals, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { form4136Pdf } from "./f4136.ts";

const business = {
  qualifying_business_activity: true,
  claimant_is_ultimate_purchaser: true,
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
const activityContext = {
  claimant_context: "business",
  additional_activities: [],
  primary_activity_has_most_credit: true,
};

Deno.test("Form 4136 PDF maps page 1 business and page 4 total widgets", () => {
  const names = Object.fromEntries(
    form4136Pdf.fields.map((field) => [field.domainKey, field.pdfField]),
  );
  assertEquals(names.business_name, "topmostSubform[0].Page1[0].f1_4[0]");
  assertEquals(
    names.line1a_quantity,
    "topmostSubform[0].Page1[0].Table_Line1[0].Line1a[0].f1_12[0]",
  );
  assertEquals(
    names.line5d_credit_dollars,
    "topmostSubform[0].Page2[0].Table_Line5[0].Line5d[0].ColE[0].f2_73[0]",
  );
  assertEquals(
    names.line11c_quantity,
    "topmostSubform[0].Page3[0].Table_Line11[0].Line11c[0].f3_97[0]",
  );
  assertEquals(
    names.line11h_credit_cents,
    "topmostSubform[0].Page3[0].Table_Line11[0].Line11h[0].ColE[0].f3_141[0]",
  );
  assertEquals(
    names.line17_total_cents,
    "topmostSubform[0].Page4[0].f4_125[0]",
  );
});

Deno.test("Form 4136 PDF projects gallons and split dollars/cents from source", () => {
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
    business,
    claims: [
      {
        ...certifications,
        line: "1a",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 300.25,
      },
      {
        ...certifications,
        line: "3b",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 400.10,
      },
    ],
  }, {
    schedule3: { line12_fuel_tax_credit: 42.6 },
  });
  assertEquals(result?.line1a_quantity, 100);
  assertEquals(result?.line1_cost_dollars, "300");
  assertEquals(result?.line1_cost_cents, "25");
  assertEquals(result?.line3_credit_dollars, "24");
  assertEquals(result?.line3_credit_cents, "30");
  assertEquals(result?.line17_total_dollars, "42");
  assertEquals(result?.line17_total_cents, "60");
});

Deno.test("Form 4136 PDF carries multiple uses on a separate statement", async () => {
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
    business,
    claims: [
      {
        ...certifications,
        line: "3a",
        type_of_use: "02",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
      {
        ...certifications,
        line: "3a",
        type_of_use: "06",
        unit: "gallons",
        qualified_quantity: 50,
        actual_fuel_cost: 150,
      },
    ],
  }, { schedule3: { line12_fuel_tax_credit: 36.45 } });
  assertEquals(result?.line3a_type, "STMT");
  assertEquals(result?.line3a_quantity, "STMT");
  const doc = await PDFDocument.create();
  await form4136Pdf.appendSupplementalPages?.(doc, result ?? {}, undefined);
  assertEquals(doc.getPageCount(), 1);
});

Deno.test("Form 4136 PDF rejects a Schedule 3 mismatch", () => {
  assertThrows(
    () =>
      form4136Pdf.projectFields?.({
        ...activityContext,
        business,
        claims: [{
          ...certifications,
          line: "1a",
          unit: "gallons",
          qualified_quantity: 100,
          actual_fuel_cost: 300,
        }],
      }, { schedule3: { line12_fuel_tax_credit: 50 } }),
    Error,
    "does not match Schedule 3",
  );
});

Deno.test("Form 4136 PDF carries line 11 LNG diesel-gallon equivalents", () => {
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
    business,
    claims: [{
      ...certifications,
      line: "11g",
      type_of_use: "02",
      unit: "DGE",
      qualified_quantity: 100,
      actual_fuel_cost: 300,
    }],
  }, { schedule3: { line12_fuel_tax_credit: 24.3 } });
  assertEquals(result?.line11g_quantity, 100);
  assertEquals(result?.line11g_credit_dollars, "24");
  assertEquals(result?.line11g_credit_cents, "30");
});

Deno.test("Form 4136 PDF projects reduced-rate bus claims", async () => {
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
    business,
    claims: [{
      ...certifications,
      line: "11a",
      type_of_use: "05",
      unit: "GGE",
      qualified_quantity: 100,
      actual_fuel_cost: 300,
    }],
  }, { schedule3: { line12_fuel_tax_credit: 10.9 } });
  assertEquals(result?.line11a_type, "05");
  assertEquals(result?.line11a_quantity, 100);
  assertEquals(result?.line11a_credit_dollars, "10");
  assertEquals(result?.line11a_credit_cents, "90");
  const doc = await PDFDocument.create();
  const pages = [doc.addPage(), doc.addPage(), doc.addPage()];
  await form4136Pdf.decoratePages?.(doc, pages, result ?? {}, undefined);
  assertEquals(doc.getPageCount(), 3);
});

Deno.test("Form 4136 PDF sends mixed bus and standard line 11 use to a statement", () => {
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
    business,
    claims: [
      {
        ...certifications,
        line: "11a",
        type_of_use: "05",
        unit: "GGE",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
      {
        ...certifications,
        line: "11a",
        type_of_use: "02",
        unit: "GGE",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
    ],
  }, { schedule3: { line12_fuel_tax_credit: 29.2 } });
  assertEquals(result?.line11a_type, "STMT");
  assertEquals(result?.line11a_quantity, "STMT");
  assertEquals(result?.line11a_credit_dollars, "29");
  assertEquals(result?.line11a_credit_cents, "20");
});

Deno.test("Form 4136 PDF skips business lines for home-use kerosene", () => {
  const result = form4136Pdf.projectFields?.({
    claimant_context: "home_kerosene",
    claimant_is_ultimate_purchaser: true,
    home_purchase_outside_blocked_pump: true,
    home_use_heating_lighting_or_cooking: true,
    purchase_records_confirmed: true,
    no_duplicate_excise_claim: true,
    claims: [{
      line: "4a",
      type_of_use: "08",
      unit: "gallons",
      qualified_quantity: 100,
      actual_fuel_cost: 300,
      undyed_fuel_confirmed: true,
    }],
  }, { schedule3: { line12_fuel_tax_credit: 24.3 } });
  assertEquals(result?.qualified_yes, true);
  assertEquals(result?.activity_count, undefined);
  assertEquals(result?.business_name, undefined);
  assertEquals(result?.line4a_type, "08");
  assertEquals(result?.line4a_quantity, 100);
  assertEquals(result?.line17_total_dollars, "24");
});
