import { assertEquals, assertThrows } from "@std/assert";
import {
  foreignTaxSource2026Schema,
  prepareForeignTaxSources2026,
} from "./foreign-tax-source.ts";
import {
  foreignTaxAllocation2026,
  foreignTaxDocument2026,
  foreignTaxFixture2026,
} from "./foreign-tax-source.fixture.ts";
import {
  syntheticDividend2026,
  syntheticInterest2026,
} from "./investment.fixture.ts";
import {
  ForeignTaxKind,
  IncomeCategory,
} from "../../nodes/intermediate/forms/credits/foreign/form_1116/index.ts";
import { FilingStatus } from "../../nodes/types.ts";

type MutableFixture = {
  claim: {
    record_reference: string;
    reviewed_on: string;
    accounting_method: string;
    sources: {
      taxpayer_tin: string;
      paid_or_withheld_on: string;
      currency_code: string;
      gross_tax_native: string;
      source_document: ReturnType<typeof foreignTaxDocument2026>;
      fx: {
        rate_date: string;
        usd_per_currency_unit: string;
        source_document: ReturnType<typeof foreignTaxDocument2026>;
      };
      allocations: {
        amount_native: string;
        reduction_native?: string;
        country_name: string;
        record_reference: string;
        income_source_references: string[];
      }[];
    }[];
  };
};

