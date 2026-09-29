import { element, elements } from "../../../mef/xml.ts";
import {
  calculateYearColumn,
  Form8978Source,
  inputSchema,
} from "../../../nodes/inputs/f8978/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

type Adjustment = ReturnType<
  typeof inputSchema.parse
>["filings"][number]["columns"][number]["income_adjustments"][number];

function sourceIndicator(source: Form8978Source): string {
  return source === Form8978Source.BbaAudit
    ? element("BBAAuditInd", "X")
    : element("AARFilingInd", "X");
}

function adjustment(tag: string, row: Adjustment): string {
  return elements(tag, [
    element("AdjustmentsDesc", row.description),
    element("TrackingNum", row.tracking_number),
    element("AARTrackingNum", row.aar_tracking_number),
    element("AuditControlNum", row.audit_control_number),
    element("EIN", row.ein),
    element("MissingEINReasonCd", row.missing_ein_reason),
    element("SSN", row.ssn),
    element("AdjustmentAmt", row.amount),
  ]);
}

function yearGroup(
  column: ReturnType<
    typeof inputSchema.parse
  >["filings"][number]["columns"][number],
): string {
  const lines = calculateYearColumn(column);
  return elements("PartnerAdditionalRptgYrTxGrp", [
    element("TaxYearEndDt", column.tax_year_end),
    ...column.income_adjustments.map((row) =>
      adjustment("AdjTaxableIncomeTxYrEndGrp", row)
    ),
    element("TotalAdjustmentsToIncomeAmt", lines.line1b),
    ...column.deduction_adjustments.map((row) =>
      adjustment("AdjDeductionIncomeTxYrEndGrp", row)
    ),
    element("TotalDeductionNetChangeAmt", lines.line3b),
    ...column.credit_adjustments.map((row) =>
      adjustment("AdjustmentCreditTaxYrEndGrp", row)
    ),
    element("TotalAdjustmentsToCreditAmt", lines.line9b),
  ]);
}

export const form8978ScheduleA: MefFormDescriptor<
  "form8978_schedule_a",
  unknown,
  readonly string[]
> = {
  pendingKey: "form8978_schedule_a",
  sourcePendingKeys: ["f8978"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8978sa.pdf",
  build(_fields, context) {
    const raw = context?.pending?.f8978;
    if (raw === undefined) return [];
    const input = inputSchema.parse(raw);
    return input.filings.map((filing) =>
      elements("IRS8978ScheduleA", [
        sourceIndicator(filing.source),
        ...filing.columns.map(yearGroup),
      ])
    );
  },
};
