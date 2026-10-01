import { element, elements } from "../../../mef/xml.ts";
import { FilingStatus } from "../../../mef/header.ts";
import {
  IraOwner,
  printSchema,
} from "../../../nodes/intermediate/forms/form8606/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import type { z } from "zod";
import { inputSchema as iraWorksheetSchema } from "../../../nodes/intermediate/worksheets/ira_deduction_worksheet/index.ts";
import { inputSchema as w2Schema } from "../../../nodes/inputs/w2/index.ts";

type Input = z.infer<typeof printSchema> | readonly [];

export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [];

function buildIRS8606(rawFields: Input, context?: MefBuildContext): string {
  if (Array.isArray(rawFields) && rawFields.length === 0) return "";
  if (Object.keys(rawFields).length === 0) {
    throw new Error("Form 8606 MeF cannot file an empty pending record");
  }
  const fields = printSchema.parse(rawFields);
  const details = fields.filing_details;
  if (!details) {
    throw new Error(
      "Form 8606 MeF needs sourced IRA owner and no-activity confirmations",
    );
  }
  if (details.owner !== IraOwner.Taxpayer) {
    throw new Error(
      "Form 8606 spouse-owned IRA needs a separate owner-specific filing route",
    );
  }
  if (
    fields.source_traditional_distributions !== 0 ||
    fields.source_roth_conversion !== 0 ||
    fields.source_roth_distribution !== 0 ||
    fields.source_roth_basis_contributions !== 0 ||
    fields.source_roth_basis_conversions !== 0 ||
    fields.print_line6_year_end_value !== undefined ||
    fields.print_line7_distributions !== undefined ||
    fields.print_line8_conversions !== undefined ||
    fields.print_line13_nontaxable !== undefined ||
    fields.print_line15c_taxable !== undefined ||
    fields.print_line16_converted !== undefined ||
    fields.print_line18_taxable_conversion !== undefined
  ) {
    throw new Error(
      "Form 8606 MeF only supports a no-distribution, no-conversion Part I claim",
    );
  }
  const line1 = fields.print_line1_nondeductible;
  const line2 = fields.print_line2_prior_basis;
  const line3 = fields.print_line3_total_basis;
  const line14 = fields.print_line14_remaining_basis;
  if (
    ![line1, line2, line3, line14].every(Number.isInteger) ||
    line1 <= 0 || line3 !== line1 + line2 ||
    line14 !== line3
  ) {
    throw new Error(
      "Form 8606 MeF needs whole-dollar line 1, nonnegative documented prior basis, and line 3 = line 14 = lines 1 + 2",
    );
  }
  const filer = context?.filer;
  if (!filer?.fullName?.trim() || !/^\d{9}$/.test(filer.primarySSN)) {
    throw new Error(
      "Form 8606 MeF needs taxpayer name and SSN from the return header",
    );
  }
  if (
    filer.spouse || filer.filingStatus === FilingStatus.MarriedFilingJointly
  ) {
    throw new Error(
      "Form 8606 MeF does not yet support joint returns with spouse IRA filing ambiguity",
    );
  }
  if (line2 === 0) {
    const evidence = fields.zero_basis_source;
    const worksheet = iraWorksheetSchema.safeParse(
      context?.pending?.ira_deduction_worksheet,
    );
    const w2s = w2Schema.safeParse(context?.pending?.w2);
    const f1040 = context?.pending?.f1040 as
      | Record<string, unknown>
      | undefined;
    const schedule1 = context?.pending?.schedule1 as
      | Record<string, unknown>
      | undefined;
    if (
      !evidence || !worksheet.success || !w2s.success ||
      w2s.data.w2s.length !== 1 || !f1040 ||
      evidence.form5498.owner_ssn !== filer.primarySSN ||
      evidence.prior_form8606.owner_ssn !== filer.primarySSN ||
      evidence.form5498.source_document_reference ===
        evidence.prior_form8606.source_document_reference ||
      evidence.form5498.box1_ira_contributions !== line1 ||
      worksheet.data.ira_contribution !== line1 ||
      worksheet.data.active_participant !== true ||
      worksheet.data.magi !== f1040.line11_agi ||
      f1040.line11_agi !== w2s.data.w2s[0].box1_wages ||
      w2s.data.w2s[0].box13_retirement_plan !== true ||
      w2s.data.w2s[0].employee_ssn?.replace(/\D/g, "") !== filer.primarySSN ||
      worksheet.data.form8606_filing_details?.owner !== IraOwner.Taxpayer ||
      JSON.stringify(worksheet.data.form8606_zero_basis_source) !==
        JSON.stringify(evidence) ||
      (schedule1?.line20_ira_deduction ?? 0) !== 0 ||
      (f1040.line4a_ira_gross ?? 0) !== 0 ||
      (f1040.line4b_ira_taxable ?? 0) !== 0
    ) {
      throw new Error(
        "Form 8606 zero-opening-basis claim needs matching 2024 Form 8606, 2025 Form 5498, IRA worksheet, and finalized Form 1040 sources",
      );
    }
  }
  return elements("IRS8606", [
    element("Form8606IRANamelineTxt", filer.fullName),
    element("NondedIRATxpyrWithIRASSN", filer.primarySSN),
    element("NondedIRACurrTYNondedContriAmt", line1),
    element("NondedIRABasisForPYAmt", line2),
    element("NondedIRATotalIRAValueAmt", line3),
    element("NondedIRATotalIRABasisAmt", line14),
  ]);
}

export const form8606: MefFormDescriptor<"form8606", Input> = {
  pendingKey: "form8606",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8606.pdf",
  build(fields, context) {
    return buildIRS8606(fields, context);
  },
};
