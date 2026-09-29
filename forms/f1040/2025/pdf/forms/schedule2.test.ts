import { assertEquals, assertThrows } from "@std/assert";
import { schedule2Pdf } from "./schedule2.ts";

Deno.test("Schedule 2 PDF includes filer identity on page 1", () => {
  assertEquals(schedule2Pdf.filerFields?.map((entry) => entry.domainKey), [
    "nameLine1",
    "primarySSN",
  ]);
});

Deno.test("Form 4255 source rows project Schedule 2 net-EPE lines and row checkboxes", () => {
  const source = {
    rows: [{
      source_document_reference: "2024 Form 3800 and recapture workpaper",
      credit_line: "1d" as const,
      prior_credit_claimed: 10_000,
      gross_epe: 8_000,
      gross_epe_applied_regular_tax: 3_000,
      non_epe_applied_regular_tax: 1_000,
      recaptured_total: 2_000,
      recaptured_carryover: 500,
      recaptured_non_epe_applied: 0 as const,
      recaptured_gross_epe_applied: 0 as const,
      recaptured_net_epe: 1_500,
      excessive_payment_net_epe: 300,
      excessive_payment_other: 0 as const,
      excessive_payment_20_percent: 60,
    }],
  };
  const projected = schedule2Pdf.projectFields?.({
    line1e_form4255_excessive_payment: 300,
    line1f_form4255_20_percent_ep: 60,
    line19_form4255_net_epe: 1_500,
  }, { f4255: source });
  assertEquals(projected?.line1e_form4255_row1d, true);
  assertEquals(projected?.line1e_form4255_row2a, false);
  assertEquals(projected?.line1f_form4255_row1d, true);
  assertEquals(projected?.line19_form4255_net_epe, 1_500);
  const byKey = new Map(
    schedule2Pdf.fields.map((field) => [field.domainKey, field.pdfField]),
  );
  assertEquals(
    byKey.get("line1d_form4255_net_epe"),
    "form1[0].Page1[0].f1_06[0]",
  );
  assertEquals(
    byKey.get("line19_form4255_net_epe"),
    "form1[0].Page2[0].f2_22[0]",
  );
});

Deno.test("2025 Schedule 2 PDF rejects generic 3468 recapture", () => {
  const byKey = new Map(schedule2Pdf.fields.map((field) => [
    field.domainKey,
    field.pdfField,
  ]));
  assertEquals(
    byKey.get("line17a_description"),
    "form1[0].Page2[0].Line17a_ReadOrder[0].Line17_ReadOrder[0].f2_01[0]",
  );
  assertEquals(
    byKey.get("line17a_investment_credit_recapture"),
    "form1[0].Page2[0].Line17a_ReadOrder[0].f2_02[0]",
  );
  assertThrows(
    () =>
      schedule2Pdf.projectFields?.(
        { line17a_investment_credit_recapture: 2_500 },
        {},
      ),
    Error,
    "requires a specific Form 4255 credit-line source",
  );
  const nmcr = schedule2Pdf.projectFields?.(
    { line17a_new_markets_credit_recapture: 3_100 },
    {},
  );
  assertEquals(nmcr?.line17a_description, "NMCR");
  assertEquals(nmcr?.line17a_investment_credit_recapture, 3_100);
});

Deno.test("2025 Schedule 2 PDF maps sourced Part II taxes to printed lines", () => {
  const byKey = new Map(schedule2Pdf.fields.map((field) => [
    field.domainKey,
    field.pdfField,
  ]));
  assertEquals(
    byKey.get("line9_household_employment"),
    "form1[0].Page1[0].f1_20[0]",
  );
  assertEquals(
    byKey.get("line13_uncollected_fica_total"),
    "form1[0].Page1[0].f1_24[0]",
  );
  assertEquals(
    byKey.get("line16_lihtc_recapture"),
    "form1[0].Page1[0].f1_27[0]",
  );
  assertEquals(
    byKey.get("line17b_mortgage_subsidy_recapture"),
    "form1[0].Page2[0].f2_03[0]",
  );
  assertEquals(byKey.get("line17c_hsa_penalty"), "form1[0].Page2[0].f2_04[0]");
  assertEquals(
    byKey.get("line17e_archer_msa_tax"),
    "form1[0].Page2[0].f2_06[0]",
  );
  assertEquals(
    byKey.get("line17f_medicare_advantage_msa_tax"),
    "form1[0].Page2[0].f2_07[0]",
  );
  assertEquals(byKey.get("line17h_nqdc_total"), "form1[0].Page2[0].f2_09[0]");
  assertEquals(
    byKey.get("line17k_golden_parachute_total"),
    "form1[0].Page2[0].f2_12[0]",
  );
  assertEquals(
    byKey.get("line17p_form8621_interest"),
    "form1[0].Page2[0].f2_17[0]",
  );
  assertEquals(
    byKey.get("line20_965_tax_installment"),
    "form1[0].Page2[0].f2_23[0]",
  );
});

Deno.test("2025 Schedule 2 PDF sums W-2 and information-return amounts only on their own lines", () => {
  const projected = schedule2Pdf.projectFields?.({
    uncollected_fica: 120,
    uncollected_fica_gtl: 80,
    section409a_excise: 600,
    line17h_nqdc_tax: 400,
    golden_parachute_excise: 250,
    line17k_golden_parachute_excise: 150,
    line20_965_tax_installment: 2_000,
  }, {});
  assertEquals(projected?.line13_uncollected_fica_total, 200);
  assertEquals(projected?.line17h_nqdc_total, 1_000);
  assertEquals(projected?.line17k_golden_parachute_total, 400);
  assertEquals(projected?.line20_965_tax_installment, 2_000);
  assertEquals(projected?.line21_total, undefined);
});
