import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import {
  buildReviewedStockLoss7203,
  form7203StockLoss,
} from "./f7203_stock_loss.ts";

const filer = {
  primarySSN: "123456789",
  nameLine1: "Alex Taxpayer",
  nameControl: "TAXP",
  address: {
    line1: "1 Main St",
    city: "Wilmington",
    state: "DE",
    zip: "19801",
  },
  filingStatus: FilingStatus.Single,
};

const ledger = {
  shareholder_ssn: "123456789",
  shareholder_name_as_on_k1: "Alex Taxpayer",
  corporation_ein: "987654321",
  beginning_stock_basis: 3_000,
  beginning_basis_workpaper_reference: "2024 shareholder stock ledger",
  original_shareholder: true,
  all_shares_one_stock_block: true,
  no_current_year_stock_transactions: true,
  no_section_1367_1_g_election: true,
  no_other_2025_stock_basis_changes: true,
  no_other_schedule_e_activity: true,
  materially_participated_in_s_corporation: true,
  material_participation_workpaper_reference:
    "2025 shareholder participation log",
  no_shareholder_debt_or_repayments: true,
  no_prior_year_suspended_losses: true,
  no_at_risk_or_passive_limitation: true,
};

const source = {
  corporation_name: "Test S Corp",
  corporation_ein: "987654321",
  source_document_reference: "2025 S corporation K-1",
  box1_ordinary_business: -4_000,
  form7203_stock_loss_ledger: ledger,
};

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/Shared/IRS7203/IRS7203.xsd",
  import.meta.url,
).pathname;
let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The official IRS schema bundle is local-only.
}

Deno.test("Form 7203 descriptor emits nothing without its pending source", () => {
  assertEquals(form7203StockLoss.build({}, context()), "");
});

function context(item: Record<string, unknown> = source, allowed = 3_000) {
  return {
    filer,
    pending: {
      k1_s_corp: { k1_s_corps: [item] },
      schedule1: {
        line5_schedule_e: -allowed,
        line10_total_additional_income: -allowed,
      },
      f1040: { line8_additional_income: -allowed },
    },
  };
}

Deno.test("staged Form 7203 stock-only XML follows TY2025 line and group order", () => {
  const xml = buildReviewedStockLoss7203(
    { stock_basis_beginning: 3_000, ordinary_loss: 4_000 },
    context(),
  );
  assertStringIncludes(xml, "<ShareholderSSN>123456789</ShareholderSSN>");
  assertStringIncludes(
    xml,
    "<SCorporationName><BusinessNameLine1Txt>Test S Corp</BusinessNameLine1Txt></SCorporationName>",
  );
  assertStringIncludes(xml, "<SCorporationEIN>987654321</SCorporationEIN>");
  assertStringIncludes(
    xml,
    "<StockBasisBeginTaxYearAmt>3000</StockBasisBeginTaxYearAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalDecreaseStockBasisAmt>3000</TotalDecreaseStockBasisAmt>",
  );
  assertStringIncludes(
    xml,
    "<StockBasisEndTaxYearAmt>0</StockBasisEndTaxYearAmt>",
  );
  assertStringIncludes(
    xml,
    "<ShrCarryoverAmountsGrp><OrdinaryBusinessLossAmt>1000</OrdinaryBusinessLossAmt><TotalAllowableLossAmt>1000</TotalAllowableLossAmt></ShrCarryoverAmountsGrp>",
  );
  assertEquals(
    xml.indexOf("<ShrCurrentYrLossDeductionsGrp>") <
      xml.indexOf("<ShrAllwblLossFromStockBasisGrp>"),
    true,
  );
  assertEquals(
    xml.indexOf("<ShrAllwblLossFromStockBasisGrp>") <
      xml.indexOf("<ShrCarryoverAmountsGrp>"),
    true,
  );
});

Deno.test({
  name: "XSD: Form 7203 stock-only loss and suspended balance",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildReviewedStockLoss7203(
    { stock_basis_beginning: 3_000, ordinary_loss: 4_000 },
    context(),
  ).replace(
    "<IRS7203>",
    '<IRS7203 xmlns="http://www.irs.gov/efile" documentId="IRS7203-1">',
  );
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
});

