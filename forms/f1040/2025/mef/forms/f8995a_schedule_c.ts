import {
  calculateScheduleCLossLines,
  type Form8995AInput,
  inputSchema,
} from "../../../nodes/intermediate/forms/form8995a/index.ts";
import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import { assertScheduleCLossSources } from "./f8995a.ts";

type Input = Form8995AInput | readonly [];

export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [];

function buildScheduleC(rawFields: Input, context?: MefBuildContext): string {
  if (Array.isArray(rawFields) && rawFields.length === 0) return "";
  const fields = inputSchema.strict().parse(rawFields);
  const parent = inputSchema.strict().safeParse(context?.pending?.form8995a);
  if (!parent.success || JSON.stringify(parent.data) !== JSON.stringify(fields)) {
    throw new Error("Form 8995-A Schedule C needs matching parent pending source");
  }
  if (context?.pending?.form8995 !== undefined ||
    context?.pending?.form8995a_schedule_a !== undefined ||
    context?.pending?.form8995a_schedule_d !== undefined) {
    throw new Error("Form 8995-A Schedule C bounded route cannot accompany Form 8995 or Schedules A/D");
  }
  assertScheduleCLossSources(fields, context?.pending);
  const lines = calculateScheduleCLossLines(fields);
  const form1040 = z.object({ line13_qbi_deduction: z.number() })
    .safeParse(context?.pending?.f1040);
  if (!form1040.success || form1040.data.line13_qbi_deduction !== lines.parent.line39) {
    throw new Error("Form 8995-A Schedule C parent line 39 differs from Form 1040 line 13");
  }
  return elements("IRS8995AScheduleC", [
    ...lines.schedule.rows.map((row) =>
      elements("LossNettingCarryforwardGrp", [
        elements("TradeOrBusinessName", [element("BusinessNameLine1Txt", row.name)]),
        element("QlfyBusinessIncomeOrLossAmt", row.line1a),
        element("LossNettingReductionAmt", row.line1b),
        element("AdjQualifiedBusinessIncomeAmt", row.line1c),
      ])
    ),
    element("PYQlfyBusinessNetLossCfwdAmt", lines.schedule.line2),
    element("TotalTradeOrBusinessLossAmt", lines.schedule.line3),
    element("TotalTradeOrBusinessIncomeAmt", lines.schedule.line4),
    element("LossNettedIncomeOthTradeBusAmt", lines.schedule.line5),
    element("QlfyBusLossCarryforwardAmt", lines.schedule.line6),
  ]);
}

export const form8995aScheduleC: MefFormDescriptor<
  "form8995a_schedule_c",
  Input
> = {
  pendingKey: "form8995a_schedule_c",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8995ac.pdf",
  build(fields, context) {
    return buildScheduleC(fields, context);
  },
};
