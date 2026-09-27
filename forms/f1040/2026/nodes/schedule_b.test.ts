import { assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { f1099int } from "../../nodes/inputs/f1099int/index.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { registry } from "../registry.ts";
import { schedule_b_2026 } from "./schedule_b.ts";

const context = { taxYear: 2026, formType: "f1040" };

function output(
  result: ReturnType<typeof schedule_b_2026.compute>,
  type: string,
) {
  return result.outputs.find((entry) => entry.nodeType === type)?.fields;
}

Deno.test("TY2026 Schedule B prints gross 1099-INT and labeled adjustments", () => {
  const source = f1099int.compute(context, {
    f1099ints: [{
      payer_name: "Test Bank",
      box1: 1_000,
      nominee_interest: 100,
      box11: 50,
      elect_bond_premium_amortization: true,
    }],
  });
  const deposit =
    source.outputs.find((entry) => entry.nodeType === "schedule_b")!.fields;
  const result = schedule_b_2026.compute(context, deposit);
  const schedule = output(result, "schedule_b")!;
  assertEquals(schedule.interest_rows, [
    { payerName: "Test Bank", amount: 1_000 },
    { payerName: "Nominee Distribution", amount: -100 },
    { payerName: "ABP Adjustment", amount: -50 },
  ]);
  assertEquals(schedule.print_line2_total, 850);
  assertEquals(schedule.print_line4_total, 850);
  assertEquals(schedule.file_schedule_b, true);
  assertEquals(output(result, "agi_aggregator")?.line2b_taxable_interest, 850);
  assertEquals(output(result, "form8960")?.line1_taxable_interest, 850);
});

Deno.test("TY2026 Schedule B requires Part III answers above the filing threshold", () => {
  const source = f1099int.compute(context, {
    f1099ints: [{ payer_name: "Test Bank", box1: 2_000 }],
  });
  const deposit =
    source.outputs.find((entry) => entry.nodeType === "schedule_b")!.fields;
  assertThrows(
    () => schedule_b_2026.compute(context, deposit),
    Error,
    "Part III needs account and trust answers",
  );
  const result = schedule_b_2026.compute(context, {
    ...deposit,
    foreign_account: false,
    foreign_trust: false,
  });
  assertEquals(output(result, "schedule_b")?.file_schedule_b, true);
  assertEquals(output(result, "f1040")?.line2b_taxable_interest, 2_000);
});

Deno.test("TY2026 Schedule B routes smaller ordinary interest without an attachment", () => {
  const source = f1099int.compute(context, {
    f1099ints: [{ payer_name: "Test Bank", box1: 100 }],
  });
  const deposit =
    source.outputs.find((entry) => entry.nodeType === "schedule_b")!.fields;
  const result = schedule_b_2026.compute(context, deposit);
  assertEquals(output(result, "schedule_b")?.file_schedule_b, false);
  assertEquals(output(result, "f1040")?.line2b_taxable_interest, 100);
});

Deno.test("TY2026 Schedule B requires payer details and reconciled exclusions", () => {
  assertThrows(
    () =>
      schedule_b_2026.compute(context, {
        taxable_interest_net: 1_000,
      }),
    Error,
    "gross interest and adjustment rows",
  );
  const detail = {
    payerName: "Test Bank",
    gross: 1_000,
    adjustments: [],
    net: 1_000,
    sellerFinanced: false,
  };
  assertThrows(
    () =>
      schedule_b_2026.compute(context, {
        taxable_interest_net: 1_000,
        interest_detail: detail,
        ee_bond_exclusion: 1_001,
      }),
    Error,
    "interest and exclusion do not reconcile",
  );
});

Deno.test("TY2026 Schedule B records foreign-account and FBAR answers", () => {
  const result = schedule_b_2026.compute(context, {
    foreign_account: true,
    fbar_required: true,
    foreign_countries: ["Sweden"],
    foreign_trust: false,
  });
  const schedule = output(result, "schedule_b")!;
  assertEquals(schedule.file_schedule_b, true);
  assertEquals(schedule.foreign_account, true);
  assertEquals(schedule.foreign_countries, ["Sweden"]);
  assertThrows(
    () =>
      schedule_b_2026.compute(context, {
        foreign_account: true,
        fbar_required: true,
        foreign_trust: false,
      }),
    Error,
    "needs foreign countries",
  );
});

Deno.test("TY2026 interest reaches AGI, NIIT, Schedule 2, and Form 1040", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Ada",
      taxpayer_last_name: "Rivera",
      taxpayer_ssn: "111223333",
      taxpayer_dob: "1990-07-12",
      taxpayer_tin_issued_by_due_date: true,
      taxpayer_ssn_valid_for_employment: true,
      taxpayer_ssn_issued_before_due_date: true,
      taxpayer_citizen_national_or_work_authorized: true,
      address_line1: "10 Main St",
      address_city: "Boston",
      address_state: "MA",
      address_zip: "02108",
    },
    w2: [{ box1_wages: 300_000, box2_fed_withheld: 50_000 }],
    f1099int: [{ payer_name: "Test Bank", box1: 10_000 }],
    schedule_b: { foreign_account: false, foreign_trust: false },
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_b.print_line4_total, 10_000);
  assertEquals(result.pending.f1040.line2b_taxable_interest, 10_000);
  assertEquals(result.pending.f1040.line9_total_income, 310_000);
  assertEquals(result.pending.form8960.line17_niit, 380);
  assertEquals(result.pending.schedule2.line6_niit, 380);
  assertEquals(result.pending.f1040.line23_other_taxes, 380);
});