Deno.test("staged Form 7203 rejects a pending amount or shareholder mismatch", () => {
  assertThrows(
    () =>
      buildReviewedStockLoss7203(
        { stock_basis_beginning: 2_000, ordinary_loss: 4_000 },
        context(),
      ),
    Error,
    "same single-source stock-only loss",
  );
  assertThrows(
    () =>
      buildReviewedStockLoss7203(
        { stock_basis_beginning: 3_000, ordinary_loss: 4_000 },
        context({
          ...source,
          form7203_stock_loss_ledger: {
            ...ledger,
            shareholder_ssn: "999999999",
          },
        }),
      ),
    Error,
    "same single-source stock-only loss",
  );
});

Deno.test("Form 7203 cash capital contribution raises stock basis and limits the sourced loss", () => {
  const contribution = {
    amount: 500,
    contributed_date: "2025-06-01",
    shareholder_ssn: "123456789",
    corporation_ein: "987654321",
    bank_transfer_reference: "Bank transfer TX-2025-500",
    corporate_capital_account_reference: "Corporate ledger capital-500",
    cash_received_by_corporation_confirmed: true,
    no_shares_issued_confirmed: true,
    not_a_shareholder_loan_confirmed: true,
  };
  const contributed = { ...source, form7203_stock_loss_ledger: {
    ...ledger,
    cash_capital_contribution: contribution,
  } };
  const fields = {
    stock_basis_beginning: 3_000,
    additional_contributions: 500,
    ordinary_loss: 4_000,
  };
  const xml = buildReviewedStockLoss7203(fields, context(contributed, 3_500));
  assertStringIncludes(xml, "<CapitalContributionBasisAmt>500</CapitalContributionBasisAmt>");
  assertStringIncludes(xml, "<StockBasisBeforeLossDedAmt>3500</StockBasisBeforeLossDedAmt>");
  assertStringIncludes(xml, "<TotalAllowableLossAmt>3500</TotalAllowableLossAmt>");
  assertThrows(() => buildReviewedStockLoss7203(
    { ...fields, additional_contributions: 501 },
    context(contributed, 3_500),
  ), Error, "same single-source stock-only loss");
  assertThrows(() => buildReviewedStockLoss7203(fields, context({
    ...contributed,
    form7203_stock_loss_ledger: {
      ...ledger,
      cash_capital_contribution: { ...contribution, shareholder_ssn: "999999999" },
    },
  }, 3_500)), Error);
});

Deno.test("staged Form 7203 rejects mixed K-1 basis items", () => {
  assertThrows(
    () =>
      buildReviewedStockLoss7203(
        { stock_basis_beginning: 3_000, ordinary_loss: 4_000 },
        context({ ...source, box4_interest: 200 }),
      ),
    Error,
    "same single-source stock-only loss",
  );
  assertThrows(
    () =>
      buildReviewedStockLoss7203(
        { stock_basis_beginning: 3_000, ordinary_loss: 4_000, new_loans: 1 },
        context(),
      ),
    Error,
    "does not accept unreviewed basis fields",
  );
});

Deno.test("staged Form 7203 zero basis skips line 10 and column c", () => {
  const xml = buildReviewedStockLoss7203(
    { stock_basis_beginning: 0, ordinary_loss: 4_000 },
    context({
      ...source,
      form7203_stock_loss_ledger: { ...ledger, beginning_stock_basis: 0 },
    }, 0),
  );
  assertEquals(xml.includes("<StockBasisBeforeLossDedAmt>"), false);
  assertEquals(xml.includes("<ShrAllwblLossFromStockBasisGrp>"), false);
  assertStringIncludes(
    xml,
    "<StockBasisEndTaxYearAmt>0</StockBasisEndTaxYearAmt>",
  );
  assertStringIncludes(
    xml,
    "<ShrCarryoverAmountsGrp><OrdinaryBusinessLossAmt>4000</OrdinaryBusinessLossAmt>",
  );
});

Deno.test("staged Form 7203 rejects a filed Schedule 1/1040 loss mismatch", () => {
  const mismatched = context();
  assertThrows(
    () =>
      buildReviewedStockLoss7203(
        { stock_basis_beginning: 3_000, ordinary_loss: 4_000 },
        {
          ...mismatched,
          pending: {
            ...mismatched.pending,
            schedule1: {
              line5_schedule_e: -4_000,
              line10_total_additional_income: -4_000,
            },
            f1040: { line8_additional_income: -4_000 },
          },
        },
      ),
    Error,
    "must match Schedule 1 line 5",
  );
});
