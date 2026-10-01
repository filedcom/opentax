import { assertEquals, assertThrows } from "@std/assert";
import { form8938Fixture } from "../../mef/forms/f8938.fixture.ts";
import { form8938Pdf } from "./f8938.ts";

Deno.test("staged Form 8938 PDF projects official 2021 fields for one Part V and VI asset", () => {
  const source = form8938Fixture();
  const fields = form8938Pdf.projectFields!(source, {});
  assertEquals(form8938Pdf.pageIndices!(source), [0, 1]);
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
  assertEquals(fields.accountExchangeRate, 1.25);
  assertEquals(fields.otherDescription, "100 shares of Example Foreign Corp.");
  assertEquals(fields.otherValueBand1, true);
  assertEquals(fields.otherEntityName, "Example Foreign Corp.");
});

Deno.test("staged Form 8938 PDF retains Part IV-only one-page form", () => {
  const source = form8938Fixture();
  const onlyExcepted = {
    ...source,
    assets: [source.assets[2]],
    max_value_all_assets: 80_000,
    year_end_value_all_assets: 55_000,
  };
  // An excepted asset still has to support the threshold; make it large enough.
  const asset = {
    ...source.assets[2],
    maximum_value_native: 80_000,
    maximum_value_usd: 80_000,
    year_end_value_native: 55_000,
    year_end_value_usd: 55_000,
  };
  const value = { ...onlyExcepted, assets: [asset] };
  assertEquals(form8938Pdf.pageIndices!(value), [0]);
  assertEquals(form8938Pdf.projectFields!(value, {}).partIV_8621, 1);
});

Deno.test("staged Form 8938 PDF rejects missing source and unimplemented continuation", () => {
  const source = form8938Fixture();
  assertThrows(() =>
    form8938Pdf.projectFields!({
      ...source,
      year_end_value_all_assets: 1,
    }, {}), Error);
  const duplicateAccount = {
    ...source.assets[0],
    asset_id: "account-2",
    asset_identifier: "CH-1002",
    year_end_value_native: 0,
    year_end_value_usd: 0,
  };
  assertThrows(
    () =>
      form8938Pdf.projectFields!({
        ...source,
        assets: [...source.assets, duplicateAccount],
        max_value_all_assets: 150_000,
      }, {}),
    Error,
    "continuation",
  );
});
