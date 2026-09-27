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
      "box_1_repaid",
      "box_5_rtaa",
      "box_6_taxable_grants",
      "box_7_agriculture",
      "box_9_market_gain",
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
