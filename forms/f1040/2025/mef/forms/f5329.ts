import { element, elements } from "../../../mef/xml.ts";
import {
  calculateOwnerForms,
  inputSchema,
  ownerEntrySchema,
  reconcileHsaOwnerForms,
} from "../../../nodes/intermediate/forms/form5329/index.ts";
import { TS } from "../../../nodes/types.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Input = Partial<typeof inputSchema._output> & {
  owner_forms?: unknown;
};

export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [];

function total(value: number | number[] | undefined): number {
  return value === undefined
    ? 0
    : Array.isArray(value)
    ? value.reduce((a, b) => a + b, 0)
    : value;
}

function excessTax(
  input: typeof ownerEntrySchema._output,
  excessKey:
    | "excess_traditional_ira"
    | "excess_roth_ira"
    | "excess_coverdell_esa"
    | "excess_archer_msa"
    | "excess_able",
  valueKey:
    | "traditional_ira_value"
    | "roth_ira_value"
    | "coverdell_esa_value"
    | "archer_msa_value"
    | "able_value",
): number {
  const excess = input[excessKey] ?? 0;
  if (excess === 0) return 0;
  const value = input[valueKey];
  if (value === undefined) {
    throw new Error(
      `Form 5329 ${valueKey} is required to calculate the 6% tax`,
    );
  }
  return Math.min(excess, value) * 0.06;
}

function buildIRS5329One(
  raw: typeof ownerEntrySchema._output,
  context?: MefBuildContext,
): string {
  const input = ownerEntrySchema.strip().parse(raw);
  const regular = total(input.early_distribution);
  const simple = total(input.simple_ira_early_distribution);
  const early = regular + simple;
  const exception = input.early_distribution_exception ?? 0;
  const education = input.esa_able_distribution ?? 0;
  const educationException = input.esa_able_exception ?? 0;
  const hsa = input.hsa_part_vii;
  const hsaPriorRemaining = hsa
    ? Math.max(
      0,
      hsa.line42_prior_excess -
        hsa.line43_unused_contribution_room -
        hsa.line44_taxable_distributions,
    )
    : 0;
  const hsaTotal = hsaPriorRemaining + (hsa?.line47_current_year_excess ?? 0);
  const excess = [
    input.excess_traditional_ira,
    input.excess_roth_ira,
    input.excess_coverdell_esa,
    input.excess_archer_msa,
    hsaTotal,
    input.excess_able,
  ].some((amount) => (amount ?? 0) > 0);
  if (!early && !education && !excess) {
    return "";
  }
  const spouse = input.owner === TS.S;
  const personName = spouse
    ? context?.filer?.spouse &&
      `${context.filer.spouse.firstName} ${context.filer.spouse.lastName}`
    : context?.filer?.fullName;
  const personSSN = spouse
    ? context?.filer?.spouse?.ssn
    : context?.filer?.primarySSN;
  if (!personName || !personSSN) {
    throw new Error("Form 5329 MeF needs the individual's name and SSN");
  }
  if (exception > regular || educationException > education) {
    throw new Error(
      "Form 5329 exception amount cannot exceed its distribution",
    );
  }
  if (exception > 0 && !input.early_distribution_exception_code) {
    throw new Error(
      "Form 5329 early-distribution exception needs its IRS exception code",
    );
  }
  const traditionalTax = excessTax(
    input,
    "excess_traditional_ira",
    "traditional_ira_value",
  );
  const rothTax = excessTax(input, "excess_roth_ira", "roth_ira_value");
  const coverdellTax = excessTax(
    input,
    "excess_coverdell_esa",
    "coverdell_esa_value",
  );
  const archerTax = excessTax(input, "excess_archer_msa", "archer_msa_value");
  const hsaTax = hsa ? Math.min(hsaTotal, hsa.december_31_value) * 0.06 : 0;
  const ableTax = excessTax(input, "excess_able", "able_value");
  const subjectToEarlyTax = early - exception;
  const earlyTax = (regular - exception) * 0.1 + simple * 0.25;
  const educationTax = (education - educationException) * 0.1;
  return elements("IRS5329", [
    element("PersonNm", personName),
    element("SSN", personSSN.replace(/\D/g, "")),
    early ? element("EarlyDistributionsAmt", early) : "",
    exception
      ? element(
        "EarlyDistriExceptionReasonCd",
        input.early_distribution_exception_code!,
      )
      : "",
    exception ? element("EarlyDistriNotSubjectToTaxAmt", exception) : "",
    early ? element("EarlyDistriSubjectToTaxAmt", subjectToEarlyTax) : "",
    early ? element("IRAEarlyDistributionsTaxAmt", earlyTax) : "",
    education ? element("EducAcctDistributionAmt", education) : "",
    educationException
      ? element("EducAcctDistriNotSubjToTaxAmt", educationException)
      : "",
    education
      ? element("EducAcctDistriSubjectToTaxAmt", education - educationException)
      : "",
    education ? element("EducIRADistributionsTaxAmt", educationTax) : "",
    input.excess_traditional_ira
      ? element("IRAExcessContriTotalAmt", input.excess_traditional_ira)
      : "",
    input.excess_traditional_ira
      ? element("IRAExcessContribTaxAmt", traditionalTax)
      : "",
    input.excess_roth_ira
      ? element("RothIRAExcessContriTotalAmt", input.excess_roth_ira)
      : "",
    input.excess_roth_ira ? element("RothIRAExcessContribTaxAmt", rothTax) : "",
    input.excess_coverdell_esa
      ? element("ESAExcessContriTotalAmt", input.excess_coverdell_esa)
      : "",
    input.excess_coverdell_esa
      ? element("EducIRAExcessContribTaxAmt", coverdellTax)
      : "",
    input.excess_archer_msa
      ? element("ArcherMSAExcessContriTotalAmt", input.excess_archer_msa)
      : "",
    input.excess_archer_msa ? element("MSAExcessContribTaxAmt", archerTax) : "",
    hsaTotal ? element("HSAExcessContriTotalAmt", hsaTotal) : "",
    hsaTotal ? element("HSAExcessContribTaxAmt", hsaTax) : "",
    input.excess_able
      ? element("ABLEExcessContriCYAmt", input.excess_able)
      : "",
    input.excess_able ? element("ABLEExcessContribTaxAmt", ableTax) : "",
  ]);
}

