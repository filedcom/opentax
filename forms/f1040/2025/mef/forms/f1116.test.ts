import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  form1116 as form1116Node,
  IncomeCategory,
} from "../../../nodes/intermediate/forms/form_1116/index.ts";
import { form1116 } from "./f1116.ts";
import { form1116OtherDeductionsStatement } from "./f1116_other_deductions_statement.ts";
import { form1116AlternativeCompensationStatement } from "./f1116_alternative_compensation_statement.ts";
import { assertAlternativeCompensationSources } from "./f1116_alternative_compensation_source.ts";
import {
  CONVERSION_EXPLANATION_DESCRIPTION,
  CONVERSION_EXPLANATION_FILE,
} from "./f1116_conversion_explanation.ts";
import { FilingStatus } from "../types.ts";
import { scheduleCLedger } from "../../../nodes/inputs/form1116_schedule_c_source/test-fixture.ts";

const passive = {
  category: IncomeCategory.Passive,
  items: [{
    foreign_tax_paid: 450,
    income_category: IncomeCategory.Passive,
    foreign_gross_income: 5_000,
    irs_country_code: "CA",
    tax_paid_or_accrued_date: "2025-11-01",
    tax_kind: ForeignTaxKind.Interest,
    tax_credit_method: ForeignTaxCreditMethod.Paid,
  }],
  foreignTaxPaid: 450,
  foreignGrossIncome: 5_000,
  includedForeignIncome: 5_000,
  directlyAllocableDeductions: 0,
  explicitlyApportionedDeductions: 0,
  automaticallyApportionedDeductions: 500,
  foreignTaxableIncome: 4_500,
  allowedCredit: 450,
  currentYearExcessTax: 0,
};

const fields = {
  category_summaries: [passive],
  total_income: 80_000,
  worldwide_gross_income: 100_000,
  general_deductions: 10_000,
  standard_or_itemized_deduction: 10_000,
  other_deductions: 0,
  us_tax_before_credits: 8_000,
};

