import { assertEquals, assertThrows } from "@std/assert";
import {
  AVG_ANNUAL_TAX_THRESHOLD_2025,
  ExpatriateType,
  f8854,
  inputSchema,
  isCoveredExpatriate,
  MARK_TO_MARKET_EXCLUSION_2025,
  NET_WORTH_THRESHOLD,
} from "./index.ts";
import { allocateMarkToMarketExclusion } from "./mark-to-market.ts";

function asset(
  assetId: string,
  fmv: number,
  basis: number,
) {
  return {
    asset_id: assetId,
    description: `Property ${assetId}`,
    fmv_at_expatriation: fmv,
    basis,
  };
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    expatriation_date: "2025-06-15",
    expatriate_type: ExpatriateType.CITIZEN,
    average_annual_tax_prior_5_years: 0,
    net_worth_at_expatriation: 0,
    certified_tax_compliance: true,
    ...overrides,
  };
}

Deno.test("Form 8854 uses TY2025 covered-expatriate thresholds", () => {
  assertEquals(AVG_ANNUAL_TAX_THRESHOLD_2025, 206_000);
  assertEquals(NET_WORTH_THRESHOLD, 2_000_000);
  assertEquals(MARK_TO_MARKET_EXCLUSION_2025, 890_000);
  assertEquals(
    isCoveredExpatriate(inputSchema.parse(input({
      average_annual_tax_prior_5_years: 206_000,
    }))),
    false,
  );
  assertEquals(
    isCoveredExpatriate(inputSchema.parse(input({
      average_annual_tax_prior_5_years: 206_001,
    }))),
    true,
  );
  assertEquals(
    isCoveredExpatriate(inputSchema.parse(input({
      net_worth_at_expatriation: 1_999_999,
    }))),
    false,
  );
  assertEquals(
    isCoveredExpatriate(inputSchema.parse(input({
      net_worth_at_expatriation: 2_000_000,
    }))),
    true,
  );
  assertEquals(
    isCoveredExpatriate(inputSchema.parse(input({
      certified_tax_compliance: false,
    }))),
    true,
  );
});

Deno.test("Form 8854 dual-citizen exception waives only tax and net-worth tests", () => {
  const dual = {
    kind: "DUAL_CITIZEN_AT_BIRTH",
    us_citizen_at_birth: true,
    other_country_citizen_at_birth: true,
    other_country_citizen_at_expatriation: true,
    other_country_tax_resident_at_expatriation: true,
    us_resident_tax_years_in_last_15: 10,
  };
  const covered = {
    average_annual_tax_prior_5_years: 300_000,
    net_worth_at_expatriation: 4_000_000,
    covered_expatriate_exception: dual,
  };
  assertEquals(isCoveredExpatriate(inputSchema.parse(input(covered))), false);
  assertEquals(
    isCoveredExpatriate(inputSchema.parse(input({
      ...covered,
      certified_tax_compliance: false,
    }))),
    true,
  );
  assertEquals(
    isCoveredExpatriate(inputSchema.parse(input({
      ...covered,
      covered_expatriate_exception: {
        ...dual,
        us_resident_tax_years_in_last_15: 11,
      },
    }))),
    true,
  );
  assertEquals(
    isCoveredExpatriate(inputSchema.parse(input({
      ...covered,
      covered_expatriate_exception: {
        ...dual,
        other_country_tax_resident_at_expatriation: false,
      },
    }))),
    true,
  );
});

Deno.test("Form 8854 minor exception uses the strict age and residence boundaries", () => {
  const minor = {
    kind: "MINOR",
    date_of_birth: "2007-01-01",
    us_resident_tax_years_before_expatriation: 10,
  };
  const covered = {
    average_annual_tax_prior_5_years: 300_000,
    covered_expatriate_exception: minor,
  };
  assertEquals(isCoveredExpatriate(inputSchema.parse(input(covered))), false);
  assertEquals(
    isCoveredExpatriate(inputSchema.parse(input({
      ...covered,
      covered_expatriate_exception: {
        ...minor,
        date_of_birth: "2006-12-15",
      },
    }))),
    true,
  );
  assertEquals(
    isCoveredExpatriate(inputSchema.parse(input({
      ...covered,
      covered_expatriate_exception: {
        ...minor,
        us_resident_tax_years_before_expatriation: 11,
      },
    }))),
    true,
  );
  assertEquals(
    isCoveredExpatriate(inputSchema.parse(input({
      ...covered,
      certified_tax_compliance: false,
    }))),
    true,
  );
});