function buildIRS5329(raw: Input, context?: MefBuildContext): readonly string[] {
  if (Array.isArray(raw) && raw.length === 0) return [];
  const unexpected = Object.keys(raw).filter((key) =>
    key !== "owner_entries" && key !== "owner_forms"
  );
  if (unexpected.length > 0) {
    throw new Error(`Form 5329 MeF requires owner entries: ${unexpected.join(", ")}`);
  }
  const parsed = inputSchema.parse({ owner_entries: raw.owner_entries });
  const calculated = calculateOwnerForms(parsed);
  if (calculated.forms.length === 0) {
    if (raw.owner_forms !== undefined) {
      throw new Error("Form 5329 MeF has forms without owner sources");
    }
    return [];
  }
  if (JSON.stringify(raw.owner_forms) !== JSON.stringify(calculated.forms)) {
    throw new Error("Form 5329 MeF owner forms do not match source calculation");
  }
  reconcileHsaOwnerForms(calculated.forms, context?.pending?.form8889);
  const schedule2 = context?.pending?.schedule2;
  const line8 = schedule2 !== null && typeof schedule2 === "object"
    ? (schedule2 as Record<string, unknown>).line8_form5329_tax
    : undefined;
  if (calculated.total > 0 && line8 !== calculated.total) {
    throw new Error("Form 5329 owner taxes do not reconcile to Schedule 2 line 8");
  }
  return calculated.forms.map((form) => buildIRS5329One(form, context))
    .filter((xml) => xml !== "");
}

export const form5329: MefFormDescriptor<"form5329", Input, readonly string[]> = {
  pendingKey: "form5329",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f5329--2025.pdf",
  build: buildIRS5329,
};
