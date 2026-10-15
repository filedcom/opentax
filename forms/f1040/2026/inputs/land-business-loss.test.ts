import { assertEquals, assertThrows } from "@std/assert";
import { landBusinessLossFixture2026 } from "./land-business-loss.fixture.ts";
import {
  finalizeLandBusinessLoss2026,
  landBusinessLossSource2026Schema,
} from "./land-business-loss.ts";
import {
  calculateBusinessLoss2026,
  calculateBusinessLossAmounts2026,
} from "./business-loss-source.ts";
import { businessLossFixture2026 } from "./business-loss.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";

Deno.test("2026 land loss owner derives 461 before finalizing a deductible 1231 vintage", () => {
  const f = landBusinessLossFixture2026(), before = structuredClone(f);
  assertThrows(
    () => calculateBusinessLoss2026(f.loss_sources),
    Error,
    "amount taken into account",
  );
  const preliminary = calculateBusinessLossAmounts2026(f.loss_sources);
  assertEquals(preliminary.lines.line4, -400000);
  assertEquals(preliminary.schedule1_line8p, 144000);
  assertEquals(preliminary.capital.land!.calculation.history_finalized, false);
  assertEquals("history" in preliminary.capital.land!.calculation, false);
  const r = finalizeLandBusinessLoss2026(f);
  assertEquals(r.finalized_loss, {
    amount_taken_into_account: 256000,
    finalized_limitation_workpaper_reference: f.record_reference,
  });
  assertEquals(r.calculation.capital.land!.calculation.opening_2027_losses, [
    { loss_year: 2026, remaining_loss: 256000 },
  ]);
  assertEquals(r.loss_attribution.disallowed_section1231_loss, 144000);
  assertEquals(r.calculation.lines, preliminary.lines);
  assertEquals(f, before);
});
Deno.test("2026 land loss owner preserves filing thresholds and full loss when no EBL applies", () => {
  for (
    const [loss, file, excess] of [[128000, false, 0], [128001, true, 0], [
      256000,
      true,
      0,
    ], [256001, true, 1]] as const
  ) {
    const r = finalizeLandBusinessLoss2026(landBusinessLossFixture2026(-loss));
    assertEquals([r.calculation.file_form461, r.calculation.schedule1_line8p], [
      file,
      excess,
    ]);
    assertEquals(r.finalized_loss!.amount_taken_into_account, loss - excess);
  }
});
Deno.test("2026 land loss allocation reconciles C, long and short source buckets with stable rounding", () => {
  const f = landBusinessLossFixture2026(-400000);
  f.loss_sources.business_sources =
    businessLossFixture2026([-200000]).business_sources;
  const sales =
    f.loss_sources.capital_sources.land_sources_2026!.source.claim.sales;
  const short = structuredClone(sales[0]);
  Object.assign(short, {
    sale_reference: "short-sale",
    property_reference: "short-parcel",
    acquisition_record_reference: "short-purchase",
    acquired_on: "2026-01-01",
    purchase_price: 200000,
  });
  short.closing.closing_record_reference = "short-closing";
  sales.push(short);
  const r = finalizeLandBusinessLoss2026(f);
  assertEquals(r.calculation.lines.line4, -500000);
  assertEquals(r.calculation.schedule1_line8p, 444000);
  const buckets = r.loss_attribution.buckets;
  assertEquals(
    buckets.find((b) => b.kind === "schedule_c")!.disallowed_loss,
    126857,
  );
  assertEquals(
    buckets.find((b) => b.kind === "net_section1231")!.disallowed_loss,
    253714,
  );
  assertEquals(
    buckets.find((b) => b.kind === "short_land")!.disallowed_loss,
    63429,
  );
  assertEquals(r.finalized_loss!.amount_taken_into_account, 146286);
  assertEquals(buckets.reduce((n, b) => n + b.amount_after_limit, 0), -256000);
  sales.reverse();
  assertEquals(
    finalizeLandBusinessLoss2026(f).loss_attribution.buckets,
    buckets,
  );
});
Deno.test("2026 land loss owner includes the actual half-SE deduction once in reviewed source buckets", () => {
  const f = landBusinessLossFixture2026(-400000);
  f.loss_sources.business_sources =
    businessLossFixture2026([50000]).business_sources;
  const r = finalizeLandBusinessLoss2026(f);
  const half = r.calculation.business!.schedule1_line15;
  assertEquals(r.calculation.lines.line14, -350000 - half);
  assertEquals(
    r.loss_attribution.buckets.find((b) => b.kind === "deductible_half_se")!
      .amount,
    -half,
  );
  assertEquals(
    r.loss_attribution.buckets.reduce((n, b) => n + b.disallowed_loss, 0),
    94000 + half,
  );
  assertEquals(
    r.loss_attribution.buckets.reduce((n, b) => n + b.amount_after_limit, 0),
    -256000,
  );
});
Deno.test("2026 land loss owner preserves recapture and capped capital offsets for gain years", () => {
  const f = landBusinessLossFixture2026(45000);
  f.loss_sources.business_sources =
    businessLossFixture2026([-400000]).business_sources;
  const r = finalizeLandBusinessLoss2026(f);
  assertEquals([
    r.calculation.lines.line4,
    r.calculation.capital.line11_form4797,
    r.calculation.schedule1_line8p,
  ], [5000, 40000, 99000]);
  assertEquals(r.finalized_loss, undefined);
  assertEquals(r.loss_attribution.disallowed_section1231_loss, 0);
  assertEquals(
    r.loss_attribution.buckets.find((b) => b.kind === "schedule_c")!
      .disallowed_loss,
    99000,
  );
});
Deno.test("2026 land loss owner applies the joint threshold and preserves filed joint history", () => {
  const f = landBusinessLossFixture2026(-600000),
    l = f.loss_sources,
    c = l.capital_sources,
    land = c.land_sources_2026!.source;
  l.filing_status = c.filing_status = land.filing_status = FilingStatus.MFJ;
  l.spouse_ssn = c.spouse_ssn = land.spouse_ssn = "987654321";
  land.claim.prior_history.owner.spouse_ssn = "987654321";
  for (const year of land.claim.prior_history.filed_years) {
    year.owner.spouse_ssn = "987654321";
  }
  const r = finalizeLandBusinessLoss2026(f);
  assertEquals([
    r.calculation.lines.line15,
    r.calculation.schedule1_line8p,
    r.finalized_loss!.amount_taken_into_account,
  ], [512000, 88000, 512000]);
});
Deno.test("2026 land loss owner rejects stale deductible amounts and incomplete activity reviews", () => {
  const f = landBusinessLossFixture2026();
  f.loss_sources.capital_sources.land_sources_2026!.finalized_loss = {
    amount_taken_into_account: 1,
    finalized_limitation_workpaper_reference: "stale",
  };
  assertThrows(
    () => finalizeLandBusinessLoss2026(f),
    Error,
    "cannot contain a finalized loss",
  );
  delete f.loss_sources.capital_sources.land_sources_2026!.finalized_loss;
  f.allocation_review.land_activities.push({
    ...f.allocation_review.land_activities[0],
  });
  assertThrows(
    () => finalizeLandBusinessLoss2026(f),
    Error,
    "every land owner/activity once",
  );
  f.allocation_review.land_activities.pop();
  f.allocation_review.land_activities[0].owner_tin = "987654321";
  assertThrows(
    () => finalizeLandBusinessLoss2026(f),
    Error,
    "every land owner/activity once",
  );
  assertEquals(
    landBusinessLossSource2026Schema.safeParse({
      ...landBusinessLossFixture2026(),
      allowed_loss: 256000,
    }).success,
    false,
  );
});
Deno.test("2026 farm loss needs its NOL allocation when EBL applies but finalizes full losses below the limit", () => {
  const f = landBusinessLossFixture2026();
  f.allocation_review.land_activities[0].farming_business = true;
  assertThrows(() => finalizeLandBusinessLoss2026(f), Error, "Form 172");
  const sale =
    f.loss_sources.capital_sources.land_sources_2026!.source.claim.sales[0];
  sale.purchase_price = 200000;
  const r = finalizeLandBusinessLoss2026(f);
  assertEquals(r.finalized_loss!.amount_taken_into_account, 100000);
  assertEquals(r.calculation.schedule1_line8p, 0);
});
