import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { extractFilerIdentity } from "../../../mef/filer.ts";
import { buildMefXml } from "../../../2025/mef/builder.ts";
import type { MefFormsPending } from "../../../2025/mef/types.ts";
import { inputNodes } from "../../../2025/inputs.ts";
import { registry } from "../../../2025/registry.ts";
import { FilingStatus } from "../../types.ts";
import {
  calculateNewMarketsRecapture,
  type NewMarketsRecaptureInput,
  recaptureSchema,
} from "./recapture.ts";
import { f8874_recapture } from "./recapture_node.ts";

const source: NewMarketsRecaptureInput = {
  notice_reference: "CDE 2025 Form 8874-B",
  investment_reference: "2022 QEI designation",
  cde_name: "Community Development Entity",
  cde_ein: "123456789",
  notice_taxpayer_tin: "111223333",
  initial_investment_date: "2022-05-01",
  qualified_equity_investment_amount: 100_000,
  notice_credit_amount: 25_000,
  recapture_event_date: "2025-06-01",
  recapture_event: "cde_redeemed_investment",
  prior_years: [{
    tax_year: 2024,
    original_return_due_date: "2025-04-15",
    section38_credit_allowed_as_filed: 9_000,
    section38_credit_allowed_without_this_qei: 7_000,
    recomputation_reference: "2024 Form 3800 recomputation",
  }],
  carryover_ledger_reference: "2024 Form 3800 Part IV and QEI workpaper",
  carryover_vintages: [{
    originating_tax_year: 2024,
    credit_generated_as_filed: 5_000,
    credit_carried_to_2025_before_recapture: 3_000,
    source_document_reference: "2024 QEI carryover workpaper",
    historical_uses: [{
      tax_year: 2024,
      credit_allowed: 2_000,
      return_reference: "2024 filed Form 3800",
    }],
  }],
};

Deno.test("New Markets recapture uses allowed-credit decrease, not notice credit", () => {
  const result = calculateNewMarketsRecapture({
    ...source,
    prior_years: [...source.prior_years],
  });
  assertEquals(result.creditDecrease, 2_000);
  assertEquals(result.carryforwardAdjustments, [{
    originatingTaxYear: 2024,
    investmentReference: "2022 QEI designation",
    sourceDocumentReference: "2024 QEI carryover workpaper",
    creditGeneratedAsFiled: 5_000,
    historicalUses: [{
      taxYear: 2024,
      creditAllowed: 2_000,
      returnReference: "2024 filed Form 3800",
    }],
    beforeRecapture: 3_000,
    removedFromQeiLedger: 3_000,
    availableAfterRecapture: 0,
  }]);
  const days2025 = (Date.UTC(2026, 0, 1) - Date.UTC(2025, 3, 15)) /
    86_400_000;
  const days2026q1 = (Date.UTC(2026, 3, 1) - Date.UTC(2026, 0, 1)) /
    86_400_000;
  const days2026q2 = (Date.UTC(2026, 3, 15) - Date.UTC(2026, 3, 1)) /
    86_400_000;
  const expectedInterest = Math.round(
    2_000 * (1 + 0.07 / 365) ** days2025 *
        (1 + 0.07 / 365) ** days2026q1 *
        (1 + 0.06 / 365) ** days2026q2 - 2_000,
  );
  assertEquals(result.interest, expectedInterest);
  assertEquals(result.schedule2Line17a, 2_000 + expectedInterest);
});

Deno.test("New Markets recapture excludes unused credit from tax and interest", () => {
  const result = calculateNewMarketsRecapture({
    ...source,
    prior_years: [{
      ...source.prior_years[0],
      section38_credit_allowed_without_this_qei: 9_000,
    }],
  });
  assertEquals(result.schedule2Line17a, 0);
  assertEquals(result.carryforwardAdjustments[0].removedFromQeiLedger, 3_000);
});

