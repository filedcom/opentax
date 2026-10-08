import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { form8992Filer } from "../../../domains/international/form8992/form8992.fixture.ts";
import { form965a } from "../../../mef/forms/international/f965a.ts";
import { f965, inputSchema } from "../../../../nodes/inputs/f965/index.ts";
import { schedule2 } from "../../../../nodes/intermediate/aggregation/schedule2/index.ts";
import { form965aPdf } from "./f965a.ts";

const source = {
  reporting_year: 2025,
  amended_report: false,
  f965s: [{
    entry_type: "original",
    source_document_reference: "Reviewed 2018 filed Form 965-A",
    tax_year_of_inclusion: 2018,
    net_tax_with_965: 52_000,
    net_tax_without_965: 20_000,
    installment_election: true,
    net_tax_adjustment: 0,
    paid_by_installment_year: [
      2_560,
      2_560,
      2_560,
      2_560,
      2_560,
      4_800,
      6_400,
      8_000,
    ],
    current_year_payment: 8_000,
    current_year_payment_reference: "Reviewed 2025 IRS payment confirmation",
  }],
  s_corp_calculations: [],
  s_corp_deferred_rows: [],
  transfer_agreements: [],
};

Deno.test("Form 965-A 2018 liability projects to Schedule 2, native MeF, and matching PDF row", () => {
  const parsed = inputSchema.parse(source);
  const result = f965.compute(
    { taxYear: 2025, formType: "f1040" },
    parsed,
  );
  const payment = fieldsOf(result.outputs, schedule2)
    ?.line20_965_tax_installment;
  assertEquals(payment, 8_000);
  const pending = { schedule2: { line20_965_tax_installment: payment } };
  const native = form965a.build(source, { pending });
  const [pdf] = form965aPdf.instances!(source, form8992Filer, pending);
  assertStringIncludes(native, "<NetTaxLiabilityYr>2018</NetTaxLiabilityYr>");
  assertStringIncludes(
    native,
    "<NetSection965TaxLiabilityAmt>32000</NetSection965TaxLiabilityAmt>",
  );
  assertStringIncludes(native, "<PaidYear8Amt>8000</PaidYear8Amt>");
  assertEquals(form965aPdf.pageIndices!(pdf), [0, 1, 2]);
  assertEquals(pdf.year2_net_liability, 32_000);
  assertEquals(pdf.year2_installment_liability, 32_000);
  assertEquals(pdf.year2_paid_year8, 8_000);
  assertEquals(pdf.year2_current_payment, 8_000);
  assertEquals(pdf.total_current_payment, 8_000);
  assertEquals(pdf.year2_unpaid, 0);
  assertEquals(pdf.year1_net_liability, undefined);
  assertEquals(
    form965aPdf.fields.find((entry) => entry.domainKey === "year2_paid_year8")
      ?.pdfField,
    "topmostSubform[0].Page2[0].Table_Part2_g-k[0].BodyRow2[0].f2_08[0]",
  );
});

Deno.test("Form 965-A PDF uses the preprinted 2017 row for a sourced late payment", () => {
  const late = {
    ...source,
    f965s: [{ ...source.f965s[0], tax_year_of_inclusion: 2017 }],
  };
  const [pdf] = form965aPdf.instances!(
    late,
    form8992Filer,
    { schedule2: { line20_965_tax_installment: 8_000 } },
  );
  assertEquals(pdf.year1_net_liability, 32_000);
  assertEquals(pdf.year1_paid_year8, 8_000);
  assertEquals(pdf.year2_net_liability, undefined);
});

Deno.test("Form 965-A PDF rejects changed payment, missing source, and unsupported branches", () => {
  assertThrows(
    () => form965aPdf.instances!(source, form8992Filer),
    Error,
    "needs the finalized 2025 return",
  );
  assertThrows(
    () =>
      form965aPdf.instances!(
        source,
        form8992Filer,
        { schedule2: { line20_965_tax_installment: 7_999 } },
      ),
    Error,
    "differ from Schedule 2 line 20",
  );
  assertThrows(() =>
    form965aPdf.instances!(
      {
        ...source,
        f965s: [{ ...source.f965s[0], current_year_payment_reference: "" }],
      },
      form8992Filer,
      { schedule2: { line20_965_tax_installment: 8_000 } },
    ), Error);
  assertThrows(
    () =>
      form965aPdf.instances!(
        { ...source, amended_report: true },
        form8992Filer,
        { schedule2: { line20_965_tax_installment: 8_000 } },
      ),
    Error,
    "one unadjusted original",
  );
  assertThrows(
    () =>
      form965aPdf.instances!(
        {
          ...source,
          f965s: [{
            ...source.f965s[0],
            net_tax_adjustment: 1,
            net_tax_adjustment_kind: "subsequent_adjustment",
          }],
        },
        form8992Filer,
        { schedule2: { line20_965_tax_installment: 8_000 } },
      ),
    Error,
    "one unadjusted original",
  );
});
