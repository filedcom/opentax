import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import {
  calculateEmployeeTipsSchedule1A,
  calculateSeniorOnlySchedule1A,
  calculateVehicleInterestSchedule1A,
  calculateW2OvertimeSchedule1A,
  inputSchema,
  isQualifiedTipsOccupationCode,
  qualifiedEmployeeTipRows,
  seniorDeduction,
} from "../../../nodes/intermediate/forms/schedule1a/index.ts";
import { inputSchema as w2InputSchema } from "../../../nodes/inputs/w2/index.ts";
import { inputSchema as form4137InputSchema } from "../../../nodes/intermediate/forms/form4137/index.ts";
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
  const parts: string[] = [];
  let total = 0;
  let senior = 0;
  let part1: { line1_agi: number; line3_magi: number } | undefined;
  if (
    (input.qualified_employee_tips?.length ?? 0) > 0 ||
    (input.qualified_form4137_tips?.length ?? 0) > 0
  ) {
    const lines = calculateEmployeeTipsSchedule1A(
      { taxYear: 2025, formType: "f1040" },
      input,
    );
    const entries = input.qualified_employee_tips ?? [];
    const form4137Entries = input.qualified_form4137_tips ?? [];
    const filedW2s = w2InputSchema.parse(context?.pending?.w2).w2s;
    const sourceW2s = filedW2s.filter((item) =>
      item.box13_statutory_employee !== true &&
      item.box14b_tipped_code !== undefined &&
      isQualifiedTipsOccupationCode(item.box14b_tipped_code) &&
      (item.box7_ss_tips ?? 0) > 0
    );
    const normalize = (value: string) => value.replaceAll("-", "");
    if (
      sourceW2s.length !== entries.length ||
      !entries.every((entry) =>
        sourceW2s.some((source) =>
          normalize(source.employee_ssn ?? "") ===
            normalize(entry.employee_ssn) &&
          normalize(source.employer_ein ?? "") ===
            normalize(entry.employer_ein) &&
          source.employer_name === entry.employer_name &&
          source.box7_ss_tips === entry.amount &&
          source.box5_medicare_wages === entry.box5_medicare_wages &&
          source.box14b_tipped_code === entry.occupation_code
        )
      )
    ) {
      throw new Error(
        "Schedule 1-A W-2 tips do not match the employer sources",
      );
    }
    const form4137 = form4137InputSchema.parse(
      context?.pending?.form4137 ?? {},
    );
    if (
      !form4137Entries.every((entry) => {
        const recipient = entry.employee_ssn.replaceAll("-", "") ===
            form4137.taxpayer_ssn?.replaceAll("-", "")
          ? "taxpayer"
          : entry.employee_ssn.replaceAll("-", "") ===
              form4137.spouse_ssn?.replaceAll("-", "")
          ? "spouse"
          : undefined;
        return recipient !== undefined &&
          (form4137.forms ?? []).some((form) =>
            form.recipient === recipient &&
            form.employers.some((employer) =>
              employer.ein?.replaceAll("-", "") ===
                entry.employer_ein.replaceAll("-", "") &&
              employer.name === entry.employer_name &&
              employer.tips_received === entry.amount
            )
          ) &&
          filedW2s.some((source) =>
            source.employee_ssn?.replaceAll("-", "") ===
              entry.employee_ssn.replaceAll("-", "") &&
            source.employer_ein?.replaceAll("-", "") ===
              entry.employer_ein.replaceAll("-", "") &&
            source.employer_name === entry.employer_name &&
            source.box13_statutory_employee !== true &&
            source.box14b_tipped_code === entry.occupation_code
          );
      })
    ) {
      throw new Error(
        "Schedule 1-A Form 4137 tips do not match the filed employer and W-2 sources",
      );
    }
    const matchesRecipient = (
      ssn: string,
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
    const allRecipientsMatch = qualifiedEmployeeTipRows(input).every(
      (entry) => {
        const ssn = normalize(entry.employee_ssn);
        const taxpayer = matchesRecipient(
          ssn,
          input.taxpayer_ssn,
          form1040.taxpayer_ssn,
          form1040.taxpayer_ssn_valid_for_employment,
          form1040.taxpayer_ssn_issued_before_due_date,
          form1040.taxpayer_tin_issued_by_due_date,
        );
        const spouse = input.filing_status === FilingStatus.MFJ &&
          matchesRecipient(
            ssn,
            input.spouse_ssn,
            form1040.spouse_ssn,
            form1040.spouse_ssn_valid_for_employment,
            form1040.spouse_ssn_issued_before_due_date,
            form1040.spouse_tin_issued_by_due_date,
          );
        return taxpayer || spouse;
      },
    );
    if (
      form1040.filing_status !== input.filing_status ||
      !allRecipientsMatch ||
      form1040.line11_agi !== lines.line1_agi
    ) {
      throw new Error(
        "Schedule 1-A tips identity and Part I/VI do not reconcile to Form 1040",
      );
    }
    part1 = lines;
    total += lines.line13_tips;
    parts.push(
      element("QualifiedTipsWagesAmt", lines.line4a_w2_tips),
      element("QualifiedTipsForm4137Amt", lines.line4b_form4137_tips),
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
    );
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
      form1040.line11_agi !== lines.line1_agi
    ) {
      throw new Error(
        "Schedule 1-A overtime identity and Part I/VI do not reconcile to Form 1040",
      );
    }
    part1 = lines;
    total += lines.line21_overtime;
    parts.push(
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
    );
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
      form1040.line11_agi !== lines.line1_agi
    ) {
      throw new Error(
        "Schedule 1-A vehicle interest identity and Part I/VI do not reconcile to Form 1040",
      );
    }
    part1 = lines;
    total += lines.line30_vehicle_interest;
    parts.push(
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
    );
  }
  if (seniorDeduction({ taxYear: 2025, formType: "f1040" }, input) > 0) {
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
      form1040.line11_agi !== lines.line1_agi
    ) {
      throw new Error(
        "Schedule 1-A senior identity and Part I/VI do not reconcile to Form 1040",
      );
    }
    part1 = lines;
    senior = lines.line37_senior;
    total += senior;
    parts.push(
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
    );
  }
  if (
    !part1 || form1040.filing_status !== input.filing_status ||
    form1040.line11_agi !== part1.line1_agi ||
    form1040.line13b_additional_deductions !== total ||
    (form1040.schedule1a_line37_senior_deduction ?? 0) !== senior
  ) {
    throw new Error(
      "Schedule 1-A total and senior deduction do not reconcile to Form 1040",
    );
  }
  return elements("IRS1040Schedule1A", [
    element("AdjustedGrossIncomeAmt", part1.line1_agi),
    element("ModifiedAGIAmt", part1.line3_magi),
    ...parts,
    element("TotalAdditionalDeductionsAmt", total),
  ]);
}

export const schedule1a: MefFormDescriptor<"schedule1a", Input> = {
  pendingKey: "schedule1a",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040s1a--2025.pdf",
  build: buildSchedule,
};
