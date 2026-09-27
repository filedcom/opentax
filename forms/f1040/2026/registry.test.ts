import { assertEquals, assertMatch } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import type { InputNodeEntry } from "../../../core/types/form-definition.ts";
import { FilingStatus } from "../nodes/types.ts";
import { form6251 } from "../nodes/intermediate/forms/form6251/index.ts";
import { buildStartNode } from "../start.ts";
import { inputNodes } from "./inputs.ts";
import { registry } from "./registry.ts";
import { buildCorePdfBytes2026 } from "./pdf/core.ts";

const context = { taxYear: 2026, formType: "f1040" };

const filer = {
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Ada",
  taxpayer_last_name: "Rivera",
  taxpayer_ssn: "111223333",
  taxpayer_dob: "1990-07-12",
  taxpayer_tin_issued_by_due_date: true,
  taxpayer_ssn_valid_for_employment: true,
  taxpayer_ssn_issued_before_due_date: true,
  taxpayer_citizen_national_or_work_authorized: true,
  digital_assets: false,
  address_line1: "10 Main St",
  address_city: "Boston",
  address_state: "MA",
  address_zip: "02108",
};

Deno.test("TY2026 registered 1099-G reaches Schedule 1, 1040, and the PDF bundle", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    f1099g: [{
      box_1_unemployment: 9,
      box_2_state_refund: 300,
      box_2_taxable_amount: 80,
      box_4_federal_withheld: 2,
    }],
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1.line1_state_refund, 80);
  assertEquals(result.pending.schedule1.line7_unemployment, 9);
  assertEquals(result.pending.schedule1.line10_total_additional_income, 89);
  assertEquals(result.pending.f1040.line8_additional_income, 89);
  assertEquals(result.pending.f1040.line11b_agi, 89);
  assertEquals(result.pending.f1040.line25b_withheld_1099, 2);
  const pdf = await PDFDocument.load(
    await buildCorePdfBytes2026({
      f1040: result.pending.f1040,
      schedule1: result.pending.schedule1,
    }),
  );
  assertEquals(pdf.getPageCount(), 4);
});

Deno.test("TY2026 1099-G rejects unfiled branches before routing any amounts", () => {
  for (
    const key of [
      "box_7_agriculture",
      "box_9_market_gain",
      "box_10_family_leave",
    ]
  ) {
    const result = execute(buildExecutionPlan(registry), registry, {
      general: filer,
      f1099g: [{ box_1_unemployment: 200, [key]: 10 }],
    }, context);
    assertEquals(result.diagnostics.length, 1);
    assertEquals(result.diagnostics[0].nodeType, "f1099g");
    assertMatch(result.diagnostics[0].message, new RegExp(key));
    assertEquals(result.pending.schedule1, undefined);
  }
  const businessRefund = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    f1099g: [{
      box_2_state_refund: 100,
      box_2_taxable_amount: 100,
      box_8_trade_or_business: true,
    }],
  }, context);
  assertMatch(businessRefund.diagnostics[0].message, /business refund/);
  assertEquals(businessRefund.pending.schedule1, undefined);

  const staleStateBoxes = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    f1099g: [{ box_1_unemployment: 100, box_10a_state: "MA" }],
  }, context);
  assertEquals(staleStateBoxes.diagnostics[0].nodeType, "start");
  assertMatch(staleStateBoxes.diagnostics[0].message, /box_10a_state/);
});

