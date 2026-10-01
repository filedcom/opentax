import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { calculateForm8941 } from "../../../nodes/inputs/f8941/index.ts";
import { form8941DirectFixture } from "../../../nodes/inputs/f8941/fixture.ts";
import { form8941Pdf } from "../../pdf/forms/f8941.ts";
import { testFiler } from "../test-filer.ts";
import { form8941 } from "./f8941.ts";

function pending() {
  const source = form8941DirectFixture();
  const lines = calculateForm8941(source);
  return {
    f8941: source,
    schedule_c: {
      schedule_cs: [{
        business_reference: source.schedule_c_business_reference,
        proprietor_recipient: source.proprietor_recipient,
        line_a_principal_business: "Retail shop",
        line_b_business_code: "459999",
        line_d_ein: source.employment_ein,
        line_f_accounting_method: "cash",
        line_g_material_participation: true,
        line_1_gross_receipts: 250_000,
        line_26_wages: 100_000,
        line_14_employee_benefits: source.other_schedule_c_employee_benefits +
          lines.line4 - lines.line12,
      }],
    },
  };
}

Deno.test("staged IRS8941 and official PDF project the same direct credit", () => {
  const filed = pending();
  const filer = { ...testFiler(), primarySSN: filed.f8941.owner_ssn };
  const xml = form8941.build(filed.f8941, { pending: filed, filer });
  assertStringIncludes(xml, "<SHOPInd>true</SHOPInd>");
  assertStringIncludes(
    xml,
    "<SmllEmplrHIPFTEEmplForTaxYrCnt>5</SmllEmplrHIPFTEEmplForTaxYrCnt>",
  );
  assertStringIncludes(
    xml,
    "<SmallerAnnualWgPdOrHIPPdAmt>11698</SmallerAnnualWgPdOrHIPPdAmt>",
  );
  assertStringIncludes(
    xml,
    "<SumSmllrAmtAndCreditForHIPAmt>11698</SumSmllrAmtAndCreditForHIPAmt>",
  );
  const pdf = form8941Pdf.projectFields!(filed.f8941, filed);
  assertEquals(pdf.line4, 25_000);
  assertEquals(pdf.line5, 23_395);
  assertEquals(pdf.line12, 11_698);
  assertEquals(pdf.line16, 11_698);
  assertEquals(pdf.shop_yes, true);
  assertEquals(pdf.prior_year_shop_no, true);
});

Deno.test("staged Form 8941 rejects Schedule C payroll, deduction, owner and source tampering", () => {
  const filed = pending();
  const filer = { ...testFiler(), primarySSN: filed.f8941.owner_ssn };
  assertThrows(
    () =>
      form8941.build(filed.f8941, {
        pending: {
          ...filed,
          schedule_c: {
            schedule_cs: [{
              ...filed.schedule_c.schedule_cs[0],
              line_14_employee_benefits: 14_000,
            }],
          },
        },
        filer,
      }),
    Error,
    "premium deduction differs from Schedule C",
  );
  assertThrows(
    () =>
      form8941.build(filed.f8941, {
        pending: filed,
        filer: { ...filer, primarySSN: "999887777" },
      }),
    Error,
    "owner SSN differs",
  );
  assertThrows(
    () =>
      form8941.build({ ...filed.f8941, employment_ein: "999887777" }, {
        pending: filed,
        filer,
      }),
    Error,
    "source differs from filed return",
  );
});
