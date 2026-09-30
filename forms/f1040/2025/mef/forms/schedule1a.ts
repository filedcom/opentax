import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import {
  calculateSeniorOnlySchedule1A,
  calculateSingleEmployerTipsSchedule1A,
  calculateVehicleInterestSchedule1A,
  calculateW2OvertimeSchedule1A,
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

function buildSchedule(raw: Input, context?: MefBuildContext): string {
  if (Array.isArray(raw) && raw.length === 0) return "";
  const input = inputSchema.parse(raw);
  if (!input.senior_zero_exclusions_review) {
    const claim = z.object({
      line13b_additional_deductions: z.number().optional(),
    }).passthrough().parse(context?.pending?.f1040);
    if ((claim.line13b_additional_deductions ?? 0) === 0) return "";
    throw new Error(
      "Schedule 1-A positive line 13b needs sourced Part I zero-exclusion review",
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
  if ((input.qualified_employee_tips?.length ?? 0) > 0) {
    const form4137 = context?.pending?.form4137 === undefined
      ? undefined
      : z.object({ forms: z.array(z.unknown()).optional() }).passthrough()
        .parse(context.pending.form4137);
    if ((form4137?.forms?.length ?? 0) > 0) {
      throw new Error(
        "Schedule 1-A W-2-only tips filing cannot include Form 4137 tips",
      );
    }
    const lines = calculateSingleEmployerTipsSchedule1A(
      { taxYear: 2025, formType: "f1040" },
      input,
    );
    const entry = input.qualified_employee_tips![0];
    const ssn = entry.employee_ssn.replaceAll("-", "");
    const matchesRecipient = (
      sourceSsn: string | undefined,
      returnSsn: string | undefined,
      employmentValid: boolean | undefined,
      issuedBeforeDueDate: boolean | undefined,
      tinIssuedByDueDate: boolean | undefined,
    ) =>
      sourceSsn?.replaceAll("-", "") === ssn &&
      returnSsn?.replaceAll("-", "") === ssn &&
      employmentValid === true && issuedBeforeDueDate === true &&
      tinIssuedByDueDate === true;
    const taxpayer = matchesRecipient(
      input.taxpayer_ssn,
      form1040.taxpayer_ssn,
      form1040.taxpayer_ssn_valid_for_employment,
      form1040.taxpayer_ssn_issued_before_due_date,
      form1040.taxpayer_tin_issued_by_due_date,
    );
    const spouse = input.filing_status === FilingStatus.MFJ && matchesRecipient(
      input.spouse_ssn,
      form1040.spouse_ssn,
      form1040.spouse_ssn_valid_for_employment,
      form1040.spouse_ssn_issued_before_due_date,
      form1040.spouse_tin_issued_by_due_date,
    );
    if (
      form1040.filing_status !== input.filing_status ||
      (!taxpayer && !spouse) ||
      form1040.line11_agi !== lines.line1_agi ||
      form1040.line13b_additional_deductions !== lines.line38_total ||
      (form1040.schedule1a_line37_senior_deduction ?? 0) !== 0
    ) {
      throw new Error(
        "Schedule 1-A tips identity and Part I/VI do not reconcile to Form 1040",
      );
    }
    return elements("IRS1040Schedule1A", [
      element("AdjustedGrossIncomeAmt", lines.line1_agi),
      element("ModifiedAGIAmt", lines.line3_magi),
      element("QualifiedTipsWagesAmt", lines.line4a_w2_tips),
      element("QualifiedTipsForm4137Amt", 0),
      element("QualifiedTipsEmployeeAmt", lines.line4c_employee_tips),
      element("TotalQualifiedTipsAmt", lines.line6_total_tips),
      element("SmallerTipsOrMaxDedAmt", lines.line7_capped_tips),
      element("TipsFilingStatusThrshldAmt", lines.line9_threshold),
      lines.line10_excess_magi > 0
        ? element("TipsMAGILessThrshldAmt", lines.line10_excess_magi)
        : "",
      lines.line10_excess_magi > 0
        ? element("TipsMAGILessThrshldDivideNum", lines.line11_thousands)
        : "",
      lines.line10_excess_magi > 0
        ? element("TipsMAGILessThrshldRedAmt", lines.line12_reduction)
        : "",
      element("QualifiedTipsDeductionAmt", lines.line13_tips),
      element("TotalAdditionalDeductionsAmt", lines.line38_total),
    ]);
  }
  if ((input.qualified_w2_overtime?.length ?? 0) > 0) {
    const lines = calculateW2OvertimeSchedule1A(
      { taxYear: 2025, formType: "f1040" },
      input,
    );
    const matchesRecipient = (
      sourceSsn: string,
      inputSsn: string | undefined,
      returnSsn: string | undefined,
      employmentValid: boolean | undefined,
      issuedBeforeDueDate: boolean | undefined,
      tinIssuedByDueDate: boolean | undefined,
    ) =>
      sourceSsn.replaceAll("-", "") === inputSsn?.replaceAll("-", "") &&
      sourceSsn.replaceAll("-", "") === returnSsn?.replaceAll("-", "") &&
      employmentValid === true && issuedBeforeDueDate === true &&
      tinIssuedByDueDate === true;
    const ownersMatch = input.qualified_w2_overtime!.every((entry) =>
      matchesRecipient(
        entry.employee_ssn,
        input.taxpayer_ssn,
        form1040.taxpayer_ssn,
        form1040.taxpayer_ssn_valid_for_employment,
        form1040.taxpayer_ssn_issued_before_due_date,
        form1040.taxpayer_tin_issued_by_due_date,
      ) ||
      (input.filing_status === FilingStatus.MFJ && matchesRecipient(
        entry.employee_ssn,
        input.spouse_ssn,
        form1040.spouse_ssn,
        form1040.spouse_ssn_valid_for_employment,
        form1040.spouse_ssn_issued_before_due_date,
        form1040.spouse_tin_issued_by_due_date,
      ))
    );
    if (
      form1040.filing_status !== input.filing_status ||
      !ownersMatch ||
      form1040.line11_agi !== lines.line1_agi ||
      form1040.line13b_additional_deductions !== lines.line38_total ||
      (form1040.schedule1a_line37_senior_deduction ?? 0) !== 0
    ) {
      throw new Error(
        "Schedule 1-A overtime identity and Part I/VI do not reconcile to Form 1040",
      );
    }
    return elements("IRS1040Schedule1A", [
      element("AdjustedGrossIncomeAmt", lines.line1_agi),
      element("ModifiedAGIAmt", lines.line3_magi),
      element("QualifiedOvertimeWagesAmt", lines.line14a_w2_overtime),
      element("QualifiedOvertimeForm1099Amt", 0),
      element("TotalQualifiedOvertimeAmt", lines.line14c_total_overtime),
      element("SmallerOvertimeOrMaxDedAmt", lines.line15_capped_overtime),
      element("OvertimeFilingStatusThrshldAmt", lines.line17_threshold),
      lines.line18_excess_magi > 0
        ? element("OtMAGILessThrshldAmt", lines.line18_excess_magi)
        : "",
      lines.line18_excess_magi > 0
        ? element("OtMAGILessThrshldDivideNum", lines.line19_thousands)
        : "",
      lines.line18_excess_magi > 0
        ? element("OtMAGILessThrshldRedAmt", lines.line20_reduction)
        : "",
      element("QualifiedOvertimeCompDedAmt", lines.line21_overtime),
      element("TotalAdditionalDeductionsAmt", lines.line38_total),
    ]);
  }
  if ((input.vehicle_loans?.length ?? 0) > 0) {
    const lines = calculateVehicleInterestSchedule1A(
      { taxYear: 2025, formType: "f1040" },
      input,
    );
    const returnSsns = [form1040.taxpayer_ssn];
    if (input.filing_status === FilingStatus.MFJ) {
      returnSsns.push(form1040.spouse_ssn);
    }
    if (
      form1040.filing_status !== input.filing_status ||
      input.taxpayer_ssn?.replaceAll("-", "") !==
        form1040.taxpayer_ssn?.replaceAll("-", "") ||
      (input.filing_status === FilingStatus.MFJ &&
        input.spouse_ssn?.replaceAll("-", "") !==
          form1040.spouse_ssn?.replaceAll("-", "")) ||
      !input.vehicle_loans!.every((loan) =>
        returnSsns.some((ssn) =>
          ssn?.replaceAll("-", "") === loan.borrower_ssn.replaceAll("-", "")
        )
      ) ||
      form1040.line11_agi !== lines.line1_agi ||
      form1040.line13b_additional_deductions !== lines.line38_total ||
      (form1040.schedule1a_line37_senior_deduction ?? 0) !== 0
    ) {
      throw new Error(
        "Schedule 1-A vehicle interest identity and Part I/VI do not reconcile to Form 1040",
      );
    }
    return elements("IRS1040Schedule1A", [
      element("AdjustedGrossIncomeAmt", lines.line1_agi),
      element("ModifiedAGIAmt", lines.line3_magi),
      ...lines.line22_vehicles.map((loan) =>
        elements("QlfyPassengerVehicleLoanIntGrp", [
          element("VIN", loan.vin),
          element("QualifiedCarLoanIntDedSchAmt", loan.deducted_elsewhere),
          element("QualifiedCarLoanInterestAmt", loan.schedule1a_interest),
        ])
      ),
      element("TotQualifiedCarLoanInterestAmt", lines.line23_total_interest),
      element("SmallerCarLoanIntOrMaxDedAmt", lines.line24_capped_interest),
      element("CarLnIntFilingStatusThrshldAmt", lines.line26_threshold),
      lines.line27_excess_magi > 0
        ? element("CarLnIntMAGILessThrshldAmt", lines.line27_excess_magi)
        : "",
      lines.line27_excess_magi > 0
        ? element("CarLnIntMAGILessThrshldDivNum", lines.line28_thousands)
        : "",
      lines.line27_excess_magi > 0
        ? element("CarLnIntMAGILessThrshldRedAmt", lines.line29_reduction)
        : "",
      element("QualifiedCarLoanInterestDedAmt", lines.line30_vehicle_interest),
      element("TotalAdditionalDeductionsAmt", lines.line38_total),
    ]);
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
  build: buildSchedule,
};