Deno.test("Form 1116 MeF carries sourced Schedule K-3 reduction on line 12 and nets line 14", () => {
  const k3 = {
    partnership_ein: "123456789",
    k1_source_document_reference: "2025 partnership K-1",
    k3_source_document_reference: "2025 partnership K-3",
    part_ii_section_1_line_6_passive_interest: 5_000,
    part_ii_section_1_line_24_passive_total: 5_000,
    part_iii_section_4_line_1_foreign_tax: 450,
    part_iii_section_4_line_2_tax_reduction: 100,
    irs_country_code: "CA",
    tax_paid_date: "2025-11-01",
    foreign_tax_currency: {
      currency_code: "CAD",
      amount: 450,
      usd_per_foreign_unit: 1,
      source_document_reference: "2025 partnership K-3",
    },
    no_other_income_tax_or_reduction_on_k3_confirmed: true as const,
  };
  const k1 = {
    partnership_name: "Test Partnership",
    partnership_ein: "123456789",
    source_document_reference: "2025 partnership K-1",
    box5_interest: 5_000,
    box16_foreign_income: 5_000,
    box16_foreign_tax: 450,
    box16_foreign_income_category: IncomeCategory.Passive,
    box16_foreign_tax_irs_country_code: "CA",
    box16_foreign_tax_paid_or_accrued_date: "2025-11-01",
    box16_foreign_tax_kind: ForeignTaxKind.Interest,
    box16_foreign_tax_credit_method: ForeignTaxCreditMethod.Paid,
    schedule_k3_passive_interest: k3,
  };
  const context = {
    pending: {
      k1_partnership: { k1_partnerships: [k1] },
      schedule3: { line1_foreign_tax_credit: 350 },
    },
  };
  const reduced = {
    ...fields,
    category_summaries: [{
      ...passive,
      items: [{
        ...passive.items[0],
        schedule_k3_line12_reduction: {
          amount: 100,
          source_document_reference: "2025 partnership K-3",
        },
        foreign_income_source_document_reference: "2025 partnership K-3",
        foreign_tax_currency: k3.foreign_tax_currency,
        partnership_k3_passive_interest: k3,
      }],
      foreignTaxReduction: 100,
      allowedCredit: 350,
    }],
  };
  const xml = form1116.build(reduced, context)[0];
  assertStringIncludes(
    xml,
    "<TotalForeignTaxesPaidOrAccrAmt>450</TotalForeignTaxesPaidOrAccrAmt>",
  );
  assertStringIncludes(
    xml,
    "<ForeignGrossTaxPaidOrAccrAmt>450</ForeignGrossTaxPaidOrAccrAmt>",
  );
  assertStringIncludes(
    xml,
    "<ForeignTaxReductionAmt>100</ForeignTaxReductionAmt>",
  );
  assertStringIncludes(
    xml,
    "<ForeignTaxAvailableForCrRedAmt>350</ForeignTaxAvailableForCrRedAmt>",
  );
  assertStringIncludes(
    xml,
    "<GrossForeignTaxCreditAmt>350</GrossForeignTaxCreditAmt>",
  );
  assertThrows(
    () =>
      form1116.build({
        ...reduced,
        category_summaries: [{
          ...reduced.category_summaries[0],
          foreignTaxReduction: 99,
        }],
      }, context),
    Error,
    "category totals differ from source items",
  );
  assertThrows(
    () => form1116.build(reduced),
    Error,
    "matching partnership K-1 and K-3 source",
  );
  assertThrows(
    () =>
      form1116.build({
        ...reduced,
        category_summaries: [{
          ...reduced.category_summaries[0],
          items: [{
            ...reduced.category_summaries[0].items[0],
            partnership_k3_passive_interest: undefined,
          }],
        }],
      }, context),
    Error,
    "matching partnership K-1 and K-3 source",
  );
  assertThrows(
    () =>
      form1116.build(reduced, {
        pending: {
          k1_partnership: {
            k1_partnerships: [{ ...k1, box16_foreign_tax: 449 }],
          },
        },
      }),
    Error,
    "matching partnership K-1 and K-3 source",
  );
  assertThrows(
    () =>
      form1116.build({
        ...reduced,
        category_summaries: [{
          ...reduced.category_summaries[0],
          items: [{
            ...reduced.category_summaries[0].items[0],
            tax_reported_on_1099: true,
          }],
        }],
      }, context),
    Error,
    "matching partnership K-1 and K-3 source",
  );
  assertThrows(
    () =>
      form1116.build({
        ...reduced,
        category_summaries: [{
          ...reduced.category_summaries[0],
          items: [
            reduced.category_summaries[0].items[0],
            reduced.category_summaries[0].items[0],
          ],
        }],
      }, context),
    Error,
    "cannot be credited twice",
  );
});

Deno.test("Form 1116 MeF reconciles a sourced foreign-currency tax with USD category tax", () => {
  const withCurrency = {
    ...fields,
    category_summaries: [{
      ...passive,
      items: [{
        ...passive.items[0],
        foreign_tax_currency: {
          currency_code: "CAD",
          amount: 360,
          usd_per_foreign_unit: 1.25,
          source_document_reference: "Canadian tax receipt",
        },
      }],
    }],
  };
  assertStringIncludes(
    form1116.build(withCurrency)[0],
    "<TotalForeignTaxesPaidOrAccrAmt>450</TotalForeignTaxesPaidOrAccrAmt>",
  );
  assertThrows(
    () =>
      form1116.build({
        ...withCurrency,
        category_summaries: [{
          ...withCurrency.category_summaries[0],
          items: [{
            ...withCurrency.category_summaries[0].items[0],
            foreign_tax_currency: {
              ...withCurrency.category_summaries[0].items[0]
                .foreign_tax_currency,
              amount: 361,
            },
          }],
        }],
      }),
    Error,
    "does not convert",
  );
});

