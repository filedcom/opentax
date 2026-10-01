import { assertEquals, assertThrows } from "@std/assert";
import {
  deriveF8938Summary,
  f8938,
  ForeignAssetType,
  form8938ThresholdDecision,
} from "./index.ts";

function asset(overrides: Record<string, unknown> = {}) {
  return {
    asset_id: "bank-2025-1",
    asset_type: ForeignAssetType.DepositAccount,
    description: "CHF deposit account",
    asset_identifier: "CH-1001",
    country: "CH",
    institution_or_issuer_name: "Example Swiss Bank",
    institution_or_issuer_address: "Zurich, Switzerland",
    owner: "taxpayer",
    currency_code: "CHF",
    year_end_exchange_rate_usd_per_unit: 1.25,
    exchange_rate_source: "U.S. Treasury 2025 year-end rate",
    exchange_rate_date: "2025-12-31",
    maximum_value_native: 64_000,
    year_end_value_native: 44_000,
    maximum_value_usd: 80_000,
    year_end_value_usd: 55_000,
    tax_items: [{
      kind: "interest",
      amount_usd: 200,
      filed_form_and_line: "Schedule B line 1",
    }],
    ...overrides,
  };
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    specified_individual_type: "us_citizen",
    annual_income_tax_return_required: true,
    filing_status: "single",
    residence: { location: "united_states" },
    max_value_all_assets: 80_000,
    year_end_value_all_assets: 55_000,
    assets: [asset()],
    ...overrides,
  };
}

function parsed(value: ReturnType<typeof input>) {
  return f8938.inputSchema.parse(value);
}

Deno.test("f8938: specified individual above US single thresholds has disclosure decision and no tax output", () => {
  const value = parsed(input());
  assertEquals(form8938ThresholdDecision(value), {
    yearEndThreshold: 50_000,
    anyTimeThreshold: 75_000,
    filingRequired: true,
  });
  assertEquals(
    f8938.compute({ taxYear: 2025, formType: "f1040" }, value).outputs,
    [],
  );
});

Deno.test("f8938: threshold is strictly greater; no annual return means no 8938 filing", () => {
  const boundary = parsed(input({
    max_value_all_assets: 75_000,
    year_end_value_all_assets: 50_000,
    assets: [asset({
      maximum_value_native: 60_000,
      maximum_value_usd: 75_000,
      year_end_value_native: 40_000,
      year_end_value_usd: 50_000,
    })],
  }));
  assertEquals(form8938ThresholdDecision(boundary).filingRequired, false);
  const noReturn = parsed(input({ annual_income_tax_return_required: false }));
  assertEquals(form8938ThresholdDecision(noReturn).filingRequired, false);
});

Deno.test("f8938: MFS joint asset counts half for threshold but full value remains in ledger", () => {
  const value = parsed(input({
    filing_status: "mfs",
    max_value_all_assets: 80_000,
    year_end_value_all_assets: 55_000,
    assets: [asset({
      owner: "joint_with_spouse",
      spouse_is_specified_individual: true,
      maximum_value_native: 128_000,
      maximum_value_usd: 160_000,
      year_end_value_native: 88_000,
      year_end_value_usd: 110_000,
    })],
  }));
  assertEquals(value.assets[0].maximum_value_usd, 160_000);
  assertEquals(form8938ThresholdDecision(value).filingRequired, true);
  const nonSpecifiedSpouse = parsed(input({
    filing_status: "mfs",
    assets: [asset({
      owner: "joint_with_spouse",
      spouse_is_specified_individual: false,
    })],
  }));
  assertEquals(nonSpecifiedSpouse.year_end_value_all_assets, 55_000);
});

Deno.test("f8938: qualifying abroad status requires tax home and presence evidence", () => {
  const value = parsed(input({
    residence: {
      location: "qualifying_abroad",
      foreign_tax_home_country: "CH",
      presence_test: "physical_presence_330_days",
      qualifying_period_start: "2025-01-01",
      qualifying_period_end: "2025-12-31",
      full_days_abroad_in_period: 330,
    },
  }));
  assertEquals(form8938ThresholdDecision(value).yearEndThreshold, 200_000);
  assertEquals(form8938ThresholdDecision(value).filingRequired, false);
  const joint = parsed(input({
    filing_status: "mfj",
    residence: {
      location: "qualifying_abroad",
      foreign_tax_home_country: "CH",
      presence_test: "bona_fide_resident_full_year",
      qualifying_period_start: "2024-01-01",
      qualifying_period_end: "2025-12-31",
    },
  }));
  assertEquals(form8938ThresholdDecision(joint).yearEndThreshold, 400_000);
  assertEquals(form8938ThresholdDecision(joint).anyTimeThreshold, 600_000);
  assertThrows(() =>
    parsed(input({ residence: { location: "qualifying_abroad" } }))
  );
  assertThrows(() =>
    parsed(input({
      residence: {
        location: "qualifying_abroad",
        foreign_tax_home_country: "CH",
        presence_test: "physical_presence_330_days",
        qualifying_period_start: "2025-01-01",
        qualifying_period_end: "2025-12-31",
        full_days_abroad_in_period: 329,
      },
    }))
  );
});

Deno.test("f8938: excepted Part IV asset still counts toward individual threshold", () => {
  const value = parsed(input({
    assets: [asset({
      asset_type: ForeignAssetType.ForeignStock,
      excepted_on_form: "8621",
      filed_exception_form_reference: "Form 8621, PFIC A, tax year 2025",
    })],
  }));
  assertEquals(form8938ThresholdDecision(value).filingRequired, true);
  assertEquals(deriveF8938Summary(value).partI.depositAccountCount, 0);
  assertEquals(deriveF8938Summary(value).partIV["8621"], 1);
});

Deno.test("f8938: multi-asset peak is contemporaneous, not the sum of per-asset maxima", () => {
  const value = parsed(input({
    max_value_all_assets: 100_000,
    year_end_value_all_assets: 85_000,
    assets: [
      asset(),
      asset({
        asset_id: "stock-1",
        asset_identifier: "DE-STOCK-1",
        asset_type: ForeignAssetType.ForeignStock,
        country: "DE",
        currency_code: "USD",
        year_end_exchange_rate_usd_per_unit: 1,
        exchange_rate_source: "USD denominated",
        maximum_value_native: 40_000,
        maximum_value_usd: 40_000,
        year_end_value_native: 30_000,
        year_end_value_usd: 30_000,
      }),
    ],
  }));
  assertEquals(value.max_value_all_assets, 100_000);
  assertEquals(form8938ThresholdDecision(value).filingRequired, true);
  assertEquals(deriveF8938Summary(value).partI.depositMaximumValueUsd, 80_000);
  assertEquals(deriveF8938Summary(value).partII.otherMaximumValueUsd, 40_000);
});

Deno.test("f8938: rejects tampered currency, aggregate, ownership and Part IV evidence", () => {
  for (
    const change of [
      { maximum_value_usd: 70_000 },
      { exchange_rate_date: "2025-06-30" },
      { country: "CHE" },
      { excepted_on_form: "8621" },
      { closed_or_disposed_date: "2025-05-01" },
    ]
  ) {
    assertThrows(() => parsed(input({ assets: [asset(change)] })), Error);
  }
  assertThrows(() => parsed(input({ year_end_value_all_assets: 1 })), Error);
  assertThrows(() => parsed(input({ assets: [asset(), asset()] })), Error);
  assertThrows(() =>
    parsed(input({
      filing_status: "mfs",
      assets: [asset({ owner: "joint_with_spouse" })],
    })), Error);
});
