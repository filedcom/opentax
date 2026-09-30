import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { itemSchema } from "../../../nodes/inputs/f8915f/index.ts";
import { buildCurrentYearDistributionForm8915F } from "./f8915f.ts";

const item = itemSchema.parse({
  retirement_source_kind: "plan",
  owner: "T",
  recipient_ssn: "111223333",
  fema_number: "DR-4871-TX",
  disaster_begin_date: "2025-03-26",
  disaster_declaration_date: "2025-05-21",
  distribution_date: "2025-06-01",
  qualified_area_home_review_reference: "reviewed principal home in Texas",
  economic_loss_review_reference: "reviewed 2025 flood loss",
  eligible_retirement_source_review_reference:
    "reviewed eligible employer plan",
  no_prior_distributions_review_reference: "reviewed 2025 disaster ledger",
  no_repayments_review_reference: "reviewed retirement repayment ledger",
  source_1099r_document_reference: "issued 2025 1099-R account 123",
  source_1099r_payer_ein: "123456789",
  source_1099r_account_number: "123",
  gross_distribution: 20_000,
  taxable_distribution: 20_000,
  full_inclusion_elected: true,
});
const filer = {
  primarySSN: "111223333",
  nameLine1: "EXAMPLE ALEX",
  fullName: "Alex Example",
  nameControl: "EXAM",
  filingStatus: FilingStatus.Single,
  address: {
    line1: "1 EXAMPLE WAY",
    city: "AUSTIN",
    state: "TX",
    zip: "78701",
  },
};
const pending = {
  f1099r: {
    f1099rs: [{
      payer_name: "Example Plan",
      payer_ein: "12-3456789",
      account_number: "123",
      source_document_reference: "issued 2025 1099-R account 123",
      ts: "T",
      box1_gross_distribution: 20_000,
      box2a_taxable_amount: 20_000,
      box7_distribution_code: "7",
      form8915f_treatment: "full",
      box13_date_of_payment: "2025-06-01",
    }],
  },
  f1040: {
    line5a_pension_gross: 20_000,
    line5b_pension_taxable: 20_000,
  },
};

Deno.test("bounded Form 8915-F native document matches source and TY2025 XSD", async () => {
  const xml = buildCurrentYearDistributionForm8915F(item, { filer, pending });
  assertStringIncludes(
    xml,
    "<CalendarYrDisasterCd>2025</CalendarYrDisasterCd>",
  );
  assertStringIncludes(
    xml,
    "<TotalCYAvailDistributionsAmt>22000</TotalCYAvailDistributionsAmt>",
  );
  assertStringIncludes(
    xml,
    "<CYTaxableDistributionsAmt>20000</CYTaxableDistributionsAmt>",
  );
  const xsd = new URL(
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Common/IRS8915F/IRS8915F.xsd",
    import.meta.url,
  ).pathname;
  try {
    await Deno.stat(xsd);
  } catch {
    return;
  }
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(
      path,
      `<?xml version="1.0"?>${
        xml.replace(
          "<IRS8915F>",
          '<IRS8915F xmlns="http://www.irs.gov/efile" documentId="IRS8915F1">',
        )
      }`,
    );
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, path],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(path);
  }
});

Deno.test("bounded Form 8915-F native document rejects changed retirement income", () => {
  assertThrows(
    () =>
      buildCurrentYearDistributionForm8915F(item, {
        filer,
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line5b_pension_taxable: 19_999 },
        },
      }),
    Error,
    "must match Form 1040",
  );
});
