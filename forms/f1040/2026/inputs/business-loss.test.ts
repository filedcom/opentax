import { assertEquals, assertThrows } from "@std/assert";
import {
  businessLossSource2026Schema,
  calculateBusinessLoss2026,
} from "./business-loss-source.ts";
import { businessLossFixture2026 } from "./business-loss.fixture.ts";
import { landCapitalFixture2026 } from "./land-capital.fixture.ts";
import { business, payment, wage } from "./business.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { businessGraphFixture2026 } from "./business-qbi.fixture.ts";

Deno.test("2026 Form 461 reproduces the new draft's 400000 loss and 50000 income example", () => {
  const f = businessLossFixture2026(), before = structuredClone(f);
  const r = calculateBusinessLoss2026(f);
  assertEquals(r.lines, {
    line2: -350000,
    line3: 0,
    line4: 0,
    line5: 0,
    line6: 0,
    line8: -0,
    line10: 0,
    line11: 0,
    line9: -350000,
    line12: 0,
    line13: -0,
    line14: -350000,
    line15: 256000,
    line16: -94000,
    excess_business_loss: 94000,
    must_file: true,
  });
  assertEquals(r.schedule1_line8p, 94000);
  assertEquals(r.carryforward, {
    origin_tax_year: 2026,
    first_carryforward_tax_year: 2027,
    amount: 94000,
    source_reference: f.record_reference,
    kind: "section461l_nol_origin",
    attribution_pending: true,
  });
  assertEquals(f, before);
});
Deno.test("2026 Form 461 separates strict per-line filing and excess-loss boundaries", () => {
  for (
    const [loss, file, excess] of [
      [128000, false, 0],
      [128001, true, 0],
      [255999, true, 0],
      [256000, true, 0],
      [256001, true, 1],
    ] as const
  ) {
    const r = calculateBusinessLoss2026(businessLossFixture2026([-loss]));
    assertEquals([r.file_form461, r.schedule1_line8p], [file, excess]);
  }
  // Filing tests the aggregated printed line, not each business separately.
  assertEquals(
    calculateBusinessLoss2026(businessLossFixture2026([-200000, 200000]))
      .file_form461,
    false,
  );
});
Deno.test("2026 Form 461 combines both spouses before a single joint threshold", () => {
  const f = businessLossFixture2026([-250000, -262001]);
  f.filing_status = FilingStatus.MFJ;
  f.spouse_ssn = "987654321";
  f.business_sources!.filing_status = FilingStatus.MFJ;
  f.business_sources!.spouse_tin = f.spouse_ssn;
  f.business_sources!.businesses[1].owner_tin = f.spouse_ssn;
  f.capital_sources.filing_status = FilingStatus.MFJ;
  f.capital_sources.spouse_ssn = f.spouse_ssn;
  const r = calculateBusinessLoss2026(f);
  assertEquals([r.lines.line14, r.lines.line15, r.schedule1_line8p], [
    -512001,
    512000,
    1,
  ]);
});
Deno.test("2026 Form 461 removes investment losses and caps business capital gains against overall net", () => {
  for (
    const [stockNet, line3, businessCap, nonbusinessGain, removedLoss, excess]
      of [
        [50000, 90000, 40000, 50000, 0, 99000],
        [-10000, 30000, 30000, 0, 0, 109000],
        [-100000, -3000, 0, 0, 3000, 139000],
      ]
  ) {
    const f = businessLossFixture2026([-400000]);
    f.capital_sources = landCapitalFixture2026();
    const s = f.capital_sources.claim!.sales[0];
    s.tax_basis = 100000;
    s.actual_proceeds_before_additional_expenses = 100000 + stockNet;
    if (s.reporting.kind !== "1099-B") throw new Error("fixture");
    s.reporting.box1e_basis = s.tax_basis;
    s.reporting.box1d_proceeds = s.actual_proceeds_before_additional_expenses;
    const r = calculateBusinessLoss2026(f);
    assertEquals([
      r.lines.line3,
      r.lines.line4,
      r.capital_classification.included_business_capital_gain,
      r.lines.line10,
      r.lines.line11,
      r.schedule1_line8p,
    ], [line3, 5000, businessCap, nonbusinessGain, removedLoss, excess]);
  }
});
Deno.test("2026 Form 461 excludes statutory employee services while retaining its reported Schedule C line", () => {
  for (const net of [100000, -100000]) {
    const f = businessLossFixture2026([-400000]), stat = business("statutory");
    stat.kind = "statutory_employee";
    stat.receipts = [];
    stat.expenses = [{
      ...payment("stat-expense", 200000 - net),
      category: "professional_services",
    }];
    f.business_sources!.businesses.push(stat);
    f.business_sources!.w2s = [{
      ...wage("123456789", 200000),
      box3_ss_wages: 184500,
      box4_ss_withheld: 11439,
      box13_statutory_employee: true,
      schedule_c_business_reference: "statutory",
    }];
    const r = calculateBusinessLoss2026(f);
    assertEquals(r.lines.line2, -400000 + net);
    assertEquals([r.lines.line10, r.lines.line11], [
      Math.max(0, net),
      Math.max(0, -net),
    ]);
    assertEquals(r.lines.line14, -400000);
    assertEquals(r.schedule1_line8p, 144000);
  }
});
Deno.test("2026 Form 461 includes the actual half-SE deduction once without treating employee wages as business income", () => {
  const f = businessLossFixture2026([50000]);
  f.business_sources!.w2s = [{
    ...wage("123456789", 400000),
    box3_ss_wages: 184500,
    box4_ss_withheld: 11439,
  }];
  const r = calculateBusinessLoss2026(f);
  assertEquals(r.lines.line2, 50000);
  assertEquals(r.lines.line8, -r.business!.schedule1_line15);
  assertEquals(r.lines.line14, 50000 - r.business!.schedule1_line15);
  assertEquals(r.file_form461, false);
});
Deno.test("2026 Form 461 rejects mismatched owners, missing reviews and amount overrides", () => {
  const f = businessLossFixture2026();
  assertThrows(
    () => calculateBusinessLoss2026({ ...f, taxpayer_ssn: "987654321" }),
    Error,
    "identical filing owners",
  );
  assertEquals(
    businessLossSource2026Schema.safeParse({ ...f, excess_business_loss: 1 })
      .success,
    false,
  );
  assertEquals(
    businessLossSource2026Schema.safeParse({ ...f, review: undefined }).success,
    false,
  );
  assertEquals(
    sourceRegistry2026.start.inputSchema.safeParse({
      ...businessGraphFixture2026(),
      form461: f,
    }).success,
    false,
  );
});
Deno.test("2026 Form 461 rejects contradictory Schedule C and land activity reviews", () => {
  const f = businessLossFixture2026([-400000]);
  f.capital_sources = landCapitalFixture2026();
  f.business_sources!.businesses[0].business_reference = "farm-1";
  assertThrows(
    () => calculateBusinessLoss2026(f),
    Error,
    "no-dispositions review conflicts",
  );
});
