import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import {
  calculateSeniorOnlySchedule1A,
  inputSchema,
} from "../../../nodes/intermediate/forms/schedule1a/index.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

const form1040ReconciliationSchema = z.object({
  filing_status: z.nativeEnum(FilingStatus).optional(),
  line11_agi: z.number().int().optional(),
  line13b_additional_deductions: z.number().int().nonnegative().optional(),
  schedule1a_line37_senior_deduction: z.number().int().nonnegative().optional(),
  taxpayer_ssn: z.string().optional(),
  taxpayer_age_65_or_older: z.boolean().optional(),
  taxpayer_ssn_valid_for_employment: z.boolean().optional(),
  taxpayer_ssn_issued_before_due_date: z.boolean().optional(),
  taxpayer_tin_issued_by_due_date: z.boolean().optional(),
  spouse_ssn: z.string().optional(),
  spouse_age_65_or_older: z.boolean().optional(),
  spouse_ssn_valid_for_employment: z.boolean().optional(),
  spouse_ssn_issued_before_due_date: z.boolean().optional(),
  spouse_tin_issued_by_due_date: z.boolean().optional(),
}).passthrough();

type Input = z.infer<typeof inputSchema> | readonly [];

function buildSeniorSchedule(raw: Input, context?: MefBuildContext): string {
  if (Array.isArray(raw) && raw.length === 0) return "";
  const input = inputSchema.parse(raw);
  if (!input.senior_zero_exclusions_review) {
    const claim = z.object({
      line13b_additional_deductions: z.number().optional(),
    }).passthrough().parse(context?.pending?.f1040);
    if ((claim.line13b_additional_deductions ?? 0) === 0) return "";
    throw new Error(
      "Schedule 1-A positive line 13b needs sourced senior-only Part I review",
    );
  }
  const form1040 = form1040ReconciliationSchema.parse(
    context?.pending?.f1040,
  );
  if (
    context?.pending &&
    ("form2555" in context.pending || "form4563" in context.pending)
  ) {
    throw new Error(
      "Schedule 1-A zero-exclusion review conflicts with a Form 2555 or Form 4563 source",
    );
  }
  const lines = calculateSeniorOnlySchedule1A(
    { taxYear: 2025, formType: "f1040" },
    input,
  );
  const matchesPerson = (
    claimed: number,
    sourceSsn: string | undefined,
    returnSsn: string | undefined,
    returnAge: boolean | undefined,
    employmentValid: boolean | undefined,
    issuedBeforeDueDate: boolean | undefined,
    tinIssuedByDueDate: boolean | undefined,
  ) =>
    claimed === 0 || (
      sourceSsn !== undefined && returnSsn !== undefined &&
      sourceSsn.replaceAll("-", "") === returnSsn.replaceAll("-", "") &&
      returnAge === true && employmentValid === true &&
      issuedBeforeDueDate === true && tinIssuedByDueDate === true
    );
  if (
    form1040.filing_status !== input.filing_status ||
    !matchesPerson(
      lines.line36a_taxpayer,
      input.taxpayer_ssn,
      form1040.taxpayer_ssn,
      form1040.taxpayer_age_65_or_older,
      form1040.taxpayer_ssn_valid_for_employment,
      form1040.taxpayer_ssn_issued_before_due_date,
      form1040.taxpayer_tin_issued_by_due_date,
    ) ||
    !matchesPerson(
      lines.line36b_spouse,
      input.spouse_ssn,
      form1040.spouse_ssn,
      form1040.spouse_age_65_or_older,
      form1040.spouse_ssn_valid_for_employment,
      form1040.spouse_ssn_issued_before_due_date,
      form1040.spouse_tin_issued_by_due_date,
    ) ||
    form1040.line11_agi === undefined ||
    form1040.line13b_additional_deductions === undefined ||
    form1040.schedule1a_line37_senior_deduction === undefined ||
    form1040.line11_agi !== lines.line1_agi ||
    form1040.line13b_additional_deductions !== lines.line38_total ||
    form1040.schedule1a_line37_senior_deduction !== lines.line37_senior
  ) {
    throw new Error(
      "Schedule 1-A senior identity and Part I/VI do not reconcile to Form 1040",
    );
  }
  return elements("IRS1040Schedule1A", [
    element("AdjustedGrossIncomeAmt", lines.line1_agi),
    element("ModifiedAGIAmt", lines.line3_magi),
    element("EnhncSrDedFSThrshldAmt", lines.line32_threshold),
    element("EnhncSrDedMAGILessThrshldAmt", lines.line33_excess_magi),
    element("EnhnSrDedMAGILessThrshldRedAmt", lines.line34_reduction),
    element("SpecfiedDolLessThrshldRedAmt", lines.line35_per_person),
    lines.line36a_taxpayer > 0
      ? element("PrimaryEnhancedSeniorDedAmt", lines.line36a_taxpayer)
      : "",
    lines.line36b_spouse > 0
      ? element("SpouseEnhancedSeniorDedAmt", lines.line36b_spouse)
      : "",
    element("EnhancedSeniorDeductionAmt", lines.line37_senior),
    element("TotalAdditionalDeductionsAmt", lines.line38_total),
  ]);
}

export const schedule1a: MefFormDescriptor<"schedule1a", Input> = {
  pendingKey: "schedule1a",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040s1a--2025.pdf",
  build: buildSeniorSchedule,
};
