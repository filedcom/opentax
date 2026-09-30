import { assertEquals } from "@std/assert";
import { buildPending } from "./pending.ts";

Deno.test("MeF pending keeps finalized worksheet context", () => {
  const pending = buildPending({
    form8978_reporting_year: {
      schedule3_line6l: 500,
      schedule2_line17z_reduction: 100,
    },
    f1040: { line24_total_tax: 900 },
  });
  assertEquals(
    (pending as Record<string, unknown>).form8978_reporting_year,
    { schedule3_line6l: 500, schedule2_line17z_reduction: 100 },
  );
  assertEquals(pending.f1040?.line24_total_tax, 900);
});

Deno.test("MeF pending retains Form 8949 transaction provenance for Form 8854 reconciliation", () => {
  const transaction = {
    part: "F",
    description: "Deemed sale of shares",
    source_transaction_id: "deemed-sale-1",
    date_acquired: "2020-01-01",
    date_sold: "2025-06-30",
    proceeds: 1000,
    cost_basis: 500,
    gain_loss: 500,
    is_long_term: true,
  };
  const pending = buildPending({ form8949: { transaction } });
  assertEquals(pending.form8949?.[0].source_transaction_id, "deemed-sale-1");
});

Deno.test("MeF pending files unadjusted broker-basis sales on Schedule D only", () => {
  const direct = {
    part: "A",
    description: "Broker shares",
    date_acquired: "2025-01-10",
    date_sold: "2025-06-20",
    proceeds: 2_000,
    cost_basis: 1_000,
    gain_loss: 1_000,
    is_long_term: false,
  };
  const adjusted = {
    ...direct,
    adjustment_codes: "W",
    adjustment_amount: 100,
    gain_loss: 1_100,
  };
  const pending = buildPending({
    form8949: { transaction: [direct, adjusted] },
    schedule_d: { transaction: [direct, adjusted] },
  });
  assertEquals(pending.form8949, [adjusted]);
  assertEquals(pending.schedule_d?.transaction, [direct, adjusted]);
});

Deno.test("MeF pending excludes source-only Form 8960 but retains its completed calculation", () => {
  const sourceOnly = buildPending({
    form8960: {
      filing_status: "single",
      magi: 5_000,
      line1_taxable_interest: 5_000,
    },
  });
  assertEquals(sourceOnly.form8960, undefined);

  const calculated = buildPending({
    form8960: {
      filing_status: "single",
      line1_taxable_interest: 5_000,
      line13_magi: 230_000,
      line14_threshold: 200_000,
      line17_niit: 190,
    },
  });
  assertEquals(calculated.form8960?.line17_niit, 190);
});
