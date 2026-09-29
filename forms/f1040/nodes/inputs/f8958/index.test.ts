import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../types.ts";
import {
  AllocationBasis,
  CommunityPropertyState,
  f8958,
  Form8958Line,
  inputSchema,
  prepareF8958Allocation,
} from "./index.ts";

const source = {
  domicile_state: CommunityPropertyState.CA,
  federal_filing_status: FilingStatus.MFS as const,
  taxpayer: { first_name: "Alex", last_name: "Example", ssn: "111223333" },
  spouse: { first_name: "Blair", last_name: "Example", ssn: "222334444" },
  community_property_period: {
    from: "2025-01-01",
    through: "2025-12-31",
    domicile_workpaper_reference: "CA-domicile-review",
  },
  reviewed_by: "Reviewer",
  reviewed_on: "2026-04-01",
  return_wide_items_review_reference: "both-spouses-return-review",
  rows: [{
    item_id: "wage-1",
    form_line: Form8958Line.Wages,
    description: "Employer A",
    source_document_id: "w2-A",
    source_record_reference: "w2-A-box1",
    allocation_basis: AllocationBasis.CommunityEqual,
    state_law_workpaper_reference: "CA-wages",
    total_amount: 100_001,
    taxpayer_share: 50_001,
    other_person_share: 50_000,
  }, {
    item_id: "withholding-1",
    form_line: Form8958Line.Withholding,
    description: "Employer A",
    source_document_id: "w2-A",
    source_record_reference: "w2-A-box2",
    allocation_basis: AllocationBasis.CommunityEqual,
    state_law_workpaper_reference: "CA-withholding",
    total_amount: 10_000,
    taxpayer_share: 5_000,
    other_person_share: 5_000,
  }],
};

Deno.test("f8958 stages item-level allocations with exact A=B+C arithmetic", () => {
  const result = prepareF8958Allocation(source);
  assertEquals(result.totalsByLine.find((item) => item.line === 1), {
    line: Form8958Line.Wages,
    total: 100_001,
    taxpayer: 50_001,
    spouse: 50_000,
  });
  const outputs =
    f8958.compute({ taxYear: 2025, formType: "f1040" }, source).outputs;
  assertEquals(outputs.length, 1);
  assertEquals(outputs[0].nodeType, "w2");
  assertEquals(outputs[0].fields.f8958_allocation, source);
});

Deno.test("f8958 rejects old amount-only and empty allocation shapes", () => {
  for (
    const input of [
      {},
      { state: CommunityPropertyState.CA },
      { allocation_items: [{ total_amount: 100 }] },
    ]
  ) {
    assertEquals(inputSchema.safeParse(input).success, false);
  }
});

Deno.test("f8958 rejects mismatched sums, unjustified splits and duplicate rows", () => {
  const wage = source.rows[0];
  for (
    const rows of [
      [{ ...wage, other_person_share: 49_999 }],
      [{ ...wage, taxpayer_share: 60_001, other_person_share: 40_000 }],
      [{ ...wage, allocation_basis: AllocationBasis.TaxpayerSeparate }],
      [wage, { ...wage }],
      [{ ...wage, allocation_basis: AllocationBasis.ReviewedException }],
    ]
  ) {
    assertThrows(() => prepareF8958Allocation({ ...source, rows }));
  }
});

Deno.test("f8958 rejects inferred equal spouse self-employment tax", () => {
  assertThrows(() =>
    prepareF8958Allocation({
      ...source,
      rows: [{
        ...source.rows[0],
        form_line: Form8958Line.SelfEmploymentTax,
      }],
    })
  );
});

Deno.test("f8958 rejects more than 40 rows for one native line", () => {
  assertEquals(
    inputSchema.safeParse({
      ...source,
      rows: Array.from({ length: 41 }, (_, index) => ({
        ...source.rows[0],
        item_id: `wage-${index}`,
      })),
    }).success,
    false,
  );
});

Deno.test("f8958 requires distinct MFS spouses and a 2025 period", () => {
  assertEquals(
    inputSchema.safeParse({
      ...source,
      federal_filing_status: FilingStatus.Single,
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...source,
      spouse: { ...source.spouse, ssn: source.taxpayer.ssn },
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...source,
      community_property_period: {
        ...source.community_property_period,
        from: "2024-12-31",
      },
    }).success,
    false,
  );
});
