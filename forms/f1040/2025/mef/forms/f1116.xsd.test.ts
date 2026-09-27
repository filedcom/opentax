import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../registry.ts";
import {
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  form1116 as form1116Node,
  IncomeCategory,
} from "../../../nodes/intermediate/forms/form_1116/index.ts";
import { buildMefXml } from "../builder.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { form1116 } from "./f1116.ts";

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The local IRS schema bundle is optional in CI.
}

const filer: FilerIdentity = {
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

const sourceItems = [
  {
    foreign_tax_paid: 500,
    foreign_gross_income: 5_000,
    income_category: IncomeCategory.Passive,
    irs_country_code: "CA",
    tax_paid_or_accrued_date: "2025-11-01",
    tax_kind: ForeignTaxKind.Interest,
    tax_credit_method: ForeignTaxCreditMethod.Paid,
  },
  {
    foreign_tax_paid: 2_000,
    foreign_gross_income: 10_000,
    income_category: IncomeCategory.General,
    irs_country_code: "GM",
    tax_paid_or_accrued_date: "2025-10-01",
    tax_kind: ForeignTaxKind.Other,
    tax_credit_method: ForeignTaxCreditMethod.Paid,
  },
];

function computedFields() {
  const result = form1116Node.compute(
    { taxYear: 2025, formType: "f1040" },
    {
      foreign_tax_items: sourceItems,
      worldwide_gross_income: 100_000,
      general_deductions: 10_000,
      standard_or_itemized_deduction: 10_000,
      worldwide_taxable_income: 80_000,
      us_tax_before_credits: 8_000,
    },
  );
  const own = result.outputs.find((item) => item.nodeType === "form_1116");
  if (!own) throw new Error("Form 1116 calculation did not retain its details");
  return own.fields as Parameters<typeof form1116.build>[0];
}

async function validateXsd(xml: string): Promise<void> {
  const tmpPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(tmpPath, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, tmpPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(tmpPath);
  }
}

Deno.test("Form 1116 keeps category credits separate and caps the total", () => {
  const fields = computedFields();
  assertEquals(fields.category_summaries?.map((item) => item.allowedCredit), [
    450,
    900,
  ]);
  const fragments = form1116.build(fields);
  assertEquals(fragments.length, 2);
  assertStringIncludes(
    fragments[1],
    "<ForeignGeneralIncTaxCreditAmt>900</ForeignGeneralIncTaxCreditAmt>",
  );
  assertStringIncludes(
    fragments[1],
    "<TentativeForeignTaxCreditAmt>1350</TentativeForeignTaxCreditAmt>",
  );
});

Deno.test("Form 1116 source edges remain acyclic before credit calculation", () => {
  const plan = buildExecutionPlan(registry).map((step) => step.nodeType);
  assertEquals(
    plan.indexOf("income_tax_calculation") < plan.indexOf("form_1116"),
    true,
  );
  assertEquals(
    plan.indexOf("form1116_review") < plan.indexOf("form_1116"),
    true,
  );
  assertEquals(plan.indexOf("form_1116") < plan.indexOf("f1040"), true);
});

Deno.test({
  name:
    "XSD: domestic qualified dividends adjust Form 1116 line 18 from return sources",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    w2: [{
      box1_wages: 100_000,
      box2_fed_withheld: 12_000,
      box3_ss_wages: 100_000,
      box4_ss_withheld: 6_200,
      box5_medicare_wages: 100_000,
      box6_medicare_withheld: 1_450,
      employer_ein: "12-3456789",
      employer_name: "ACME Corp",
      employer_address_line1: "100 Main St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box12_entries: [],
    }],
    f1099div: [{
      payerName: "U.S. Fund",
      isNominee: false,
      box11: false,
      box1a: 20_000,
      box1b: 20_000,
    }],
    f1099int: [{
      payer_name: "Canadian Bank",
      box1: 1_000,
      box6: 100,
      box7: "Canada",
      foreign_source_interest_usd: 1_000,
      foreign_tax_irs_country_code: "CA",
    }],
    form1116_review: {
      all_foreign_sources_reviewed: true,
      foreign_qualified_dividends: 0,
      foreign_capital_gains_or_losses_present: false,
      source_document_references: [
        "2025 domestic 1099-DIV, Canadian 1099-INT, and brokerage review",
      ],
      no_amt_liability_verified: true,
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const fields = result.pending.form_1116 as Record<string, unknown>;
  const adjusted = fields.total_income as number;
  const raw = result.pending.f1040?.line15_taxable_income as number;
  assertEquals(adjusted < raw, true);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(
    xml,
    `<ForeignTxblIncomeAftrExemptAmt>${adjusted}</ForeignTxblIncomeAftrExemptAmt>`,
  );
  await validateXsd(xml);
});

Deno.test("Form 1116 rejects missing source facts and stale aggregate data", () => {
  assertThrows(
    () => form1116.build({ foreign_tax_paid: 500 }),
    Error,
    "category calculation details",
  );
  const fields = computedFields();
  const summaries = fields.category_summaries ?? [];
  assertThrows(
    () =>
      form1116.build({
        ...fields,
        category_summaries: [{
          ...summaries[0],
          items: [{ ...summaries[0].items[0], irs_country_code: undefined }],
        }],
      }),
    Error,
    "source country",
  );
});

Deno.test({
  name: "XSD: two Form 1116 categories are separate valid MeF documents",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    form_1116: computedFields(),
    schedule3: { line1_total: 1_350 },
  }, filer);
  assertEquals([...xml.matchAll(/<IRS1116 documentId=/g)].length, 2);
  assertStringIncludes(
    xml,
    "<ForeignPassiveIncTaxCreditAmt>450</ForeignPassiveIncTaxCreditAmt>",
  );
  assertStringIncludes(
    xml,
    "<ForeignGeneralIncTaxCreditAmt>900</ForeignGeneralIncTaxCreditAmt>",
  );
  assertStringIncludes(xml, 'referenceDocumentId="IRS1116');
  await validateXsd(xml);
});

