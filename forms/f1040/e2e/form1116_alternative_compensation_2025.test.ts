import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "../2025/registry.ts";
import { buildMefBundle } from "../2025/mef/builder.ts";
import { buildPending } from "../2025/mef/pending.ts";
import { buildPdfBytes } from "../2025/pdf/builder.ts";
import { form1116Pdf } from "../2025/pdf/forms/f1116.ts";
import { extractFilerIdentity } from "../mef/filer.ts";

const wageReference = "2025 employer project ledger";
const alternative = {
  specific_compensation_description: "Consulting salary",
  alternative_allocation_basis: "Client project locations",
  alternative_allocation_computation:
    "140000 of 300000 salary sourced to Germany",
  geographical_comparison:
    "Project locations more accurately reflect service delivery than workdays",
  compensation_item_total_usd: 300_000,
  alternative_us_source_usd: 160_000,
  alternative_foreign_source_usd: 140_000,
  ordinary_us_source_usd: 180_000,
  ordinary_foreign_source_usd: 120_000,
  source_document_reference: wageReference,
};
const currency = {
  currency_code: "EUR",
  amount: 1_600,
  usd_per_foreign_unit: 1.25,
  conversion_date: "2025-06-15",
  conversion_rate_explanation: "Bank posted rate on payment day",
  source_document_reference: "2025 German wage-tax receipt",
};
const inputs = {
  general: {
    filing_status: "single",
    taxpayer_first_name: "Alex",
    taxpayer_last_name: "Example",
    taxpayer_ssn: "111-22-3333",
    taxpayer_dob: "1985-06-15",
    address_line1: "1 Example Way",
    address_city: "Austin",
    address_state: "TX",
    address_zip: "78701",
    digital_assets: false,
  },
  fec: [{
    foreign_employer_name: "German Employer",
    country_code: "DE",
    currency: "EUR",
    compensation_amount: 240_000,
    compensation_usd: 300_000,
    foreign_service_compensation_usd: 140_000,
    foreign_tax_paid_usd: 2_000,
    foreign_tax_irs_country_code: "GM",
    foreign_tax_paid_or_accrued_date: "2025-06-15",
    foreign_tax_credit_method: "paid",
    foreign_tax_currency: currency,
    alternative_compensation_sourcing: alternative,
  }],
  form1116_review: {
    all_foreign_sources_reviewed: true,
    foreign_qualified_dividends: 0,
    foreign_capital_gains_or_losses_present: false,
    source_document_references: [wageReference],
    no_amt_liability_verified: true,
    single_source_pdf_review: {
      source_document_reference: wageReference,
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
    },
  },
};

Deno.test("one foreign employer alternative allocation reaches full return, MeF attachment and PDF", async () => {
  const result = execute(buildExecutionPlan(registry), registry, inputs, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line1h_other_earned, 300_000);
  assertEquals(result.pending.f1040?.line12a_standard_deduction, 15_750);
  assertEquals(result.pending.f1040?.line15_taxable_income, 284_250);
  assertEquals(result.pending.schedule3?.line1_foreign_tax_credit, 2_000);
  const projected = form1116Pdf.projectFields?.(
    result.pending.form_1116!,
    result.pending,
  ) ?? {};
  assertEquals(projected.pdf_line3a_a, 15_750);
  assertEquals(projected.pdf_line3g_a, 7_350);
  assertEquals(projected.pdf_line7, 132_650);
  const filer = extractFilerIdentity(result.pending.f1040);
  const bundle = await buildMefBundle(buildPending(result.pending), {
    filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<AltBasisCompensationSourceStmt documentId=",
  );
  assertStringIncludes(bundle.xml, "<BinaryAttachment documentId=");
  assertStringIncludes(
    bundle.xml,
    'referenceDocumentName="AltBasisCompensationSourceStatement"',
  );
  assertStringIncludes(
    bundle.xml,
    'referenceDocumentName="BinaryAttachment FinancialServicesActiveFinancingIncomeStatement',
  );
  assertEquals(bundle.attachments.length, 1);
  assertEquals(
    (await PDFDocument.load(bundle.attachments[0].bytes)).getPageCount(),
    1,
  );
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, bundle.xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
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
  const pdf = await buildPdfBytes(result.pending, filer);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);
  const changed = structuredClone(result.pending);
  (changed.fec as { fecs: Array<{ foreign_service_compensation_usd: number }> })
    .fecs[0].foreign_service_compensation_usd = 139_999;
  await assertRejects(
    () => buildMefBundle(buildPending(changed), { filer, attachments: [] }),
    Error,
    "must match each identified foreign-employer wage item",
  );
});

