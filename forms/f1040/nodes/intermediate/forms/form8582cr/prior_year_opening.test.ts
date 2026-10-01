import { assertEquals, assertThrows } from "@std/assert";
import { reconcileForm8582CR2024OpeningCandidate } from "./prior_year_opening.ts";

const priorSource = {
  activity_reference: "Community investment",
  source_form: "Form 8874",
  source_document_reference: "2024 Community QEI record",
  source_origin: { kind: "self" as const },
  category: "other" as const,
  reporting_route: "form3800_line3" as const,
  form3800_credit_line: "1i" as const,
  current_year_credit: 500,
  prior_unallowed_credits: [],
  publicly_traded_partnership: false,
};
const candidate = {
  tax_year: 2024 as const,
  taxpayer_tin: "111223333",
  return_copy_reference: "2024 retained Form 1040 copy",
  form8582cr_copy_reference: "2024 retained Form 8582-CR copy",
  no_recapture_or_bankruptcy_transfer_reviewed: true as const,
  source: priorSource,
  form8582cr_line5: 500,
  form8582cr_line37: 300,
};
const current = {
  credit_sources: [{
    ...priorSource,
    current_year_credit: 0,
    prior_unallowed_credits: [{
      originating_tax_year: 2024,
      credit_amount: 200,
      source_document_reference: priorSource.source_document_reference,
    }],
  }],
  regular_tax_all_income: 10_000,
  regular_tax_without_passive: 9_000,
};
const general = { taxpayer_ssn: "111-22-3333" };

Deno.test("reviewed 2024 single-credit copies reconcile a 2025 activity/year opening candidate", () => {
  const opening = reconcileForm8582CR2024OpeningCandidate(
    candidate,
    current,
    general,
  );
  assertEquals(opening.originating_tax_year, 2024);
  assertEquals(opening.prior_unallowed_credit, 200);
  assertEquals(opening.preview_line4b, 200);
  assertEquals(opening.preview_line5, 200);
  assertEquals(opening.preview_line37, 200);
  assertEquals(opening.preview_form3800_passive_allocation.allowed_credit, 200);
  assertEquals(opening.source.activity_reference, "Community investment");
  assertEquals(opening.source.prior_unallowed_credits[0].credit_amount, 200);
});

Deno.test("2024 opening candidate rejects tax, source, origin, and prior-copy drift", () => {
  const changed = [
    [{ ...candidate, taxpayer_tin: "999887777" }, current, general],
    [{ ...candidate, form8582cr_line37: 301 }, current, general],
    [
      { ...candidate, no_recapture_or_bankruptcy_transfer_reviewed: false },
      current,
      general,
    ],
    [candidate, {
      ...current,
      credit_sources: [{
        ...current.credit_sources[0],
        activity_reference: "Different activity",
      }],
    }, general],
    [candidate, {
      ...current,
      credit_sources: [{
        ...current.credit_sources[0],
        prior_unallowed_credits: [{
          ...current.credit_sources[0].prior_unallowed_credits[0],
          originating_tax_year: 2023,
        }],
      }],
    }, general],
    [candidate, {
      ...current,
      credit_sources: [{
        ...current.credit_sources[0],
        prior_unallowed_credits: [{
          ...current.credit_sources[0].prior_unallowed_credits[0],
          source_document_reference: "Different 2024 credit copy",
        }],
      }],
    }, general],
  ] as const;
  for (const [prior, thisYear, taxpayer] of changed) {
    assertThrows(
      () => reconcileForm8582CR2024OpeningCandidate(prior, thisYear, taxpayer),
      Error,
    );
  }
});
