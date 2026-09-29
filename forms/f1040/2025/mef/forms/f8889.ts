import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import { inputSchema as form8889SourceSchema } from "../../../nodes/intermediate/forms/form8889/index.ts";
import {
  reconcileCode2Form8889,
  reconcilePairedForm8889,
  reconcileSpouseOnlyForm8889,
} from "../../form8889_spouse_reconciliation.ts";

// The Form 8889 node emits the completed 2025 form lines. Serialize those
// lines rather than reinterpreting raw HSA contributions in the MeF layer.
// Order is the sequence in IRS8889.xsd (TY2025 v5.4).
export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["print_line2_taxpayer_contributions", "HSAContributionAmt"],
  ["print_line3_limit", "HSALimitedAnnualDeductibleAmt"],
  ["print_line4_archer", "TotalArcherMSAContributionAmt"],
  ["print_line5", "HSALimitedDeductibleAllwdAmt"],
  ["print_line6", "HSAFamilyDeductibleAmt"],
  ["print_line7_catchup", "HSAAddnlContributionAmt"],
  ["print_line8", "HSALimitedGrossContributionAmt"],
  ["print_line9_employer", "HSAEmployerContributionAmt"],
  ["print_line10", "HSAQualifiedFundingDistriAmt"],
  ["print_line11", "TotalHSAContributionAmt"],
  ["print_line12", "HSALimitedContributionAmt"],
  ["print_line13_deduction", "TotalHSADeductionAmt"],
  ["print_line14a_distributions", "TotalHSADistributionAmt"],
  ["print_line14b_excluded_distributions", "HSADistributionRolloverAmt"],
  ["print_line14c", "HSANetDistributionAmt"],
  ["print_line15_qualified", "UnreimbQualMedAndDentalExpAmt"],
  ["print_line16_taxable", "TaxableHSADistributionAmt"],
  ["print_line17b_penalty", "HSADistriAddnlPercentTaxAmt"],
  ["print_line18", "HDHPCoverageFailPartialYrAmt"],
  ["print_line19", "HDHPCoverageFailFundDistriAmt"],
  ["print_line20", "HDHPCoverageIncomeAmt"],
  ["print_line21", "HDHPCoverageAddnlTaxAmt"],
];

const ownerFormSchema = z.object({
  owner: z.enum(["primary", "spouse"]),
  beneficiary_name: z.string().trim().min(1),
  beneficiary_ssn: z.string().regex(/^\d{9}$/),
}).passthrough();
const inputSchema = z.object({
  forms: z.array(ownerFormSchema).min(1).max(2),
}).strict();
const filingInputSchema = inputSchema.extend(
  form8889SourceSchema.partial().shape,
);
type Input = z.infer<typeof filingInputSchema> | readonly [];

const LINE_KEYS = new Set([
  "print_line1_coverage",
  "print_line17a_exception",
  ...FIELD_MAP.map(([key]) => key),
]);

