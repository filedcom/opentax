import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { executeDraftSources2026 } from "../execute.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { marketplaceGraph2026 } from "./marketplace-graph.fixture.ts";
import { syntheticIso2026 } from "./iso.fixture.ts";
import {
  itemizedClaim2026,
  syntheticMedical2026,
} from "../schedule-a.fixture.ts";
import {
  syntheticInterest2026,
  syntheticInvestmentClaim2026,
} from "./investment.fixture.ts";
import {
  calculateMarketplaceReturn2026,
  type MarketplaceReturnInput2026,
} from "./marketplace-return.ts";
import {
  calculateForm6251_2026,
  type Form6251Input2026,
  refigureForm6251For1062_2026,
} from "../nodes/form6251.ts";
import {
  calculateScheduleA2026,
  type ScheduleASource2026,
} from "../schedule-a.ts";
import { childCreditGraphFixture2026 } from "../nodes/f8812.fixture.ts";
import { form1062GraphFixture2026 } from "./form1062-graph.fixture.ts";

async function execute(input: Record<string, unknown>) {
  const r = await executeDraftSources2026(input);
  assertEquals(r.diagnostics, []);
  return r.pending;
}
function workpaper(p: Awaited<ReturnType<typeof execute>>) {
  return (p.form8962!.calculation_2026 as ReturnType<
    typeof calculateMarketplaceReturn2026
  >).source_input;
}
function medicalInput(wages = 62600) {
  const medical = {
    ...syntheticMedical2026(),
    payer_ssn: "400001037",
    patient_ssn: "400001037",
  };
  return {
    ...marketplaceGraph2026(wages, true),
    schedule_a: { ...itemizedClaim2026, medical_payments: [medical] },
  };
}

Deno.test("2026 Marketplace cliff reconciles PTC schedules AMT credit limits and final settlement", async () => {
  for (
    const [wage, credit, repayment, tax, refund] of [[
      62600,
      765,
      0,
      5335,
      5698,
    ], [62601, 0, 3000, 8335, 1933]]
  ) {
    const p = await execute(marketplaceGraph2026(wage));
    assertEquals(p.form8962.net_premium_tax_credit ?? 0, credit);
    assertEquals(p.form8962.excess_advance_payment ?? 0, repayment);
    assertEquals(p.schedule2.line1a_excess_advance_premium, repayment);
    assertEquals(p.f1040.line31_other_payments, credit);
    assertEquals(p.f1040.line17_additional_taxes, repayment);
    assertEquals(p.f1040.line24c_total_tax, tax);
    assertEquals(p.f1040.line35a_refund, refund);
    assertEquals(p.f8812.schedule2_part1_tax, repayment);
    assertEquals(p.f2441.schedule2_part1_tax, repayment);
    assertEquals(p.f8863.schedule2_part1_tax, repayment);
    const amt = p.form6251.calculation_2026 as ReturnType<
      typeof calculateForm6251_2026
    >;
    assertEquals(amt.lines.line10, tax);
    assertEquals("repayment_limitation" in p.form8962, false);
    assertEquals("excess_advance_premium" in p.form8962, false);
  }
});

Deno.test("2026 Marketplace repayment reduces AMT before Schedule 2 totals without circular execution", async () => {
  const iso = syntheticIso2026();
  iso.f3921s[0].employee_tin = "400001037";
  const base = marketplaceGraph2026(62601);
  const p = await execute({ ...base, f3921: iso });
  const { f1095a: _claim, ...without } = base;
  const old = await execute({ ...without, f3921: iso });
  const amt = p.form6251.calculation_2026 as ReturnType<
    typeof calculateForm6251_2026
  >;
  const noPtcAmt = old.form6251.calculation_2026 as ReturnType<
    typeof calculateForm6251_2026
  >;
  assertEquals(amt.lines.line10 - noPtcAmt.lines.line10, 3000);
  assertEquals(noPtcAmt.lines.line11 - amt.lines.line11, 3000);
  assertEquals(
    p.f1040.line17_additional_taxes,
    old.f1040.line17_additional_taxes,
  );
  assertEquals(p.f1040.line24c_total_tax, old.f1040.line24c_total_tax);
});

Deno.test("2026 Marketplace taxpayer MAGI includes sourced tax-exempt interest", async () => {
  const base = syntheticInvestmentClaim2026();
  const interest = {
    ...syntheticInterest2026(),
    recipient_tin: "400001037",
    box1: 0,
    box8: 1,
  };
  const p = await execute({
    ...marketplaceGraph2026(62600),
    investment_income: { ...base, f1099ints: [interest], f1099divs: [] },
  });
  assertEquals(p.f1040.line11a_agi, 62600);
  assertEquals(p.form8962.taxpayer_modified_agi, 62601);
  assertEquals(p.f1040.line17_additional_taxes, 3000);
  const source = workpaper(p);
  assertThrows(
    () =>
      calculateMarketplaceReturn2026({
        ...source,
        taxpayer_modified_agi: 62600,
      }),
    Error,
    "executed AGI workpaper",
  );
});