Deno.test("two owner-matched foreign employers establish worldwide compensation for one alternative wage item", async () => {
  const secondWageReference = "2025 second foreign employer wage ledger";
  const twoEmployerInputs = {
    ...inputs,
    fec: [{
      ...inputs.fec[0],
      compensation_amount: 160_000,
      compensation_usd: 200_000,
      compensation_owner_ssn: "111-22-3333",
      compensation_source_document_reference: wageReference,
      alternative_compensation_sourcing: {
        ...alternative,
        compensation_item_total_usd: 200_000,
        alternative_us_source_usd: 60_000,
        ordinary_us_source_usd: 80_000,
        alternative_allocation_computation:
          "140000 of 200000 salary sourced to Germany",
      },
    }, {
      foreign_employer_name: "Second Foreign Employer",
      country_code: "FR",
      currency: "EUR",
      compensation_amount: 80_000,
      compensation_usd: 100_000,
      compensation_owner_ssn: "111-22-3333",
      compensation_source_document_reference: secondWageReference,
      foreign_service_compensation_usd: 0,
      foreign_tax_paid_usd: 0,
    }],
  };
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    twoEmployerInputs,
    {
      taxYear: 2025,
      formType: "f1040",
    },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line1h_other_earned, 300_000);
  assertEquals(result.pending.schedule3?.line1_foreign_tax_credit, 2_000);
  const projected = form1116Pdf.projectFields?.(
    result.pending.form_1116!,
    result.pending,
  ) ?? {};
  assertEquals(projected.pdf_line3e_a, 300_000);
  assertEquals(projected.pdf_line3g_a, 7_350);
  assertEquals(projected.pdf_line7, 132_650);
  const filer = extractFilerIdentity(result.pending.f1040);
  const bundle = await buildMefBundle(buildPending(result.pending), {
    filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<AltBasisCompensationSourceStmt documentId=",
  );
  const altered = structuredClone(result.pending);
  (altered.fec as { fecs: Array<{ compensation_owner_ssn: string }> })
    .fecs[1].compensation_owner_ssn = "999-88-7777";
  assertThrows(
    () => form1116Pdf.projectFields?.(altered.form_1116!, altered),
    Error,
    "must match each sourced foreign-employer compensation item",
  );
  await assertRejects(
    () => buildMefBundle(buildPending(altered), { filer, attachments: [] }),
    Error,
    "employee's $250,000 threshold",
  );
});

Deno.test("three owner-matched foreign-employer wage records support one alternative compensation item", async () => {
  const threeEmployerInputs = {
    ...inputs,
    fec: [{
      ...inputs.fec[0],
      compensation_amount: 160_000,
      compensation_usd: 200_000,
      compensation_owner_ssn: "111-22-3333",
      compensation_source_document_reference: wageReference,
      alternative_compensation_sourcing: {
        ...alternative,
        compensation_item_total_usd: 200_000,
        alternative_us_source_usd: 60_000,
        ordinary_us_source_usd: 80_000,
        alternative_allocation_computation:
          "140000 of 200000 salary sourced to Germany",
      },
    }, {
      foreign_employer_name: "French Employer",
      country_code: "FR",
      compensation_amount: 40_000,
      compensation_usd: 50_000,
      compensation_owner_ssn: "111-22-3333",
      compensation_source_document_reference: "2025 French wage ledger",
      foreign_service_compensation_usd: 0,
      foreign_tax_paid_usd: 0,
    }, {
      foreign_employer_name: "Dutch Employer",
      country_code: "NL",
      compensation_amount: 40_000,
      compensation_usd: 50_000,
      compensation_owner_ssn: "111-22-3333",
      compensation_source_document_reference: "2025 Dutch wage ledger",
      foreign_service_compensation_usd: 0,
      foreign_tax_paid_usd: 0,
    }],
  };
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    threeEmployerInputs,
    {
      taxYear: 2025,
      formType: "f1040",
    },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line1h_other_earned, 300_000);
  assertEquals(result.pending.f1040?.line1z_total_wages, 300_000);
  assertEquals(result.pending.schedule3?.line1_foreign_tax_credit, 2_000);
  const projected = form1116Pdf.projectFields?.(
    result.pending.form_1116!,
    result.pending,
  ) ?? {};
  assertEquals(projected.pdf_line1a_a, 140_000);
  assertEquals(projected.pdf_line3e_a, 300_000);
  assertEquals(projected.pdf_line3g_a, 7_350);
  assertEquals(projected.pdf_line7, 132_650);
  const filer = extractFilerIdentity(result.pending.f1040);
  const bundle = await buildMefBundle(buildPending(result.pending), {
    filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<AltBasisCompensationSourceStmt documentId=",
  );
  assertStringIncludes(bundle.xml, "<BinaryAttachment documentId=");
  assertEquals(bundle.attachments.length, 1);
  assertEquals(
    (await PDFDocument.load(await buildPdfBytes(result.pending, filer)))
      .getPageCount() >= 4,
    true,
  );

  const wrongOwner = structuredClone(result.pending);
  (wrongOwner.fec as { fecs: Array<{ compensation_owner_ssn: string }> })
    .fecs[2].compensation_owner_ssn = "999-88-7777";
  assertThrows(
    () => form1116Pdf.projectFields?.(wrongOwner.form_1116!, wrongOwner),
    Error,
    "sourced foreign-employer compensation item",
  );
  await assertRejects(() =>
    buildMefBundle(buildPending(wrongOwner), { filer, attachments: [] })
  );
  await assertRejects(() => buildPdfBytes(wrongOwner, filer));

  const duplicateDocument = structuredClone(result.pending);
  (duplicateDocument.fec as {
    fecs: Array<{ compensation_source_document_reference: string }>;
  }).fecs[2].compensation_source_document_reference = "2025 French wage ledger";
  await assertRejects(() =>
    buildMefBundle(buildPending(duplicateDocument), { filer, attachments: [] })
  );
  assertThrows(
    () =>
      form1116Pdf.projectFields?.(
        duplicateDocument.form_1116!,
        duplicateDocument,
      ),
    Error,
    "sourced foreign-employer compensation item",
  );
});

