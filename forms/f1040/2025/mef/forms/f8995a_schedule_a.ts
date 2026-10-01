import {
  assertMfsSstbOwner,
  calculateOneSstb8995ALines,
  type Form8995AInput,
  inputSchema,
} from "../../../nodes/intermediate/forms/form8995a/index.ts";
import { element, elements } from "../../../mef/xml.ts";
import { FilingStatus as HeaderFilingStatus } from "../../../mef/header.ts";
import { FilingStatus as NodeFilingStatus } from "../../../nodes/types.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Input = Form8995AInput | readonly [];

export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [];

function buildScheduleA(rawFields: Input, context?: MefBuildContext): string {
  if (Array.isArray(rawFields) && rawFields.length === 0) return "";
  const fields = inputSchema.strict().parse(rawFields);
  const parent = inputSchema.strict().safeParse(context?.pending?.form8995a);
  if (
    !parent.success || JSON.stringify(parent.data) !== JSON.stringify(fields)
  ) {
    throw new Error(
      "Form 8995-A Schedule A needs matching parent pending source",
    );
  }
  if (context?.pending?.form8995a_schedule_d !== undefined) {
    throw new Error(
      "Form 8995-A Schedule A bounded route cannot include Schedule D",
    );
  }
  const lines = calculateOneSstb8995ALines(fields);
  const expectedStatus = fields.filing_status === NodeFilingStatus.MFJ
    ? HeaderFilingStatus.MarriedFilingJointly
    : fields.filing_status === NodeFilingStatus.MFS
    ? HeaderFilingStatus.MarriedFilingSeparately
    : fields.filing_status === NodeFilingStatus.HOH
    ? HeaderFilingStatus.HeadOfHousehold
    : HeaderFilingStatus.Single;
  if (context?.filer?.filingStatus !== expectedStatus) {
    throw new Error(
      "Form 8995-A Schedule A filing status differs from the return header",
    );
  }
  assertMfsSstbOwner(fields, context.filer.primarySSN);
  const filed1040 = context?.pending?.f1040;
  if (
    !filed1040 || typeof filed1040 !== "object" ||
    !("line13_qbi_deduction" in filed1040) ||
    filed1040.line13_qbi_deduction !== lines.line39
  ) {
    throw new Error(
      "Form 8995-A Schedule A parent line 39 differs from Form 1040 line 13",
    );
  }
  return elements("IRS8995AScheduleA", [
    elements("NonPTPSSTBGrp", [
      element("TaxableIncomeBeforeQBIDedAmt", lines.line33),
      element("FilingStatusThresholdCd", lines.threshold),
      element("TXIBfrQBIDedLessThresholdAmt", lines.line33 - lines.threshold),
      element("FilingStatusPhaseInRangeCd", lines.phaseInRange),
      element("PhaseInPct", lines.phaseIn.toFixed(5)),
      element("ApplicablePct", lines.applicable.toFixed(5)),
      elements("NonPTPSSTBDtlGrp", [
        elements("TradeOrBusinessName", [
          element("BusinessNameLine1Txt", lines.source.business_name),
        ]),
        element("EIN", lines.source.ein),
        element("QualifedBusinessIncomeAmt", lines.source.business_qbi),
        element("AllocableShareW2WagesAmt", lines.source.business_w2_wages),
        element("AllocableShareUBIAQlfyPropAmt", lines.source.business_ubia),
        element("ApplicablePctQBIAmt", lines.line2),
        element("ApplicablePctW2WagesAmt", lines.line4),
        element("ApplicablePctUBIAQlfyPropAmt", lines.line7),
      ]),
    ]),
  ]);
}

export const form8995aScheduleA: MefFormDescriptor<
  "form8995a_schedule_a",
  Input
> = {
  pendingKey: "form8995a_schedule_a",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8995aa--2025.pdf",
  build(fields, context) {
    return buildScheduleA(fields, context);
  },
};