Deno.test("TY2026 1099-G prints same-year unemployment repayment", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    f1099g: [{ box_1_unemployment: 1_000, box_1_repaid: 400 }],
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1.line7_unemployment, 600);
  assertEquals(result.pending.schedule1.line7_repaid, 400);
  assertEquals(result.pending.schedule1.line10_total_additional_income, 600);
  assertEquals(result.pending.f1040.line8_additional_income, 600);
  const pdf = await PDFDocument.load(
    await buildCorePdfBytes2026({
      f1040: result.pending.f1040,
      schedule1: result.pending.schedule1,
    }),
  );
  assertEquals(pdf.getPageCount(), 4);

  const invalid = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    f1099g: [{ box_1_unemployment: 100, box_1_repaid: 101 }],
  }, context);
  assertMatch(invalid.diagnostics[0].message, /repayment exceeds/);
  assertEquals(invalid.pending.schedule1, undefined);

  const fullyRepaid = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    f1099g: [{ box_1_unemployment: 100, box_1_repaid: 100 }],
  }, context);
  assertEquals(fullyRepaid.diagnostics, []);
  assertEquals(fullyRepaid.pending.schedule1.line7_unemployment, 0);
  assertEquals(fullyRepaid.pending.schedule1.line7_repaid, 100);
  assertEquals(fullyRepaid.pending.schedule1.file_schedule1, true);
});

Deno.test("TY2026 1099-G RTAA and taxable grants get a typed line 8z statement", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    f1099g: [{ box_5_rtaa: 599, box_6_taxable_grants: 750 }],
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1.line8z_rtaa, 599);
  assertEquals(result.pending.schedule1.line8z_taxable_grants, 750);
  assertEquals(result.pending.schedule1.line8z_total, 1_349);
  assertEquals(
    result.pending.schedule1.line8z_print_description,
    "See attached statement",
  );
  assertEquals(result.pending.schedule1.line8z_statement_rows, [
    { description: "RTAA payments", amount: 599 },
    { description: "Taxable grants", amount: 750 },
  ]);
  assertEquals(result.pending.schedule1.line9_total_other_income, 1_349);
  assertEquals(result.pending.f1040.line8_additional_income, 1_349);
  const pdf = await PDFDocument.load(
    await buildCorePdfBytes2026({
      f1040: result.pending.f1040,
      schedule1: result.pending.schedule1,
    }),
  );
  assertEquals(pdf.getPageCount(), 5);

  const rtaaOnly = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    f1099g: [{ box_5_rtaa: 599 }],
  }, context);
  assertEquals(rtaaOnly.diagnostics, []);
  assertEquals(
    rtaaOnly.pending.schedule1.line8z_print_description,
    "RTAA payments",
  );
  assertEquals(rtaaOnly.pending.schedule1.line8z_statement_rows, undefined);
  const singlePdf = await PDFDocument.load(
    await buildCorePdfBytes2026({
      f1040: rtaaOnly.pending.f1040,
      schedule1: rtaaOnly.pending.schedule1,
    }),
  );
  assertEquals(singlePdf.getPageCount(), 4);
});

Deno.test("TY2026 registered 1099-INT reaches Schedule B, Schedule 1, 1040, and PDF", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    f1099int: [{
      payer_name: "Test Bank",
      box1: 2_000,
      box2: 100,
      box4: 50,
    }],
    schedule_b: { foreign_account: false, foreign_trust: false },
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_b.print_line4_total, 2_000);
  assertEquals(result.pending.schedule1.line18_early_withdrawal, 100);
  assertEquals(result.pending.f1040.line2b_taxable_interest, 2_000);
  assertEquals(result.pending.f1040.line10_adjustments, 100);
  assertEquals(result.pending.f1040.line11b_agi, 1_900);
  assertEquals(result.pending.f1040.line25b_withheld_1099, 50);
  const pdf = await PDFDocument.load(
    await buildCorePdfBytes2026({
      f1040: result.pending.f1040,
      schedule1: result.pending.schedule1,
      scheduleB: result.pending.schedule_b,
    }),
  );
  assertEquals(pdf.getPageCount(), 5);
});

Deno.test("TY2026 1099-INT rejects unfiled or unelected routes", () => {
  for (
    const [fields, message] of [
      [{ box6: 20 }, /foreign tax/],
      [{ investment_property_for_form4952: true }, /investment interest/],
      [{ box3: 100, box12: 20 }, /amortization election/],
    ] as const
  ) {
    const result = execute(buildExecutionPlan(registry), registry, {
      general: filer,
      f1099int: [{ payer_name: "Test Bank", box1: 100, ...fields }],
    }, context);
    assertEquals(result.diagnostics[0].nodeType, "f1099int");
    assertMatch(result.diagnostics[0].message, message);
    assertEquals(result.pending.schedule_b, undefined);
  }
});