for (
  const additionalWages of [
    [25_000, 25_000, 50_000],
    [25_000, 25_000, 25_000, 25_000],
    [20_000, 20_000, 20_000, 20_000, 20_000],
    [14_000, 14_000, 14_000, 14_000, 14_000, 14_000, 16_000],
  ]
) {
  Deno.test(`${additionalWages.length + 1} distinct same-owner foreign employers reconcile alternative compensation`, async () => {
    const owner = "111-22-3333";
    const employerInputs = {
      ...inputs,
      fec: [
        {
          ...inputs.fec[0],
          compensation_amount: 160_000,
          compensation_usd: 200_000,
          compensation_owner_ssn: owner,
          compensation_source_document_reference: wageReference,
          alternative_compensation_sourcing: {
            ...alternative,
            compensation_item_total_usd: 200_000,
            alternative_us_source_usd: 60_000,
            ordinary_us_source_usd: 80_000,
            alternative_allocation_computation:
              "140000 of 200000 salary sourced to Germany",
          },
        },
        ...additionalWages.map((amount, index) => ({
          foreign_employer_name: `Additional Foreign Employer ${index + 1}`,
          country_code: "FR",
          compensation_amount: amount,
          compensation_usd: amount,
          compensation_owner_ssn: owner,
          compensation_source_document_reference: `2025 additional employer ${
            index + 1
          } wage ledger`,
          foreign_service_compensation_usd: 0,
          foreign_tax_paid_usd: 0,
        })),
      ],
    };
    const result = execute(
      buildExecutionPlan(registry),
      registry,
      employerInputs,
      { taxYear: 2025, formType: "f1040" },
    );
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.f1040?.line1h_other_earned, 300_000);
    assertEquals(result.pending.f1040?.line1z_total_wages, 300_000);
    assertEquals(result.pending.schedule3?.line1_foreign_tax_credit, 2_000);
    const projected = form1116Pdf.projectFields?.(
      result.pending.form_1116!,
      result.pending,
    ) ?? {};
    assertEquals(projected.pdf_line1a_a, 140_000);
    assertEquals(projected.pdf_line3e_a, 300_000);
    assertEquals(projected.pdf_line3g_a, 7_350);
    assertEquals(projected.pdf_line7, 132_650);
    const filer = extractFilerIdentity(result.pending.f1040);
    const bundle = await buildMefBundle(buildPending(result.pending), {
      filer,
      attachments: [],
    });
    assertStringIncludes(
      bundle.xml,
      "<AltBasisCompensationSourceStmt documentId=",
    );
    assertEquals(bundle.attachments.length, 1);
    assertEquals(
      (await PDFDocument.load(await buildPdfBytes(result.pending, filer)))
        .getPageCount() >= 4,
      true,
    );

    const wrongOwner = structuredClone(result.pending);
    (wrongOwner.fec as { fecs: Array<{ compensation_owner_ssn: string }> })
      .fecs.at(-1)!.compensation_owner_ssn = "999-88-7777";
    assertThrows(
      () => form1116Pdf.projectFields?.(wrongOwner.form_1116!, wrongOwner),
      Error,
      "sourced foreign-employer compensation item",
    );
    await assertRejects(() =>
      buildMefBundle(buildPending(wrongOwner), { filer, attachments: [] })
    );

    const duplicateDocument = structuredClone(result.pending);
    (duplicateDocument.fec as {
      fecs: Array<{ compensation_source_document_reference: string }>;
    }).fecs.at(-1)!.compensation_source_document_reference =
      "2025 additional employer 1 wage ledger";
    assertThrows(
      () =>
        form1116Pdf.projectFields?.(
          duplicateDocument.form_1116!,
          duplicateDocument,
        ),
      Error,
      "sourced foreign-employer compensation item",
    );
    await assertRejects(() =>
      buildMefBundle(buildPending(duplicateDocument), {
        filer,
        attachments: [],
      })
    );

    const changedWage = structuredClone(result.pending);
    (changedWage.fec as { fecs: Array<{ compensation_usd: number }> })
      .fecs.at(-1)!.compensation_usd += 1;
    assertThrows(
      () => form1116Pdf.projectFields?.(changedWage.form_1116!, changedWage),
      Error,
      "standard-deduction, zero-carryover calculation",
    );
  });
}
