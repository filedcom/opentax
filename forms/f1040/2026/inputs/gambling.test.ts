import { assert, assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../nodes/types.ts";
import { executeDraftSources2026 } from "../execute.ts";
import {
  calculateGambling2026,
  gamblingIssuedAttachments2026,
} from "./gambling-source.ts";
import { gamblingClaim2026, gamblingGraph2026 } from "./gambling.fixture.ts";
const source = () => ({
  filing_status: FilingStatus.Single,
  taxpayer_ssn: "400001037",
  claim: gamblingClaim2026(),
});
Deno.test("2026 casual winnings include unreported amounts through tax and preserve withholding classification", async () => {
  const graph = gamblingGraph2026();
  graph.gambling.claim.copies[0].box4_federal_withheld = 500;
  const r = await executeDraftSources2026(graph);
  assertEquals(r.diagnostics, []);
  const f = r.pending.f1040;
  assertEquals([
    f.line8_additional_income,
    f.line11b_agi,
    f.line15_taxable_income,
    f.line16_income_tax,
    f.line25c_other_withheld,
  ], [2500, 53010, 36910, 4183, 500]);
  assertEquals(r.pending.schedule1.line8b_gambling_winnings, 2500);
  assertEquals(r.pending.schedule1.line8z_total, 0);
  assertEquals(f.line25b_withheld_1099 ?? 0, 0);
});
Deno.test("2026 wagering loss deduction is 90 percent of losses capped at gains and selects itemization", async () => {
  const r = await executeDraftSources2026(gamblingGraph2026(true));
  assertEquals(r.diagnostics, []);
  const f = r.pending.f1040;
  assertEquals([
    f.line11b_agi,
    f.line12e_standard_or_itemized,
    f.line15_taxable_income,
    f.line16_income_tax,
  ], [80510, 27000, 53510, 6488]);
  const a = r.pending.schedule_a.calculation_2026 as {
    lines: { line17a: number; line17z: number };
  };
  assertEquals([a.lines.line17a, a.lines.line17z], [27000, 27000]);
  const s = source();
  s.claim.winnings[0].amount = 10000;
  s.claim.winnings.pop();
  s.claim.losses = gamblingGraph2026(true).gambling.claim.losses;
  s.claim.losses[0].amount = 20000;
  assertEquals(calculateGambling2026(s).schedule_a_line17a, 10000);
  s.claim.losses[0].amount = 10000;
  assertEquals(calculateGambling2026(s).schedule_a_line17a, 9000);
});
Deno.test("2026 winnings reconcile identical wagers without counting box 7 twice", () => {
  const s = source();
  s.claim.copies[0].box7_identical_wagers = 100;
  assertThrows(() => calculateGambling2026(s), Error, "omits");
  s.claim.winnings[0].amount = 2300;
  assertEquals(calculateGambling2026(s).schedule1_line8b, 2600);
  s.claim.copies[0].identical_wager_review.box7_included_in_box1 = true;
  s.claim.winnings[0].amount = 2200;
  assertEquals(calculateGambling2026(s).schedule1_line8b, 2500);
});
Deno.test("2026 gambling rejects duplicate, superseded, wrong-owner, wrong-year and unlinked records", () => {
  for (
    const alter of [
      (s: ReturnType<typeof source>) => {
        s.claim.winnings.push(structuredClone(s.claim.winnings[0]));
      },
      (s: ReturnType<typeof source>) => {
        s.claim.copies.push({
          ...s.claim.copies[0],
          source_document_reference: "duplicate-copy",
        });
      },
      (s: ReturnType<typeof source>) => {
        s.claim.copies[0].superseded_document_references = ["casino-copy"];
      },
      (s: ReturnType<typeof source>) => {
        s.claim.winnings[0].owner_tin = "400001038";
      },
      (s: ReturnType<typeof source>) => {
        s.claim.winnings[0].payment_date = "2025-02-15";
      },
      (s: ReturnType<typeof source>) => {
        s.claim.winnings[0].w2g_source_references = [];
      },
      (s: ReturnType<typeof source>) => {
        s.claim.winnings[0].amount = 2200.001;
      },
    ]
  ) {
    const s = source();
    alter(s);
    assertThrows(() => calculateGambling2026(s));
  }
});
Deno.test("2026 joint gambling includes each spouse but separate returns reject spouse sources", () => {
  const s = {
    ...source(),
    filing_status: FilingStatus.MFJ,
    spouse_ssn: "400001038",
  };
  s.claim.winnings[1].owner_tin = s.spouse_ssn;
  assertEquals(calculateGambling2026(s).schedule1_line8b, 2500);
  assertThrows(
    () => calculateGambling2026({ ...s, filing_status: FilingStatus.MFS }),
    Error,
    "another filer",
  );
});
Deno.test("2026 gambling aggregates cents and requires issued withholding copies for PDF assembly", () => {
  const s = source();
  s.claim.winnings[0].amount = 2200.49;
  s.claim.winnings[1].amount = 300.49;
  assertEquals(calculateGambling2026(s).schedule1_line8b, 2501);
  assertEquals(gamblingIssuedAttachments2026(s), []);
  s.claim.copies[0].box4_federal_withheld = 100;
  assertThrows(
    () => gamblingIssuedAttachments2026(s),
    Error,
    "original issued PDF",
  );
});
Deno.test("2026 gambling losses require itemized inventory even when standard deduction might win", async () => {
  const graph = gamblingGraph2026(true);
  delete graph.schedule_a;
  const r = await executeDraftSources2026(graph);
  assert(r.diagnostics.length > 0);
});

Deno.test("2026 W-2G state and local withholding feed the itemized tax ledger", async () => {
  const graph = gamblingGraph2026(true);
  Object.assign(graph.gambling.claim.copies[0], {
    box15_state_withheld: 400,
    box13_state: "TX",
    box13_payer_state_id: "state-payer",
    box17_local_withheld: 100,
    box18_locality: "Example city",
  });
  const r = await executeDraftSources2026(graph);
  assertEquals(r.diagnostics, []);
  const a = r.pending.schedule_a.calculation_2026 as {
    lines: { line5a: number; line17a: number };
  };
  assertEquals([a.lines.line5a, a.lines.line17a], [500, 27000]);
  assertEquals(r.pending.f1040.line12e_standard_or_itemized, 27500);
});

import { childTaxFixture2026 } from "./child-tax.fixture.ts";
Deno.test("2026 child tax includes gambling as unearned income and itemized connected losses", async () => {
  const child = childTaxFixture2026(0, 0);
  const g = gamblingGraph2026(true);
  const owner = child.general.taxpayer_ssn;
  for (const c of g.gambling.claim.copies) c.box9_winner_tin = owner;
  for (
    const row of [...g.gambling.claim.winnings, ...g.gambling.claim.losses]
  ) row.owner_tin = owner;
  delete child.f8615.claim.no_directly_connected_itemized_deductions;
  child.f8615.claim.no_directly_connected_itemized_deductions_except_gambling =
    true;
  const r = await executeDraftSources2026({
    ...child,
    gambling: g.gambling,
    schedule_a: g.schedule_a,
  });
  assertEquals(r.diagnostics, []);
  const c = r.pending.f8615.calculation_2026 as {
    eligibility: { gross_unearned_income: number };
    source: { itemized_deductions_directly_connected: number };
  };
  assertEquals(c.eligibility.gross_unearned_income, 30000);
  assertEquals(c.source.itemized_deductions_directly_connected, 27000);
  assertEquals(r.pending.f1040.line15_taxable_income, 3000);
  // The standard candidate must still be evaluated without claiming itemized losses.
  assertEquals(r.pending.f1040.line12e_standard_or_itemized, 27000);
});

Deno.test("2026 W-2G withholding adds to Additional Medicare withholding without replacing it", async () => {
  const graph = gamblingGraph2026();
  Object.assign(graph.w2s[0], {
    box1_wages: 250000,
    box3_ss_wages: 184500,
    box4_ss_withheld: 11439,
    box5_medicare_wages: 250000,
    box6_medicare_withheld: 4075,
  });
  graph.gambling.claim.copies[0].box4_federal_withheld = 500;
  const r = await executeDraftSources2026(graph);
  assertEquals(r.diagnostics, []);
  assertEquals(r.pending.f1040.line25c_other_withheld, 950);
  assertEquals(r.pending.f1040.line25d_total_withholding, 11218);
});
Deno.test("2026 small gambling losses remain available without displacing a larger standard deduction", async () => {
  const graph = gamblingGraph2026(true);
  graph.gambling.claim.losses[0].amount = 1000;
  const r = await executeDraftSources2026(graph);
  assertEquals(r.diagnostics, []);
  assertEquals(r.pending.f1040.line11b_agi, 80510);
  assertEquals(r.pending.f1040.line12e_standard_or_itemized, 16100);
});
