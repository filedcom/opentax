import { assertEquals, assertThrows } from "@std/assert";
import { reconcileForm8582CR2024OpeningCandidate } from "./prior_year_opening.ts";

const source2023 = {
  activity_reference: "Community investment A",
  source_form: "Form 8874",
  source_document_reference: "2023 Community QEI A",
  source_origin: { kind: "self" as const },
  category: "other" as const,
  reporting_route: "form3800_line3" as const,
  form3800_credit_line: "1i" as const,
  current_year_credit: 500,
  prior_unallowed_credits: [],
  publicly_traded_partnership: false,
};
const source2024 = {
  ...source2023,
  activity_reference: "Community investment B",
  source_document_reference: "2024 Community QEI B",
  current_year_credit: 400,
};
const carried2023 = {
  ...source2023,
  current_year_credit: 0,
  prior_unallowed_credits: [{
    originating_tax_year: 2023,
    credit_amount: 200,
    source_document_reference: source2023.source_document_reference,
  }],
};
const candidate = {
  taxpayer_tin: "111223333",
  no_recapture_or_bankruptcy_transfer_reviewed: true as const,
  prior_2023: {
    tax_year: 2023 as const,
    return_copy_reference: "2023 Form 1040 copy",
    form8582cr_copy_reference: "2023 Form 8582-CR copy",
    single_activity_credit_type_reviewed: true as const,
    source: source2023,
    form8582cr_line5: 500,
    form8582cr_line37: 300,
  },
  prior_2024: {
    tax_year: 2024 as const,
    return_copy_reference: "2024 Form 1040 copy",
    form8582cr_copy_reference: "2024 Form 8582-CR copy",
    form8582cr_line5: 600,
    form8582cr_line37: 300,
    worksheet9_rows: [{
      source: carried2023,
      originating_tax_year: 2023 as const,
      column_a_credit: 200,
      column_b_unallowed: 100,
      column_c_allowed: 100,
    }, {
      source: source2024,
      originating_tax_year: 2024 as const,
      column_a_credit: 400,
      column_b_unallowed: 200,
      column_c_allowed: 200,
    }],
  },
};
const current = {
  credit_sources: [
    {
      ...carried2023,
      prior_unallowed_credits: [{
        ...carried2023.prior_unallowed_credits[0],
        credit_amount: 100,
      }],
    },
    {
      ...source2024,
      current_year_credit: 0,
      prior_unallowed_credits: [{
        originating_tax_year: 2024,
        credit_amount: 200,
        source_document_reference: source2024.source_document_reference,
      }],
    },
  ],
  regular_tax_all_income: 10_000,
  regular_tax_without_passive: 9_000,
};
const general = { taxpayer_ssn: "111-22-3333" };

Deno.test("two distinct 2023/2024 activity vintages reconcile prior lines and Worksheet 9 into a 2025 opening candidate", () => {
  const opening = reconcileForm8582CR2024OpeningCandidate(
    candidate,
    current,
    general,
  );
  assertEquals(opening.rows.map((row) => row.originating_tax_year), [
    2023,
    2024,
  ]);
  assertEquals(opening.rows.map((row) => row.prior_unallowed_credit), [
    100,
    200,
  ]);
  assertEquals(opening.preview_line4b, 300);
  assertEquals(opening.preview_line5, 300);
  assertEquals(opening.preview_line37, 300);
  assertEquals(
    opening.preview_form3800_passive_allocations.reduce(
      (sum, row) => sum + row.allowed_credit,
      0,
    ),
    300,
  );
});

Deno.test("two-vintage opening candidate rejects changed prior totals, row, activity, year and taxpayer", () => {
  const changed = [
    [{ ...candidate, taxpayer_tin: "999887777" }, current],
    [{
      ...candidate,
      prior_2023: { ...candidate.prior_2023, form8582cr_line37: 301 },
    }, current],
    [{
      ...candidate,
      prior_2023: {
        ...candidate.prior_2023,
        single_activity_credit_type_reviewed: false,
      },
    }, current],
    [{
      ...candidate,
      prior_2024: { ...candidate.prior_2024, form8582cr_line5: 601 },
    }, current],
    [{
      ...candidate,
      prior_2024: { ...candidate.prior_2024, form8582cr_line37: 301 },
    }, current],
    [{
      ...candidate,
      prior_2024: {
        ...candidate.prior_2024,
        worksheet9_rows: [
          {
            ...candidate.prior_2024.worksheet9_rows[0],
            column_b_unallowed: 101,
          },
          candidate.prior_2024.worksheet9_rows[1],
        ],
      },
    }, current],
    [candidate, {
      ...current,
      credit_sources: [
        {
          ...current.credit_sources[0],
          activity_reference: "Different activity",
        },
        current.credit_sources[1],
      ],
    }],
    [candidate, {
      ...current,
      credit_sources: [
        current.credit_sources[0],
        {
          ...current.credit_sources[1],
          prior_unallowed_credits: [{
            ...current.credit_sources[1].prior_unallowed_credits[0],
            originating_tax_year: 2023,
          }],
        },
      ],
    }],
    [candidate, {
      ...current,
      credit_sources: [
        current.credit_sources[0],
        {
          ...current.credit_sources[1],
          prior_unallowed_credits: [{
            ...current.credit_sources[1].prior_unallowed_credits[0],
            source_document_reference: "Changed 2024 credit source",
          }],
        },
      ],
    }],
    [
      { ...candidate, no_recapture_or_bankruptcy_transfer_reviewed: false },
      current,
    ],
  ] as const;
  for (const [prior, thisYear] of changed) {
    assertThrows(
      () => reconcileForm8582CR2024OpeningCandidate(prior, thisYear, general),
      Error,
    );
  }
});
