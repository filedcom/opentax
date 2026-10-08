import { assertEquals, assertThrows } from "@std/assert";
import {
  buildCurrentYearCarryforwardLedger,
  currentYearCarryforwardLedgerSchema,
} from "./carryforward-ledger.ts";
import { reconcileForm8582CRNextYearOpening } from "./next_year_import.ts";
import { PassiveCreditReportingRoute } from "./credit-route.ts";
import { PassiveCreditCategory, PassiveCreditSourceOrigin } from "./source.ts";

const source = {
  activity_reference: "new-markets-investment-2025",
  source_form: "Form 8874",
  source_document_reference: "8874-investment-2025",
  source_origin: { kind: PassiveCreditSourceOrigin.Self as const },
  category: PassiveCreditCategory.Other,
  current_year_credit: 1_000,
  prior_unallowed_credits: [],
  publicly_traded_partnership: false,
  reporting_route: PassiveCreditReportingRoute.Form3800Line3 as const,
  form3800_credit_line: "1i" as const,
};

Deno.test("Form 8582-CR current-year ledger retains activity, route, and 2025 unallowed credit", () => {
  const ledger = buildCurrentYearCarryforwardLedger({
    credit_sources: [source],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_500,
  });
  assertEquals(ledger.tax_year, 2025);
  assertEquals(ledger.total_credit, 1_000);
  assertEquals(ledger.allowed_credit, 500);
  assertEquals(ledger.unallowed_credit, 500);
  assertEquals(
    ledger.rows[0].source.activity_reference,
    source.activity_reference,
  );
  assertEquals(ledger.rows[0].source.reporting_route, source.reporting_route);
  assertEquals(ledger.rows[0].originating_tax_year, 2025);
  assertEquals(ledger.rows[0].unallowed_credit, 500);
  assertThrows(
    () =>
      currentYearCarryforwardLedgerSchema.parse({
        ...ledger,
        rows: [{ ...ledger.rows[0], unallowed_credit: 499 }],
      }),
    Error,
    "does not reconcile",
  );
});

Deno.test("Form 8582-CR current-year ledger rejects unverified prior vintage", () => {
  assertThrows(
    () =>
      buildCurrentYearCarryforwardLedger({
        credit_sources: [{
          ...source,
          prior_unallowed_credits: [{
            originating_tax_year: 2024,
            credit_amount: 200,
            source_document_reference: "2024-worksheet-9",
          }],
        }],
        regular_tax_all_income: 10_000,
        regular_tax_without_passive: 9_500,
      }),
    Error,
    "prior vintages need filed Worksheet 9",
  );
});

Deno.test("Form 8582-CR 2026 opening replays filed 2025 Worksheet 9 source and credit", () => {
  const original = {
    credit_sources: [source],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_500,
  };
  const ledger = buildCurrentYearCarryforwardLedger(original);
  const accepted = "accepted-2025-return-1";
  const filed = { accepted_return_reference: accepted, ledger };
  const opening = {
    tax_year: 2026 as const,
    prior_accepted_return_reference: accepted,
    rows: [{
      source,
      originating_tax_year: 2025 as const,
      prior_unallowed_credit: 500,
    }],
  };
  assertEquals(
    reconcileForm8582CRNextYearOpening(opening, filed, original, accepted),
    opening,
  );
  const reject = (
    next: unknown,
    prior: unknown = filed,
    input: unknown = original,
  ) =>
    assertThrows(() =>
      reconcileForm8582CRNextYearOpening(
        next,
        prior,
        input,
        accepted,
      )
    );
  reject({ ...opening, rows: [] });
  reject({ ...opening, rows: [opening.rows[0], opening.rows[0]] });
  reject({
    ...opening,
    rows: [{ ...opening.rows[0], prior_unallowed_credit: 499 }],
  });
  reject({
    ...opening,
    rows: [{
      ...opening.rows[0],
      source: {
        ...source,
        source_document_reference: "different-8874",
      },
    }],
  });
  reject({ ...opening, prior_accepted_return_reference: "another-return" });
  reject(opening, { ...filed, ledger: { ...ledger, unallowed_credit: 499 } });
  reject(opening, filed, { ...original, regular_tax_without_passive: 9_400 });
});

Deno.test("Form 8582-CR line 6 rejects an inverted or fractional tax pair", () => {
  assertThrows(
    () =>
      buildCurrentYearCarryforwardLedger({
        credit_sources: [source],
        regular_tax_all_income: 10_000,
        regular_tax_without_passive: 10_001,
      }),
    Error,
    "cannot exceed tax on all income",
  );
  assertThrows(
    () =>
      buildCurrentYearCarryforwardLedger({
        credit_sources: [source],
        regular_tax_all_income: 10_000.5,
        regular_tax_without_passive: 9_500,
      }),
    Error,
  );
});