Deno.test("Form 8854 validates its source date and asset amounts", () => {
  assertEquals(
    inputSchema.safeParse(input({
      expatriate_type: ExpatriateType.LONG_TERM_RESIDENT,
    })).success,
    true,
  );
  for (const date of ["2025-02-30", "2025-13-01", "nonsense"]) {
    assertEquals(
      inputSchema.safeParse(input({ expatriation_date: date })).success,
      false,
    );
  }
  assertEquals(
    inputSchema.safeParse(input({
      expatriation_date: "2024-12-31",
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      expatriate_type: ExpatriateType.LONG_TERM_RESIDENT,
      covered_expatriate_exception: {
        kind: "MINOR",
        date_of_birth: "2007-01-01",
        us_resident_tax_years_before_expatriation: 2,
      },
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      covered_expatriate_exception: {
        kind: "MINOR",
        date_of_birth: "2025-07-01",
        us_resident_tax_years_before_expatriation: 0,
      },
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      assets: [asset("A", -1, 0)],
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      assets: [asset("A", 1, -1)],
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      assets: [asset("A", 1.001, 0)],
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      assets: [asset("A", 1, 0), asset("A", 2, 0)],
    })).success,
    false,
  );
});

Deno.test("Form 8854 allocates the 2025 exclusion to gain assets, not losses", () => {
  const allocations = allocateMarkToMarketExclusion([
    asset("business", 2_000_000, 200_000),
    asset("stock", 1_000_000, 800_000),
    asset("loss", 500_000, 800_000),
  ]);
  assertEquals(
    allocations.map((row) => ({
      gainOrLoss: row.builtInGainOrLoss,
      exclusion: row.exclusionAllocated,
      gainAfterExclusion: row.gainAfterExclusion,
    })),
    [
      {
        gainOrLoss: 1_800_000,
        exclusion: 801_000,
        gainAfterExclusion: 999_000,
      },
      { gainOrLoss: 200_000, exclusion: 89_000, gainAfterExclusion: 111_000 },
      { gainOrLoss: -300_000, exclusion: 0, gainAfterExclusion: 0 },
    ],
  );
});

Deno.test("Form 8854 caps exclusion at total positive gain and balances cents", () => {
  assertEquals(
    allocateMarkToMarketExclusion([
      asset("A", 100, 0),
      asset("B", 50, 0),
      asset("C", 10, 20),
    ]).map((row) => [row.exclusionAllocated, row.gainAfterExclusion]),
    [[100, 0], [50, 0], [0, 0]],
  );
  const rows = allocateMarkToMarketExclusion([
    asset("A", 890_000.01, 0),
    asset("B", 890_000.01, 0),
    asset("C", 890_000.01, 0),
  ]);
  assertEquals(rows.map((row) => row.exclusionAllocated), [
    296_666.67,
    296_666.67,
    296_666.66,
  ]);
  assertEquals(
    Math.round(
      rows.reduce((sum, row) => sum + row.exclusionAllocated, 0) * 100,
    ),
    89_000_000,
  );
});

Deno.test("Form 8854 rejects duplicate asset IDs and invalid precision", () => {
  assertThrows(
    () => allocateMarkToMarketExclusion([asset("A", 1, 0), asset("A", 2, 0)]),
    Error,
    "Duplicate Form 8854 asset ID",
  );
  assertThrows(
    () => allocateMarkToMarketExclusion([asset("A", 1.001, 0)]),
  );
});

Deno.test("Form 8854 does not turn deemed gain into a dollar-for-dollar Schedule 2 tax", () => {
  assertThrows(
    () =>
      f8854.compute(
        { taxYear: 2025, formType: "f1040" },
        inputSchema.parse(input({
          net_worth_at_expatriation: 2_000_000,
          assets: [asset("A", 2_000_000, 500_000)],
        })),
      ),
    Error,
    "asset-specific deemed gain reporting and the IRS8854 attachment",
  );
});

Deno.test("Form 8854 filing never disappears silently just because no exit tax applies", () => {
  assertThrows(
    () =>
      f8854.compute(
        { taxYear: 2025, formType: "f1040" },
        inputSchema.parse(input()),
      ),
    Error,
    "IRS8854 attachment",
  );
});
