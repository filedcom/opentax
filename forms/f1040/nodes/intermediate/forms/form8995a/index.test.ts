import { assertEquals, assertThrows } from "@std/assert";
import { form8995a, inputSchema } from "./index.ts";
import { FilingStatus } from "../../../types.ts";

function compute(input: Record<string, unknown>) {
  return form8995a.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(input),
  );
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

Deno.test("bounded source: one identified non-SSTB business retains its filing facts", () => {
  const details = {
    business_name: "Smith Design LLC",
    ein: "123456789",
    business_qbi: 100_000,
    business_w2_wages: 20_000,
    business_ubia: 200_000,
    one_non_sstb_business_confirmed: true,
    no_aggregation_confirmed: true,
    no_reit_ptp_or_loss_carryforward_confirmed: true,
    qualified_dividends_zero_confirmed: true,
    qbi_wages_ubia_sources_confirmed: true,
    taxable_income_before_qbi_confirmed: true,
  };
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 300_000,
    net_capital_gain: 0,
    qbi: 100_000,
    w2_wages: 20_000,
    unadjusted_basis: 200_000,
    business_filing_details: details,
  });
  assertEquals(
    findOutput(result, "f1040")?.fields.line13_qbi_deduction,
    10_000,
  );
  assertEquals(
    findOutput(result, "standard_deduction")?.fields.qbi_deduction,
    10_000,
  );
  assertEquals(
    findOutput(result, "form8995a")?.fields.business_filing_details,
    details,
  );
});

// ── Input validation ─────────────────────────────────────────────────────────

Deno.test("Schedule C rejects current-year QBI loss before routing", () => {
  assertThrows(
    () =>
      compute({
        filing_status: FilingStatus.Single,
        taxable_income: 300_000,
        qbi: -1000,
      }),
    Error,
    "Schedule C",
  );
});

Deno.test("validation: rejects negative w2_wages", () => {
  assertThrows(() =>
    compute({
      filing_status: FilingStatus.Single,
      taxable_income: 300_000,
      qbi: 50_000,
      w2_wages: -100,
    })
  );
});

Deno.test("validation: rejects positive qbi_loss_carryforward", () => {
  assertThrows(() =>
    compute({
      filing_status: FilingStatus.Single,
      taxable_income: 300_000,
      qbi: 50_000,
      qbi_loss_carryforward: 5000,
    })
  );
});

Deno.test("validation: accepts all-absent inputs — no outputs", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 300_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ── Below-threshold: no wage limitation ──────────────────────────────────────

Deno.test("below threshold: 20% × QBI, no wage limit (single < $197,300)", () => {
  // taxable_income = 100,000 (below $197,300 single threshold)
  // QBI = 50,000 → 20% = 10,000; income cap = 20% × 100,000 = 20,000
  // No wage limitation below threshold
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 100_000,
    qbi: 50_000,
    w2_wages: 5_000, // very low wages — would limit if applicable
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 10_000);
});

Deno.test("below threshold MFJ: no wage limit (MFJ < $394,600)", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    taxable_income: 200_000,
    qbi: 80_000,
    w2_wages: 1_000,
  });
  const out = findOutput(result, "f1040");
  // 20% × 80,000 = 16,000; income cap = 20% × 200,000 = 40,000 → 16,000
  assertEquals(out?.fields.line13_qbi_deduction, 16_000);
});

// ── W-2 wages limitation ─────────────────────────────────────────────────────

Deno.test("W-2 limit: 50% of wages applies (above threshold, 50% wages < 20% QBI)", () => {
  // taxable_income = $250,000 single (above $197,300 → reduction_ratio = 1.0 → full limit)
  // QBI = 200,000 → 20% = 40,000
  // W-2 wages = 30,000 → 50% = 15,000; UBIA = 0 → limit = max(15,000, 7,500) = 15,000
  // deduction = min(40,000, 15,000) = 15,000
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 300_000,
    qbi: 200_000,
    w2_wages: 30_000,
    unadjusted_basis: 0,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 15_000);
});

