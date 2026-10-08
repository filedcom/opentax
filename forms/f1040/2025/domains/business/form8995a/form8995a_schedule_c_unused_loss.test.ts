import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { FilingStatus as HeaderFilingStatus } from "../../../../mef/header.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { form8995a } from "../../../mef/forms/business/f8995a/f8995a.ts";
import { form8995aScheduleC } from "../../../mef/forms/business/f8995a/f8995a_schedule_c.ts";
import { form8995aPdf } from "../../../pdf/forms/business/f8995a.ts";
import { form8995aScheduleCPdf } from "../../../pdf/forms/business/f8995a_schedule_c.ts";
import { inputSchema as form8995aInputSchema } from "../../../../nodes/intermediate/forms/form8995a/index.ts";

const gain = {
  line_a_principal_business: "Repairs",
  line_b_business_code: "811490",
  line_c_business_name: "North Works",
  line_d_ein: "123456789",
  business_reference: "north-2025",
  line_f_accounting_method: "cash" as const,
  line_g_material_participation: true,
  line_1_gross_receipts: 1_100,
  line_26_wages: 100,
  qbi_w2_wages: 100,
  qbi_unadjusted_basis: 0,
  qbi_no_other_adjustments_confirmed: true,
};
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
        line2_schedule_c_amount: -200,
        line6_schedule_f_amount: 0,
        source_document_refs: ["synthetic 2025 Schedule C source pair"],
      },
    },
    w2: [{ box1_wages: 300_000, box2_fed_withheld: 60_000 }],
    schedule_c: [gain, loss],
  });
  assertEquals(result.diagnostics, []);
  return result;
}

Deno.test("Form 8995-A Schedule C carries unused current QBI loss with zero deduction", () => {
  const result = preparedReturn();
  assertEquals(result.pending.f1040.line13_qbi_deduction, 0);
  assertEquals(result.pending.schedule1.line3_schedule_c, -200);
  assertEquals(result.pending.f1040.line8_additional_income, -200);
  assertEquals(result.carryforwards.qbi_loss_carryforward_8995a, 200);
  const pending = normalizeAllPending(result.pending);
  const parent = form8995aInputSchema.parse(pending.form8995a);
  const companion = form8995aInputSchema.parse(pending.form8995a_schedule_c);
  assertEquals(parent.qbi, -200);
  const parentXml = form8995a.build(parent, { filer, pending });
  const scheduleXml = form8995aScheduleC.build(companion, { filer, pending });
  assertStringIncludes(
    scheduleXml,
    "<QlfyBusLossCarryforwardAmt>200</QlfyBusLossCarryforwardAmt>",
  );
  assertStringIncludes(parentXml, "<IRS8995A");
  const parentPdf = form8995aPdf.projectFields!(parent, pending);
  const schedulePdf = form8995aScheduleCPdf.projectFields!(companion, pending);
  assertEquals(parentPdf.line2, 0);
  assertEquals(parentPdf.line4, 0);
  assertEquals(parentPdf.line39, 0);
  assertEquals(schedulePdf.line3, 1_200);
  assertEquals(schedulePdf.line4, 1_000);
  assertEquals(schedulePdf.line5, 1_000);
  assertEquals(schedulePdf.line6, 200);
});

Deno.test("unused Schedule C loss packet rejects changed source, companion, and final deduction", () => {
  const pending = normalizeAllPending(preparedReturn().pending);
  const altered: Record<string, Record<string, unknown>>[] = [{
    ...pending,
    schedule_c: {
      ...pending.schedule_c,
      schedule_cs: [gain, { ...loss, line_27b_other_expenses: 1_199 }],
    },
  }, {
    ...pending,
    form8995a_schedule_c: {
      ...pending.form8995a_schedule_c,
      qbi: -199,
    },
  }, {
    ...pending,
    f1040: { ...pending.f1040, line13_qbi_deduction: 1 },
  }, {
    ...pending,
    schedule1: { ...pending.schedule1, line3_schedule_c: -199 },
  }, {
    ...pending,
    schedule1: { ...pending.schedule1, line16_sep_simple: 1 },
  }, {
    ...pending,
    f1040: { ...pending.f1040, line8_additional_income: -199 },
  }, {
    ...pending,
    f1040: {
      ...pending.f1040,
      line15_taxable_income: Number(pending.f1040.line15_taxable_income) + 1,
    },
  }];
  for (const changed of altered) {
    assertThrows(
      () =>
        form8995a.build(form8995aInputSchema.parse(changed.form8995a), {
          filer,
          pending: changed,
        }),
      Error,
    );
    assertThrows(
      () => form8995aPdf.projectFields!(changed.form8995a, changed),
      Error,
    );
  }
});
