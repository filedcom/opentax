import {
  assertPatron1099PATRSource,
  calculateOneBusiness8995ALines,
  calculatePatronScheduleDLines,
  type Form8995AInput,
  inputSchema,
} from "../../../nodes/intermediate/forms/form8995a/index.ts";
import { element, elements } from "../../../mef/xml.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import { validateOneBusiness } from "./f8995a.ts";

type Input = Form8995AInput | readonly [];

export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [];

function buildScheduleD(rawFields: Input, context?: MefBuildContext): string {
  if (Array.isArray(rawFields) && rawFields.length === 0) return "";
  const fields = inputSchema.strict().parse(rawFields);
  const parent = inputSchema.strict().safeParse(context?.pending?.form8995a);
  if (!parent.success || JSON.stringify(parent.data) !== JSON.stringify(fields)) {
    throw new Error("Form 8995-A Schedule D needs matching parent pending source");
  }
  assertPatron1099PATRSource(fields, context?.pending?.f1099patr);
  validateOneBusiness(fields);
  const source = fields.patron_filing_details;
  const business = fields.business_filing_details;
  if (!source || !business) {
    throw new Error("Form 8995-A Schedule D needs identified business and cooperative source");
  }
  const schedule = calculatePatronScheduleDLines(fields);
  const parentLines = calculateOneBusiness8995ALines(fields);
  if (schedule.line6 !== parentLines.line14) {
    throw new Error("Form 8995-A Schedule D line 6 differs from parent line 14");
  }
  const form1040 = context?.pending?.f1040;
  if (
    typeof form1040 !== "object" || !form1040 ||
    !("line13_qbi_deduction" in form1040) ||
    form1040.line13_qbi_deduction !== parentLines.line39
  ) {
    throw new Error("Form 8995-A Schedule D parent line 39 differs from Form 1040 line 13");
  }
  return elements("IRS8995AScheduleD", [
    elements("PatronAgricHortCoopGrp", [
      elements("TradeOrBusinessName", [
        element("BusinessNameLine1Txt", business.business_name),
      ]),
      element("EIN", business.ein),
      element("QBIAllcblQlfyCoopPymtAmt", schedule.line2),
      element("QBIAllcblQlfyCoopPymtPctAmt", schedule.line3),
      element("W2WageAllcblQlfyCoopPymtAmt", schedule.line4),
      element("W2WageAllcblQlfyCoopPymtPctAmt", schedule.line5),
      element("PatronReductionAmt", schedule.line6),
    ]),
  ]);
}

export const form8995aScheduleD: MefFormDescriptor<
  "form8995a_schedule_d",
  Input
> = {
  pendingKey: "form8995a_schedule_d",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8995ad.pdf",
  build(fields, context) {
    return buildScheduleD(fields, context);
  },
};
