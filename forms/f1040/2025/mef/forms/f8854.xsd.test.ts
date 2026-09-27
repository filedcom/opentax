import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildMefXml } from "../builder.ts";
import { buildPending } from "../pending.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../registry.ts";
import { buildForm8854Annual } from "./f8854_annual.ts";
import { buildForm8854InitialBundle } from "./f8854_initial.ts";
import { form8854 } from "./f8854.ts";
import {
  ExpatriateType,
  inputSchema as initialSchema,
} from "../../../nodes/inputs/f8854/index.ts";
import { annualInputSchema } from "../../../nodes/inputs/f8854/annual.ts";
import { ReportedFormCode } from "../../../nodes/inputs/f8854/section-c.ts";

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Common/IRS8854/IRS8854.xsd",
  import.meta.url,
).pathname;

let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The IRS schema bundle is local-only.
}

const partI = {
  mailing_address: {
    kind: "US" as const,
    line1: "1 Main St",
    city: "Wilmington",
    state: "DE",
    zip: "19801",
  },
  telephone: { kind: "US" as const, number: "3025550123" },
  notification: {
    kind: "CITIZEN_STATE_DEPARTMENT" as const,
    date: "2025-06-15",
  },
  citizenships: [{ country_code: "US", acquired_date: "1980-01-01" }],
  us_citizenship_acquisition: "BIRTH" as const,
};

const filer: FilerIdentity = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

const noncoveredInput = initialSchema.parse({
  expatriation_date: "2025-06-15",
  expatriate_type: ExpatriateType.CITIZEN,
  part_i: partI,
  prior_year_us_income_tax_less_foreign_tax_credit: {
    year_2024: 0,
    year_2023: 0,
    year_2022: 0,
    year_2021: 0,
    year_2020: 0,
  },
  balance_sheet: {
    asset_categories_confirmed_complete: true,
    liabilities_confirmed_complete: true,
    cash_and_bank_deposits: {
      fair_market_value: 100_000,
      us_adjusted_basis: 100_000,
    },
    foreign_cfc_securities_within_line5: [],
    partnership_interests: [],
    owned_trust_assets: [],
    nongrantor_trust_interests: [],
    other_assets: [],
    installment_obligations_liability: 0,
    mortgage_liability: 0,
    other_liabilities: [],
  },
  certified_tax_compliance: true,
  exception_facts: { dual_citizen: null, minor: null },
  significant_asset_liability_changes_prior_5_years: false,
  section_c: null,
  section_d: { elect_deferral: false },
});

const statementInput = initialSchema.parse({
  ...noncoveredInput,
  significant_asset_liability_changes_prior_5_years: true,
  significant_change_explanation: "Partnership interest acquired.",
  balance_sheet: {
    ...noncoveredInput.balance_sheet,
    partnership_interests: [{
      partnership_name: "Example Partnership",
      fair_market_value: 100,
      us_adjusted_basis: 50,
    }],
    other_liabilities: [{ description: "Loan", amount: 20 }],
  },
});

const annualNoActivityInput = annualInputSchema.parse({
  expatriation_date: "2020-06-15",
  expatriate_type: ExpatriateType.CITIZEN,
  part_i: {
    ...partI,
    notification: {
      kind: "CITIZEN_STATE_DEPARTMENT",
      date: "2020-06-15",
    },
  },
  prior_form8854_obligations_confirmed_complete: true,
  deferred_properties: [{
    item_id: "stock",
    description: "Stock holding",
    prior_form8854_document_id: "DOC-PRIOR",
    prior_mark_to_market_gain_or_loss_amount: 111_000,
    prior_deferred_tax_amount: 50_000,
    disposition: { disposed_in_2025: false },
  }],
  eligible_deferred_compensation_items: [],
  nongrantor_trust_interests: [],
});

function withNamespace(xml: string): string {
  return xml.replace(
    "<IRS8854",
    '<IRS8854 documentId="IRS88540" xmlns="http://www.irs.gov/efile"',
  );
}

async function validate8854(xml: string): Promise<void> {
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, withNamespace(xml));
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
}

Deno.test("noncovered initial Form 8854 is attached to the Form 1040 return", () => {
  const xml = buildMefXml({
    f1040: { filing_status: "single" },
    f8854: noncoveredInput,
  }, filer);
  assertStringIncludes(xml, "<IRS8854 documentId=");
  assertStringIncludes(
    xml,
    "<InitialExptrtStmtSpcfdYrInd>X</InitialExptrtStmtSpcfdYrInd>",
  );
});

Deno.test("registered Form 8854 path refuses covered cases", () => {
  assertThrows(
    () =>
      form8854.build({
        ...noncoveredInput,
        balance_sheet: {
          ...noncoveredInput.balance_sheet,
          cash_and_bank_deposits: {
            fair_market_value: 2_000_000,
            us_adjusted_basis: 2_000_000,
          },
        },
      }),
    Error,
    "reconciled income forms and attachments",
  );
});

Deno.test("noncovered Form 8854 links its actual native statements in schema order", () => {
  const xml = buildMefXml({
    f1040: { filing_status: "single" },
    f8854: statementInput,
  }, filer);
  assertStringIncludes(xml, "<IRS8854 documentId=");
  assertStringIncludes(xml, "<ChangePrePostExptrtDateStmt documentId=");
  assertStringIncludes(xml, "<OtherLiabilitiesStatement documentId=");
  assertStringIncludes(xml, "<PartnershipInterestStatement documentId=");
  assertEquals(
    xml.indexOf("<ChangePrePostExptrtDateStmt documentId=") <
      xml.indexOf("<OtherLiabilitiesStatement documentId="),
    true,
  );
  assertEquals(
    xml.indexOf("<OtherLiabilitiesStatement documentId=") <
      xml.indexOf("<PartnershipInterestStatement documentId="),
    true,
  );
});

