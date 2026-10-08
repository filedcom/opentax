import { assertThrows } from "@std/assert";
import { assertEicSource } from "./eic-source.ts";

Deno.test("export rejects a positive EIC attached to a filed Form 2555", () => {
  assertThrows(
    () =>
      assertEicSource("single", 500, true, {
        eitc: {
          credit_amount: 500,
          qualifying_children: 0,
          investment_income_floor: 0,
        },
        form2555: { filing_details: { foreign_wages: 1 } },
      }),
    Error,
    "cannot accompany a filed Form 2555",
  );
});

Deno.test("export rejects a positive EIC without its matching calculation", () => {
  assertThrows(
    () => assertEicSource("single", 500, true, {}),
    Error,
    "needs its matching calculation source",
  );
});

Deno.test("export rejects a positive EIC without reviewed prior history", () => {
  assertThrows(
    () =>
      assertEicSource("single", 500, true, {
        general: { filing_status: "single" },
        eitc: {
          credit_amount: 500,
          qualifying_children: 0,
          investment_income_floor: 0,
        },
      }),
    Error,
    "reviewed prior-disallowance history",
  );
});

Deno.test("export rejects EIC when K-1 Form 4797 line 10 passive character is unknown", () => {
  for (const amount of [12_000, -500]) {
    assertThrows(
      () =>
        assertEicSource("single", 500, true, {
          eitc: {
            credit_amount: 500,
            qualifying_children: 0,
            investment_income_floor: 0,
          },
          form4797: {
            k1_box11_line10_rows: [{
              partnership_name: "Sample Partnership",
              partnership_ein: "123456789",
              source_document_reference: "reviewed-k1",
              code: "R",
              gain_loss: amount,
              statement_reference: "box11-statement",
              recipient_tin: "123456789",
              character_workpaper_reference: "ordinary-character-workpaper",
            }],
          },
        }),
      Error,
      "needs passive-activity classification for partnership K-1 Form 4797 line 10 amounts",
    );
  }
});

Deno.test("export rejects passive K-1 Form 4797 line 10 without finalized loss facts", () => {
  for (const gainLoss of [500, -500]) {
    assertThrows(
      () =>
        assertEicSource("single", 100, true, {
          eitc: {
            credit_amount: 100,
            qualifying_children: 0,
            investment_income_floor: 0,
          },
          form4797: {
            k1_box11_line10_rows: [{
              partnership_name: "Sample Partnership",
              partnership_ein: "123456789",
              source_document_reference: "reviewed-k1",
              code: "R",
              gain_loss: gainLoss,
              statement_reference: "box11-statement",
              recipient_tin: "123456789",
              character_workpaper_reference: "ordinary-character-workpaper",
              eic_activity_review: {
                classification: "passive",
                activity_statement_reference: "activity-statement",
                participation_workpaper_reference: "participation-review",
                partnership_not_publicly_traded_verified: true,
                ...(gainLoss < 0
                  ? {
                    no_current_or_prior_unallowed_loss_for_activity_verified:
                      true,
                  }
                  : {}),
              },
            }],
          },
        }),
      Error,
      "needs a finalized Form 8582 loss allocation",
    );
  }
});

Deno.test("export rejects a positive EIC with a matching over-limit Worksheet 1 total", () => {
  assertThrows(
    () =>
      assertEicSource("single", 500, true, {
        f1040: { line2a_tax_exempt: 11_951 },
        eitc: {
          credit_amount: 500,
          qualifying_children: 0,
          investment_income_floor: 11_951,
        },
      }),
    Error,
    "investment income exceeds the 2025 limit",
  );
});