function amount(
  fields: z.infer<typeof ownerFormSchema>,
  key: string,
  tag: string,
): string {
  const value = fields[key];
  if (value === undefined || value === null) return "";
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Form 8889 ${key} must be a nonnegative amount`);
  }
  return element(tag, value);
}

function buildOwner8889(
  fields: z.infer<typeof ownerFormSchema>,
  context?: MefBuildContext,
): string {
  const unsupported = Object.keys(fields).filter((key) =>
    key !== "owner" && key !== "beneficiary_name" &&
    key !== "beneficiary_ssn" && !LINE_KEYS.has(key)
  );
  if (unsupported.length > 0) {
    throw new Error(
      `Form 8889 MeF does not accept uncomputed owner fields: ${
        unsupported.join(", ")
      }`,
    );
  }
  const hasLines = Object.keys(fields).some((key) => LINE_KEYS.has(key));
  if (!hasLines) {
    throw new Error("Form 8889 owner needs computed print_line fields");
  }

  const owner = fields.owner;
  const name = fields.beneficiary_name;
  const ssn = typeof fields.beneficiary_ssn === "string"
    ? fields.beneficiary_ssn.replace(/\D/g, "")
    : "";
  const expectedSsn = owner === "primary"
    ? context?.filer?.primarySSN
    : owner === "spouse"
    ? context?.filer?.spouse?.ssn
    : undefined;
  if (
    !expectedSsn || typeof name !== "string" || !name.trim() ||
    !/^\d{9}$/.test(ssn) || ssn !== expectedSsn.replace(/\D/g, "")
  ) {
    throw new Error("Form 8889 MeF requires the HSA beneficiary SSN");
  }
  if (
    owner === "primary" && context?.filer?.fullName &&
    name.trim().toUpperCase() !== context.filer.fullName.trim().toUpperCase()
  ) {
    throw new Error(
      "Form 8889 primary beneficiary name does not match the return",
    );
  }
  if (
    owner === "spouse" && context?.filer?.spouse &&
    name.trim().toUpperCase() !==
      `${context.filer.spouse.firstName} ${context.filer.spouse.lastName}`
        .toUpperCase()
  ) {
    throw new Error(
      "Form 8889 spouse beneficiary name does not match the return",
    );
  }
  const coverage = fields.print_line1_coverage;
  if (
    coverage !== undefined && coverage !== null &&
    coverage !== "self_only" && coverage !== "family"
  ) {
    throw new Error("Form 8889 line 1 needs self-only or family coverage");
  }
  const exception = fields.print_line17a_exception;
  if (exception !== undefined && typeof exception !== "boolean") {
    throw new Error("Form 8889 line 17a must be a boolean");
  }

  const beforeException = FIELD_MAP.slice(0, 17);
  const afterException = FIELD_MAP.slice(17);
  return elements("IRS8889", [
    element("PersonNm", name.trim()),
    element("RecipientSSN", ssn),
    coverage === "self_only" ? element("HDHPSelfOnlyCoverageInd", "X") : "",
    coverage === "family" ? element("HDHPFamilyCoverageInd", "X") : "",
    ...beforeException.map(([key, tag]) => amount(fields, key, tag)),
    exception === true ? element("HSADistriAddnlPercentTaxExcInd", "X") : "",
    ...afterException.map(([key, tag]) => amount(fields, key, tag)),
  ]);
}

function buildIRS8889(
  raw: Input,
  context?: MefBuildContext,
): readonly string[] {
  if (Array.isArray(raw) && raw.length === 0) return [];
  if (Array.isArray(raw)) {
    throw new Error("Form 8889 MeF needs owner-labeled computed forms");
  }
  if (Object.keys(raw).length === 0) return [];
  const fields = filingInputSchema.parse(raw);
  if (
    fields.forms.length < 1 || fields.forms.length > 2 ||
    (fields.forms.length === 2 &&
      (fields.forms[0]?.owner !== "primary" ||
        fields.forms[1]?.owner !== "spouse"))
  ) {
    throw new Error(
      "Form 8889 MeF needs one identified owner or taxpayer-then-spouse forms",
    );
  }
  reconcileSpouseOnlyForm8889(
    fields.forms,
    context?.pending,
    context?.filer,
  );
  reconcileCode2Form8889(fields.forms, context?.pending, context?.filer);
  reconcilePairedForm8889(
    fields.forms,
    context?.pending,
    context?.filer,
  );
  if (fields.forms.length === 2) {
    const sum = (key: string) =>
      fields.forms.reduce((total, form) => {
        const value = form[key];
        if (value === undefined) return total;
        if (typeof value !== "number" || !Number.isFinite(value)) {
          throw new Error(`Form 8889 ${key} needs a numeric owner amount`);
        }
        return total + value;
      }, 0);
    const pendingSchedule1 = z.object({
      line13_hsa_deduction: z.number().optional(),
      line8f_hsa_income: z.number().optional(),
      line26_total_adjustments: z.number().optional(),
    }).passthrough().parse(context?.pending?.schedule1 ?? {});
    const pendingSchedule2 = z.object({
      line17c_hsa_penalty: z.number().optional(),
      line17d_hsa_eligibility_tax: z.number().optional(),
    }).passthrough().parse(context?.pending?.schedule2 ?? {});
    const pending1040 = z.object({
      line10_adjustments: z.number().optional(),
    }).passthrough().parse(context?.pending?.f1040);
    if (
      (pendingSchedule1?.line13_hsa_deduction ?? 0) !==
        sum("print_line13_deduction") ||
      (pendingSchedule1?.line8f_hsa_income ?? 0) !==
        sum("print_line16_taxable") + sum("print_line20") ||
      (pendingSchedule2?.line17c_hsa_penalty ?? 0) !==
        sum("print_line17b_penalty") ||
      (pendingSchedule2?.line17d_hsa_eligibility_tax ?? 0) !==
        sum("print_line21") ||
      (pendingSchedule1?.line26_total_adjustments ?? 0) !==
        (pending1040?.line10_adjustments ?? 0)
    ) {
      throw new Error(
        "Form 8889 owner totals do not reconcile to Schedule 1, Schedule 2, and Form 1040",
      );
    }
  }
  return fields.forms.map((form) => buildOwner8889(form, context));
}

export const form8889: MefFormDescriptor<"form8889", Input, readonly string[]> =
  {
    pendingKey: "form8889",
    FIELD_MAP,
    pdfUrl: "https://www.irs.gov/pub/irs-prior/f8889--2025.pdf",
    build: buildIRS8889,
  };