Deno.test("Form 8854 linking refuses a changed native statement set", () => {
  assertThrows(
    () =>
      form8854.build(statementInput, {
        pending: { f8854: statementInput },
        documentIdsByPendingKey: { f8854_native_statements: [] },
      }),
    Error,
    "statement set changed",
  );
});

Deno.test("annual Form 8854 no-activity certification is attached to Form 1040", () => {
  const xml = buildMefXml({
    f1040: { filing_status: "single" },
    f8854_annual: annualNoActivityInput,
  }, filer);
  assertStringIncludes(xml, "<IRS8854 documentId=");
  assertStringIncludes(
    xml,
    "<AnnualExptrtStmtBfrSpcfdYrInd>X</AnnualExptrtStmtBfrSpcfdYrInd>",
  );
});

Deno.test("annual Form 8854 source reaches the filed return through the graph", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Test Way",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    f8854_annual: annualNoActivityInput,
  }, { taxYear: 2025, formType: "f1040" });
  const xml = buildMefXml(buildPending(result.pending), filer);
  assertStringIncludes(xml, "<IRS8854 documentId=");
  assertStringIncludes(xml, "<AnnualExptrtStmtBfrSpcfdYrGrp>");
});

Deno.test("annual Form 8854 descriptor refuses an unreported disposition", () => {
  assertThrows(
    () =>
      buildMefXml({
        f1040: { filing_status: "single" },
        f8854_annual: {
          ...annualNoActivityInput,
          deferred_properties: [{
            ...annualNoActivityInput.deferred_properties[0],
            disposition: {
              disposed_in_2025: true,
              disposition_date: "2025-05-20",
              reported_transaction_id: "TX-STOCK",
              deferred_tax_and_interest_payment_document_id: "DOC-PAYMENT",
            },
          }],
        },
      }, filer),
    Error,
    "reconciled 2025 reporting and payment evidence",
  );
});

Deno.test("Form 8854 refuses ambiguous initial and annual statements for one filer", () => {
  assertThrows(
    () =>
      buildMefXml({
        f1040: { filing_status: "single" },
        f8854: noncoveredInput,
        f8854_annual: annualNoActivityInput,
      }, filer),
    Error,
    "cannot file both initial and annual Form 8854",
  );
});

Deno.test({
  name: "XSD: noncovered initial Form 8854 in a full Form 1040 return",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildMefXml({
    f1040: { filing_status: "single" },
    f8854: noncoveredInput,
  }, filer);
  const xsd = new URL(
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
});

Deno.test({
  name: "XSD: noncovered Form 8854 with linked native statements",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildMefXml({
    f1040: { filing_status: "single" },
    f8854: statementInput,
  }, filer);
  const xsd = new URL(
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
});

Deno.test({
  name: "XSD: initial Form 8854 with identified Form 8949 deemed sale",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const input = initialSchema.parse({
    expatriation_date: "2025-06-15",
    expatriate_type: ExpatriateType.CITIZEN,
    part_i: partI,
    prior_year_us_income_tax_less_foreign_tax_credit: {
      year_2024: 0,
      year_2023: 0,
      year_2022: 0,
      year_2021: 0,
      year_2020: 0,
    },
    balance_sheet: {
      asset_categories_confirmed_complete: true,
      liabilities_confirmed_complete: true,
      cash_and_bank_deposits: {
        fair_market_value: 1_000_000,
        us_adjusted_basis: 1_000_000,
      },
      marketable_us_securities: {
        fair_market_value: 1_000_000,
        us_adjusted_basis: 100_000,
      },
      foreign_cfc_securities_within_line5: [],
      partnership_interests: [],
      owned_trust_assets: [],
      nongrantor_trust_interests: [],
      other_assets: [],
      installment_obligations_liability: 0,
      mortgage_liability: 0,
      other_liabilities: [],
    },
    certified_tax_compliance: true,
    exception_facts: { dual_citizen: null, minor: null },
    significant_asset_liability_changes_prior_5_years: false,
    section_c: {
      property_inventory_confirmed_complete: true,
      mark_to_market_assets: [{
        item_id: "stock",
        description: "100 shares of stock",
        fmv_day_before_expatriation: 1_000_000,
        us_adjusted_basis: 100_000,
        basis_irrevocable_election_h2: false,
        reported_form_code: ReportedFormCode.Form8949,
        reported_transaction_id: "TX-STOCK",
      }],
      eligible_deferred_compensation: [],
      ineligible_deferred_compensation: [],
      specified_tax_deferred_accounts: [],
      nongrantor_trust_interests: [],
    },
    section_d: { elect_deferral: false },
  });
  const bundle = buildForm8854InitialBundle(input, {
    balanceSheet: {},
    sectionC: { computation: "DOC-COMP" },
    binaryAttachments: [],
  }, {
    form8949: [{
      part: "F",
      description: "100 shares of stock",
      source_transaction_id: "TX-STOCK",
      date_acquired: "2020-01-01",
      date_sold: "2025-06-14",
      proceeds: 1_000_000,
      cost_basis: 100_000,
      adjustment_codes: "O",
      adjustment_amount: -890_000,
      gain_loss: 10_000,
      is_long_term: true,
    }],
  });
  await validate8854(bundle.formXml);
});

Deno.test({
  name: "XSD: annual Form 8854 with prior deferred property",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  await validate8854(buildForm8854Annual(annualNoActivityInput));
});

Deno.test({
  name: "XSD: annual no-activity Form 8854 in a full Form 1040 return",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildMefXml({
    f1040: { filing_status: "single" },
    f8854_annual: annualNoActivityInput,
  }, filer);
  const xsd = new URL(
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
});