Deno.test("2026 Marketplace medical deduction subtracts allowed PTC and includes repaid advances once", async () => {
  for (
    const [wage, premiums, line1, line4, deduction] of [[
      62600,
      1235.04,
      17735,
      13040,
      16100,
    ], [62601, 5000.04, 21500, 16805, 16805]]
  ) {
    const p = await execute(medicalInput(wage));
    const result = calculateMarketplaceReturn2026(workpaper(p));
    const a = p.schedule_a.calculation_2026 as ReturnType<
      typeof calculateScheduleA2026
    >;
    assertEquals(result.medical.eligible_premiums, premiums);
    assertEquals(a.lines.line1, line1);
    assertEquals(a.lines.line4, line4);
    assertEquals(p.f1040.line12e_standard_or_itemized, deduction);
  }
});

Deno.test("2026 Marketplace medical review does not suppress unrelated medical expenses", async () => {
  const input = medicalInput();
  input.f1095a = marketplaceGraph2026().f1095a;
  const p = await execute(input);
  const a = p.schedule_a.calculation_2026 as ReturnType<
    typeof calculateScheduleA2026
  >;
  assertEquals(a.lines.line1, 16500);
  const insurance = {
    ...input.schedule_a.medical_payments[0],
    category: "medical_insurance" as const,
    not_marketplace_premium: true as const,
  };
  const allowed = await execute({
    ...input,
    schedule_a: { ...input.schedule_a, medical_payments: [insurance] },
  });
  assertEquals(
    (allowed.schedule_a.calculation_2026 as ReturnType<
      typeof calculateScheduleA2026
    >).lines.line1,
    16500,
  );
  const { not_marketplace_premium: _r, ...unreviewed } = insurance;
  const blocked = await executeDraftSources2026({
    ...input,
    schedule_a: { ...input.schedule_a, medical_payments: [unreviewed] },
  });
  assertEquals(
    blocked.diagnostics.some((d) => d.message.includes("exactly once")),
    true,
  );
});

Deno.test("2026 Marketplace rejects duplicated premium receipts and mismatched Schedule A workpapers", async () => {
  const p = await execute(medicalInput());
  const a = p.schedule_a.calculation_2026 as ReturnType<
    typeof calculateScheduleA2026
  >;
  const raw: ScheduleASource2026 = structuredClone(a.source_input);
  raw.medical_payments![0].payment_reference =
    workpaper(p).marketplace_sources_2026.claim.month_reviews[0].premium_payment
      .reference;
  assertThrows(() => calculateScheduleA2026(raw), Error, "exactly once");
  assertThrows(
    () =>
      calculateScheduleA2026({
        ...a.source_input,
        agi: a.source_input.agi + 1,
      }),
    Error,
    "owners and AGI",
  );
  const amt = p.form6251.calculation_2026 as ReturnType<
    typeof calculateForm6251_2026
  >;
  assertThrows(
    () =>
      calculateForm6251_2026({
        ...amt.source_input,
        taxpayer_ssn: "999887777",
      }),
    Error,
    "match return owners",
  );
});

Deno.test("2026 Marketplace paid-in-2027 premiums can support PTC but need a separate medical timing route", async () => {
  const input = marketplaceGraph2026();
  const row = input.f1095a.claim.month_reviews[11];
  row.premium_payment.paid_on = "2027-01-15";
  row.coverage_eligibility_review.reviewed_on = "2027-01-16";
  await execute(input);
  const result = await executeDraftSources2026({
    ...input,
    f1095a: {
      ...input.f1095a,
      medical_review: marketplaceGraph2026(62600, true).f1095a.medical_review,
    },
    schedule_a: itemizedClaim2026,
  });
  assertEquals(
    result.diagnostics.some((d) => d.message.includes("exact 2026 after-tax")),
    true,
  );
  const needsInventory = await executeDraftSources2026(
    marketplaceGraph2026(62600, true),
  );
  assertEquals(
    needsInventory.diagnostics.some((d) =>
      d.message.includes("itemized expense inventory")
    ),
    true,
  );
});

Deno.test("2026 Marketplace refuses unresolved QSEHRA and self-employed health interactions", async () => {
  const input = marketplaceGraph2026();
  const q = await executeDraftSources2026({
    ...input,
    w2s: [{ ...input.w2s[0], box12_entries: [{ code: "FF", amount: 1000 }] }],
  });
  assertEquals(
    q.diagnostics.some((d) => d.message.includes("QSEHRA benefits")),
    true,
  );
  const p = await execute(input),
    source: MarketplaceReturnInput2026 = workpaper(p);
  assertThrows(
    () =>
      calculateMarketplaceReturn2026({
        ...source,
        pub974_income_audit: {
          ...source.pub974_income_audit,
          schedule1_line17_se_health_insurance: 1000,
        },
      }),
    Error,
    "coordinated Pub. 974",
  );
});

Deno.test("2026 Marketplace inputs reject taxpayer MAGI and family overrides", async () => {
  const input = marketplaceGraph2026();
  for (
    const extra of [{ taxpayer_modified_agi: 0 }, { household_size: 5 }, {
      tax_family: {},
    }]
  ) {
    await assertRejects(() =>
      executeDraftSources2026({
        ...input,
        f1095a: { ...input.f1095a, ...extra },
      })
    );
  }
});

