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
      assets: [{ fmv_at_expatriation: -1, basis: 0 }],
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      assets: [{ fmv_at_expatriation: 1, basis: -1 }],
    })).success,
    false,
  );
});

Deno.test("Form 8854 does not turn deemed gain into a dollar-for-dollar Schedule 2 tax", () => {
  assertThrows(
    () =>
      f8854.compute(
        { taxYear: 2025, formType: "f1040" },
        inputSchema.parse(input({
          net_worth_at_expatriation: 2_000_000,
          assets: [{ fmv_at_expatriation: 2_000_000, basis: 500_000 }],
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