Deno.test({
  name:
    "XSD: Form 1116 direct foreign expense has a linked explanation statement",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const fields = computedFields();
  const [passive, general] = fields.category_summaries ?? [];
  const withExpense = {
    ...fields,
    category_summaries: [{
      ...passive,
      items: [{
        ...passive.items[0],
        directly_allocable_deductions: 100,
        direct_expense_explanation:
          "Custody fee directly attributable to Canadian interest",
      }],
      directlyAllocableDeductions: 100,
      foreignTaxableIncome: 4_400,
      allowedCredit: 440,
    }, general],
  };
  const xml = buildMefXml({
    form_1116: withExpense,
    schedule3: { line1_total: 1_340 },
  }, filer);
  const statementId = /<ForeignIncmRelatedExpensesStmt documentId="([^"]+)"/
    .exec(xml)?.[1];
  assertEquals(typeof statementId, "string");
  assertStringIncludes(
    xml,
    `<ForeignIncRelatedExpensesAmt referenceDocumentId="${statementId}" referenceDocumentName="ForeignIncmRelatedExpensesStmt">100</ForeignIncRelatedExpensesAmt>`,
  );
  assertStringIncludes(
    xml,
    "Custody fee directly attributable to Canadian interest",
  );
  await validateXsd(xml);
});

Deno.test({
  name: "XSD: Form 1116 line 3b links its other-deductions statement",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    form_1116: {
      ...computedFields(),
      standard_or_itemized_deduction: 8_000,
      other_deductions: 2_000,
      other_deductions_explanation:
        "Student loan interest adjustment $1,000; IRA deduction $1,000",
    },
    schedule3: { line1_total: 1_350 },
  }, filer);
  const statementId = /<OtherDeductionsNotRelatedStmt documentId="([^"]+)"/
    .exec(xml)?.[1];
  assertEquals(typeof statementId, "string");
  assertStringIncludes(
    xml,
    `<OtherDeductionsNotRelatedAmt referenceDocumentId="${statementId}" referenceDocumentName="OtherDeductionsNotRelatedStatement">2000</OtherDeductionsNotRelatedAmt>`,
  );
  assertStringIncludes(xml, "Student loan interest adjustment");
  await validateXsd(xml);
});