Deno.test("W-2 limit: UBIA alternative applies (25% wages + 2.5% UBIA > 50% wages)", () => {
  // taxable_income = $300,000 single (above threshold → full limit)
  // QBI = 200,000 → 20% = 40,000
  // W-2 wages = 20,000 → 50% = 10,000; UBIA = 1,000,000 → 25%×20,000 + 2.5%×1,000,000 = 5,000 + 25,000 = 30,000
  // limit = max(10,000, 30,000) = 30,000
  // deduction = min(40,000, 30,000) = 30,000
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 300_000,
    qbi: 200_000,
    w2_wages: 20_000,
    unadjusted_basis: 1_000_000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 30_000);
});

Deno.test("W-2 limit: zero wages, zero UBIA → deduction is zero above threshold", () => {
  // Full wage limit applies, both zero → deduction = 0
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 300_000,
    qbi: 200_000,
    w2_wages: 0,
    unadjusted_basis: 0,
  });
  assertEquals(findOutput(result, "f1040"), undefined);
});

// ── Phase-in of limitation (partial) ─────────────────────────────────────────

Deno.test("phase-in: 50% through range — partial wage limitation applied", () => {
  // Single threshold $197,300; TI = $222,300 → excess = $25,000 → ratio = 0.5
  // QBI = 200,000 → 20% = 40,000
  // W-2 wages = 30,000 → 50% = 15,000; UBIA = 0 → limit = 15,000
  // phase_in_amount = 0.5 × (40,000 - 15,000) = 12,500
  // qbi_component = 40,000 - 12,500 = 27,500
  // income cap = 20% × 222,300 = 44,460 → not binding
  // deduction = 27,500
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 222_300,
    qbi: 200_000,
    w2_wages: 30_000,
    unadjusted_basis: 0,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 27_500);
});

Deno.test("phase-in: exactly at threshold — no limitation, full 20%", () => {
  // TI = $197,300 exactly → reduction_ratio = 0 → no wage limitation
  // QBI = 100,000 → 20% = 20,000; income cap = 20% × 197,300 = 39,460 → not binding
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 197_300,
    qbi: 100_000,
    w2_wages: 5_000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 20_000);
});

