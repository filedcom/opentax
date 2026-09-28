import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import { FilingStatus } from "../../../mef/header.ts";
import {
  calculateArcherMsaDistribution,
  type Form8853Input,
  inputSchema,
  MsaOwner,
} from "../../../nodes/intermediate/forms/form8853/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Input = Form8853Input | readonly [];

export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [];

function validateBoundedArcherDistribution(fields: Form8853Input) {
  const details = fields.archer_distribution_filing_details;
  if (!details) {
    throw new Error(
      "Form 8853 MeF needs Archer MSA owner and source confirmations",
    );
  }
  if (details.owner !== MsaOwner.Taxpayer) {
    throw new Error(
      "Form 8853 spouse-owned MSA needs a separate owner-specific filing route",
    );
  }
  if (
    (fields.employer_archer_msa ?? 0) > 0 ||
    (fields.taxpayer_archer_msa_contributions ?? 0) > 0 ||
    (fields.line3_limitation_amount ?? 0) > 0 ||
    (fields.compensation ?? 0) > 0 ||
    (fields.medicare_advantage_distributions ?? 0) > 0 ||
    (fields.medicare_advantage_qualified_expenses ?? 0) > 0 ||
    fields.medicare_advantage_exception === true ||
    (fields.ltc_gross_payments ?? 0) > 0 ||
    (fields.ltc_qualified_contract_amount ?? 0) > 0 ||
    (fields.ltc_accelerated_death_benefits ?? 0) > 0 ||
    (fields.ltc_period_days ?? 0) > 0 ||
    (fields.ltc_actual_costs ?? 0) > 0 ||
    (fields.ltc_reimbursements ?? 0) > 0
  ) {
    throw new Error(
      "Form 8853 MeF only supports an Archer MSA distribution without contributions, Medicare MSA, or LTC activity",
    );
  }
  const lines = calculateArcherMsaDistribution(fields);
  if (
    ![lines.line6a, lines.line6b, lines.line6c, lines.line7].every(
      Number.isInteger,
    ) ||
    lines.line6a <= 0 || fields.archer_msa_rollover !== 0 ||
    fields.archer_msa_exception !== false || lines.line7 !== lines.line6a ||
    lines.line6c !== lines.line6a || lines.line8 !== 0 || lines.line9b !== 0
  ) {
    throw new Error(
      "Form 8853 MeF needs a whole-dollar Archer distribution fully matched by unreimbursed qualified expenses, with no rollover or tax exception",
    );
  }
  return lines;
}

function validateReturnContext(context: MefBuildContext | undefined): string {
  const filer = context?.filer;
  if (!filer || !/^\d{9}$/.test(filer.primarySSN)) {
    throw new Error(
      "Form 8853 MeF needs MSA holder SSN from the return header",
    );
  }
  if (
    filer.spouse || filer.filingStatus === FilingStatus.MarriedFilingJointly
  ) {
    throw new Error(
      "Form 8853 MeF does not yet support joint returns with spouse MSA ambiguity",
    );
  }
  if (!context?.pending) {
    throw new Error(
      "Form 8853 MeF needs pending return reconciliation context",
    );
  }
  const schedule1 = z.object({
    line8e_archer_msa_dist: z.number().optional(),
    line23_archer_msa_deduction: z.number().optional(),
  }).safeParse(context.pending.schedule1);
  const schedule2 = z.object({
    line17e_archer_msa_tax: z.number().optional(),
    line17f_medicare_advantage_msa_tax: z.number().optional(),
  }).safeParse(context.pending.schedule2);
  if (
    (context.pending.schedule1 !== undefined && !schedule1.success) ||
    (context.pending.schedule2 !== undefined && !schedule2.success)
  ) {
    throw new Error(
      "Form 8853 MeF cannot reconcile malformed Schedule 1 or 2 credit fields",
    );
  }
  if (
    (schedule1.success &&
      ((schedule1.data.line8e_archer_msa_dist ?? 0) !== 0 ||
        (schedule1.data.line23_archer_msa_deduction ?? 0) !== 0)) ||
    (schedule2.success &&
      ((schedule2.data.line17e_archer_msa_tax ?? 0) !== 0 ||
        (schedule2.data.line17f_medicare_advantage_msa_tax ?? 0) !== 0))
  ) {
    throw new Error(
      "Form 8853 zero-tax Archer route conflicts with Schedule 1 or 2",
    );
  }
  return filer.primarySSN;
}

function buildIRS8853(rawFields: Input, context?: MefBuildContext): string {
  if (Array.isArray(rawFields) && rawFields.length === 0) return "";
  if (Object.keys(rawFields).length === 0) {
    throw new Error("Form 8853 MeF cannot file an empty pending record");
  }
  const fields = inputSchema.parse(rawFields);
  const lines = validateBoundedArcherDistribution(fields);
  const holderSSN = validateReturnContext(context);
  return elements("IRS8853", [
    elements("ArcherMSAAndMedcrAdvntgMSAGrp", [
      element("MSAHolderSSN", holderSSN),
      element("TotalArcherMSADistributionAmt", lines.line6a),
      element("ArcherMSADistriRollOverAmt", lines.line6b),
      element("ArcherMSANetDistributionAmt", lines.line6c),
      element("ArcherMSAUnreimbQualMedExpAmt", lines.line7),
      element("TaxableArcherMSADistriAmt", lines.line8),
    ]),
  ]);
}

export const form8853: MefFormDescriptor<"form8853", Input> = {
  pendingKey: "form8853",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8853.pdf",
  build(fields, context) {
    return buildIRS8853(fields, context);
  },
};