Deno.test({
  name:
    "XSD: foreign-employer tax reaches Form 1116 and Schedule 3 through the graph",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    fec: [{
      foreign_employer_name: "German Employer GmbH",
      country_code: "DE",
      foreign_tax_irs_country_code: "GM",
      compensation_amount: 60_000,
      compensation_usd: 60_000,
      foreign_service_compensation_usd: 60_000,
      foreign_tax_paid_usd: 3_000,
      foreign_tax_paid_or_accrued_date: "2025-11-01",
      foreign_tax_credit_method: ForeignTaxCreditMethod.Paid,
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(xml, "<ForeignCountryCd>GM</ForeignCountryCd>");
  assertStringIncludes(
    xml,
    "<ForeignGeneralIncTaxCreditAmt>3000</ForeignGeneralIncTaxCreditAmt>",
  );
  assertStringIncludes(
    xml,
    '<ForeignTaxCreditAmt referenceDocumentId="IRS1116',
  );
  await validateXsd(xml);
});

Deno.test({
  name:
    "XSD: 1099 interest and dividends from one country share a Form 1116 source",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    w2: [{
      box1_wages: 100_000,
      box2_fed_withheld: 12_000,
      box3_ss_wages: 100_000,
      box4_ss_withheld: 6_200,
      box5_medicare_wages: 100_000,
      box6_medicare_withheld: 1_450,
      employer_ein: "12-3456789",
      employer_name: "ACME Corp",
      employer_address_line1: "100 Main St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box12_entries: [],
    }],
    f1099int: [{
      payer_name: "Canadian Bank",
      box1: 1_000,
      box6: 100,
      box7: "Canada",
      foreign_source_interest_usd: 1_000,
      foreign_tax_irs_country_code: "CA",
    }],
    f1099div: [{
      payerName: "Canadian Fund",
      isNominee: false,
      box11: false,
      box1a: 1_000,
      box7: 100,
      box8: "Canada",
      foreign_source_dividends_usd: 1_000,
      foreign_tax_irs_country_code: "CA",
      holdingPeriodDays: 20,
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(result.pending, filer);
  assertEquals([...xml.matchAll(/<ForeignTaxCreditSource>/g)].length, 1);
  assertStringIncludes(
    xml,
    "<ForeignTaxSpecialTypeCd>1099 TAX</ForeignTaxSpecialTypeCd>",
  );
  assertStringIncludes(
    xml,
    "<USTaxWithheldOnDividendAmt>100</USTaxWithheldOnDividendAmt>",
  );
  assertStringIncludes(
    xml,
    "<USTaxWithheldOnInterestAmt>100</USTaxWithheldOnInterestAmt>",
  );
  await validateXsd(xml);
});

Deno.test({
  name:
    "XSD: trust K-1 foreign tax statement reaches Form 1116 through the graph",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    w2: [{
      box1_wages: 100_000,
      box2_fed_withheld: 12_000,
      box3_ss_wages: 100_000,
      box4_ss_withheld: 6_200,
      box5_medicare_wages: 100_000,
      box6_medicare_withheld: 1_450,
      employer_ein: "12-3456789",
      employer_name: "ACME Corp",
      employer_address_line1: "100 Main St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box12_entries: [],
    }],
    k1_trust: [{
      estate_trust_name: "Test Trust",
      box1_interest: 1_000,
      box14_foreign_tax: 100,
      box14_foreign_income: 1_000,
      box14_foreign_income_category: IncomeCategory.Passive,
      box14_foreign_tax_irs_country_code: "CA",
      box14_foreign_tax_paid_or_accrued_date: "2025-08-03",
      box14_foreign_tax_kind: ForeignTaxKind.Interest,
      box14_foreign_tax_credit_method: ForeignTaxCreditMethod.Paid,
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(xml, "<ForeignCountryCd>CA</ForeignCountryCd>");
  assertStringIncludes(
    xml,
    "<USTaxWithheldOnInterestAmt>100</USTaxWithheldOnInterestAmt>",
  );
  assertStringIncludes(
    xml,
    '<ForeignTaxCreditAmt referenceDocumentId="IRS1116',
  );
  await validateXsd(xml);
});
