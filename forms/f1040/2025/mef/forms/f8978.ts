import { isDeepStrictEqual } from "node:util";
import { element, elements } from "../../../mef/xml.ts";
import {
  calculateFiling,
  type Form8978Lines,
  Form8978Source,
  inputSchema,
} from "../../../nodes/inputs/f8978/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import {
  buildForm8978Statements,
  statementFileName,
} from "./f8978_statement.ts";

type Input = {
  filings?: unknown;
  calculated_filings?: readonly Form8978Lines[];
  line14?: number;
} & Record<string, unknown>;

function sourceIndicator(source: Form8978Source): string {
  return source === Form8978Source.BbaAudit
    ? element("BBAAuditInd", "X")
    : element("AARFilingInd", "X");
}

function yearGroup(year: Form8978Lines["years"][number]): string {
  return elements("TYAuditLiabilityCmptGrp", [
    element("TaxYearEndDt", year.tax_year_end),
    element("TotalIncomeOriginallyRptAmt", year.original_income),
    element("TotalAdjustmentsToIncomeAmt", year.line1b),
    element("TotalIncomeCorrectAmt", year.line2),
    element("TotalDeductionOriginallyRptAmt", year.original_deductions),
    element("TotalDeductionNetChangeAmt", year.line3b),
    element("TotalDeductionCorrectAmt", year.line4),
    element("TaxableIncomeCorrectAmt", year.line5),
    element("IncomeTaxAmt", year.corrected_income_tax),
    element("AlternativeMinimumTaxAmt", year.corrected_amt),
    element("TotalTaxCorrectAmt", year.line8),
    element("TotalCreditOriginallyRptAmt", year.original_credits),
    element("TotalAdjustmentsToCreditAmt", year.line9b),
    element("TotalCreditsCorrectAmt", year.line10),
    element("TotalCorrIncmTaxLiabAfterCrAmt", year.line11),
    element("TotalTaxOriginallyRptAmt", year.original_tax_liability),
    element("TaxIncreaseDecreaseAmt", year.line13),
    element("PenaltyAmt", year.penalty),
    element("InterestAmt", year.interest),
  ]);
}

function buildForm(
  filing: Form8978Lines,
  index: number,
  filingCount: number,
  context?: MefBuildContext,
): string {
  const scheduleIds = context?.documentIdsByPendingKey?.form8978_schedule_a;
  if (scheduleIds && scheduleIds.length !== filingCount) {
    throw new Error("Form 8978 needs one linked Schedule A per filing");
  }
  const scheduleId = scheduleIds?.[index];
  const statementId = context?.documentIdsByAttachmentFileName
    ?.[statementFileName(index)];
  if (context?.documentIdsByPendingKey && !statementId) {
    throw new Error(
      "Form 8978 needs its tax-computation statement PDF in the MeF bundle",
    );
  }
  return elements(
    "IRS8978",
    [
      sourceIndicator(filing.source),
      ...filing.years.map(yearGroup),
      element("TotRptgYrTxIncreaseDecreaseAmt", filing.line14),
      filing.line16 > 0 ? element("TotalPenaltyAmt", filing.line16) : "",
      filing.line18 > 0 ? element("TotalInterestAmt", filing.line18) : "",
    ],
    scheduleId
      ? {
        referenceDocumentId: [statementId, scheduleId].filter(Boolean).join(
          " ",
        ),
        referenceDocumentName: "BinaryAttachment IRS8978ScheduleA",
      }
      : undefined,
  );
}

export const form8978: MefFormDescriptor<"f8978", Input, readonly string[]> = {
  pendingKey: "f8978",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8978.pdf",
  build(fields, context) {
    if (fields.filings && !fields.calculated_filings) {
      throw new Error(
        "Form 8978 needs calculated affected-year liabilities before MeF export",
      );
    }
    if (fields.filings) {
      const recomputed = inputSchema.parse(fields).filings.map(calculateFiling);
      if (
        !isDeepStrictEqual(recomputed, fields.calculated_filings) ||
        recomputed.reduce((sum, filing) => sum + filing.line14, 0) !==
          fields.line14
      ) {
        throw new Error(
          "Form 8978 MeF values disagree with affected-year source facts",
        );
      }
    }
    return (fields.calculated_filings ?? []).map((filing, index) =>
      buildForm(filing, index, fields.calculated_filings?.length ?? 0, context)
    );
  },
  async buildBinaryAttachments(fields, context) {
    if (!fields.filings) return [];
    return buildForm8978Statements(inputSchema.parse(fields), context?.filer);
  },
};