Deno.test("phase-in: MFJ 50% through range ($444,600) — partial limitation", () => {
  // MFJ threshold $394,600; TI = $444,600 → excess = $50,000 → ratio = 0.5
  // QBI = 300,000 → 20% = 60,000
  // W-2 wages = 40,000 → 50% = 20,000; UBIA = 0 → limit = 20,000
  // phase_in_amount = 0.5 × (60,000 - 20,000) = 20,000
  // qbi_component = 60,000 - 20,000 = 40,000
  const result = compute({
    filing_status: FilingStatus.MFJ,
    taxable_income: 444_600,
    qbi: 300_000,
    w2_wages: 40_000,
    unadjusted_basis: 0,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 40_000);
});

// ── Required Schedule A ──────────────────────────────────────────────────────

Deno.test("Schedule A rejects fully phased-out SSTB source", () => {
  assertThrows(
    () =>
      compute({
        filing_status: FilingStatus.Single,
        taxable_income: 350_000,
        sstb_qbi: 200_000,
        sstb_w2_wages: 50_000,
        sstb_unadjusted_basis: 500_000,
      }),
    Error,
    "Schedule A",
  );
});

Deno.test("Schedule A rejects an SSTB within the phase-in range", () => {
  assertThrows(
    () =>
      compute({
        filing_status: FilingStatus.Single,
        taxable_income: 222_300,
        sstb_qbi: 100_000,
        sstb_w2_wages: 30_000,
        sstb_unadjusted_basis: 0,
      }),
    Error,
    "Schedule A",
  );
});

Deno.test("Schedule A source cannot use Form 8995-A below threshold", () => {
  assertThrows(
    () =>
      compute({
        filing_status: FilingStatus.Single,
        taxable_income: 100_000,
        sstb_qbi: 50_000,
        sstb_w2_wages: 500,
      }),
    Error,
    "Schedule A",
  );
});

// ── Mixed qualified businesses ───────────────────────────────────────────────

Deno.test("Schedule A rejects a fully phased-out SSTB beside non-SSTB QBI", () => {
  assertThrows(
    () =>
      compute({
        filing_status: FilingStatus.Single,
        taxable_income: 350_000,
        qbi: 100_000,
        w2_wages: 50_000,
        sstb_qbi: 200_000,
        sstb_w2_wages: 80_000,
      }),
    Error,
    "Schedule A",
  );
});

// ── QBI loss carryforward ─────────────────────────────────────────────────────

Deno.test("Schedule C rejects prior-year QBI loss before routing", () => {
  assertThrows(
    () =>
      compute({
        filing_status: FilingStatus.Single,
        taxable_income: 300_000,
        qbi: 100_000,
        w2_wages: 60_000,
        qbi_loss_carryforward: -20_000,
      }),
    Error,
    "Schedule C",
  );
});

Deno.test("Schedule C rejects excess prior loss even with zero deduction", () => {
  assertThrows(
    () =>
      compute({
        filing_status: FilingStatus.Single,
        taxable_income: 300_000,
        qbi: 30_000,
        w2_wages: 60_000,
        qbi_loss_carryforward: -50_000,
      }),
    Error,
    "Schedule C",
  );
});

Deno.test("Schedule B rejects an aggregation election before routing", () => {
  assertThrows(
    () =>
      compute({
        filing_status: FilingStatus.Single,
        taxable_income: 300_000,
        qbi: 100_000,
        w2_wages: 60_000,
        aggregation_groups: [{
          group_name: "Group 1",
          business_names: ["Shop A", "Shop B"],
          combined_for_limitation: true,
        }],
      }),
    Error,
    "Schedule B",
  );
});

Deno.test("Schedule D rejects an affirmative specified cooperative patron", () => {
  assertThrows(
    () =>
      compute({
        filing_status: FilingStatus.Single,
        taxable_income: 300_000,
        qbi: 100_000,
        w2_wages: 60_000,
        patron_of_specified_cooperative: true,
      }),
    Error,
    "Schedule D",
  );
});

Deno.test("Schedule D patron source emits a paired companion and reduced Form 1040 amount", () => {
  const base = {
    filing_status: FilingStatus.Single,
    taxable_income: 300_000,
    net_capital_gain: 0,
    qbi: 100_000,
    w2_wages: 40_000,
    unadjusted_basis: 0,
    patron_of_specified_cooperative: true,
    business_filing_details: {
      business_name: "Smith Farm",
      ein: "123456789",
      business_qbi: 100_000,
      business_w2_wages: 40_000,
      business_ubia: 0,
      one_non_sstb_business_confirmed: true,
      no_aggregation_confirmed: true,
      no_reit_ptp_or_loss_carryforward_confirmed: true,
      qualified_dividends_zero_confirmed: true,
      qbi_wages_ubia_sources_confirmed: true,
      taxable_income_before_qbi_confirmed: true,
    },
    patron_filing_details: {
      source_1099patr: {
        payer_name: "Farm Coop", payer_tin: "987654321",
        box7_qualified_payments: 60_000,
        box6_section199ag_deduction: 0,
        box13_specified_cooperative: true,
        trade_or_business: true,
      },
      qbi_allocable_to_qualified_payments: 50_000,
      w2_wages_allocable_to_qualified_payments: 10_000,
      one_cooperative_confirmed: true,
      allocation_worksheet_reference: "farm-qbi-allocation-2025",
      allocation_worksheet_reviewed_by: "Tax Reviewer",
      allocation_worksheet_review_date: "2026-01-30",
    },
  };
  // Parent line 13 = min(20,000, 20,000), Schedule D line 6 = min(4,500, 5,000).
  const result = compute(base);
  assertEquals(findOutput(result, "f1040")?.fields.line13_qbi_deduction, 15_500);
  assertEquals(findOutput(result, "form8995a")?.fields, inputSchema.parse(base));
  assertEquals(findOutput(result, "form8995a_schedule_d")?.fields, inputSchema.parse(base));
});

Deno.test("Schedule D rejects allocations beyond the identified business", () => {
  assertThrows(() => compute({
    filing_status: FilingStatus.Single,
    taxable_income: 300_000,
    qbi: 100_000,
    w2_wages: 40_000,
    unadjusted_basis: 0,
    patron_of_specified_cooperative: true,
    business_filing_details: {
      business_name: "Smith Farm", ein: "123456789",
      business_qbi: 100_000, business_w2_wages: 40_000, business_ubia: 0,
      one_non_sstb_business_confirmed: true, no_aggregation_confirmed: true,
      no_reit_ptp_or_loss_carryforward_confirmed: true,
      qualified_dividends_zero_confirmed: true,
      qbi_wages_ubia_sources_confirmed: true,
      taxable_income_before_qbi_confirmed: true,
    },
    patron_filing_details: {
      source_1099patr: {
        payer_name: "Farm Coop", payer_tin: "987654321",
        box7_qualified_payments: 60_000,
        box6_section199ag_deduction: 0,
        box13_specified_cooperative: true,
        trade_or_business: true,
      },
      qbi_allocable_to_qualified_payments: 100_001,
      w2_wages_allocable_to_qualified_payments: 10_000,
      one_cooperative_confirmed: true,
      allocation_worksheet_reference: "farm-qbi-allocation-2025",
      allocation_worksheet_reviewed_by: "Tax Reviewer",
      allocation_worksheet_review_date: "2026-01-30",
    },
  }), Error, "allocations exceed");
});

// ── Taxable income overall cap ────────────────────────────────────────────────

Deno.test("income cap: 20% × (TI - cap_gain) limits deduction", () => {
  // TI = $300,000 (above threshold); cap_gain = $250,000
  // income_cap_base = 300,000 - 250,000 = 50,000; cap = 20% × 50,000 = 10,000
  // QBI = 200,000; wages = 100,000; 50% wages = 50,000; 20% QBI = 40,000
  // deduction = min(40,000, 10,000) = 10,000
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 300_000,
    net_capital_gain: 250_000,
    qbi: 200_000,
    w2_wages: 100_000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 10_000);
});