Deno.test("TY2026 1099-INT private-activity bond interest reaches Form 6251 and PDF", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    w2: [{ box1_wages: 100_000, box2_fed_withheld: 10_000 }],
    f1099int: [{
      payer_name: "Municipal Bond Fund",
      box8: 300_000,
      box9: 300_000,
    }],
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line2a_tax_exempt, 300_000);
  assertEquals(result.pending.form6251.private_activity_bond_interest, 300_000);
  const amt = Number(result.pending.form6251.line11_amt);
  assertEquals(amt > 0, true);
  assertEquals(result.pending.schedule2.line2_amt, amt);
  assertEquals(result.pending.f1040.line17_additional_taxes, amt);
  const pdf = await PDFDocument.load(
    await buildCorePdfBytes2026({
      f1040: result.pending.f1040,
      schedule2: result.pending.schedule2,
      form6251: result.pending.form6251,
    }),
  );
  assertEquals(pdf.getPageCount(), 6);
});

Deno.test("TY2026 registry executes a wages-only return", () => {
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
    w2: [{ box1_wages: 80_000, box2_fed_withheld: 10_000 }],
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line9_total_income, 80_000);
  assertEquals(result.pending.f1040.line16_income_tax, 8_770);
  assertEquals(result.pending.f1040.line35a_refund, 1_230);
  assertEquals(
    result.pending.f1040.taxpayer_citizen_national_or_work_authorized,
    true,
  );
});

Deno.test("TY2026 registry routes W-2 and Form 4137 tips through Schedule 2", () => {
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
      address_line1: "10 Main St",
      address_city: "Boston",
      address_state: "MA",
      address_zip: "02108",
    },
    w2: [{
      employee_ssn: "111223333",
      employer_ein: "12-3456789",
      employer_name: "CAFE",
      box1_wages: 70_000,
      box3_ss_wages: 70_000,
      box2_fed_withheld: 0,
      box12_entries: [{ code: "TP", amount: 3_000 }],
      box14b_tipped_codes: ["102"],
    }],
    form4137: {
      forms: [{
        recipient: "taxpayer",
        employers: [{
          name: "CAFE",
          ein: "12-3456789",
          tips_received: 5_000,
          tips_reported: 3_000,
        }],
        ss_wages_from_w2: 70_000,
      }],
    },
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1a.line15_qualified_tips, 5_000);
  assertEquals(result.pending.schedule2.line16c_additional_fica, 153);
  assertEquals(result.pending.f1040.line1c_unreported_tips, 2_000);
  assertEquals(result.pending.f1040.line23_other_taxes, 153);
});

Deno.test("TY2026 AMT reaches Schedule 2 and Form 1040 from an ISO adjustment", () => {
  const directInputs: readonly InputNodeEntry[] = [
    ...inputNodes,
    {
      node: form6251,
      inputSchema: form6251.inputSchema.pick({ iso_adjustment: true }),
      isArray: false,
    },
  ];
  const graph = { ...registry, start: buildStartNode(directInputs) };
  const result = execute(buildExecutionPlan(graph), graph, {
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
    w2: [{ box1_wages: 100_000, box2_fed_withheld: 10_000 }],
    form6251: { iso_adjustment: 300_000 },
  }, context);
  assertEquals(result.diagnostics, []);
  const amt = Number(result.pending.form6251.line11_amt);
  assertEquals(amt > 0, true);
  assertEquals(result.pending.form6251.amti, 400_000);
  assertEquals(result.pending.form6251.exemption, 90_100);
  assertEquals(result.pending.form6251.tentative_tax, 81_882);
  assertEquals(result.pending.schedule2.line2_amt, amt);
  assertEquals(result.pending.schedule2.line3_part1_tax, amt);
  assertEquals(result.pending.f1040.line17_additional_taxes, amt);
  assertEquals(
    result.pending.f1040.line24a_total_tax,
    Number(result.pending.f1040.line16_income_tax) + amt,
  );
});
