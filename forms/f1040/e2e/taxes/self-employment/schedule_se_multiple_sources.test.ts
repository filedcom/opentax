import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../../2025/registry.ts";
import { assertOwnedScheduleSE } from "../../../2025/domains/taxes/self-employment/schedule-se/schedule-se-owner-source.ts";

// Schedule SE line 2 combines Schedule C line 31 with partnership K-1 box 14
// code A (i1040sse, Line 2). On a joint return each spouse files a separate
// Schedule SE for their own earnings (i1040sse, "Who Must Pay SE Tax").

const plan = buildExecutionPlan(registry);
const ctx = { taxYear: 2025, formType: "f1040" };
const TAXPAYER = "123456789";
const SPOUSE = "987654321";

function scheduleC(recipient: "T" | "S", ssn: string) {
  return {
    f1099nec: [{
      payer_name: "Client One",
      payer_tin: "223456789",
      recipient_ssn: ssn,
      box1_nec: 219_689,
      for_routing: "schedule_c",
      schedule_c_business_reference: "consulting",
    }],
    schedule_c: [{
      business_reference: "consulting",
      proprietor_recipient: recipient,
      line_a_principal_business: "CONSULTING",
      line_b_business_code: "541990",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      line_1_gross_receipts: 219_689,
    }],
  };
}

function k1(
  name: string,
  ein: string,
  recipient: string,
  earnings = -32_870,
) {
  return {
    partnership_name: name,
    partnership_ein: ein,
    recipient_tin: recipient,
    box1_ordinary_business: earnings,
    box14a_se_earnings: earnings,
  };
}

test("joint Schedule SE nets each spouse's K-1 box 14a against only their own Schedule C", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: "mfj",
      taxpayer_ssn: TAXPAYER,
      spouse_ssn: SPOUSE,
      digital_assets: false,
    },
    ...scheduleC("T", TAXPAYER),
    k1_partnership: [
      k1("Partnership One", "311111111", TAXPAYER),
      k1("Partnership Two", "322222222", SPOUSE),
    ],
  }, ctx);
  const se = result.diagnostics.filter((d) => d.nodeType === "schedule_se");
  assertEquals(se, []);
  // Taxpayer: (219,689 − 32,870) × 92.35% = 172,527; × 15.3% = 26,396.
  // Spouse: a −32,870 loss has no SE tax.
  assertEquals(result.pending.schedule2?.line4_se_tax, 26_396);
  assertEquals(result.pending.schedule1?.line15_se_deduction, 13_198);
  // The export reconciliation rebuilds the same per-spouse computation from
  // the retained K-1s and Schedule C.
  assertEquals(assertOwnedScheduleSE(result.pending, 2025)?.tax, 26_396);
});

test("single-filer Schedule SE sums Schedule C and K-1 box 14a", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: "single",
      taxpayer_ssn: TAXPAYER,
      digital_assets: false,
    },
    ...scheduleC("T", TAXPAYER),
    k1_partnership: [k1("Partnership One", "311111111", TAXPAYER)],
  }, ctx);
  const se = result.diagnostics.filter((d) => d.nodeType === "schedule_se");
  assertEquals(se, []);
  assertEquals(result.pending.schedule_se?.net_profit_schedule_c, 186_819);
  assertEquals(result.pending.schedule2?.line4_se_tax, 26_396);
  assertEquals(result.pending.schedule1?.line15_se_deduction, 13_198);
});

test("joint Schedule SE keeps offsetting K-1 earnings with their separate spouses", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: "mfj",
      taxpayer_ssn: TAXPAYER,
      spouse_ssn: SPOUSE,
      digital_assets: false,
    },
    k1_partnership: [
      k1("Taxpayer Partnership", "311111111", TAXPAYER, 50_000),
      k1("Spouse Partnership", "322222222", SPOUSE, -50_000),
    ],
  }, ctx);
  assertEquals(
    result.diagnostics.filter((d) => d.nodeType === "schedule_se"),
    [],
  );
  assertEquals(result.pending.schedule2?.line4_se_tax, 7_065);
  assertEquals(result.pending.schedule1?.line15_se_deduction, 3_533);
  assertEquals(assertOwnedScheduleSE(result.pending, 2025)?.tax, 7_065);
});

test("joint Schedule SE preserves offsetting K-1 owners beside Schedule C", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: "mfj",
      taxpayer_ssn: TAXPAYER,
      spouse_ssn: SPOUSE,
      digital_assets: false,
    },
    ...scheduleC("T", TAXPAYER),
    k1_partnership: [
      k1("Taxpayer Partnership", "311111111", TAXPAYER, 50_000),
      k1("Spouse Partnership", "322222222", SPOUSE, -50_000),
    ],
  }, ctx);
  assertEquals(
    result.diagnostics.filter((d) => d.nodeType === "schedule_se"),
    [],
  );
  assertEquals(result.pending.schedule2?.line4_se_tax, 29_059);
  assertEquals(assertOwnedScheduleSE(result.pending, 2025)?.tax, 29_059);
});