// ── REIT dividends ────────────────────────────────────────────────────────────

Deno.test("REIT: section 199A dividends — 20% applied, not subject to wage limit", () => {
  // Above threshold; no QBI — only REIT dividends
  // REIT = 50,000 → 20% = 10,000; income cap = 20% × 300,000 = 60,000
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 300_000,
    line6_sec199a_dividends: 50_000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 10_000);
});

Deno.test("REIT: reit_loss_carryforward reduces dividends", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 300_000,
    line6_sec199a_dividends: 30_000,
    reit_loss_carryforward: -10_000,
  });
  const out = findOutput(result, "f1040");
  // net REIT = 20,000 → 20% = 4,000
  assertEquals(out?.fields.line13_qbi_deduction, 4_000);
});

// ── Output routing ────────────────────────────────────────────────────────────

Deno.test("routing: positive deduction → routes to f1040 with line13_qbi_deduction", () => {
  // Below threshold → no wage limit; 20% × 50,000 = 10,000; income cap = 20% × 100,000 = 20,000
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 100_000,
    qbi: 50_000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 10_000);
});

Deno.test("routing: positive deduction → also routes to standard_deduction with qbi_deduction", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 100_000,
    qbi: 50_000,
  });
  const out = findOutput(result, "standard_deduction");
  assertEquals(out?.fields.qbi_deduction, 10_000);
});

Deno.test("routing: both f1040 and standard_deduction outputs present when deduction > 0", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 100_000,
    qbi: 50_000,
  });
  assertEquals(result.outputs.length, 3);
});

Deno.test("routing: no QBI activity — no outputs", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 300_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ── Mixed unsupported source ────────────────────────────────────────────────

Deno.test("Schedule A rejects mixed SSTB before any deduction output", () => {
  assertThrows(
    () =>
      compute({
        filing_status: FilingStatus.MFJ,
        taxable_income: 444_600,
        qbi: 80_000,
        w2_wages: 40_000,
        unadjusted_basis: 200_000,
        sstb_qbi: 60_000,
        sstb_w2_wages: 20_000,
        sstb_unadjusted_basis: 0,
        line6_sec199a_dividends: 20_000,
        reit_loss_carryforward: -5_000,
      }),
    Error,
    "Schedule A",
  );
});
