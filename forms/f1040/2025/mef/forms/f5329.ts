import { element, elements } from "../../../mef/xml.ts";
import { inputSchema } from "../../../nodes/intermediate/forms/form5329/index.ts";
import { TS } from "../../../nodes/types.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Input = Partial<typeof inputSchema._output> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [];

function total(value: number | number[] | undefined): number {
  return value === undefined
    ? 0
    : Array.isArray(value)
    ? value.reduce((a, b) => a + b, 0)
    : value;
}

function excessTax(
  input: typeof inputSchema._output,
  excessKey:
    | "excess_traditional_ira"
    | "excess_roth_ira"
    | "excess_coverdell_esa"
    | "excess_archer_msa"
    | "excess_hsa"
    | "excess_able",
  valueKey:
    | "traditional_ira_value"
    | "roth_ira_value"
    | "coverdell_esa_value"
    | "archer_msa_value"
    | "hsa_value"
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

function buildIRS5329(raw: Input, context?: MefBuildContext): string {
  if (Array.isArray(raw) && raw.length === 0) return "";
  const input = inputSchema.parse(raw);
  const regular = total(input.early_distribution);
  const simple = total(input.simple_ira_early_distribution);
  const early = regular + simple;
  const exception = input.early_distribution_exception ?? 0;
  const education = input.esa_able_distribution ?? 0;
  const educationException = input.esa_able_exception ?? 0;
  const excess = [
    input.excess_traditional_ira,
    input.excess_roth_ira,
    input.excess_coverdell_esa,
    input.excess_archer_msa,
    input.excess_hsa,
    input.excess_able,
  ].some((amount) => (amount ?? 0) > 0);
  if (!early && !education && !excess) {
    return "";
  }
  const subjects = input.subject_ts === undefined
    ? []
    : Array.isArray(input.subject_ts)
    ? input.subject_ts
    : [input.subject_ts];
  if (new Set(subjects).size > 1) {
    throw new Error("Form 5329 needs separate taxpayer and spouse forms");
  }
  const spouse = subjects[0] === TS.S;
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
  const hsaTax = excessTax(input, "excess_hsa", "hsa_value");
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
    input.excess_hsa
      ? element("HSAExcessContriTotalAmt", input.excess_hsa)
      : "",
    input.excess_hsa ? element("HSAExcessContribTaxAmt", hsaTax) : "",
    input.excess_able
      ? element("ABLEExcessContriCYAmt", input.excess_able)
      : "",
    input.excess_able ? element("ABLEExcessContribTaxAmt", ableTax) : "",
  ]);
}

export const form5329: MefFormDescriptor<"form5329", Input> = {
  pendingKey: "form5329",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f5329--2025.pdf",
  build: buildIRS5329,
};
