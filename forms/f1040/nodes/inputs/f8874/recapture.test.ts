import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { extractFilerIdentity } from "../../../mef/filer.ts";
import { buildMefXml } from "../../../2025/mef/builder.ts";
import type { MefFormsPending } from "../../../2025/mef/types.ts";
import { inputNodes } from "../../../2025/inputs.ts";
import { registry } from "../../../2025/registry.ts";
import { FilingStatus } from "../../types.ts";
import { calculateNewMarketsRecapture, recaptureSchema } from "./recapture.ts";
import { f8874_recapture } from "./recapture_node.ts";

const source = {
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
    original_unused_qei_credit: 3_000,
    recomputed_unused_qei_credit: 0,
    recomputation_reference: "2024 Form 3800 recomputation",
  }],
} as const;

Deno.test("New Markets recapture uses allowed-credit decrease, not notice credit", () => {
  const result = calculateNewMarketsRecapture({
    ...source,
    prior_years: [...source.prior_years],
  });
  assertEquals(result.creditDecrease, 2_000);
  assertEquals(result.years[0].carryforwardAdjustment, 3_000);
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
  assertEquals(result.years[0].carryforwardAdjustment, 3_000);
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
      original_unused_qei_credit: 0,
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
        prior_years: [...source.prior_years, source.prior_years[0]],
      },
    ]
  ) {
    assertEquals(recaptureSchema.safeParse(invalid).success, false);
  }
});
