import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { FilingStatus as HeaderFilingStatus } from "../mef/header.ts";
import { normalizeAllPending } from "./pending.ts";
import { form8995a } from "./mef/forms/f8995a.ts";
import { form8995aScheduleC } from "./mef/forms/f8995a_schedule_c.ts";
import { form8995aPdf } from "./pdf/forms/f8995a.ts";
import { form8995aScheduleCPdf } from "./pdf/forms/f8995a_schedule_c.ts";
import { inputSchema as form8995aInputSchema } from "../nodes/intermediate/forms/form8995a/index.ts";

const gain = {
  line_a_principal_business: "Repairs",
  line_b_business_code: "811490",
  line_c_business_name: "North Works",
  line_d_ein: "123456789",
  business_reference: "north-2025",
  line_f_accounting_method: "cash" as const,
  line_g_material_participation: true,
  line_1_gross_receipts: 1_400,
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
  line_27b_other_expenses: 1_000,
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
    },
    w2: [{ box1_wages: 300_000, box2_fed_withheld: 60_000 }],
    schedule_c: [gain, loss],
  });
  assertEquals(result.diagnostics, []);
  return result;
}

Deno.test("Form 8995-A Schedule C nets two businesses to a positive limited deduction", () => {
  const result = preparedReturn();
  assertEquals(result.pending.f1040.line13_qbi_deduction, 50);
  assertEquals(result.carryforwards.qbi_loss_carryforward_8995a, undefined);
  const pending = normalizeAllPending(result.pending);
  const parent = form8995aInputSchema.parse(pending.form8995a);
  const companion = form8995aInputSchema.parse(pending.form8995a_schedule_c);
  assertEquals(parent.qbi, 300);
  const parentXml = form8995a.build(parent, { filer, pending });
  const scheduleXml = form8995aScheduleC.build(companion, { filer, pending });
  assertStringIncludes(
    parentXml,
    "<QualifiedBusinessIncomeDedAmt>50</QualifiedBusinessIncomeDedAmt>",
  );
  assertStringIncludes(
    scheduleXml,
    "<TotalTradeOrBusinessLossAmt>1000</TotalTradeOrBusinessLossAmt>",
  );
  assertStringIncludes(
    scheduleXml,
    "<LossNettedIncomeOthTradeBusAmt>1000</LossNettedIncomeOthTradeBusAmt>",
  );
  assertStringIncludes(
    scheduleXml,
    "<QlfyBusLossCarryforwardAmt>0</QlfyBusLossCarryforwardAmt>",
  );
  const parentPdf = form8995aPdf.projectFields!(parent, pending);
  const schedulePdf = form8995aScheduleCPdf.projectFields!(companion, pending);
  assertEquals(parentPdf.line2, 300);
  assertEquals(parentPdf.line3, 60);
  assertEquals(parentPdf.line10, 50);
  assertEquals(parentPdf.line39, 50);
  assertEquals(schedulePdf.line3, 1_000);
  assertEquals(schedulePdf.line4, 1_300);
  assertEquals(schedulePdf.line5, 1_000);
  assertEquals(schedulePdf.line6, 0);
});

Deno.test("positive Schedule C loss-netting packet rejects extra Schedule B and changed final deduction", () => {
  const pending = normalizeAllPending(preparedReturn().pending);
  const altered: Record<string, Record<string, unknown>>[] = [{
    ...pending,
    form8995a_schedule_b: pending.form8995a,
  }, {
    ...pending,
    f1040: { ...pending.f1040, line13_qbi_deduction: 51 },
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
      () =>
        form8995aScheduleC.build(
          form8995aInputSchema.parse(changed.form8995a_schedule_c),
          {
            filer,
            pending: changed,
          },
        ),
      Error,
    );
    assertThrows(
      () => form8995aPdf.projectFields!(changed.form8995a, changed),
      Error,
    );
    assertThrows(
      () =>
        form8995aScheduleCPdf.projectFields!(
          form8995aInputSchema.parse(changed.form8995a_schedule_c),
          changed,
        ),
      Error,
    );
  }
});