Deno.test("2026 foreign tax retains original payment, date FX and source binding requirements", () => {
  const r = prepareForeignTaxSources2026(foreignTaxFixture2026());
  assertEquals(r.gross_tax_usd, 110.28);
  assertEquals(r.receipts[0].original_tax_native, "100.25");
  assertEquals(r.receipts[0].paid_or_accrued_label, "2026-06-30");
  assertEquals(r.categories[0].rows[0].part_ii_tax_usd, 110.28);
  assertEquals(r.requires_income_and_return_binding, true);
  assertEquals(r.requires_creditability_and_reduction_line_binding, true);
  assertEquals(r.requires_election_eligibility_and_carryover_review, true);
  assertEquals(r.filing_ready, false);
});
Deno.test("2026 foreign tax apportions complete source cents across categories and reductions", () => {
  const raw = foreignTaxFixture2026(), s = raw.claim.sources[0];
  if (s.kind !== "foreign_tax_payment") throw Error("fixture");
  s.gross_tax_native = "0.03";
  s.fx.usd_per_currency_unit = "0.5";
  s.allocations = [
    foreignTaxAllocation2026("a"),
    foreignTaxAllocation2026("b"),
    foreignTaxAllocation2026("c"),
  ];
  s.allocations.forEach((a) => a.amount_native = "0.01");
  s.allocations[1].income_category = IncomeCategory.General;
  s.allocations[2].income_category = "lump_sum";
  s.allocations[2].reduction_native = "0.01";
  s.allocations[2].reduction_document = foreignTaxDocument2026(
    "line12-reduction",
  );
  s.allocations[2].reduction_treatment = "line12";
  const r = prepareForeignTaxSources2026(raw);
  assertEquals(r.gross_tax_usd, .02);
  assertEquals(r.receipts[0].allocations.map((a) => a.gross_tax_usd), [
    .01,
    .01,
    0,
  ]);
  assertEquals(r.categories.map((c) => c.income_category), [
    "passive",
    "general",
    "lump_sum",
  ]);
});
Deno.test("2026 foreign tax preserves multiple-country 1099 USD taxes without invented FX", () => {
  const raw = foreignTaxFixture2026();
  raw.claim.sources = [{
    kind: "issued_1099_int",
    record_reference: "int-tax",
    complete_country_and_income_allocation_on_issued_copy_reviewed: true,
    copy: {
      ...syntheticInterest2026(),
      box6: 200.01,
      source_document_sha256: "b".repeat(64),
    },
    allocations: [{
      ...foreignTaxAllocation2026("int-ch"),
      amount_native: "100.01",
      income_source_references: ["synthetic-int-1"],
    }, {
      ...foreignTaxAllocation2026("int-ca"),
      country_name: "Canada",
      amount_native: "100",
      income_source_references: ["synthetic-int-1"],
    }],
  }, {
    kind: "issued_1099_div",
    record_reference: "div-tax",
    complete_country_and_income_allocation_on_issued_copy_reviewed: true,
    copy: {
      ...syntheticDividend2026(),
      box7: 99.99,
      source_document_sha256: "c".repeat(64),
    },
    allocations: [{
      ...foreignTaxAllocation2026("div-ca"),
      country_name: "Canada",
      tax_kind: ForeignTaxKind.Dividends,
      amount_native: "99.99",
      income_source_references: ["synthetic-div-1"],
    }],
  }];
  const r = prepareForeignTaxSources2026(raw);
  assertEquals(r.gross_tax_usd, 300);
  assertEquals(r.categories[0].rows.map((a) => a.country_name), [
    "Switzerland",
    "Canada",
    "Canada",
  ]);
  for (const receipt of r.receipts) {
    assertEquals(receipt.currency_code, undefined);
    assertEquals(receipt.original_tax_native, undefined);
    assertEquals(receipt.paid_or_accrued_label, "1099 taxes");
  }
  // The amount alone is not evidence of eligibility for the small-credit election.
  raw.claim.election = "credit_without_form1116";
  assertEquals(
    prepareForeignTaxSources2026(raw)
      .requires_election_eligibility_and_carryover_review,
    true,
  );
  const bad = structuredClone(raw);
  bad.claim.sources[0].allocations[0].amount_native = "100";
  assertThrows(() => prepareForeignTaxSources2026(bad), Error, "reconcile");
  const duplicate = structuredClone(raw);
  duplicate.claim.sources.push({
    ...duplicate.claim.sources[0],
    record_reference: "other-reference",
  });
  assertThrows(
    () => prepareForeignTaxSources2026(duplicate),
    Error,
    "Duplicate",
  );
});
Deno.test("2026 foreign tax separates PTEP pre-Part-II reductions from line 12", () => {
  const raw = foreignTaxFixture2026(), a = raw.claim.sources[0].allocations[0];
  a.tax_kind = "ptep";
  a.ptep_group = "PO951A";
  a.income_category = IncomeCategory.Section951A;
  a.reduction_native = "10.25";
  a.reduction_document = foreignTaxDocument2026("section960d4-review");
  a.reduction_treatment = "part_ii_ptep_965g_960d4";
  let r = prepareForeignTaxSources2026(raw).categories[0].rows[0];
  assertEquals(r.gross_tax_usd, 110.28);
  assertEquals(r.part_ii_tax_usd, 99);
  assertEquals(r.line12_reduction_usd, 0);
  assertEquals(r.part_ii_tax_native, "90");
  a.reduction_treatment = "line12";
  r = prepareForeignTaxSources2026(raw).categories[0].rows[0];
  assertEquals(r.part_ii_tax_usd, 110.28);
  assertEquals(r.line12_reduction_usd, 11.28);
  delete a.ptep_group;
  assertThrows(() => prepareForeignTaxSources2026(raw), Error, "PTEP");
});
Deno.test("2026 foreign tax rejects wrong owners, rates, dates, duplicates and incoherent evidence", () => {
  const changes = [
    (s: MutableFixture) => s.claim.reviewed_on = "2026-06-01",
    (s: MutableFixture) => s.claim.sources[0].taxpayer_tin = "999887777",
    (s: MutableFixture) =>
      s.claim.sources[0].paid_or_withheld_on = "2025-12-31",
    (s: MutableFixture) =>
      s.claim.sources[0].paid_or_withheld_on = "2026-02-30",
    (s: MutableFixture) => s.claim.sources[0].fx.rate_date = "2026-12-31",
    (s: MutableFixture) => s.claim.sources[0].currency_code = "USD",
    (s: MutableFixture) =>
      s.claim.sources[0].allocations[0].amount_native = "100.250001",
    (s: MutableFixture) =>
      s.claim.sources[0].allocations[0].reduction_native = "101",
    (s: MutableFixture) =>
      s.claim.sources[0].allocations[0].reduction_native = "1",
    (s: MutableFixture) =>
      s.claim.sources[0].allocations[0].country_name = "France",
    (s: MutableFixture) =>
      s.claim.sources[0].allocations[0].record_reference =
        s.claim.record_reference,
    (s: MutableFixture) =>
      s.claim.sources[0].allocations[0].income_source_references.push(
        "foreign-interest-receipt-1",
      ),
    (s: MutableFixture) =>
      s.claim.sources[0].fx.source_document = {
        ...s.claim.sources[0].source_document,
        document_sha256: "b".repeat(64),
      },
    (s: MutableFixture) => s.claim.accounting_method = "accrued",
    (s: MutableFixture) => s.claim.sources[0].gross_tax_native = "1.0000001",
    (s: MutableFixture) =>
      s.claim.sources[0].fx.usd_per_currency_unit = "1.000000001",
  ];
  for (const change of changes) {
    const raw = foreignTaxFixture2026();
    change(raw as unknown as MutableFixture);
    assertThrows(() => prepareForeignTaxSources2026(raw));
  }
  const raw = foreignTaxFixture2026(),
    source = structuredClone(raw.claim.sources[0]);
  source.record_reference = "copy";
  source.allocations[0].record_reference = "copy-allocation";
  raw.claim.sources.push(source);
  assertThrows(() => prepareForeignTaxSources2026(raw), Error, "Duplicate");
});
Deno.test("2026 foreign tax accepts both actual joint filers, keeps deduction election and rejects calculated input", () => {
  const raw = foreignTaxFixture2026();
  raw.filing_status = FilingStatus.MFJ;
  raw.spouse_ssn = "987654321";
  const s = structuredClone(raw.claim.sources[0]);
  if (s.kind !== "foreign_tax_payment") throw Error("fixture");
  s.taxpayer_tin = raw.spouse_ssn;
  s.record_reference = "spouse-tax";
  s.allocations[0].record_reference = "spouse-allocation";
  raw.claim.sources.push(s);
  raw.claim.election = "itemized_deduction";
  const r = prepareForeignTaxSources2026(raw);
  assertEquals(r.gross_tax_usd, 220.56);
  assertEquals(r.source_input.claim.election, "itemized_deduction");
  assertEquals(r.receipts.map((s) => s.taxpayer_tin), [
    "123456789",
    "987654321",
  ]);
  assertThrows(() =>
    foreignTaxSource2026Schema.parse({ ...raw, schedule3_line1: 220.56 })
  );
  raw.filing_status = FilingStatus.MFS;
  assertThrows(
    () => prepareForeignTaxSources2026(raw),
    Error,
    "actual return filer",
  );
});
