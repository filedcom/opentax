import { assertEquals, assertThrows } from "@std/assert";
import {
  assertCurrentYearSection481aMatches,
  f3115,
  FilingType,
} from "./index.ts";

function item(overrides: Record<string, unknown> = {}) {
  return {
    designated_change_number: "222",
    filing_type: FilingType.Automatic,
    reporting_schedule: "schedule_c",
    business_reference: "business-a",
    year_of_change: 2025,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof item>[]) {
  return f3115.compute(
    { taxYear: 2025, formType: "f1040" },
    { f3115s: items } as Parameters<typeof f3115.compute>[1],
  );
}

function adjustments(items: ReturnType<typeof item>[]) {
  const result = compute(items);
  assertEquals(result.outputs.map((output) => output.nodeType), ["schedule_c"]);
  return (result.outputs[0].fields as Record<string, unknown>)
    .section481a_adjustments;
}

Deno.test("f3115 requires a nonempty method-change list and DCN", () => {
  assertThrows(() => compute([]));
  assertThrows(() => compute([item({ designated_change_number: "" })]));
});

Deno.test("f3115 emits nothing without a current-year adjustment", () => {
  assertEquals(compute([item()]).outputs, []);
  assertEquals(compute([item({ section_481_adjustment: 0 })]).outputs, []);
});

Deno.test("f3115 positive adjustment uses ordinary four-year inclusion", () => {
  assertEquals(adjustments([item({ section_481_adjustment: 12_000 })]), [{
    business_reference: "business-a",
    designated_change_number: "222",
    year_of_change: 2025,
    amount: 3_000,
  }]);
  assertEquals(
    adjustments([item({
      section_481_adjustment: 12_000,
      spread_period: 4,
      year_of_change: 2023,
    })]),
    [{
      business_reference: "business-a",
      designated_change_number: "222",
      year_of_change: 2023,
      amount: 3_000,
    }],
  );
  assertEquals(
    compute([item({
      section_481_adjustment: 12_000,
      year_of_change: 2021,
    })]).outputs,
    [],
  );
});

Deno.test("f3115 allocates whole-dollar installments and puts the remainder in year four", () => {
  assertEquals(adjustments([item({ section_481_adjustment: 10_001 })]), [{
    business_reference: "business-a",
    designated_change_number: "222",
    year_of_change: 2025,
    amount: 2_500,
  }]);
  assertEquals(
    adjustments([
      item({ section_481_adjustment: 10_001, year_of_change: 2022 }),
    ]),
    [{
      business_reference: "business-a",
      designated_change_number: "222",
      year_of_change: 2022,
      amount: 2_501,
    }],
  );
  assertThrows(() => compute([item({ section_481_adjustment: 10_001.5 })]));
});

Deno.test("Form 3115 source reconciliation rejects a changed Schedule C installment", () => {
  const source = { f3115s: [item({ section_481_adjustment: 12_000 })] };
  const matching = [{
    business_reference: "business-a",
    designated_change_number: "222",
    year_of_change: 2025,
    amount: 3_000,
  }];
  assertCurrentYearSection481aMatches(source, matching, 2025);
  assertThrows(
    () =>
      assertCurrentYearSection481aMatches(source, [{
        ...matching[0],
        amount: 4_000,
      }], 2025),
    Error,
    "differ from Form 3115 source",
  );
});

Deno.test("f3115 negative adjustment is a current-year business expense", () => {
  assertEquals(adjustments([item({ section_481_adjustment: -6_000 })]), [{
    business_reference: "business-a",
    designated_change_number: "222",
    year_of_change: 2025,
    amount: -6_000,
  }]);
  assertEquals(
    compute([item({
      section_481_adjustment: -6_000,
      year_of_change: 2024,
    })]).outputs,
    [],
  );
});

Deno.test("f3115 preserves per-business and per-change character", () => {
  assertEquals(
    adjustments([
      item({ section_481_adjustment: 8_000 }),
      item({
        designated_change_number: "333",
        business_reference: "business-b",
        section_481_adjustment: -1_000,
      }),
    ]),
    [
      {
        business_reference: "business-a",
        designated_change_number: "222",
        year_of_change: 2025,
        amount: 2_000,
      },
      {
        business_reference: "business-b",
        designated_change_number: "333",
        year_of_change: 2025,
        amount: -1_000,
      },
    ],
  );
});

Deno.test("f3115 permits verified one-year positive election under $50,000", () => {
  assertEquals(
    adjustments([item({
      section_481_adjustment: 49_999,
      spread_period: 1,
      one_year_positive_election_verified: true,
    })]),
    [{
      business_reference: "business-a",
      designated_change_number: "222",
      year_of_change: 2025,
      amount: 49_999,
    }],
  );
  assertThrows(() =>
    compute([item({
      section_481_adjustment: 50_000,
      one_year_positive_election_verified: true,
    })])
  );
  assertThrows(() =>
    compute([
      item({
        section_481_adjustment: 1_000,
        one_year_positive_election_verified: true,
      }),
      item({ designated_change_number: "333", section_481_adjustment: 1_000 }),
    ])
  );
});

Deno.test("f3115 rejects nonzero unclassified and unsupported adjustments", () => {
  assertThrows(() =>
    compute([item({
      section_481_adjustment: 1_000,
      reporting_schedule: undefined,
    })])
  );
  assertThrows(() =>
    compute([item({
      section_481_adjustment: 1_000,
      business_reference: undefined,
    })])
  );
  assertThrows(() =>
    compute([item({
      section_481_adjustment: 1_000,
      year_of_change: undefined,
    })])
  );
  assertThrows(() =>
    compute([item({
      section_481_adjustment: 1_000,
      year_of_change: 2026,
    })])
  );
  assertThrows(() =>
    compute([item({
      section_481_adjustment: 1_000,
      spread_period: 2,
    })])
  );
  assertThrows(() =>
    compute([item({
      section_481_adjustment: -1_000,
      spread_period: 4,
    })])
  );
  assertThrows(() =>
    compute([item({
      section_481_adjustment: -1_000,
      one_year_positive_election_verified: true,
    })])
  );
});
