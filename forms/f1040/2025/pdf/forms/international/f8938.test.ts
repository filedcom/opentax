import { assertEquals, assertThrows } from "@std/assert";
import { form8938Fixture } from "../../../mef/forms/international/f8938.fixture.ts";
import { form8938Pdf } from "./f8938.ts";

function pages(raw: Record<string, unknown>) {
  return form8938Pdf.instances!(raw);
}

Deno.test("staged Form 8938 PDF projects official 2021 fields for one Part V and VI asset", () => {
  const [fields] = pages(form8938Fixture());
  assertEquals(form8938Pdf.pageIndices!(fields), [0, 1]);
  assertEquals(fields.calendarYearSuffix, "25");
  assertEquals(fields.depositAccountCount, 1);
  assertEquals(fields.depositMaximumValueUsd, 80_000);
  assertEquals(fields.otherAssetCount, 1);
  assertEquals(fields.otherMaximumValueUsd, 40_000);
  assertEquals(fields.partIV_8621, 1);
  assertEquals(fields.line13_interest_amount, 200);
  assertEquals(fields.line13_interest_schedule, "Schedule B line 1");
  assertEquals(fields.line14_dividends_amount, 100);
  assertEquals(fields.line14_dividends_form, "Form 1040 line 3b");
  assertEquals(fields.accountIdentifier, "CH-1001");
  assertEquals(fields.accountCurrency, "CHF");
  assertEquals(fields.accountExchangeRate, "1.25");
  assertEquals(fields.accountInstitutionAddress, "10 Bankstrasse");
  assertEquals(fields.accountInstitutionCityCountry, "Zurich, CH, 8001");
  assertEquals(fields.otherDescription, "100 shares of Example Foreign Corp.");
  assertEquals(fields.otherValueBand1, true);
  assertEquals(fields.otherEntityName, "Example Foreign Corp.");
  assertEquals(fields.otherCorporation, true);
  assertEquals(fields.otherEntityAddress, "20 Market St");
  assertEquals(fields.otherEntityCityCountry, "Berlin, DE, 10115");
});

Deno.test("staged Form 8938 PDF classifies a nonentity counterparty", () => {
  const source = form8938Fixture();
  const [fields] = pages({
    ...source,
    assets: source.assets.map((asset, index) =>
      index === 1
        ? {
          ...asset,
          asset_type: "foreign_security_not_in_account",
          foreign_entity_type: undefined,
          issuer_or_counterparty_role: "counterparty",
          issuer_or_counterparty_type: "corporation",
          issuer_or_counterparty_is_us_person: false,
        }
        : asset
    ),
  });
  assertEquals(fields.otherCounterparty, true);
  assertEquals(fields.otherIssuerCorporation, true);
  assertEquals(fields.otherForeignPerson, true);
  assertEquals(fields.otherIssuerName, "Example Foreign Corp.");
});

Deno.test("staged Form 8938 PDF retains Part IV-only one-page form", () => {
  const source = form8938Fixture();
  const asset = {
    ...source.assets[2],
    maximum_value_native: 80_000,
    maximum_value_usd: 80_000,
    year_end_value_native: 55_000,
    year_end_value_usd: 55_000,
  };
  const [page] = pages({
    ...source,
    assets: [asset],
    max_value_all_assets: 80_000,
    year_end_value_all_assets: 55_000,
  });
  assertEquals(form8938Pdf.pageIndices!(page), [0]);
  assertEquals(page.partIV_8621, 1);
});

Deno.test("staged Form 8938 PDF repeats page 2 for overflow without repeating page 1", () => {
  const source = form8938Fixture();
  const secondAccount = {
    ...source.assets[0],
    asset_id: "account-2",
    asset_identifier: "CH-1002",
    year_end_value_native: 0,
    year_end_value_usd: 0,
  };
  const secondStock = {
    ...source.assets[1],
    asset_id: "stock-2",
    asset_identifier: "STOCK-200",
    year_end_value_native: 0,
    year_end_value_usd: 0,
  };
  const copies = pages({
    ...source,
    assets: [...source.assets, secondAccount, secondStock],
    max_value_all_assets: 150_000,
  });
  assertEquals(copies.length, 2);
  assertEquals(form8938Pdf.pageIndices!(copies[0]), [0, 1]);
  assertEquals(form8938Pdf.pageIndices!(copies[1]), [1]);
  assertEquals(copies[0].hasAdditionalStatements, true);
  assertEquals(copies[0].additionalStatementCount, 1);
  assertEquals(copies[0].accountIdentifier, "CH-1001");
  assertEquals(copies[0].otherIdentifier, "STOCK-100");
  assertEquals(copies[1].accountIdentifier, "CH-1002");
  assertEquals(copies[1].otherIdentifier, "STOCK-200");
});

Deno.test("staged Form 8938 PDF leaves the unused side blank on uneven continuation", () => {
  const source = form8938Fixture();
  const secondAccount = {
    ...source.assets[0],
    asset_id: "account-2",
    asset_identifier: "CH-1002",
    year_end_value_native: 0,
    year_end_value_usd: 0,
  };
  const copies = pages({
    ...source,
    assets: [...source.assets, secondAccount],
    max_value_all_assets: 150_000,
  });
  assertEquals(copies.length, 2);
  assertEquals(copies[1].accountIdentifier, "CH-1002");
  assertEquals(copies[1].otherIdentifier, undefined);
  assertEquals(form8938Pdf.pageIndices!(copies[1]), [1]);
});

Deno.test("staged Form 8938 PDF rejects tampered source", () => {
  const source = form8938Fixture();
  assertThrows(() => pages({ ...source, year_end_value_all_assets: 1 }), Error);
  assertThrows(() =>
    pages({
      ...source,
      assets: source.assets.map((asset, index) =>
        index === 0
          ? {
            ...asset,
            institution_or_issuer_address: { line1: "10 Bankstrasse" },
          }
          : asset
      ),
    }), Error);
});