Deno.test("2026 Marketplace repayment reaches the child-credit nonrefundable limit", async () => {
  const base = childCreditGraphFixture2026(25000);
  const source = marketplaceGraph2026(25000).f1095a;
  const owner = base.general.taxpayer_ssn;
  const claim = JSON.parse(
    JSON.stringify(source).replaceAll("400001037", owner),
  ) as typeof source;
  const dep = base.general.dependents[0];
  claim.family_review.dependent_returns = [{
    dependent_tin: dep.ssn,
    record_reference: "child-income-review",
    reviewed_on: "2027-02-28",
    reviewer_name: "Example Reviewer",
    all_income_sources_reconciled_verified: true,
    source: {
      filing: "no_income",
      income_inventory_record_reference: "child-no-income",
      no_taxable_or_nontaxable_income_verified: true,
      no_other_filing_trigger_verified: true,
      return_filed: false,
    },
  }];
  const copy = claim.claim.copies[0];
  copy.monthly_slcsps = Array(12).fill(416.67);
  copy.annual_slcsp = 5000.04;
  copy.monthly_aptcs = Array(12).fill(416.67);
  copy.annual_aptc = 5000.04;
  for (const r of claim.claim.month_reviews) {
    r.premium_payment.amount = 0;
    r.applicable_slcsp.amount = 416.67;
  }
  const withPtc = await execute({ ...base, f1095a: claim }),
    without = await execute(base);
  assertEquals(withPtc.schedule2.line1a_excess_advance_premium, 525);
  assertEquals(
    Number(withPtc.f1040.line19_child_tax_credit) -
      Number(without.f1040.line19_child_tax_credit),
    525,
  );
  assertEquals(
    Number(without.f1040.line28_actc) - Number(withPtc.f1040.line28_actc),
    525,
  );
});

Deno.test("2026 Marketplace prevents an unrefigured farmland election", async () => {
  const { graph: input, documents } = await form1062GraphFixture2026();
  const claim = marketplaceGraph2026().f1095a;
  // The fixture's taxpayer is retargeted throughout all Marketplace source evidence.
  const mapped = JSON.parse(
    JSON.stringify(claim).replaceAll(
      "400001037",
      ((input as Record<string, unknown>).general as { taxpayer_ssn: string })
        .taxpayer_ssn,
    ),
  );
  const result = await executeDraftSources2026(
    { ...input, f1095a: mapped },
    documents,
  );
  assertEquals(
    result.diagnostics.some((d) =>
      d.message.includes("hypothetical-income and premium-deduction replay")
    ),
    true,
  );
  const p = await execute(marketplaceGraph2026());
  const amt = p.form6251.calculation_2026 as ReturnType<
    typeof calculateForm6251_2026
  >;
  assertThrows(
    () =>
      refigureForm6251For1062_2026(
        amt.source_input as Form6251Input2026,
        input.form1062.claim.election,
        0,
      ),
    Error,
    "hypothetical-income",
  );
});

Deno.test("2026 Marketplace joint MAGI combines both owned W-2s and requires both filer income reviews", async () => {
  const input = marketplaceGraph2026(60000), spouse = "555667777";
  input.f1095a.family_review.filer_residences.push({
    filer_tin: spouse,
    record_reference: "spouse-residence",
    from: "2026-01-01",
    through: "2026-12-31",
    state: "TX",
  });
  input.f1095a.income_review.reviewed_filer_tins.push(spouse);
  const general = {
    ...input.general,
    filing_status: FilingStatus.MFJ,
    spouse_first_name: "Morgan",
    spouse_last_name: "Wheat",
    spouse_ssn: spouse,
    spouse_dob: "1988-01-02",
    spouse_blind: false,
    spouse_can_be_claimed_as_dependent: false,
    spouse_citizen_national_or_work_authorized: true,
  };
  const graph = {
    ...input,
    general,
    w2s: [...input.w2s, {
      ...input.w2s[0],
      source_document_reference: "spouse-w2",
      employee_ssn: spouse,
      employer_ein: "000000058",
      box1_wages: 24600,
      box3_ss_wages: 24600,
      box5_medicare_wages: 24600,
      box4_ss_withheld: 1525.2,
      box6_medicare_withheld: 356.7,
    }],
  };
  const p = await execute(graph);
  assertEquals(p.form8962.taxpayer_modified_agi, 84600);
  assertEquals(p.form8962.household_size, 2);
  assertEquals(p.schedule2.line1a_excess_advance_premium, 1426);
  graph.w2s[1].box1_wages = 24601;
  const above = await execute(graph);
  assertEquals(above.form8962.taxpayer_modified_agi, 84601);
  assertEquals(above.schedule2.line1a_excess_advance_premium, 3000);
  input.f1095a.income_review.reviewed_filer_tins.pop();
  const missing = await executeDraftSources2026(graph);
  assertEquals(
    missing.diagnostics.some((d) =>
      d.message.includes("each actual filer once")
    ),
    true,
  );
});
