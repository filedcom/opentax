import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus as HeaderFilingStatus } from "../../../mef/header.ts";
import { FilingStatus as NodeFilingStatus } from "../../../nodes/types.ts";
import {
  calculateScheduleCLossLines,
  form8995a as node,
  inputSchema,
} from "../../../nodes/intermediate/forms/form8995a/index.ts";
import { form8995 } from "../../../nodes/intermediate/forms/form8995/index.ts";
import { form8995a as parent } from "./f8995a.ts";
import { form8995aScheduleC } from "./f8995a_schedule_c.ts";
import { form8995aPdf } from "../../pdf/forms/f8995a.ts";
import { form8995aScheduleCPdf } from "../../pdf/forms/f8995a_schedule_c.ts";

const gainSource = {
  line_a_principal_business: "Consulting",
  line_b_business_code: "541611",
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
const lossSource = {
  line_a_principal_business: "Retail",
  line_b_business_code: "459999",
  line_c_business_name: "South Shop",
  line_d_ein: "987654321",
  business_reference: "south-2025",
  line_f_accounting_method: "cash" as const,
  line_g_material_participation: true,
  line_32_at_risk: "a" as const,
  line_1_gross_receipts: 0,
  line_27b_other_expenses: 800,
  qbi_w2_wages: 0,
  qbi_unadjusted_basis: 0,
  qbi_no_other_adjustments_confirmed: true,
};
const businesses = [
  { business_reference: "north-2025", business_name: "North Works", ein: "123456789",
    qbi: 1_000, w2_wages: 100, ubia: 0,
    no_other_adjustments_confirmed: true, source_schedule_c: gainSource },
  { business_reference: "south-2025", business_name: "South Shop", ein: "987654321",
    qbi: -800, w2_wages: 0, ubia: 0,
    no_other_adjustments_confirmed: true, source_schedule_c: lossSource },
];
const input = {
  filing_status: NodeFilingStatus.Single,
  taxable_income: 300_000,
  net_capital_gain: 0,
  qbi: 200,
  w2_wages: 100,
  unadjusted_basis: 0,
  schedule_c_qbi_businesses: businesses,
  qbi_no_prior_loss_or_suspended_loss_confirmed: true as const,
};
const filer = {
  primarySSN: "123456789",
  nameLine1: "SMITH JOHN A",
  nameControl: "SMIT",
  address: { line1: "1 MAIN ST", city: "AUSTIN", state: "TX", zip: "78701" },
  filingStatus: HeaderFilingStatus.Single,
};
const pending = {
  form8995a: input,
  form8995a_schedule_c: input,
  schedule_c: { schedule_cs: [gainSource, lossSource],
    qbi_no_prior_loss_or_suspended_loss_confirmed: true },
  f1040: { line13_qbi_deduction: 40 },
};
const context = { filer, pending };

Deno.test("Form 8995-A Schedule C: current gain and loss net to the sourced parent and native companion", () => {
  const parsed = inputSchema.parse(input);
  const calculated = calculateScheduleCLossLines(parsed);
  assertEquals(calculated.schedule.line3, 800);
  assertEquals(calculated.schedule.line4, 1_000);
  assertEquals(calculated.schedule.line5, 800);
  assertEquals(calculated.schedule.line6, 0);
  assertEquals(calculated.parent.line39, 40);
  const result = node.compute({ taxYear: 2025, formType: "f1040" }, parsed);
  assertEquals(result.outputs.find((output) => output.nodeType === "f1040")?.fields.line13_qbi_deduction, 40);
  assertEquals(result.outputs.find((output) => output.nodeType === "form8995a_schedule_c")?.fields, parsed);
  const scheduleXml = form8995aScheduleC.build(input, context);
  assertStringIncludes(scheduleXml, "<QlfyBusinessIncomeOrLossAmt>-800</QlfyBusinessIncomeOrLossAmt>");
  assertStringIncludes(scheduleXml, "<LossNettedIncomeOthTradeBusAmt>800</LossNettedIncomeOthTradeBusAmt>");
  const parentXml = parent.build(input, context);
  assertStringIncludes(parentXml, "<TradeOrBusinessName><BusinessNameLine1Txt>South Shop</BusinessNameLine1Txt></TradeOrBusinessName>");
  assertStringIncludes(parentXml, "<QualifiedBusinessIncomeDedAmt>40</QualifiedBusinessIncomeDedAmt>");
  const schedulePdf = form8995aScheduleCPdf.projectFields?.(input, pending);
  const parentPdf = form8995aPdf.projectFields?.(input, pending);
  assertEquals(schedulePdf?.row2_a, -800);
  assertEquals(schedulePdf?.line5, 800);
  assertEquals(parentPdf?.line2, 200);
  assertEquals(parentPdf?.line2_b, 0);
  assertEquals(parentPdf?.line39, 40);
});

Deno.test("Form 8995-A Schedule C: altered source, companion, parent line, and unsupported loss reject", () => {
  assertThrows(() => parent.build(input, {
    filer, pending: { ...pending, form8995a_schedule_c: undefined },
  }), Error, "companion is missing");
  assertThrows(() => form8995aScheduleC.build(input, {
    filer, pending: { ...pending, schedule_c: { schedule_cs: [gainSource, { ...lossSource, line_27b_other_expenses: 799 }],
      qbi_no_prior_loss_or_suspended_loss_confirmed: true } },
  }), Error, "differ from the retained Schedule C");
  assertThrows(() => form8995aScheduleC.build(input, {
    filer, pending: { ...pending, f1040: { line13_qbi_deduction: 39 } },
  }), Error, "Form 1040 line 13");
  assertThrows(() => node.compute({ taxYear: 2025, formType: "f1040" }, inputSchema.parse({
    ...input, qbi_loss_carryforward: -100,
  })), Error, "excludes prior loss");
  assertThrows(() => node.compute({ taxYear: 2025, formType: "f1040" }, inputSchema.parse({
    ...input, schedule_c_qbi_businesses: [{ ...businesses[0], qbi: 1_001 }, businesses[1]],
  })), Error, "positive net QBI");
  assertThrows(() => node.compute({ taxYear: 2025, formType: "f1040" }, inputSchema.parse({
    ...input,
    schedule_c_qbi_businesses: [businesses[0], {
      ...businesses[1],
      source_schedule_c: { ...lossSource, line_32_at_risk: undefined },
    }],
  })), Error, "business identity, QBI adjustment");
});

Deno.test("Form 8995-A Schedule C: offsetting businesses do not disappear at the QBI routing node", () => {
  const result = form8995.compute({ taxYear: 2025, formType: "f1040" }, {
    qbi_from_schedule_c: 0,
    w2_wages: 100,
    unadjusted_basis: 0,
    filing_status: NodeFilingStatus.Single,
    taxable_income: 300_000,
    schedule_c_qbi_businesses: [
      businesses[0],
      { ...businesses[1], qbi: -1_000 },
    ],
    qbi_no_prior_loss_or_suspended_loss_confirmed: true,
  });
  const routed = result.outputs.find((output) => output.nodeType === "form8995a");
  assertEquals(routed?.nodeType, "form8995a");
  assertThrows(
    () => node.compute({ taxYear: 2025, formType: "f1040" }, inputSchema.parse(routed!.fields)),
    Error,
    "positive net QBI",
  );
});