Deno.test("New Markets carryover records a sourced one-year carryback", () => {
  const result = calculateNewMarketsRecapture({
    ...source,
    prior_years: [{
      tax_year: 2023,
      original_return_due_date: "2024-04-15",
      section38_credit_allowed_as_filed: 2_000,
      section38_credit_allowed_without_this_qei: 0,
      recomputation_reference: "2023 amended Form 3800 carryback",
    }],
    carryover_vintages: [{
      ...source.carryover_vintages[0],
      historical_uses: [{
        tax_year: 2023,
        credit_allowed: 2_000,
        return_reference: "2023 amended Form 3800 carryback",
      }],
    }],
  });
  assertEquals(result.carryforwardAdjustments[0].historicalUses, [{
    taxYear: 2023,
    creditAllowed: 2_000,
    returnReference: "2023 amended Form 3800 carryback",
  }]);
});

Deno.test("New Markets recapture compounds through rate changes and leap year", () => {
  const priorYear = {
    ...source.prior_years[0],
    tax_year: 2022,
    original_return_due_date: "2023-04-18",
    section38_credit_allowed_as_filed: 10_000,
    section38_credit_allowed_without_this_qei: 0,
  };
  const result = calculateNewMarketsRecapture({
    ...source,
    qualified_equity_investment_amount: 200_000,
    prior_years: [priorYear],
    carryover_vintages: [],
  });
  const days = (from: string, to: string) =>
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
    86_400_000;
  const expectedInterest = Math.round(
    10_000 *
        (1 + 0.07 / 365) ** days("2023-04-18", "2023-10-01") *
        (1 + 0.08 / 365) ** days("2023-10-01", "2024-01-01") *
        (1 + 0.08 / 366) ** days("2024-01-01", "2025-01-01") *
        (1 + 0.07 / 365) ** days("2025-01-01", "2026-04-01") *
        (1 + 0.06 / 365) ** days("2026-04-01", "2026-04-15") - 10_000,
  );
  assertEquals(result.interest, expectedInterest);
});

Deno.test("New Markets substantially-all recapture requires cure review", () => {
  const failure = {
    ...source,
    recapture_event: "substantially_all_requirement_failed",
  };
  assertEquals(recaptureSchema.safeParse(failure).success, false);
  assertEquals(
    recaptureSchema.safeParse({
      ...failure,
      substantially_all_cure_exception_applies: true,
      substantially_all_cure_review_reference: "CDE cure records",
    }).success,
    false,
  );
  assertEquals(
    recaptureSchema.safeParse({
      ...failure,
      substantially_all_cure_exception_applies: false,
      substantially_all_cure_review_reference: "CDE cure records",
    }).success,
    true,
  );
  assertEquals(
    recaptureSchema.safeParse({
      ...source,
      substantially_all_cure_exception_applies: false,
      substantially_all_cure_review_reference: "Irrelevant cure records",
    }).success,
    false,
  );
});

Deno.test("New Markets recapture routes the computed total to Schedule 2", () => {
  const input = { ...source, prior_years: [...source.prior_years] };
  const result = f8874_recapture.compute(
    { taxYear: 2025, formType: "f1040" },
    { recaptures: [input] },
  );
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule2");
  assertEquals(
    result.outputs[0].fields.line17a_new_markets_credit_recapture,
    calculateNewMarketsRecapture(input).schedule2Line17a,
  );
});

Deno.test("New Markets recapture does not count one notice twice", () => {
  assertEquals(
    f8874_recapture.inputSchema.safeParse({
      recaptures: [source, source],
    }).success,
    false,
  );
});

Deno.test("New Markets recapture totals separate investments once", () => {
  const first = { ...source, prior_years: [...source.prior_years] };
  const second = {
    ...source,
    notice_reference: "Second CDE 2025 Form 8874-B",
    investment_reference: "Second 2022 QEI designation",
    prior_years: [{
      ...source.prior_years[0],
      section38_credit_allowed_as_filed: 10_000,
      section38_credit_allowed_without_this_qei: 9_500,
    }],
  };
  const result = f8874_recapture.compute(
    { taxYear: 2025, formType: "f1040" },
    { recaptures: [first, second] },
  );
  assertEquals(
    result.outputs[0].fields.line17a_new_markets_credit_recapture,
    calculateNewMarketsRecapture(first).schedule2Line17a +
      calculateNewMarketsRecapture(second).schedule2Line17a,
  );
});

