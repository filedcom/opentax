import { assertEquals, assertThrows } from "@std/assert";
import { earlyCases, earlyFixture } from "./form8835_early.fixture.ts";
import { itemSchema } from "../../../../../nodes/inputs/credits/business/f8835/index.ts";
import {
  assertForm8835EarlyConstructionSource,
  form8835ContinuityDeadline,
} from "../../../../../nodes/inputs/credits/business/f8835/early-construction-source.ts";

Deno.test("Form8835 continuity notice deadlines include the 2016-2020 extensions", () => {
  for (
    const [start, deadline] of [
      ["2016-06-01", "2022-12-31"],
      ["2017-06-01", "2023-12-31"],
      ["2018-06-01", "2024-12-31"],
      ["2019-06-01", "2025-12-31"],
      ["2020-06-01", "2025-12-31"],
      ["2021-06-01", "2025-12-31"],
      ["2022-06-01", "2026-12-31"],
      ["2023-01-28", "2027-12-31"],
    ]
  ) assertEquals(form8835ContinuityDeadline(start), deadline);
});

Deno.test("Form8835 coherent service-date change cannot extend the continuity safe harbor", async () => {
  const fixture = await earlyFixture(earlyCases[2]);
  const item = itemSchema.parse(fixture.input.f8835[0]);
  assertForm8835EarlyConstructionSource(item, true);
  item.facility_placed_in_service_date = "2023-01-01";
  item.early_construction_source!.placed_in_service_on = "2023-01-01";
  assertThrows(
    () => assertForm8835EarlyConstructionSource(item, true),
    Error,
    "safe harbor expired",
  );
});

Deno.test("Form8835 cost overrun moves the first five-percent date even with balanced final costs", async () => {
  const fixture = await earlyFixture(earlyCases[1]);
  const item = itemSchema.parse(fixture.input.f8835[0]);
  assertForm8835EarlyConstructionSource(item, true);
  const start = item.early_construction_source!.beginning;
  if (start.method !== "five_percent") throw new Error("Expected cost fixture");
  start.final_total_cost_cents++;
  start.costs[2].eligible_cost_cents++;
  assertThrows(
    () => assertForm8835EarlyConstructionSource(item, true),
    Error,
    "first qualifying date",
  );
});

Deno.test("Form8835 source schemas reject invented dates and unsupported continuity claims", async () => {
  const fixture = await earlyFixture(earlyCases[4]);
  const item = structuredClone(fixture.input.f8835[0]) as any;
  item.early_construction_source.beginning.work_began_on = "2015-02-30";
  assertThrows(() => itemSchema.parse(item));
  item.early_construction_source.beginning.work_began_on = "2015-06-01";
  item.early_construction_source.continuity.history[0]
    .continuity_requirement_for_period_reviewed = false;
  assertThrows(() => itemSchema.parse(item));
});
