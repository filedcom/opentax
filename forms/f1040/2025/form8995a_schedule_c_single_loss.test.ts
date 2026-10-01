import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { FilingStatus as HeaderFilingStatus } from "../mef/header.ts";
import { normalizeAllPending } from "./pending.ts";
import { form8995a } from "./mef/forms/f8995a.ts";
import { form8995aScheduleC } from "./mef/forms/f8995a_schedule_c.ts";
import { form8995aPdf } from "./pdf/forms/f8995a.ts";
import { form8995aScheduleCPdf } from "./pdf/forms/f8995a_schedule_c.ts";
import { inputSchema as form8995aInputSchema } from "../nodes/intermediate/forms/form8995a/index.ts";

const loss = {
  line_a_principal_business: "Retail",
  line_b_business_code: "459999",
  line_c_business_name: "South Shop",
  line_d_ein: "987654321",
  business_reference: "south-2025",
  line_f_accounting_method: "cash" as const,
  line_g_material_participation: true,
  line_32_at_risk: "a" as const,
  line_1_gross_receipts: 0,
  line_27b_other_expenses: 1_200,
  qbi_w2_wages: 0,
  qbi_unadjusted_basis: 0,
  qbi_no_other_adjustments_confirmed: true,
};
const filer = {
  primarySSN: "111223333",
  fullName: "Alex Owner",
  nameLine1: "OWNER ALEX",
  nameControl: "OWNE",
  filingStatus: HeaderFilingStatus.Single,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};

function preparedReturn() {
  const result = f1040_2025.executeReturn({
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Owner",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
      form461_scope_review: {
        only_schedule_c_and_f_business_items: true,
        other_part_i_lines_zero: true,
        part_ii_adjustments_zero: true,
        post_at_risk_and_passive_limits_confirmed: true,
        line2_schedule_c_amount: -1_200,
        line6_schedule_f_amount: 0,
        source_document_refs: ["one reviewed 2025 Schedule C loss"],
      },
    },
    w2: [{ box1_wages: 300_000, box2_fed_withheld: 60_000 }],
    schedule_c: [loss],
  });
  assertEquals(result.diagnostics, []);
  return result;
}

Deno.test("one sourced QBI loss files Schedule C and carries it forward with no current deduction", () => {
  const result = preparedReturn();
  assertEquals(result.pending.f1040.line13_qbi_deduction, 0);
  assertEquals(result.pending.schedule1.line3_schedule_c, -1_200);
  assertEquals(result.pending.f1040.line8_additional_income, -1_200);
  assertEquals(result.carryforwards.qbi_loss_carryforward_8995a, 1_200);
  const pending = normalizeAllPending(result.pending);
  const parent = form8995aInputSchema.parse(pending.form8995a);
  const companion = form8995aInputSchema.parse(pending.form8995a_schedule_c);
  assertEquals(parent.qbi, -1_200);
  const parentXml = form8995a.build(parent, { filer, pending });
  const scheduleXml = form8995aScheduleC.build(companion, { filer, pending });
  assertStringIncludes(parentXml, "<IRS8995A");
  assertStringIncludes(
    scheduleXml,
    "<QlfyBusLossCarryforwardAmt>1200</QlfyBusLossCarryforwardAmt>",
  );
  const parentPdf = form8995aPdf.projectFields!(parent, pending);
  const schedulePdf = form8995aScheduleCPdf.projectFields!(companion, pending);
  assertEquals(parentPdf.business_name, "South Shop");
  assertEquals(parentPdf.line39, 0);
  assertEquals(schedulePdf.row1_a, -1_200);
  assertEquals(schedulePdf.row2_name, undefined);
  assertEquals(schedulePdf.line3, 1_200);
  assertEquals(schedulePdf.line4, 0);
  assertEquals(schedulePdf.line6, 1_200);
});

Deno.test("one-business QBI loss rejects changed source, return, and companion", () => {
  const pending = normalizeAllPending(preparedReturn().pending);
  const changed = [{
    ...pending,
    schedule_c: {
      ...pending.schedule_c,
      schedule_cs: [{ ...loss, line_27b_other_expenses: 1_199 }],
    },
  }, {
    ...pending,
    form8995a_schedule_c: { ...pending.form8995a_schedule_c, qbi: -1_199 },
  }, {
    ...pending,
    schedule1: { ...pending.schedule1, line3_schedule_c: -1_199 },
  }, {
    ...pending,
    f1040: { ...pending.f1040, line13_qbi_deduction: 1 },
  }];
  for (const altered of changed) {
    assertThrows(() =>
      form8995a.build(
        form8995aInputSchema.parse(altered.form8995a),
        { filer, pending: altered },
      )
    );
    assertThrows(() =>
      form8995aScheduleC.build(
        form8995aInputSchema.parse(altered.form8995a_schedule_c),
        { filer, pending: altered },
      )
    );
    assertThrows(() =>
      form8995aPdf.projectFields!(
        altered.form8995a,
        altered,
      )
    );
    assertThrows(() =>
      form8995aScheduleCPdf.projectFields!(
        altered.form8995a_schedule_c,
        altered,
      )
    );
  }
});
