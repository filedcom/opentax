import { assert, assertEquals, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../index.ts";
import { form1116 } from "../../../mef/forms/international/f1116/f1116.ts";
import {
  form1116ScheduleB,
  scheduleBFieldsSchema,
} from "../../../mef/forms/international/f1116/f1116_schedule_b.ts";
import { form1116Pdf } from "../../../pdf/forms/international/f1116/f1116.ts";
import { form1116ScheduleBPdf } from "../../../pdf/forms/international/f1116/f1116_schedule_b.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import { FilingStatus } from "../../../../nodes/types.ts";
import { inputSchema as f1099intInputSchema } from "../../../../nodes/inputs/f1099int/index.ts";

const XSD_PATH = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

const canadaRef = "2025 Canadian Bank 1099-INT";
const franceRef = "2025 French Bank 1099-INT";
const canada = {
  recipient_tin: "111223333",
  payer_name: "Canadian Bank",
  box1: 20_000,
  box6: 4_000,
  box7: "Canada",
  foreign_source_interest_usd: 20_000,
  foreign_tax_irs_country_code: "CA",
  foreign_tax_source_document_reference: canadaRef,
};
const france = {
  recipient_tin: "111223333",
  payer_name: "French Bank",
  box1: 30_000,
  box6: 5_000,
  box7: "France",
  foreign_source_interest_usd: 30_000,
  foreign_tax_irs_country_code: "FR",
  foreign_tax_source_document_reference: franceRef,
};
const germanyRef = "2025 German Bank 1099-INT";
const germany = {
  recipient_tin: "111223333",
  payer_name: "German Bank",
  box1: 10_000,
  box6: 2_000,
  box7: "Germany",
  foreign_source_interest_usd: 10_000,
  foreign_tax_irs_country_code: "GM",
  foreign_tax_source_document_reference: germanyRef,
};
const review = {
  column_a_source_document_reference: canadaRef,
  column_a_irs_country_code: "CA",
  column_b_source_document_reference: franceRef,
  column_b_irs_country_code: "FR",
  column_c_source_document_reference: germanyRef,
  column_c_irs_country_code: "GM",
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

function filedReturn(germanyCode = "GM") {
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
    f1099int: [canada, france, {
      ...germany,
      foreign_tax_irs_country_code: germanyCode,
    }],
    form1116_review: {
      all_foreign_sources_reviewed: true,
      foreign_qualified_dividends: 0,
      foreign_capital_gains_or_losses_present: false,
      source_document_references: [canadaRef, franceRef, germanyRef],
      no_amt_liability_verified: true,
      three_country_interest_pdf_review: {
        ...review,
        column_c_irs_country_code: germanyCode,
      },
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

Deno.test("three countries' passive interest reconciles Form 1116 A/B/C, Schedule B, Schedule 3, Form 1040 and native sources", () => {
  const result = filedReturn();
  const parent = result.pending.form_1116;
  assert(parent);
  const summary = (parent.category_summaries as
    | Array<{
      automaticallyApportionedDeductions: number;
      foreignGrossIncome: number;
    }>
    | undefined)?.[0];
  assert(summary);
  assertEquals(summary.foreignGrossIncome, 60_000);
  assertEquals(summary.automaticallyApportionedDeductions, 15_750);
  assertEquals(result.pending.f1040.line2b_taxable_interest, 60_000);
  assertEquals(
    result.pending.f1040.line20_nonrefundable_credits,
    result.pending.schedule3.line8_total,
  );
  const pdf = form1116Pdf.projectFields!(parent, result.pending);
  assertEquals(pdf.pdf_country_a, "Canada");
  assertEquals(pdf.pdf_country_b, "France");
  assertEquals(pdf.pdf_country_c, "Germany");
  assertEquals(pdf.pdf_line1a_a, 20_000);
  assertEquals(pdf.pdf_line1a_b, 30_000);
  assertEquals(pdf.pdf_line1a_c, 10_000);
  assertEquals(pdf.pdf_line3g_a, 5_250);
  assertEquals(pdf.pdf_line3g_b, 7_875);
  assertEquals(pdf.pdf_line3g_c, 2_625);
  assertEquals(pdf.pdf_part2_us_interest_a, 4_000);
  assertEquals(pdf.pdf_part2_us_interest_b, 5_000);
  assertEquals(pdf.pdf_part2_us_interest_c, 2_000);
  const fieldPaths = new Map(form1116Pdf.fields.map((field) => [
    field.domainKey,
    field.pdfField,
  ]));
  assertEquals(
    fieldPaths.get("pdf_country_c"),
    "topmostSubform[0].Page1[0].Table_Part1_LinesI-1a[0].Rowi[0].f1_06[0]",
  );
  assertEquals(
    fieldPaths.get("pdf_part2_us_interest_c"),
    "topmostSubform[0].Page1[0].Table_Part2[0].RowC[0].f1_79[0]",
  );
  assert(result.pending.form1116_schedule_b);
  assertEquals(result.pending.form1116_schedule_b.category, "passive");
  assertEquals(result.pending.form1116_schedule_b.case, "current_year_excess");
  const scheduleBXml = form1116ScheduleB.build(
    scheduleBFieldsSchema.parse(result.pending.form1116_schedule_b),
  );
  assert(scheduleBXml.includes("IRS1116ScheduleB"));
  assert(
    form1116ScheduleBPdf.projectFields!(
      result.pending.form1116_schedule_b,
      result.pending,
    ),
  );
  assertEquals(
    pdf.pdf_line35,
    result.pending.schedule3.line1_foreign_tax_credit,
  );
  const [xml] = form1116.build(parent as Parameters<typeof form1116.build>[0], {
    pending: result.pending,
  });
  assert(xml.includes("<ForeignCountryCd>CA</ForeignCountryCd>"));
  assert(xml.includes("<ForeignCountryCd>FR</ForeignCountryCd>"));
  assert(xml.includes("<ForeignCountryCd>GM</ForeignCountryCd>"));
  assert(
    xml.includes(
      "<USTaxWithheldOnInterestAmt>4000</USTaxWithheldOnInterestAmt>",
    ),
  );
  assert(
    xml.includes(
      "<USTaxWithheldOnInterestAmt>5000</USTaxWithheldOnInterestAmt>",
    ),
  );
  assert(
    xml.includes(
      "<USTaxWithheldOnInterestAmt>2000</USTaxWithheldOnInterestAmt>",
    ),
  );
});

Deno.test("three-country interest retains both Form 1116 and Schedule B pages in a prepared printable packet", async () => {
  const result = filedReturn();
  const filer =
    pdfReviewFixtures.find((fixture) => fixture.id === "single-w2-refund")!
      .filer;
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assert(bundle.xml.includes("<ForeignCountryCd>CA</ForeignCountryCd>"));
  assert(bundle.xml.includes("<ForeignCountryCd>FR</ForeignCountryCd>"));
  assert(bundle.xml.includes("<ForeignCountryCd>GM</ForeignCountryCd>"));
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
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(`Missing verification prerequisite: ${XSD_PATH}`);
    }
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

Deno.test("three-country Germany source and final exports refuse ISO DE", () => {
  assertThrows(
    () =>
      f1099intInputSchema.parse({
        f1099ints: [{ ...germany, foreign_tax_irs_country_code: "DE" }],
      }),
    Error,
    "TY2025 Form 1116 requires an IRS MeF country code",
  );
  const result = filedReturn();
  const parent = result.pending.form_1116;
  assert(parent);
  const pending = {
    ...result.pending,
    f1099int: {
      f1099ints: [canada, france, {
        ...germany,
        foreign_tax_irs_country_code: "DE",
      }],
    },
  };
  assertThrows(
    () =>
      form1116.build(parent as Parameters<typeof form1116.build>[0], {
        pending,
      }),
    Error,
    "Form 1116 three-country interest needs three separately reviewed 1099-INT sources",
  );
  assertThrows(
    () => form1116Pdf.projectFields!(parent, pending),
    Error,
    "Form 1116 three-country interest needs three separately reviewed 1099-INT sources",
  );
});

Deno.test("three-country passive interest rejects changed payer, country, review, tax and return at native/PDF export", () => {
  const result = filedReturn();
  const parent = result.pending.form_1116;
  assert(parent);
  for (
    const pending of [
      {
        ...result.pending,
        f1099int: { f1099ints: [canada, { ...france, box6: 4_999 }, germany] },
      },
      {
        ...result.pending,
        f1099int: {
          f1099ints: [canada, {
            ...france,
            foreign_tax_irs_country_code: "CA",
          }, germany],
        },
      },
      {
        ...result.pending,
        f1099int: {
          f1099ints: [canada, {
            ...france,
            foreign_tax_source_document_reference: "Other France copy",
          }, germany],
        },
      },
      {
        ...result.pending,
        f1040: { ...result.pending.f1040, line2b_taxable_interest: 59_999 },
      },
      {
        ...result.pending,
        form1116_schedule_b: {
          ...result.pending.form1116_schedule_b,
          current_year_excess_tax: 1,
        },
      },
    ]
  ) {
    assertThrows(
      () =>
        form1116.build(parent as Parameters<typeof form1116.build>[0], {
          pending,
        }),
      Error,
    );
    assertThrows(() => form1116Pdf.projectFields!(parent, pending), Error);
  }
  const changedC = {
    ...parent,
    three_country_interest_pdf_review: {
      ...review,
      column_c_irs_country_code: "FR",
    },
  };
  assertThrows(
    () =>
      form1116.build(changedC as Parameters<typeof form1116.build>[0], {
        pending: result.pending,
      }),
    Error,
  );
  assertThrows(
    () => form1116Pdf.projectFields!(changedC, result.pending),
    Error,
  );
  const conflicting = {
    ...parent,
    multi_source_pdf_review: {
      ...review,
      payer_source_document_references: [canadaRef, franceRef, germanyRef],
    },
  };
  assertThrows(
    () =>
      form1116.build(conflicting as Parameters<typeof form1116.build>[0], {
        pending: result.pending,
      }),
    Error,
  );
  assertThrows(
    () => form1116Pdf.projectFields!(conflicting, result.pending),
    Error,
  );
  const missingReview = {
    ...parent,
    three_country_interest_pdf_review: undefined,
  };
  assertThrows(
    () =>
      form1116.build(missingReview as Parameters<typeof form1116.build>[0], {
        pending: result.pending,
      }),
    Error,
  );
  assertThrows(
    () => form1116Pdf.projectFields!(missingReview, result.pending),
    Error,
  );
});
