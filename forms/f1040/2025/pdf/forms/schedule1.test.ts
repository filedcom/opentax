import { assertEquals, assertThrows } from "@std/assert";
import { schedule1Pdf } from "./schedule1.ts";

Deno.test("Schedule 1 PDF includes filer identity on page 1", () => {
  assertEquals(schedule1Pdf.filerFields?.map((entry) => entry.domainKey), [
    "nameLine1",
    "primarySSN",
  ]);
});

Deno.test("Schedule 1 PDF puts Form 2106 deductions on line 12", () => {
  const line12 = schedule1Pdf.fields.find((entry) =>
    entry.domainKey === "line12_business_expenses"
  );
  assertEquals(line12?.pdfField, "topmostSubform[0].Page2[0].f2_02[0]");
});

Deno.test("Schedule 1 PDF uses 2025 fields after the Form 1099-K entry", () => {
  const at = (key: string) =>
    schedule1Pdf.fields.find((entry) => entry.domainKey === key)?.pdfField;
  assertEquals(at("line1_state_refund"), "topmostSubform[0].Page1[0].f1_04[0]");
  assertEquals(at("line3_schedule_c"), "topmostSubform[0].Page1[0].f1_07[0]");
  assertEquals(
    at("line8p_excess_business_loss"),
    "topmostSubform[0].Page1[0].f1_28[0]",
  );
  assertEquals(
    at("line8j_f1099k_hobby_income"),
    "topmostSubform[0].Page1[0].f1_22[0]",
  );
  assertEquals(
    at("line9_total_other_income"),
    "topmostSubform[0].Page1[0].f1_37[0]",
  );
  assertEquals(
    at("line10_total_additional_income"),
    "topmostSubform[0].Page1[0].f1_38[0]",
  );
  assertEquals(
    at("line11_educator_expenses"),
    "topmostSubform[0].Page2[0].f2_01[0]",
  );
  assertEquals(at("line24f_501c18d"), "topmostSubform[0].Page2[0].f2_21[0]");
  assertEquals(
    at("line24k_section67e_excess_deduction"),
    "topmostSubform[0].Page2[0].f2_26[0]",
  );
  assertEquals(
    at("line25_total_other_adjustments"),
    "topmostSubform[0].Page2[0].f2_29[0]",
  );
  assertEquals(
    at("line26_total_adjustments"),
    "topmostSubform[0].Page2[0].f2_30[0]",
  );
});

Deno.test("Schedule 1 PDF maps W-2G winnings to line 8b, not line 8z", () => {
  const line8b = schedule1Pdf.fields.find((entry) =>
    entry.domainKey === "line8b_gambling_winnings"
  );
  assertEquals(line8b?.pdfField, "topmostSubform[0].Page1[0].f1_14[0]");
  const line8z = schedule1Pdf.fields.find((entry) =>
    entry.domainKey === "line8z_other"
  );
  assertEquals(line8z?.pdfField, "topmostSubform[0].Page1[0].f1_36[0]");
});

Deno.test("Schedule 1 PDF combines identified line 8z sources once", () => {
  const projected = schedule1Pdf.instances?.({
    line8z_rtaa: 300,
    line8z_form8814: 200,
    line8z_hsa_excess_earnings: 100,
  })?.[0];
  assertEquals(projected?.line8z_other, 600);
  assertEquals(
    projected?.line8z_description,
    "Form 8814, HSA excess earnings, Trade adjustment assistance",
  );
});

Deno.test("Schedule 1 PDF rejects an untyped generic line 8z amount", () => {
  assertThrows(
    () => schedule1Pdf.instances?.({ line8z_other: 100 }),
    Error,
    "line 8z generic income needs identified source types",
  );
});

Deno.test("Schedule 1 PDF combines 1099-K and 1099-NEC activity income on line 8j", () => {
  const projected = schedule1Pdf.instances?.({
    line8j_f1099k_hobby_income: 100,
    f1099nec_nonbusiness_sources: [{
      payer_name: "Event Payer",
      payer_tin: "123456789",
      recipient_tin: "987654321",
      description: "One-time event",
      amount: 2_000,
    }],
  })?.[0];
  assertEquals(projected?.line8j_f1099k_hobby_income, 2_100);
  assertEquals(projected?.line8z_other, undefined);
});