Deno.test("Form 1116 line 1b reconciles paid-tax currency and requires its linked explanation PDF", async () => {
  const alternative = {
    specific_compensation_description: "Consulting salary",
    alternative_allocation_basis: "Client project locations",
    alternative_allocation_computation:
      "140,000 of 300,000 salary sourced to Germany",
    geographical_comparison:
      "Project locations more accurately reflect service delivery than workdays",
    compensation_item_total_usd: 300_000,
    alternative_us_source_usd: 160_000,
    alternative_foreign_source_usd: 140_000,
    ordinary_us_source_usd: 180_000,
    ordinary_foreign_source_usd: 120_000,
    source_document_reference: "2025 employer project ledger",
  };
  const currency = {
    currency_code: "EUR",
    amount: 1_600,
    usd_per_foreign_unit: 1.25,
    conversion_date: "2025-12-01",
    conversion_rate_explanation:
      "Employer receipt shows the paid-date EUR/USD spot rate",
    source_document_reference: "2025 German wage-tax receipt",
  };
  const fecSource = {
    fecs: [{
      foreign_employer_name: "German Employer",
      country_code: "DE",
      compensation_amount: 300_000,
      compensation_usd: 300_000,
      foreign_tax_paid_usd: 2_000,
      foreign_service_compensation_usd: 140_000,
      foreign_tax_irs_country_code: "GM",
      foreign_tax_paid_or_accrued_date: "2025-12-01",
      foreign_tax_credit_method: ForeignTaxCreditMethod.Paid,
      foreign_tax_currency: currency,
      alternative_compensation_sourcing: alternative,
    }],
  };
  const calculated = form1116Node.compute(
    { taxYear: 2025, formType: "f1040" },
    {
      foreign_tax_items: [{
        foreign_tax_paid: 2_000,
        foreign_gross_income: 140_000,
        income_category: IncomeCategory.General,
        irs_country_code: "GM",
        tax_paid_or_accrued_date: "2025-12-01",
        tax_kind: ForeignTaxKind.Other,
        tax_credit_method: ForeignTaxCreditMethod.Paid,
        foreign_tax_currency: currency,
        foreign_income_source_document_reference:
          alternative.source_document_reference,
        alternative_compensation_sourcing: alternative,
      }],
      worldwide_taxable_income: 250_000,
      us_tax_before_credits: 50_000,
    },
  );
  const own = calculated.outputs.find((item) => item.nodeType === "form_1116");
  const formFields = own?.fields as Parameters<typeof form1116.build>[0];
  assertAlternativeCompensationSources(formFields.category_summaries ?? [], {
    pending: { fec: fecSource },
  });
  const filer = {
    primarySSN: "123456789",
    nameLine1: "TEST TAXPAYER",
    nameControl: "TEST",
    address: {
      line1: "1 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    filingStatus: FilingStatus.Single,
    softwareId: "12345678",
    originator: { efin: "123456", originatorType: "ERO" as const },
  };
  assertThrows(
    () =>
      form1116AlternativeCompensationStatement.build({}, {
        pending: { form_1116: formFields, fec: fecSource },
        filer,
      }),
    Error,
    "detailed explanation PDF attachment",
  );
  const attachment = (await form1116.buildBinaryAttachments!(formFields, {
    filer,
  }))[0];
  assertEquals(attachment.fileName, CONVERSION_EXPLANATION_FILE);
  assertEquals(attachment.description, CONVERSION_EXPLANATION_DESCRIPTION);
  assertEquals(attachment.bytes[0], 37);
  const linkedContext = {
    pending: {
      form_1116: formFields,
      fec: fecSource,
      schedule3: { line1_foreign_tax_credit: 2_000 },
    },
    filer,
    binaryAttachmentFileNames: [CONVERSION_EXPLANATION_FILE],
    attachmentDescriptionsByFileName: {
      [CONVERSION_EXPLANATION_FILE]: CONVERSION_EXPLANATION_DESCRIPTION,
    },
    documentIdsByAttachmentFileName: {
      [CONVERSION_EXPLANATION_FILE]: "BinaryAttachment1",
    },
    documentIdsByPendingKey: {
      form1116_alternative_compensation_statement: ["AltBasisStmt1"],
    },
  };
  assertStringIncludes(
    form1116AlternativeCompensationStatement.build({}, linkedContext),
    "<AltBasisCompensationSourceStmt>",
  );
  assertStringIncludes(
    form1116.build(formFields, linkedContext)[0],
    'referenceDocumentId="BinaryAttachment1"',
  );
  assertThrows(
    () =>
      form1116.build(formFields, {
        ...linkedContext,
        documentIdsByAttachmentFileName: undefined,
      }),
    Error,
    "not linked in the return bundle",
  );
  assertThrows(
    () =>
      form1116.build(formFields, {
        ...linkedContext,
        documentIdsByAttachmentFileName: {
          [CONVERSION_EXPLANATION_FILE]: "  ",
        },
      }),
    Error,
    "not linked in the return bundle",
  );
  assertThrows(
    () =>
      form1116AlternativeCompensationStatement.build({}, {
        pending: { form_1116: formFields },
        filer,
      }),
    Error,
    "needs the foreign-employer compensation source",
  );
  assertThrows(
    () =>
      form1116AlternativeCompensationStatement.build({}, {
        pending: {
          form_1116: formFields,
          fec: {
            fecs: [{
              ...fecSource.fecs[0],
              foreign_service_compensation_usd: 139_999,
            }],
          },
        },
        filer,
      }),
    Error,
    "source amounts must match",
  );
  assertThrows(
    () =>
      form1116AlternativeCompensationStatement.build({}, {
        pending: {
          form_1116: formFields,
          fec: {
            fecs: [{
              ...fecSource.fecs[0],
              foreign_tax_currency: { ...currency, amount: 1_599 },
            }],
          },
        },
        filer,
      }),
    Error,
    "source amounts must match",
  );
  assertThrows(
    () =>
      form1116AlternativeCompensationStatement.build({}, {
        pending: {
          form_1116: {
            ...formFields,
            category_summaries: formFields.category_summaries?.map((
              summary,
            ) => ({
              ...summary,
              items: summary.items.map((item) => ({
                ...item,
                foreign_gross_income: 139_999,
              })),
            })),
          },
          fec: fecSource,
        },
        filer,
      }),
    Error,
    "source amounts must match",
  );
  assertThrows(
    () =>
      form1116AlternativeCompensationStatement.build({}, {
        pending: {
          form_1116: {
            ...formFields,
            category_summaries: formFields.category_summaries?.map((
              summary,
            ) => ({
              ...summary,
              items: summary.items.map((item) => ({
                ...item,
                foreign_income_source_document_reference:
                  "unrelated employer ledger",
              })),
            })),
          },
          fec: fecSource,
        },
        filer,
      }),
    Error,
    "source amounts must match",
  );
  assertThrows(
    () =>
      form1116.build(formFields, {
        pending: { fec: fecSource },
        documentIdsByPendingKey: {
          form1116_alternative_compensation_statement: ["AltBasisStmt1"],
        },
      }),
    Error,
    "detailed explanation PDF attachment",
  );
  assertThrows(
    () =>
      form1116.build(formFields, {
        documentIdsByPendingKey: {
          form1116_alternative_compensation_statement: ["AltBasisStmt1"],
        },
      }),
    Error,
    "needs the foreign-employer compensation source",
  );
  assertThrows(
    () =>
      form1116.build(formFields, {
        pending: {
          fec: {
            fecs: [{
              ...fecSource.fecs[0],
              foreign_service_compensation_usd: 139_999,
            }],
          },
        },
        documentIdsByPendingKey: {
          form1116_alternative_compensation_statement: ["AltBasisStmt1"],
        },
      }),
    Error,
    "source amounts must match",
  );
});

Deno.test("Form 1116 MeF rejects a disclosed redetermination without native Schedule C", () => {
  assertThrows(
    () =>
      form1116.build({
        foreign_tax_redeterminations: [scheduleCLedger()],
      }),
    Error,
    "needs native Schedule C",
  );
});

Deno.test("Form 1116 MeF cannot serialize a multi-category redetermination as its parent form", () => {
  assertThrows(
    () =>
      form1116.build({
        foreign_tax_redeterminations: [
          scheduleCLedger(),
          scheduleCLedger(IncomeCategory.General, "additional_accrued_tax"),
        ],
        category_summaries: [passive],
      }),
    Error,
    "needs native Schedule C",
  );
});

Deno.test("Form 1116 limitation inputs alone do not create a form", () => {
  assertEquals(
    form1116.build({ total_income: 80_000, us_tax_before_credits: 8_000 }),
    [],
  );
});

Deno.test("Form 1116 refuses an aggregate foreign tax without source details", () => {
  assertThrows(
    () => form1116.build({ foreign_tax_paid: 500 }),
    Error,
    "category calculation details",
  );
});

Deno.test("Form 1116 uses the IRS passive category and actual limitation tags", () => {
  const [xml] = form1116.build(fields);
  assertStringIncludes(
    xml,
    "<ForeignIncPassiveCategoryInd>X</ForeignIncPassiveCategoryInd>",
  );
  assertStringIncludes(xml, "<ForeignCountryCd>CA</ForeignCountryCd>");
  assertStringIncludes(
    xml,
    "<ForeignGrossIncomeAmt>5000</ForeignGrossIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<ItemizedOrStandardDeductionAmt>10000</ItemizedOrStandardDeductionAmt>",
  );
  assertStringIncludes(
    xml,
    "<ProRataDeductionsNotRelatedAmt>500</ProRataDeductionsNotRelatedAmt>",
  );
  assertStringIncludes(
    xml,
    "<MaxAllowedForeignTaxCreditAmt>450</MaxAllowedForeignTaxCreditAmt>",
  );
  assertStringIncludes(xml, "<ForeignTaxCreditAmt>450</ForeignTaxCreditAmt>");
});

Deno.test("Form 1116 MeF line 18 carries the computed senior addback", () => {
  const calculated = form1116Node.compute(
    { taxYear: 2025, formType: "f1040" },
    {
      foreign_tax_items: [{
        foreign_tax_paid: 870,
        foreign_gross_income: 10_000,
        income_category: IncomeCategory.Passive,
        irs_country_code: "CA",
        tax_paid_or_accrued_date: "2025-11-01",
        tax_kind: ForeignTaxKind.Interest,
        tax_credit_method: ForeignTaxCreditMethod.Paid,
      }],
      worldwide_taxable_income: 40_000,
      enhanced_senior_deduction: 6_000,
      us_tax_before_credits: 4_000,
    },
  );
  const formFields = calculated.outputs.find((item) =>
    item.nodeType === "form_1116"
  )?.fields;
  const [xml] = form1116.build(
    (formFields ?? {}) as Parameters<typeof form1116.build>[0],
  );
  assertStringIncludes(
    xml,
    "<ForeignTxblIncomeAftrExemptAmt>46000</ForeignTxblIncomeAftrExemptAmt>",
  );
  assertStringIncludes(xml, "<TaxFromTaxReturnAmt>4000</TaxFromTaxReturnAmt>");
  assertStringIncludes(
    xml,
    "<GrossForeignTaxCreditAmt>870</GrossForeignTaxCreditAmt>",
  );
});

Deno.test("Form 1116 MeF places documented vehicle interest on line 4b, not 3b", () => {
  const calculated = form1116Node.compute(
    { taxYear: 2025, formType: "f1040" },
    {
      foreign_tax_items: [{
        foreign_tax_paid: 1_880,
        foreign_gross_income: 20_000,
        income_category: IncomeCategory.Passive,
        irs_country_code: "CA",
        tax_paid_or_accrued_date: "2025-11-01",
        tax_kind: ForeignTaxKind.Interest,
        tax_credit_method: ForeignTaxCreditMethod.Paid,
      }],
      qualified_vehicle_loan_interest_deduction: 2_000,
      vehicle_interest_asset_method: {
        all_assets_included_verified: true,
        assets: [
          {
            asset_id: "US-stock",
            source_document_reference: "2025 broker tax-basis statement US",
            beginning_tax_book_value: 40_000,
            ending_tax_book_value: 40_000,
            income_source: "us",
          },
          {
            asset_id: "CA-stock",
            source_document_reference: "2025 broker tax-basis statement CA",
            beginning_tax_book_value: 60_000,
            ending_tax_book_value: 60_000,
            income_source: "foreign",
            income_category: IncomeCategory.Passive,
            irs_country_code: "CA",
          },
        ],
      },
      worldwide_taxable_income: 50_000,
      us_tax_before_credits: 5_000,
    },
  );
  const formFields = calculated.outputs.find((item) =>
    item.nodeType === "form_1116"
  )?.fields;
  const [xml] = form1116.build(
    (formFields ?? {}) as Parameters<typeof form1116.build>[0],
  );
  assertStringIncludes(
    xml,
    "<ApportionedOtherInterestExpAmt>1200</ApportionedOtherInterestExpAmt>",
  );
  assertStringIncludes(
    xml,
    "<ForeignIncNetDeductAndLossAmt>1200</ForeignIncNetDeductAndLossAmt>",
  );
  assertEquals(xml.includes("<OtherDeductionsNotRelatedAmt>"), false);
});

Deno.test("Form 1116 source details must reconcile with category totals", () => {
  assertThrows(
    () =>
      form1116.build({
        ...fields,
        category_summaries: [{ ...passive, foreignTaxPaid: 400 }],
      }),
    Error,
    "totals differ",
  );
});

Deno.test("Form 1116 never emits unsupported direct expenses without their statement", () => {
  assertThrows(
    () =>
      form1116.build({
        ...fields,
        category_summaries: [{
          ...passive,
          items: [{
            ...passive.items[0],
            foreign_tax_paid: 440,
            directly_allocable_deductions: 100,
          }],
          foreignTaxPaid: 440,
          directlyAllocableDeductions: 100,
          foreignTaxableIncome: 4_400,
          allowedCredit: 440,
          currentYearExcessTax: 0,
        }],
      }),
    Error,
    "supporting statement",
  );
});

Deno.test("Form 1116 line 3b uses a linked source-specific deductions statement", () => {
  const withOther = {
    ...fields,
    standard_or_itemized_deduction: 8_000,
    other_deductions: 2_000,
    other_deductions_explanation:
      "Student loan interest adjustment $1,000; IRA deduction $1,000",
  };
  const statement = form1116OtherDeductionsStatement.build({}, {
    pending: { form_1116: withOther },
  });
  assertStringIncludes(
    statement,
    "<OtherDeductionsNotRelatedStmt>",
  );
  assertStringIncludes(statement, "Student loan interest adjustment");
  const [xml] = form1116.build(withOther, {
    documentIdsByPendingKey: {
      form1116_other_deductions_statement: ["STMT1"],
    },
  });
  assertStringIncludes(
    xml,
    '<OtherDeductionsNotRelatedAmt referenceDocumentId="STMT1" referenceDocumentName="OtherDeductionsNotRelatedStatement">2000</OtherDeductionsNotRelatedAmt>',
  );
});

Deno.test("Form 1116 other-deductions statement omits return context without a credit claim", () => {
  assertEquals(form1116OtherDeductionsStatement.build({}, {
    pending: { form_1116: { other_deductions: 5_652 } },
  }), "");
  assertThrows(() => form1116OtherDeductionsStatement.build({}, {
    pending: {
      form_1116: { ...fields, other_deductions: 2_000 },
    },
  }), Error, "need a source explanation");
});

Deno.test("Form 1116 line 3b rejects a missing explanation or missing linked document", () => {
  const withOther = {
    ...fields,
    standard_or_itemized_deduction: 8_000,
    other_deductions: 2_000,
  };
  assertThrows(
    () => form1116.build(withOther),
    Error,
    "source explanation",
  );
  assertThrows(
    () =>
      form1116OtherDeductionsStatement.build({}, {
        pending: { form_1116: withOther },
      }),
    Error,
    "source explanation",
  );
  assertThrows(
    () =>
      form1116.build({
        ...withOther,
        other_deductions_explanation: "IRA deduction $2,000",
      }, { documentIdsByPendingKey: {} }),
    Error,
    "statement count",
  );
});