Deno.test("New Markets recapture reaches a filed 1040 without Form 8874", () => {
  const general = {
    filing_status: FilingStatus.Single,
    taxpayer_first_name: "Test",
    taxpayer_last_name: "Taxpayer",
    taxpayer_ssn: "111-22-3333",
    taxpayer_dob: "1985-06-15",
    address_line1: "1 Test Way",
    address_city: "Austin",
    address_state: "TX",
    address_zip: "78701",
  };
  assertEquals(
    inputNodes.some((entry) => entry.node.nodeType === "f8874_recapture"),
    true,
  );
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      general,
      f8874_recapture: { recaptures: [source] },
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const expected = calculateNewMarketsRecapture({
    ...source,
    prior_years: [...source.prior_years],
  }).schedule2Line17a;
  assertEquals(
    result.pending.schedule2?.line17a_new_markets_credit_recapture,
    expected,
  );
  assertEquals(result.pending.f1040?.line23_other_taxes, expected);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertEquals(xml.includes("<IRS8874"), false);
  assertEquals(xml.includes("<OtherCreditsCd>NMCR</OtherCreditsCd>"), true);
});

Deno.test("New Markets recapture requires a statutory event and prior-year proof", () => {
  for (
    const invalid of [
      { ...source, recapture_event: "investment_sold" },
      { ...source, notice_reference: "" },
      { ...source, notice_credit_amount: 40_000 },
      { ...source, carryover_ledger_reference: "" },
      {
        ...source,
        carryover_vintages: [{
          ...source.carryover_vintages[0],
          historical_uses: [{
            tax_year: 2023,
            credit_allowed: 2_000,
            return_reference: "2023 amended Form 3800 carryback",
          }],
        }],
      },
      {
        ...source,
        carryover_vintages: [{
          ...source.carryover_vintages[0],
          historical_uses: [],
        }],
      },
      {
        ...source,
        carryover_vintages: [{
          ...source.carryover_vintages[0],
          historical_uses: [
            source.carryover_vintages[0].historical_uses[0],
            source.carryover_vintages[0].historical_uses[0],
          ],
        }],
      },
      {
        ...source,
        carryover_vintages: [{
          ...source.carryover_vintages[0],
          historical_uses: [{
            ...source.carryover_vintages[0].historical_uses[0],
            tax_year: 2021,
          }],
        }],
      },
      {
        ...source,
        prior_years: [{
          ...source.prior_years[0],
          section38_credit_allowed_as_filed: 1_000,
          section38_credit_allowed_without_this_qei: 0,
        }],
      },
      {
        ...source,
        carryover_vintages: [
          { ...source.carryover_vintages[0], credit_generated_as_filed: 6_000 },
        ],
      },
      {
        ...source,
        carryover_vintages: [
          {
            ...source.carryover_vintages[0],
            credit_carried_to_2025_before_recapture: 6_000,
          },
        ],
      },
      {
        ...source,
        carryover_vintages: [
          source.carryover_vintages[0],
          source.carryover_vintages[0],
        ],
      },
      { ...source, prior_years: [] },
      { ...source, initial_investment_date: "2017-01-01" },
      { ...source, recapture_event_date: "2026-01-01" },
      {
        ...source,
        prior_years: [{
          ...source.prior_years[0],
          section38_credit_allowed_without_this_qei: 10_000,
        }],
      },
      {
        ...source,
        prior_years: [{
          ...source.prior_years[0],
          section38_credit_allowed_as_filed: 40_000,
          section38_credit_allowed_without_this_qei: 0,
        }],
      },
      {
        ...source,
        prior_years: [...source.prior_years, source.prior_years[0]],
      },
    ]
  ) {
    assertEquals(recaptureSchema.safeParse(invalid).success, false);
  }
});
