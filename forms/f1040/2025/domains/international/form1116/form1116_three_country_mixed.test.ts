import { assert, assertEquals, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../../../../nodes/types.ts";
import { f1040_2025 } from "../../../index.ts";
import { form1116 } from "../../../mef/forms/international/f1116/f1116.ts";
import { form1116Pdf } from "../../../pdf/forms/international/f1116/f1116.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";

const XSD_PATH = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

const canadaRef = "2025 Canadian bank interest copy";
const franceRef = "2025 French corporation dividend copy";
const germanyRef = "2025 German bank interest copy";
const canada = {
  recipient_tin: "111223333",
  payer_name: "Canadian Bank",
  box1: 20_000,
  box6: 2_000,
  box7: "Canada",
  foreign_source_interest_usd: 20_000,
  foreign_tax_irs_country_code: "CA",
  foreign_tax_source_document_reference: canadaRef,
};
const germany = {
  recipient_tin: "111223333",
  payer_name: "German Bank",
  box1: 10_000,
  box6: 1_000,
  box7: "Germany",
  foreign_source_interest_usd: 10_000,
  foreign_tax_irs_country_code: "GM",
  foreign_tax_source_document_reference: germanyRef,
};
const france = {
  recipient_tin: "111223333",
  payerName: "French Corporation",
  source_document_reference: franceRef,
  isNominee: false,
  box11: false,
  box1a: 30_000,
  box7: 3_000,
  box8: "France",
  foreign_source_dividends_usd: 30_000,
  foreign_tax_irs_country_code: "FR",
  holdingPeriodDays: 30,
  foreign_tax_holding_review: {
    ex_dividend_date: "2025-06-15",
    qualifying_held_days_in_31_day_window: 24,
    diminished_risk_days_excluded: 2,
    no_related_payment_obligation_confirmed: true,
    ordinary_stock_holding_rule_confirmed: true,
    review_reference: "French ordinary-stock holding ledger",
    reviewed_on: "2026-02-01",
  },
};
const review = {
  column_a_interest_source_document_reference: canadaRef,
  column_a_interest_irs_country_code: "CA",
  column_b_dividend_source_document_reference: franceRef,
  column_b_dividend_irs_country_code: "FR",
  column_c_interest_source_document_reference: germanyRef,
  column_c_interest_irs_country_code: "GM",
  all_foreign_tax_items_identified_confirmed: true,
  all_worldwide_income_sources_identified_confirmed: true,
  all_part_i_deductions_and_losses_except_standard_zero_confirmed: true,
  no_foreign_tax_reduction_confirmed: true,
  no_high_tax_kickout_confirmed: true,
  no_foreign_income_adjustment_confirmed: true,
  no_section_960c_increase_confirmed: true,
  no_international_boycott_confirmed: true,
  no_prior_year_carryover_or_carryback_confirmed: true,
  no_preferential_rate_income_confirmed: true,
  no_other_category_credit_confirmed: true,
};

function filedReturn() {
  const result = f1040_2025.executeReturn({
    general: {
      filing_status: FilingStatus.Single,
      digital_assets: false,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
    f1099int: [canada, germany],
    f1099div: [france],
    form1116_review: {
      all_foreign_sources_reviewed: true,
      foreign_qualified_dividends: 0,
      foreign_capital_gains_or_losses_present: false,
      source_document_references: [canadaRef, franceRef, germanyRef],
      no_amt_liability_verified: true,
      three_country_mixed_pdf_review: review,
    },
    form1116_carryover_review: {
      reviews: [{
        income_category: "passive",
        prior_year_form1116_line23_limit: 500,
        prior_year_form1116_line24_allowed_credit: 500,
        prior_year_schedule_b_line8_balance: 0,
        source_document_references: [
          "Filed 2024 passive Form 1116 and Schedule B",
        ],
        no_foreign_tax_redetermination_or_special_adjustment: true,
      }],
    },
  });
  assertEquals(result.diagnostics, []);
  return result;
}

Deno.test("three-country mixed credit retains its parent and Schedule B pages in an XSD-valid packet", async () => {
  const result = filedReturn();
  const filer =
    pdfReviewFixtures.find((fixture) => fixture.id === "single-w2-refund")!
      .filer;
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  for (const code of ["CA", "FR", "GM"]) {
    assert(bundle.xml.includes(`<ForeignCountryCd>${code}</ForeignCountryCd>`));
  }
  const origins: PdfPageOrigin[] = [];
  const bytes = await buildPdfBytes(
    pending,
    filer,
    ".pdf-cache",
    bundle,
    origins,
  );
  const document = await PDFDocument.load(bytes);
  assertEquals(document.getPageCount(), origins.length);
  assertEquals(
    origins.filter((page) => page.formKey === "form_1116").length,
    2,
  );
  assertEquals(
    origins.filter((page) => page.formKey === "form1116_schedule_b").length,
    2,
  );
  try {
    await Deno.stat(XSD_PATH);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return;
    throw error;
  }
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, bundle.xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, xmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
});

Deno.test("three-country interest and ordinary dividends reconcile native Form 1116 and PDF A/B/C", () => {
  const result = filedReturn();
  const parent = result.pending.form_1116;
  assert(parent);
  const summary = (parent.category_summaries as Array<{
    foreignGrossIncome: number;
    automaticallyApportionedDeductions: number;
  }>)[0];
  assertEquals(summary.foreignGrossIncome, 60_000);
  assertEquals(summary.automaticallyApportionedDeductions, 15_750);
  assertEquals(result.pending.f1040.line2b_taxable_interest, 30_000);
  assertEquals(result.pending.f1040.line3b_ordinary_dividends, 30_000);
  const pdf = form1116Pdf.projectFields!(parent, result.pending);
  assertEquals(pdf.pdf_country_a, "Canada");
  assertEquals(pdf.pdf_country_b, "France");
  assertEquals(pdf.pdf_country_c, "Germany");
  assertEquals(pdf.pdf_line3g_a, 5_250);
  assertEquals(pdf.pdf_line3g_b, 7_875);
  assertEquals(pdf.pdf_line3g_c, 2_625);
  assertEquals(pdf.pdf_part2_us_interest_a, 2_000);
  assertEquals(pdf.pdf_part2_us_dividend_b, 3_000);
  assertEquals(pdf.pdf_part2_us_interest_c, 1_000);
  assertEquals(
    pdf.pdf_line35,
    result.pending.schedule3.line1_foreign_tax_credit,
  );
  const [xml] = form1116.build(parent as Parameters<typeof form1116.build>[0], {
    pending: result.pending,
  });
  for (const country of ["CA", "FR", "GM"]) {
    assert(xml.includes(`<ForeignCountryCd>${country}</ForeignCountryCd>`));
  }
  assert(
    xml.includes(
      "<USTaxWithheldOnDividendAmt>3000</USTaxWithheldOnDividendAmt>",
    ),
  );
  assert(
    xml.includes(
      "<USTaxWithheldOnInterestAmt>1000</USTaxWithheldOnInterestAmt>",
    ),
  );
});

Deno.test("three-country mixed credit rejects changed dividend, interest, review and filed return", () => {
  const result = filedReturn();
  const parent = result.pending.form_1116;
  assert(parent);
  const changed: Record<string, Record<string, unknown>>[] = [
    {
      ...result.pending,
      f1099int: { f1099ints: [canada, { ...germany, box6: 999 }] },
    },
    {
      ...result.pending,
      f1099div: { f1099divs: [{ ...france, box7: 2_999 }] },
    },
    {
      ...result.pending,
      form_1116: {
        ...parent,
        three_country_mixed_pdf_review: {
          ...review,
          column_c_interest_source_document_reference: canadaRef,
        },
      },
    },
    {
      ...result.pending,
      f1040: { ...result.pending.f1040, line2b_taxable_interest: 29_999 },
    },
  ];
  for (const pending of changed) {
    if (!("form_1116" in pending)) {
      throw new Error("Expected Form 1116 in synthetic return");
    }
    const alteredParent = pending.form_1116;
    assertThrows(
      () =>
        form1116.build(alteredParent as Parameters<typeof form1116.build>[0], {
          pending,
        }),
      Error,
    );
    assertThrows(
      () => form1116Pdf.projectFields!(alteredParent, pending),
      Error,
    );
  }
});
