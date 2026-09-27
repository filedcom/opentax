import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  form1116 as form1116Node,
  IncomeCategory,
} from "../../../nodes/intermediate/forms/form_1116/index.ts";
import { form1116 } from "./f1116.ts";
import { form1116OtherDeductionsStatement } from "./f1116_other_deductions_statement.ts";

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
