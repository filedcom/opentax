import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import { FilingStatus } from "../../../mef/header.ts";
import { FilingStatus as SourceFilingStatus } from "../../../nodes/types.ts";
import {
  current1095AStatements,
  f1095a,
  inputSchema as form1095aSchema,
} from "../../../nodes/inputs/f1095a/index.ts";
import {
  form8962 as form8962Calculation,
  inputSchema as form8962InputSchema,
} from "../../../nodes/intermediate/forms/form8962/index.ts";
import { inputSchema as generalSchema } from "../../../nodes/inputs/general/index.ts";
import { inputSchema as f1099intSchema } from "../../../nodes/inputs/f1099int/index.ts";
import { reconcileDependentMagi } from "../../form8962-dependent-magi.ts";
import { roundForm8962Amounts } from "../../form8962-money.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

interface MonthlyRow {
  month_code: string;
  premium?: number;
  slcsp?: number;
  contribution?: number;
  max_assistance?: number;
  allowed_credit?: number;
  aptc: number;
}

interface SharedPolicyAllocation {
  basis:
    | "mfs_exception"
    | "mfs_no_exception"
    | "divorce_agreed"
    | "divorce_no_agreement"
    | "other_agreed"
    | "other_no_agreement"
    | "no_aptc";
  policy_number: string;
  other_taxpayer_ssn: string;
  start_month: number;
  end_month: number;
  premium_pct?: number;
  slcsp_pct?: number;
  aptc_pct?: number;
}

interface AlternativeMarriageGroup {
  family_size: number;
  monthly_contribution: number;
  start_month: number;
  end_month: number;
}

export interface Fields {
  qsehra_ind?: boolean | null;
  mfs_exception_ind?: boolean | null;
  household_size?: number | null;
  taxpayer_modified_agi?: number | null;
  dependents_modified_agi?: number | null;
  household_income?: number | null;
  federal_poverty_line?: number | null;
  fpl_region?: "contiguous" | "alaska" | "hawaii" | null;
  federal_poverty_pct?: number | null;
  applicable_figure?: number | null;
  annual_premium?: number | null;
  annual_slcsp?: number | null;
  annual_applicable_contribution?: number | null;
  monthly_applicable_contribution?: number | null;
  annual_max_ptc?: number | null;
  annual_ptc_allowed?: number | null;
  annual_aptc?: number | null;
  monthly_ptc_rows?: readonly MonthlyRow[] | null;
  shared_policy_allocations?: readonly SharedPolicyAllocation[] | null;
  alternative_marriage_primary?: AlternativeMarriageGroup | null;
  alternative_marriage_spouse?: AlternativeMarriageGroup | null;
  total_premium_tax_credit?: number | null;
  total_advance_ptc?: number | null;
  net_premium_tax_credit?: number | null;
  excess_advance_payment?: number | null;
  repayment_limitation?: number | null;
  excess_advance_premium?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

const MONTH_CODES = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
] as const;

const returnSchema = z.object({
  line11_agi: z.number(),
  line2a_tax_exempt: z.number().nonnegative().optional(),
  line6a_ss_gross: z.number().nonnegative().optional(),
  line6b_ss_taxable: z.number().nonnegative().optional(),
  line17_additional_taxes: z.number().nonnegative().optional(),
  line31_additional_payments: z.number().nonnegative().optional(),
});
const schedule2Schema = z.object({
  line1a_excess_advance_premium: z.number().nonnegative().optional(),
});
const schedule3Schema = z.object({
  line9_premium_tax_credit: z.number().nonnegative().optional(),
});

function reconcileSinglePersonPolicyIdentity(
  policies: ReturnType<typeof current1095AStatements>,
  primarySSN: string,
): void {
  const filerSSN = primarySSN.replaceAll("-", "");
  if (
    policies.some((policy) =>
      policy.covered_individual_ssns?.length !== 1 ||
      policy.covered_individual_ssns[0].replaceAll("-", "") !== filerSSN
    )
  ) {
    throw new Error(
      "Form 8962 one-person policy needs the filer as its sole covered individual",
    );
  }
}

function reconcileOnePolicyDependentIdentity(
  policies: ReturnType<typeof current1095AStatements>,
  householdSize: number | null | undefined,
  generalSource: unknown,
  primarySSN: string,
): void {
  if (policies.length !== 1 || householdSize === 1) return;
  const general = generalSchema.safeParse(generalSource);
  const dependents = general.success
    ? (general.data.dependents ?? []).filter((dependent) =>
      dependent.dependent_on_another_return !== true
    )
    : [];
  const allowed = new Set([
    primarySSN.replaceAll("-", ""),
    ...dependents.map((dependent) => dependent.ssn?.replaceAll("-", "")),
  ]);
  const covered = policies[0].covered_individual_ssns?.map((ssn) =>
    ssn.replaceAll("-", "")
  );
  if (
    !general.success || householdSize === undefined || householdSize === null ||
    dependents.length !== householdSize - 1 ||
    allowed.size !== householdSize ||
    (general.data.taxpayer_ssn !== undefined &&
      general.data.taxpayer_ssn.replaceAll("-", "") !==
        primarySSN.replaceAll("-", "")) ||
    !covered?.length || covered.length > householdSize ||
    (householdSize === 3 && covered.length !== 3) ||
    new Set(covered).size !== covered.length ||
    covered.some((ssn) => !allowed.has(ssn))
  ) {
    throw new Error(
      "Form 8962 one-policy dependent filing needs distinct covered people from the verified tax family; other-family enrollees require shared-policy allocation",
    );
  }
}

function reconcilePovertyTable(
  fields: Input,
  context: MefBuildContext,
): number {
  const state = context.filer?.address.state;
  if (!state || !/^[A-Z]{2}$/.test(state)) {
    throw new Error("Form 8962 poverty table needs a US residence state");
  }
  const general = generalSchema.safeParse(context.pending?.general);
  const residenceStates = general.success
    ? general.data.ptc_residence_states_2025
    : undefined;
  const residenceMonths = general.success
    ? general.data.ptc_residence_months_2025
    : undefined;
  const generalAddressState = general.success
    ? general.data.address_state
    : undefined;
  if (
    residenceStates !== undefined &&
    (new Set(residenceStates).size !== residenceStates.length ||
      !residenceStates.includes(state) ||
      generalAddressState !== state)
  ) {
    throw new Error(
      "Form 8962 residence states must be distinct and include the filing residence",
    );
  }
  if (residenceStates !== undefined && residenceStates.length > 1) {
    const switches = residenceMonths?.filter((monthState, month, months) =>
      month > 0 && monthState !== months[month - 1]
    ).length;
    if (
      (residenceStates.length !== 2 && residenceStates.length !== 3) ||
      residenceMonths === undefined ||
      residenceMonths[11] !== state ||
      new Set(residenceMonths).size !== residenceStates.length ||
      residenceStates.some((candidate) =>
        !residenceMonths.includes(candidate)
      ) ||
      switches !== residenceStates.length - 1
    ) {
      throw new Error(
        "Form 8962 interstate move needs twelve residence months with one state switch for two states or two state switches for three states ending in the filing state",
      );
    }
  } else if (
    residenceMonths !== undefined &&
    (residenceMonths.some((monthState) => monthState !== state) ||
      residenceStates?.[0] !== state)
  ) {
    throw new Error(
      "Form 8962 residence months disagree with the single-state filing route",
    );
  }
  const statesForTable = residenceStates ?? [state];
  const expectedRegion = statesForTable.includes("AK")
    ? "alaska"
    : statesForTable.includes("HI")
    ? "hawaii"
    : "contiguous";
  if (fields.fpl_region !== expectedRegion) {
    throw new Error(
      "Form 8962 poverty table must match the verified residence state",
    );
  }
  if (expectedRegion !== "contiguous") {
    if (
      !general.success || general.data.address_state !== state ||
      !residenceStates?.includes(state)
    ) {
      throw new Error(
        "Form 8962 Alaska/Hawaii poverty table needs verified 2025 residence states",
      );
    }
  }
  const familySize = fields.household_size;
  if (familySize !== 1 && familySize !== 2 && familySize !== 3) {
    throw new Error(
      "Form 8962 bounded poverty table needs family size 1, 2, or 3",
    );
  }
  return expectedRegion === "alaska"
    ? 18_810 + (familySize - 1) * 6_730
    : expectedRegion === "hawaii"
    ? 17_310 + (familySize - 1) * 6_190
    : 15_060 + (familySize - 1) * 5_380;
}

// Independently check Form 8962 Table 2 and Table 5 at the filing boundary.
// Below 100% remains one verified policy; 100%-399% also admits separately
// reconciled one-person sequential and verified-family monthly policies.
function simplePolicyIncomeAmounts(
  householdIncome: number,
  povertyLine: number,
  householdSize: number | null | undefined,
  policyCount: number,
  below100VerifiedException = false,
  verifiedFamilyPolicies = false,
): { povertyPct: number; figure: number; repaymentCap: number | undefined } {
  const actualPct = Math.floor(householdIncome / povertyLine * 100);
  if (
    (actualPct < 100 &&
      (!below100VerifiedException || policyCount !== 1)) ||
    (actualPct < 400 &&
      householdSize !== 1 &&
      !(verifiedFamilyPolicies &&
        ((householdSize === 2 && policyCount <= 2) ||
          (householdSize === 3 && policyCount === 3))))
  ) {
    throw new Error(
      "Form 8962 below-400%-FPL filing needs a verified one-person or family-policy route",
    );
  }
  const povertyPct = householdIncome > 4 * povertyLine ? 401 : actualPct;
  const figure = actualPct <= 150
    ? 0
    : actualPct <= 300
    ? (actualPct - 150) * 4 / 10_000
    : actualPct < 400
    ? Math.round(600 + (actualPct - 300) * 2.5) / 10_000
    : 0.085;
  const repaymentCap = actualPct < 200
    ? 375
    : actualPct < 300
    ? 975
    : actualPct < 400
    ? 1_625
    : undefined;
  return { povertyPct, figure, repaymentCap };
}

function isBelow100AptcOnly(fields: Input, context?: MefBuildContext): boolean {
  const general = generalSchema.safeParse(context?.pending?.general);
  return general.success &&
    general.data.ptc_below_100_fpl_status?.basis === "not_applicable" &&
    (fields.federal_poverty_pct ?? 100) < 100 &&
    fields.total_premium_tax_credit === 0 &&
    (fields.total_advance_ptc ?? 0) > 0;
}

function isMfsNoExceptionAptcOnly(context?: MefBuildContext): boolean {
  const general = generalSchema.safeParse(context?.pending?.general);
  return general.success &&
    general.data.filing_status === SourceFilingStatus.MFS &&
    general.data.ptc_mfs_status?.basis === "no_exception" &&
    general.data.ptc_mfs_status.policy_scope === "family_only";
}

function isMfsSharedPolicy(context?: MefBuildContext): boolean {
  const general = generalSchema.safeParse(context?.pending?.general);
  return general.success &&
    general.data.filing_status === SourceFilingStatus.MFS &&
    (general.data.ptc_mfs_status?.basis === "no_exception" ||
      general.data.ptc_mfs_status?.basis === "domestic_abuse" ||
      general.data.ptc_mfs_status?.basis === "spousal_abandonment") &&
    general.data.ptc_mfs_status.policy_scope === "shared_with_spouse";
}

function sourcedTaxExemptInterest(
  pending: Readonly<Record<string, unknown>> | undefined,
  reported: number,
): number {
  if (reported === 0) return 0;
  const source = f1099intSchema.safeParse(pending?.f1099int);
  if (
    !source.success ||
    source.data.f1099ints.reduce(
        (total, item) => total + (item.box8 ?? 0) - (item.box13 ?? 0),
        0,
      ) !== reported
  ) {
    throw new Error(
      "Form 8962 tax-exempt MAGI needs matching Form 1099-INT source",
    );
  }
  return reported;
}

function reconcileBelow100AptcOnly(
  fields: Input,
  context?: MefBuildContext,
): void {
  const pending = context?.pending;
  const general = generalSchema.safeParse(pending?.general);
  const source = form1095aSchema.safeParse(pending?.f1095a);
  const form1040 = returnSchema.safeParse(pending?.f1040);
  const schedule2 = schedule2Schema.safeParse(pending?.schedule2);
  if (
    !context?.filer || !general.success || !source.success ||
    !form1040.success || !schedule2.success
  ) {
    throw new Error(
      "Form 8962 below-100% APTC-only filing needs verified return and Marketplace sources",
    );
  }
  const policies = current1095AStatements(source.data.f1095as);
  const policy = policies[0];
  const ssn = context.filer.primarySSN.replaceAll("-", "");
  const rows = fields.monthly_ptc_rows;
  const povertyLine = reconcilePovertyTable(fields, context);
  const agi = form1040.data.line11_agi;
  const sourceAptc = policy?.monthly_aptcs?.reduce(
    (sum, amount) => sum + amount,
    0,
  );
  const aptc = rows == null
    ? Math.round(policy?.annual_aptc ?? sourceAptc ?? 0)
    : policy?.monthly_aptcs?.reduce(
      (sum, amount) => sum + Math.round(amount),
      0,
    );
  if (
    context.filer.filingStatus !== FilingStatus.Single ||
    general.data.filing_status !== SourceFilingStatus.Single ||
    general.data.taxpayer_ssn?.replaceAll("-", "") !== ssn ||
    policies.length !== 1 || !policy?.policy_number ||
    policy.coverage_state !== context.filer.address.state ||
    policy.covered_individual_ssns?.length !== 1 ||
    policy.covered_individual_ssns[0].replaceAll("-", "") !== ssn ||
    policy.shared_policy_periods || policy.slcsp_corrections ||
    policy.slcsp_review_periods || policy.alternative_marriage_owner ||
    !policy.monthly_premiums || !policy.monthly_slcsps ||
    !policy.monthly_aptcs || aptc === undefined || aptc <= 0 ||
    (policy.annual_aptc !== undefined &&
      Math.abs(policy.annual_aptc - (sourceAptc ?? 0)) > 0.01) ||
    fields.household_size !== 1 || fields.dependents_modified_agi !== 0 ||
    fields.taxpayer_modified_agi !== agi || fields.household_income !== agi ||
    fields.federal_poverty_line !== povertyLine ||
    fields.federal_poverty_pct !== Math.floor(agi / povertyLine * 100) ||
    fields.federal_poverty_pct >= 100 ||
    fields.total_advance_ptc !== aptc ||
    fields.total_premium_tax_credit !== 0 ||
    (fields.net_premium_tax_credit ?? 0) !== 0 ||
    fields.excess_advance_payment !== aptc ||
    fields.repayment_limitation !== 375 ||
    fields.excess_advance_premium !== Math.min(aptc, 375) ||
    schedule2.data.line1a_excess_advance_premium !== Math.min(aptc, 375) ||
    form1040.data.line17_additional_taxes !== Math.min(aptc, 375) ||
    pending?.schedule3 !== undefined || pending?.form2555 !== undefined ||
    (rows == null
      ? fields.annual_aptc !== aptc
      : rows.length !== 12 || fields.annual_aptc !== undefined ||
        rows.some((row, index) =>
          row.month_code !== MONTH_CODES[index] ||
          row.aptc !== Math.round(policy.monthly_aptcs![index]) ||
          row.premium !== undefined || row.slcsp !== undefined ||
          row.allowed_credit !== undefined
        ))
  ) {
    throw new Error(
      "Form 8962 below-100% APTC-only filing differs from its identified policy or repayment return",
    );
  }
}

function reconcileMfsNoExceptionAptcOnly(
  fields: Input,
  context?: MefBuildContext,
): void {
  const pending = context?.pending;
  const general = generalSchema.safeParse(pending?.general);
  const source = form1095aSchema.safeParse(pending?.f1095a);
  const form1040 = returnSchema.safeParse(pending?.f1040);
  const schedule2 = schedule2Schema.safeParse(pending?.schedule2);
  if (
    !context?.filer || !general.success || !source.success ||
    !form1040.success || !schedule2.success
  ) {
    throw new Error(
      "Form 8962 MFS APTC-only filing needs verified return and Marketplace sources",
    );
  }
  const policies = current1095AStatements(source.data.f1095as);
  const policy = policies[0];
  const ssn = context.filer.primarySSN.replaceAll("-", "");
  const sourceAptc = policy?.monthly_aptcs?.reduce(
    (sum, amount) => sum + amount,
    0,
  );
  const aptc = Math.round(policy?.annual_aptc ?? sourceAptc ?? 0);
  const povertyLine = reconcilePovertyTable(fields, context);
  const agi = form1040.data.line11_agi;
  const povertyPct = Math.floor(agi / povertyLine * 100);
  const cap = povertyPct < 200 ? 750 : povertyPct < 300 ? 1_950 : 3_250;
  if (
    context.filer.filingStatus !== FilingStatus.MarriedFilingSeparately ||
    general.data.filing_status !== SourceFilingStatus.MFS ||
    general.data.ptc_mfs_status?.basis !== "no_exception" ||
    general.data.ptc_mfs_status.exception_reviewed !== true ||
    general.data.ptc_mfs_status.no_one_can_claim_taxpayer !== true ||
    general.data.ptc_mfs_status.policy_scope !== "family_only" ||
    general.data.ptc_mfs_status.all_covered_individuals_lawfully_present !==
      true ||
    general.data.ptc_mfs_status.no_self_employed_health_insurance_deduction !==
      true ||
    general.data.taxpayer_ssn?.replaceAll("-", "") !== ssn ||
    policies.length !== 1 || !policy?.policy_number ||
    policy.coverage_state !== context.filer.address.state ||
    policy.covered_individual_ssns?.length !== 1 ||
    policy.covered_individual_ssns[0].replaceAll("-", "") !== ssn ||
    policy.shared_policy_periods || policy.slcsp_corrections ||
    policy.slcsp_review_periods || policy.alternative_marriage_owner ||
    !policy.monthly_premiums || !policy.monthly_slcsps ||
    !policy.monthly_aptcs || aptc === undefined || aptc <= 0 ||
    policy.monthly_premiums.some((value) => value <= 0) ||
    policy.monthly_aptcs.some((value) => value <= 0) ||
    (policy.annual_aptc !== undefined &&
      Math.abs(policy.annual_aptc - (sourceAptc ?? 0)) > 0.01) ||
    fields.monthly_ptc_rows !== undefined ||
    fields.annual_premium !== Math.round(policy.annual_premium ?? 0) ||
    fields.annual_slcsp !== Math.round(policy.annual_slcsp ?? 0) ||
    policy.annual_premium === undefined ||
    Math.abs(
        policy.annual_premium -
          policy.monthly_premiums.reduce((sum, value) => sum + value, 0),
      ) >
      0.01 ||
    policy.annual_slcsp === undefined ||
    Math.abs(
        policy.annual_slcsp -
          policy.monthly_slcsps.reduce((sum, value) => sum + value, 0),
      ) >
      0.01 ||
    fields.annual_ptc_allowed !== undefined ||
    fields.household_size !== 1 || fields.dependents_modified_agi !== 0 ||
    fields.mfs_exception_ind === true ||
    fields.taxpayer_modified_agi !== agi || fields.household_income !== agi ||
    (form1040.data.line2a_tax_exempt ?? 0) !== 0 ||
    (form1040.data.line6a_ss_gross ?? 0) !==
      (form1040.data.line6b_ss_taxable ?? 0) ||
    fields.federal_poverty_line !== povertyLine ||
    fields.federal_poverty_pct !== povertyPct ||
    povertyPct < 100 || povertyPct >= 400 ||
    fields.total_advance_ptc !== aptc || fields.annual_aptc !== aptc ||
    fields.total_premium_tax_credit !== 0 ||
    (fields.net_premium_tax_credit ?? 0) !== 0 ||
    fields.excess_advance_payment !== aptc ||
    fields.repayment_limitation !== cap ||
    fields.excess_advance_premium !== Math.min(aptc, cap) ||
    schedule2.data.line1a_excess_advance_premium !== Math.min(aptc, cap) ||
    form1040.data.line17_additional_taxes !== Math.min(aptc, cap) ||
    pending?.schedule3 !== undefined || pending?.form2555 !== undefined
  ) {
    throw new Error(
      "Form 8962 MFS APTC-only filing differs from its identified policy or repayment return",
    );
  }
}

function reconcileSimpleAnnualPolicy(
  fields: Input,
  context?: MefBuildContext,
): void {
  const pending = context?.pending;
  const source = form1095aSchema.safeParse(pending?.f1095a);
  const form1040 = returnSchema.safeParse(pending?.f1040);
  if (!context?.filer || !source.success || !form1040.success) {
    throw new Error(
      "Form 8962 positive annual filing needs Form 1095-A and finalized Form 1040 facts",
    );
  }
  const policies = current1095AStatements(source.data.f1095as);
  const multiplePolicies = policies.length > 1;
  const twoStateFamilyPolicies = policies.length === 2 &&
    new Set(policies.map((policy) => policy.coverage_state)).size === 2;
  const general = generalSchema.safeParse(pending?.general);
  const mfsException = general.success &&
    general.data.filing_status === SourceFilingStatus.MFS &&
    (general.data.ptc_mfs_status?.basis === "domestic_abuse" ||
      general.data.ptc_mfs_status?.basis === "spousal_abandonment") &&
    general.data.ptc_mfs_status.policy_scope === "family_only" &&
    context.filer.filingStatus === FilingStatus.MarriedFilingSeparately &&
    fields.mfs_exception_ind === true && fields.household_size === 1 &&
    policies.length === 1;
  const dependentMagi = reconcileDependentMagi(
    fields.household_size,
    fields.dependents_modified_agi,
    pending?.general,
  );
  const householdIncome = form1040.data.line11_agi + dependentMagi;
  const povertyLine = reconcilePovertyTable(fields, context);
  const incomeAmounts = simplePolicyIncomeAmounts(
    householdIncome,
    povertyLine,
    fields.household_size,
    policies.length,
    general.success &&
      general.data.ptc_below_100_fpl_status?.basis ===
        "marketplace_estimate" &&
      (fields.total_advance_ptc ?? 0) > 0,
  );
  if (
    !((context.filer.filingStatus === FilingStatus.Single &&
      fields.mfs_exception_ind !== true) || mfsException) ||
    context.filer.address.foreignCountry ||
    policies.length < 1 || policies.length > 3 ||
    policies.some((policy) =>
      !policy.policy_number ||
      (!twoStateFamilyPolicies &&
        policy.coverage_state !== context.filer?.address.state) ||
      policy.alternative_marriage_owner !== undefined ||
      policy.shared_policy_periods || policy.slcsp_corrections ||
      policy.slcsp_review_periods ||
      !policy.monthly_premiums || !policy.monthly_slcsps ||
      !policy.monthly_aptcs ||
      policy.annual_premium === undefined ||
      policy.annual_slcsp === undefined ||
      policy.annual_aptc === undefined
    ) ||
    (general.success &&
      (general.data.ptc_residence_states_2025?.length ?? 1) > 1) ||
    source.data.alternative_marriage_month !== undefined ||
    fields.monthly_ptc_rows != null ||
    (fields.household_size !== 1 && fields.household_size !== 2 &&
      fields.household_size !== 3) ||
    (fields.household_size === 3 &&
      policies.length !== 1 && policies.length !== 3) ||
    (policies.length === 3 && fields.household_size !== 3) ||
    fields.qsehra_ind === true ||
    (fields.shared_policy_allocations?.length ?? 0) > 0 ||
    fields.alternative_marriage_primary || fields.alternative_marriage_spouse ||
    pending?.form2555 !== undefined
  ) {
    throw new Error(
      "Form 8962 annual line 11 needs identified full-year unchanged Marketplace policies and a one- to three-person return",
    );
  }
  const policyNumbers = policies.map((policy) => policy.policy_number);
  if (new Set(policyNumbers).size !== policies.length) {
    throw new Error("Form 8962 annual policies need distinct policy numbers");
  }
  if (multiplePolicies) {
    const dependents = general.success ? general.data.dependents ?? [] : [];
    const generalTaxpayerSsn = general.success
      ? general.data.taxpayer_ssn?.replaceAll("-", "")
      : undefined;
    const expectedSsns = [
      context.filer.primarySSN.replaceAll("-", ""),
      ...dependents.map((dependent) => dependent.ssn?.replaceAll("-", "")),
    ];
    const actualSsns = policies.flatMap((policy) =>
      policy.covered_individual_ssns?.map((ssn) => ssn.replaceAll("-", "")) ??
        []
    );
    if (
      fields.household_size !== policies.length ||
      dependents.length !== policies.length - 1 ||
      dependents.some((dependent) =>
        !dependent.ssn || dependent.dependent_on_another_return === true
      ) ||
      generalTaxpayerSsn !== context.filer.primarySSN.replaceAll("-", "") ||
      new Set(expectedSsns).size !== policies.length ||
      policies.some((policy) => policy.covered_individual_ssns?.length !== 1) ||
      new Set(actualSsns).size !== policies.length ||
      actualSsns.some((ssn) => !expectedSsns.includes(ssn)) ||
      (!twoStateFamilyPolicies &&
        policies.some((policy) =>
          policy.monthly_slcsps?.[0] !== policies[0].monthly_slcsps?.[0]
        ))
    ) {
      throw new Error(
        policies.length === 3
          ? "Form 8962 annual three-policy route needs distinct taxpayer and two claimed-dependent covered people with one same-state SLCSP"
          : "Form 8962 annual two-policy route needs distinct taxpayer/dependent covered people and one same-state SLCSP",
      );
    }
    if (twoStateFamilyPolicies) {
      const taxpayerPolicy = policies.find((policy) =>
        policy.covered_individual_ssns?.[0]?.replaceAll("-", "") ===
          context.filer?.primarySSN.replaceAll("-", "")
      );
      if (
        taxpayerPolicy?.coverage_state !== context.filer.address.state ||
        policies.some((policy) =>
          !CONTIGUOUS_STATES.has(policy.coverage_state ?? "")
        ) || fields.fpl_region !== "contiguous"
      ) {
        throw new Error(
          "Form 8962 annual different-state family policies need the taxpayer policy in the filing state and both states on the contiguous poverty table",
        );
      }
    }
  }
  if (fields.household_size === 1) {
    reconcileSinglePersonPolicyIdentity(policies, context.filer.primarySSN);
  } else {
    reconcileOnePolicyDependentIdentity(
      policies,
      fields.household_size,
      pending?.general,
      context.filer.primarySSN,
    );
  }
  if (
    policies.some((policy) =>
      policy.monthly_premiums!.some((value) =>
        value <= 0 || value !== policy.monthly_premiums![0]
      ) ||
      policy.monthly_slcsps!.some((value) =>
        value <= 0 || value !== policy.monthly_slcsps![0]
      ) ||
      policy.monthly_aptcs!.some((value) => value <= 0) ||
      Math.abs(
          policy.annual_premium! -
            policy.monthly_premiums!.reduce((a, b) => a + b, 0),
        ) > 0.01 ||
      Math.abs(
          policy.annual_slcsp! -
            policy.monthly_slcsps!.reduce((a, b) => a + b, 0),
        ) > 0.01 ||
      Math.abs(
          policy.annual_aptc! -
            policy.monthly_aptcs!.reduce((a, b) => a + b, 0),
        ) > 0.01
    )
  ) {
    throw new Error(
      "Form 8962 annual line 11 needs unchanged monthly premiums and SLCSP with reconciled Form 1095-A line 33 totals",
    );
  }
  const annualPremium = roundForm8962Amounts(
    policies.map((policy) => policy.annual_premium!),
  );
  const annualSlcsp = roundForm8962Amounts(
    twoStateFamilyPolicies
      ? policies.map((policy) => policy.annual_slcsp!)
      : [policies[0].annual_slcsp!],
  );
  const annualAptc = roundForm8962Amounts(
    policies.map((policy) => policy.annual_aptc!),
  );
  if (
    (form1040.data.line2a_tax_exempt ?? 0) !== 0 ||
    (form1040.data.line6a_ss_gross ?? 0) !==
      (form1040.data.line6b_ss_taxable ?? 0) ||
    fields.taxpayer_modified_agi !== form1040.data.line11_agi ||
    fields.household_income !== householdIncome ||
    fields.federal_poverty_line !== povertyLine ||
    fields.federal_poverty_pct !== incomeAmounts.povertyPct ||
    fields.applicable_figure !== incomeAmounts.figure
  ) {
    throw new Error(
      "Form 8962 annual line 11 household income must reconcile to finalized Form 1040",
    );
  }
  const annualContribution = Math.round(householdIncome * incomeAmounts.figure);
  const annualMaxAssistance = Math.max(
    0,
    annualSlcsp - annualContribution,
  );
  const credit = Math.round(
    Math.min(annualPremium, annualMaxAssistance),
  );
  const advance = Math.round(annualAptc);
  const net = Math.max(0, credit - advance);
  const excess = Math.max(0, advance - credit);
  const repayment = Math.min(excess, incomeAmounts.repaymentCap ?? excess);
  if (
    fields.annual_applicable_contribution !== annualContribution ||
    fields.monthly_applicable_contribution !==
      Math.round(annualContribution / 12) ||
    fields.annual_premium !== annualPremium ||
    fields.annual_slcsp !== annualSlcsp ||
    fields.annual_aptc !== annualAptc ||
    fields.annual_max_ptc !== annualMaxAssistance ||
    fields.annual_ptc_allowed !== credit ||
    fields.total_premium_tax_credit !== credit ||
    fields.total_advance_ptc !== advance ||
    (fields.net_premium_tax_credit ?? 0) !== net ||
    (fields.excess_advance_payment ?? 0) !== excess ||
    (fields.excess_advance_premium ?? 0) !== repayment ||
    fields.repayment_limitation !==
      (excess > 0 ? incomeAmounts.repaymentCap : undefined)
  ) {
    throw new Error(
      "Form 8962 annual line 11 and lines 24 through 29 differ from Form 1095-A and calculated contribution",
    );
  }
  const schedule2 = schedule2Schema.safeParse(pending?.schedule2);
  const schedule3 = schedule3Schema.safeParse(pending?.schedule3);
  if (
    (repayment > 0 && (
      !schedule2.success ||
      schedule2.data.line1a_excess_advance_premium !== repayment ||
      form1040.data.line17_additional_taxes !== repayment
    )) ||
    (net > 0 && (
      !schedule3.success ||
      schedule3.data.line9_premium_tax_credit !== net ||
      form1040.data.line31_additional_payments !== net
    )) ||
    (repayment === 0 && schedule2.success &&
      (schedule2.data.line1a_excess_advance_premium ?? 0) !== 0) ||
    (net === 0 && schedule3.success &&
      (schedule3.data.line9_premium_tax_credit ?? 0) !== 0)
  ) {
    throw new Error(
      "Form 8962 annual net credit or repayment differs from finalized Schedule 2/3 and Form 1040",
    );
  }
}

const CONTIGUOUS_STATES = new Set([
  "AL",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
]);

const TY2025_UNEXTENDED_DUE_DATE = "2026-04-15";

function validIsoDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

type NoAptcPayment = NonNullable<
  z.infer<typeof form1095aSchema>["f1095as"][number]["no_aptc_monthly_evidence"]
>[number]["premium_payment"];

function paidNoAptcPremium(
  payment: NoAptcPayment,
  reportedPremium: number,
  allowProtectedPartial = false,
  month?: number,
  coverageState?: string,
): number | null {
  if (
    !validIsoDate(payment.paid_on) ||
    payment.paid_on > TY2025_UNEXTENDED_DUE_DATE
  ) return null;
  if (payment.status === "paid_in_full") {
    return payment.amount >= reportedPremium ? reportedPremium : null;
  }
  if (!allowProtectedPartial || payment.amount >= reportedPremium) return null;
  if (payment.status === "protected_partial") {
    return payment.amount >= payment.minimum_payment_to_avoid_termination
      ? payment.amount
      : null;
  }
  if (month === undefined || coverageState === undefined) return null;
  const monthStart = `2025-${String(month).padStart(2, "0")}-01`;
  const monthEnd = new Date(Date.UTC(2025, month, 0))
    .toISOString().slice(0, 10);
  if (
    payment.order_state !== coverageState ||
    payment.emergency_state !== coverageState ||
    payment.order_protected_month !== month ||
    !validIsoDate(payment.emergency_declared_on) ||
    !validIsoDate(payment.emergency_expires_on) ||
    !validIsoDate(payment.order_issued_on) ||
    !validIsoDate(payment.order_effective_start) ||
    !validIsoDate(payment.order_effective_end) ||
    payment.emergency_declared_on > payment.order_issued_on ||
    payment.emergency_expires_on < payment.order_issued_on ||
    payment.order_effective_start > payment.order_effective_end ||
    payment.order_effective_start > monthEnd ||
    payment.order_effective_end < monthStart
  ) return null;
  return payment.amount;
}

function isNoAptcClaim(context?: MefBuildContext): boolean {
  const source = form1095aSchema.safeParse(context?.pending?.f1095a);
  if (!source.success) return false;
  return current1095AStatements(source.data.f1095as).some((policy) =>
    policy.monthly_premiums?.some((premium) => premium > 0) &&
    policy.monthly_aptcs?.every((aptc) => aptc === 0)
  );
}

function reconcileNoAptcPolicyMonths(
  fields: Input,
  context?: MefBuildContext,
): void {
  const pending = context?.pending;
  const source = form1095aSchema.safeParse(pending?.f1095a);
  const general = generalSchema.safeParse(pending?.general);
  const form1040 = returnSchema.safeParse(pending?.f1040);
  if (
    !context?.filer || !source.success || !general.success ||
    !form1040.success
  ) {
    throw new Error(
      "Form 8962 no-APTC PTC needs Form 1095-A, taxpayer identity, and finalized Form 1040",
    );
  }
  const policies = current1095AStatements(source.data.f1095as);
  const policy = policies[0];
  const rows = fields.monthly_ptc_rows;
  const coveredMonths =
    policy?.monthly_premiums?.flatMap((premium, index) =>
      premium > 0 ? [index + 1] : []
    ) ?? [];
  const dependentMagi = reconcileDependentMagi(
    fields.household_size,
    fields.dependents_modified_agi,
    pending?.general,
  );
  const hasVerifiedDependent = fields.household_size === 2 &&
    (general.data.dependents?.length ?? 0) === 1;
  if (
    context.filer.filingStatus !== FilingStatus.Single ||
    context.filer.address.foreignCountry ||
    policies.length !== 1 || !policy?.policy_number ||
    policy.coverage_state !== context.filer.address.state ||
    (hasVerifiedDependent
      ? policy.covered_individual_ssns?.length !== 2
      : policy.covered_individual_ssns?.length !== 1 ||
        (policy.covered_individual_ssns?.[0] ?? "").replaceAll("-", "") !==
          context.filer.primarySSN.replaceAll("-", "")) ||
    general.data.taxpayer_ssn?.replaceAll("-", "") !==
      context.filer.primarySSN.replaceAll("-", "") ||
    general.data.filing_status !== SourceFilingStatus.Single ||
    general.data.taxpayer_can_be_claimed_as_dependent !== false ||
    (!hasVerifiedDependent && (general.data.dependents?.length ?? 0) !== 0) ||
    policy.shared_policy_periods || policy.slcsp_review_periods ||
    policy.alternative_marriage_owner ||
    source.data.alternative_marriage_month !== undefined ||
    !policy.monthly_premiums || !policy.monthly_aptcs ||
    !policy.slcsp_corrections || !policy.no_aptc_monthly_evidence ||
    coveredMonths.length === 0 ||
    policy.monthly_slcsps?.some((slcsp, index) =>
      policy.monthly_premiums?.[index] === 0 && slcsp !== 0
    ) ||
    policy.monthly_aptcs.some((aptc) => aptc !== 0) ||
    (fields.household_size !== 1 && !hasVerifiedDependent) ||
    fields.dependents_modified_agi !== dependentMagi ||
    fields.qsehra_ind === true || fields.mfs_exception_ind === true ||
    (fields.shared_policy_allocations?.length ?? 0) !== 0 ||
    fields.alternative_marriage_primary || fields.alternative_marriage_spouse ||
    fields.annual_premium !== undefined ||
    fields.annual_aptc !== undefined ||
    fields.annual_ptc_allowed !== undefined ||
    !Array.isArray(rows) || rows.length !== 12 ||
    pending?.form2555 !== undefined
  ) {
    throw new Error(
      "Form 8962 no-APTC PTC supports one fully paid, nonshared Marketplace policy and a verified one- or two-person single return",
    );
  }
  if (hasVerifiedDependent) {
    reconcileOnePolicyDependentIdentity(
      policies,
      fields.household_size,
      pending?.general,
      context.filer.primarySSN,
    );
  }
  const povertyLine = reconcilePovertyTable(fields, context);
  const taxpayerIncome = form1040.data.line11_agi + sourcedTaxExemptInterest(
    pending,
    form1040.data.line2a_tax_exempt ?? 0,
  );
  const income = taxpayerIncome + dependentMagi;
  if (
    hasVerifiedDependent &&
    (income < povertyLine || income >= 4 * povertyLine)
  ) {
    throw new Error(
      "Form 8962 monthly no-APTC dependent route needs household income from 100% through 399% FPL",
    );
  }
  const incomeAmounts = simplePolicyIncomeAmounts(
    income,
    povertyLine,
    fields.household_size,
    policies.length,
    general.data.ptc_below_100_fpl_status?.basis === "lawfully_present",
    hasVerifiedDependent,
  );
  if (
    (form1040.data.line6a_ss_gross ?? 0) !==
      (form1040.data.line6b_ss_taxable ?? 0) ||
    fields.taxpayer_modified_agi !== taxpayerIncome ||
    fields.household_income !== income ||
    fields.federal_poverty_line !== povertyLine ||
    fields.federal_poverty_pct !== incomeAmounts.povertyPct ||
    fields.applicable_figure !== incomeAmounts.figure
  ) {
    throw new Error(
      "Form 8962 no-APTC household income and poverty table differ from Form 1040",
    );
  }
  const annualContribution = Math.round(income * incomeAmounts.figure);
  const monthlyContribution = Math.round(annualContribution / 12);
  if (
    fields.annual_applicable_contribution !== annualContribution ||
    fields.monthly_applicable_contribution !== monthlyContribution ||
    (fields.annual_slcsp !== undefined &&
      fields.annual_slcsp !== rows.reduce(
          (sum, row) => sum + (row.slcsp ?? 0),
          0,
        )) ||
    (policy.annual_premium !== undefined &&
      Math.abs(
          policy.annual_premium -
            policy.monthly_premiums.reduce((sum, premium) => sum + premium, 0),
        ) >
        0.01) ||
    (policy.annual_aptc ?? 0) !== 0 ||
    (policy.monthly_slcsps && policy.annual_slcsp !== undefined &&
      Math.abs(
          policy.annual_slcsp -
            policy.monthly_slcsps.reduce((sum, slcsp) => sum + slcsp, 0),
        ) >
        0.01) ||
    (!policy.monthly_slcsps && (policy.annual_slcsp ?? 0) !== 0)
  ) {
    throw new Error(
      "Form 8962 no-APTC Form 1095-A totals or contribution do not reconcile",
    );
  }
  const corrections = new Map(policy.slcsp_corrections.map((item) => [
    item.month,
    item,
  ]));
  const evidence = new Map(policy.no_aptc_monthly_evidence.map((item) => [
    item.month,
    item,
  ]));
  if (
    corrections.size !== coveredMonths.length ||
    evidence.size !== coveredMonths.length ||
    policy.slcsp_corrections.length !== coveredMonths.length ||
    policy.no_aptc_monthly_evidence.length !== coveredMonths.length ||
    coveredMonths.some((month) =>
      !corrections.has(month) || !evidence.has(month)
    )
  ) {
    throw new Error(
      "Form 8962 no-APTC needs one Marketplace determination and payment record for every covered month",
    );
  }
  const credit = rows.reduce((total, row, index) => {
    const month = index + 1;
    const correction = corrections.get(month);
    const proof = evidence.get(month);
    const reportedPremium = policy.monthly_premiums![index];
    if (reportedPremium === 0) {
      if (
        row.month_code !== MONTH_CODES[index] || row.premium !== 0 ||
        row.slcsp !== 0 || row.aptc !== 0 ||
        row.contribution !== monthlyContribution ||
        row.max_assistance !== 0 || row.allowed_credit !== 0
      ) {
        throw new Error(
          `Form 8962 no-APTC uncovered month ${month} must have zero policy and credit amounts`,
        );
      }
      return total;
    }
    const paidPremium = proof
      ? paidNoAptcPremium(
        proof.premium_payment,
        reportedPremium,
        true,
        month,
        policy.coverage_state,
      )
      : null;
    if (
      !correction || !proof || correction.basis !== "no_aptc" ||
      correction.corrected_slcsp <= 0 ||
      proof.marketplace_slcsp !== correction.corrected_slcsp ||
      proof.marketplace_method !== correction.determination_source ||
      !validIsoDate(proof.marketplace_determined_on) ||
      paidPremium === null
    ) {
      throw new Error(
        `Form 8962 no-APTC month ${month} lacks matching Marketplace SLCSP and timely premium-payment evidence`,
      );
    }
    const premium = Math.round(paidPremium);
    const slcsp = Math.round(correction.corrected_slcsp);
    const maxAssistance = Math.max(0, slcsp - monthlyContribution);
    const allowed = Math.min(premium, maxAssistance);
    if (
      row.month_code !== MONTH_CODES[index] || row.premium !== premium ||
      row.slcsp !== slcsp || row.aptc !== 0 ||
      row.contribution !== monthlyContribution ||
      row.max_assistance !== maxAssistance ||
      row.allowed_credit !== allowed
    ) {
      throw new Error(
        `Form 8962 no-APTC month ${month} differs from source premiums, determined SLCSP, or calculated credit`,
      );
    }
    return total + allowed;
  }, 0);
  const roundedCredit = Math.round(credit);
  const schedule3 = schedule3Schema.safeParse(pending?.schedule3);
  const schedule2 = schedule2Schema.safeParse(pending?.schedule2);
  if (
    roundedCredit <= 0 ||
    fields.total_premium_tax_credit !== roundedCredit ||
    fields.total_advance_ptc !== 0 ||
    fields.net_premium_tax_credit !== roundedCredit ||
    (fields.excess_advance_payment ?? 0) !== 0 ||
    (fields.excess_advance_premium ?? 0) !== 0 ||
    fields.repayment_limitation !== undefined ||
    (schedule2.success &&
      (schedule2.data.line1a_excess_advance_premium ?? 0) !== 0) ||
    !schedule3.success ||
    schedule3.data.line9_premium_tax_credit !== roundedCredit ||
    form1040.data.line31_additional_payments !== roundedCredit
  ) {
    throw new Error(
      "Form 8962 no-APTC positive credit differs from Schedule 3 or finalized Form 1040",
    );
  }
}

function reconcileMultiNoAptcPolicyMonths(
  fields: Input,
  context?: MefBuildContext,
): void {
  const pending = context?.pending;
  const source = form1095aSchema.safeParse(pending?.f1095a);
  const general = generalSchema.safeParse(pending?.general);
  const form1040 = returnSchema.safeParse(pending?.f1040);
  if (
    !context?.filer || !source.success || !general.success || !form1040.success
  ) {
    throw new Error(
      "Form 8962 multi-policy monthly PTC needs verified return and Marketplace sources",
    );
  }
  const policies = current1095AStatements(source.data.f1095as);
  const rows = fields.monthly_ptc_rows;
  const ssn = context.filer.primarySSN.replaceAll("-", "");
  const policyLabel = policies.length > 4
    ? `${policies.length}-policy`
    : policies.length === 4
    ? "four-policy"
    : policies.length === 3
    ? "three-policy"
    : "two-policy";
  const activePolicyCounts = Array.from(
    { length: 12 },
    (_, month) =>
      policies.filter((policy) => (policy.monthly_premiums?.[month] ?? 0) > 0)
        .length,
  );
  const uncoveredMonths = activePolicyCounts.filter((count) => count === 0)
    .length;
  // Preserve the existing two-policy overlap route for zero, one, or two
  // uncovered months. Wider gaps use one contiguous block per policy.
  const sequentialOnly = policies.length >= 3 || uncoveredMonths > 2;
  if (
    context.filer.filingStatus !== FilingStatus.Single ||
    context.filer.address.foreignCountry ||
    general.data.filing_status !== SourceFilingStatus.Single ||
    general.data.taxpayer_ssn?.replaceAll("-", "") !== ssn ||
    general.data.taxpayer_can_be_claimed_as_dependent !== false ||
    (general.data.dependents?.length ?? 0) !== 0 ||
    policies.length < 2 || policies.length > 12 ||
    new Set(policies.map((policy) => policy.policy_number)).size !==
      policies.length ||
    (sequentialOnly && activePolicyCounts.some((count) => count > 1)) ||
    (sequentialOnly && policies.some((policy) => {
      const coveredMonths = policy.monthly_premiums?.flatMap((premium, index) =>
        premium > 0 ? [index] : []
      ) ?? [];
      return coveredMonths.some((month, index) =>
        index > 0 && month !== coveredMonths[index - 1] + 1
      );
    })) ||
    policies.some((policy) =>
      !policy.policy_number ||
      policy.coverage_state !== context.filer?.address.state ||
      policy.covered_individual_ssns?.length !== 1 ||
      policy.covered_individual_ssns[0].replaceAll("-", "") !== ssn ||
      policy.shared_policy_periods || policy.slcsp_review_periods ||
      policy.alternative_marriage_owner ||
      !policy.monthly_premiums || !policy.monthly_slcsps ||
      !policy.monthly_aptcs || !policy.slcsp_corrections ||
      !policy.no_aptc_monthly_evidence ||
      !policy.monthly_premiums.some((amount) => amount > 0) ||
      policy.monthly_slcsps.some((amount, index) =>
        policy.monthly_premiums![index] === 0 && amount !== 0
      ) ||
      policy.monthly_aptcs.some((amount) => amount !== 0) ||
      (policy.annual_premium !== undefined &&
        Math.abs(
            policy.annual_premium -
              policy.monthly_premiums.reduce((sum, amount) => sum + amount, 0),
          ) >
          0.005) ||
      (policy.annual_slcsp !== undefined &&
        Math.abs(
            policy.annual_slcsp -
              policy.monthly_slcsps.reduce((sum, amount) => sum + amount, 0),
          ) >
          0.005) ||
      (policy.annual_aptc ?? 0) !== 0
    ) ||
    fields.household_size !== 1 || fields.dependents_modified_agi !== 0 ||
    fields.qsehra_ind === true || fields.mfs_exception_ind === true ||
    (fields.shared_policy_allocations?.length ?? 0) !== 0 ||
    fields.alternative_marriage_primary || fields.alternative_marriage_spouse ||
    fields.annual_premium !== undefined || fields.annual_aptc !== undefined ||
    fields.annual_ptc_allowed !== undefined ||
    !Array.isArray(rows) || rows.length !== 12 ||
    source.data.alternative_marriage_month !== undefined ||
    pending?.form2555 !== undefined
  ) {
    throw new Error(
      `Form 8962 ${policyLabel} monthly PTC needs distinct same-state nonshared policies for one filer`,
    );
  }
  const povertyLine = reconcilePovertyTable(fields, context);
  const income = form1040.data.line11_agi + sourcedTaxExemptInterest(
    pending,
    form1040.data.line2a_tax_exempt ?? 0,
  );
  const incomeAmounts = simplePolicyIncomeAmounts(
    income,
    povertyLine,
    1,
    policies.length,
  );
  const annualContribution = Math.round(income * incomeAmounts.figure);
  const contribution = Math.round(annualContribution / 12);
  if (
    (form1040.data.line6a_ss_gross ?? 0) !==
      (form1040.data.line6b_ss_taxable ?? 0) ||
    fields.taxpayer_modified_agi !== income ||
    fields.household_income !== income ||
    fields.federal_poverty_line !== povertyLine ||
    fields.federal_poverty_pct !== incomeAmounts.povertyPct ||
    fields.applicable_figure !== incomeAmounts.figure ||
    fields.annual_applicable_contribution !== annualContribution ||
    fields.monthly_applicable_contribution !== contribution ||
    (fields.annual_slcsp !== undefined &&
      fields.annual_slcsp !== rows.reduce(
          (sum, row) => sum + (row.slcsp ?? 0),
          0,
        ))
  ) {
    throw new Error(
      `Form 8962 ${policyLabel} monthly income differs from finalized return`,
    );
  }
  const evidence = policies.map((policy) => ({
    coveredMonths: policy.monthly_premiums!.flatMap((premium, index) =>
      premium > 0 ? [index + 1] : []
    ),
    corrections: new Map(
      policy.slcsp_corrections!.map((item) => [item.month, item]),
    ),
    payments: new Map(
      policy.no_aptc_monthly_evidence!.map((item) => [item.month, item]),
    ),
  }));
  if (
    policies.some((policy, index) =>
      evidence[index].corrections.size !==
        evidence[index].coveredMonths.length ||
      evidence[index].payments.size !== evidence[index].coveredMonths.length ||
      policy.slcsp_corrections!.length !==
        evidence[index].coveredMonths.length ||
      policy.no_aptc_monthly_evidence!.length !==
        evidence[index].coveredMonths.length ||
      evidence[index].coveredMonths.some((month) =>
        !evidence[index].corrections.has(month) ||
        !evidence[index].payments.has(month)
      )
    )
  ) {
    throw new Error(
      `Form 8962 ${policyLabel} monthly PTC needs a determination and payment for every policy-covered month`,
    );
  }
  let credit = 0;
  for (let index = 0; index < 12; index++) {
    const month = index + 1;
    const active = policies.flatMap((policy, policyIndex) =>
      policy.monthly_premiums![index] > 0 ? [policyIndex] : []
    );
    if (active.length === 0) {
      const row = rows[index];
      if (
        row.month_code !== MONTH_CODES[index] || row.premium !== 0 ||
        row.slcsp !== 0 || row.aptc !== 0 ||
        row.contribution !== contribution || row.max_assistance !== 0 ||
        row.allowed_credit !== 0
      ) {
        throw new Error(
          `Form 8962 ${policyLabel} uncovered month ${month} must have zero policy and credit amounts`,
        );
      }
      continue;
    }
    const sourceSlcsp = evidence[active[0]].corrections.get(month)
      ?.corrected_slcsp;
    if (sourceSlcsp === undefined || sourceSlcsp <= 0) {
      throw new Error(
        `Form 8962 ${policyLabel} month ${month} needs a determined SLCSP`,
      );
    }
    const slcsp = roundForm8962Amounts([sourceSlcsp]);
    if (
      active.some((policyIndex) =>
        evidence[policyIndex].corrections.get(month)?.corrected_slcsp !==
          sourceSlcsp
      )
    ) {
      throw new Error(
        `Form 8962 ${policyLabel} month ${month} needs one same-state SLCSP`,
      );
    }
    const paidPremiums: number[] = [];
    for (const policyIndex of active) {
      const correction = evidence[policyIndex].corrections.get(month);
      const proof = evidence[policyIndex].payments.get(month);
      const paidPremium = proof
        ? paidNoAptcPremium(
          proof.premium_payment,
          policies[policyIndex].monthly_premiums![index],
          true,
          month,
          policies[policyIndex].coverage_state,
        )
        : null;
      if (
        !correction || !proof || correction.basis !== "no_aptc" ||
        correction.corrected_slcsp !== sourceSlcsp ||
        proof.marketplace_slcsp !== sourceSlcsp ||
        proof.marketplace_method !== correction.determination_source ||
        !validIsoDate(proof.marketplace_determined_on) ||
        paidPremium === null
      ) {
        throw new Error(
          `Form 8962 ${policyLabel} month ${month} lacks matching SLCSP or timely premium-payment evidence`,
        );
      }
      paidPremiums.push(paidPremium);
    }
    const premium = roundForm8962Amounts(paidPremiums);
    const assistance = Math.max(0, slcsp - contribution);
    const allowed = Math.min(premium, assistance);
    const row = rows[index];
    if (
      row.month_code !== MONTH_CODES[index] || row.premium !== premium ||
      row.slcsp !== slcsp || row.aptc !== 0 ||
      row.contribution !== contribution || row.max_assistance !== assistance ||
      row.allowed_credit !== allowed
    ) {
      throw new Error(
        `Form 8962 ${policyLabel} month ${month} differs from sources or calculated credit`,
      );
    }
    credit += allowed;
  }
  const roundedCredit = Math.round(credit);
  const schedule3 = schedule3Schema.safeParse(pending?.schedule3);
  const schedule2 = schedule2Schema.safeParse(pending?.schedule2);
  if (
    fields.total_premium_tax_credit !== roundedCredit ||
    fields.total_advance_ptc !== 0 ||
    fields.net_premium_tax_credit !== roundedCredit ||
    (fields.excess_advance_payment ?? 0) !== 0 ||
    (fields.excess_advance_premium ?? 0) !== 0 ||
    fields.repayment_limitation !== undefined ||
    (schedule2.success &&
      (schedule2.data.line1a_excess_advance_premium ?? 0) !== 0) ||
    !schedule3.success ||
    schedule3.data.line9_premium_tax_credit !== roundedCredit ||
    form1040.data.line31_additional_payments !== roundedCredit
  ) {
    throw new Error(
      `Form 8962 ${policyLabel} monthly credit differs from finalized return`,
    );
  }
}

function reconcileNoAptcAnnualPolicy(
  fields: Input,
  context?: MefBuildContext,
): void {
  const pending = context?.pending;
  const source = form1095aSchema.safeParse(pending?.f1095a);
  const general = generalSchema.safeParse(pending?.general);
  const form1040 = returnSchema.safeParse(pending?.f1040);
  if (
    !context?.filer || !source.success || !general.success ||
    !form1040.success
  ) {
    throw new Error(
      "Form 8962 no-APTC annual PTC needs Form 1095-A, taxpayer identity, and finalized Form 1040",
    );
  }
  const policies = current1095AStatements(source.data.f1095as);
  const policy = policies[0];
  const dependentMagi = reconcileDependentMagi(
    fields.household_size,
    fields.dependents_modified_agi,
    pending?.general,
  );
  const hasVerifiedDependent = fields.household_size === 2 &&
    (general.data.dependents?.length ?? 0) === 1;
  if (
    context.filer.filingStatus !== FilingStatus.Single ||
    context.filer.address.foreignCountry ||
    policies.length !== 1 || !policy?.policy_number ||
    policy.coverage_state !== context.filer.address.state ||
    (fields.household_size === 1 &&
      (policy.covered_individual_ssns?.length !== 1 ||
        policy.covered_individual_ssns[0].replaceAll("-", "") !==
          context.filer.primarySSN.replaceAll("-", ""))) ||
    general.data.taxpayer_ssn?.replaceAll("-", "") !==
      context.filer.primarySSN.replaceAll("-", "") ||
    general.data.filing_status !== SourceFilingStatus.Single ||
    general.data.taxpayer_can_be_claimed_as_dependent !== false ||
    (!hasVerifiedDependent && (general.data.dependents?.length ?? 0) !== 0) ||
    policy.shared_policy_periods || policy.slcsp_review_periods ||
    policy.alternative_marriage_owner ||
    source.data.alternative_marriage_month !== undefined ||
    !policy.monthly_premiums || !policy.monthly_aptcs ||
    !policy.slcsp_corrections || !policy.no_aptc_monthly_evidence ||
    policy.monthly_premiums.some((premium) =>
      premium <= 0 || premium !== policy.monthly_premiums![0]
    ) ||
    policy.monthly_aptcs.some((aptc) => aptc !== 0) ||
    fields.monthly_ptc_rows != null ||
    (fields.household_size !== 1 && !hasVerifiedDependent) ||
    fields.dependents_modified_agi !== dependentMagi ||
    fields.qsehra_ind === true || fields.mfs_exception_ind === true ||
    (fields.shared_policy_allocations?.length ?? 0) !== 0 ||
    fields.alternative_marriage_primary || fields.alternative_marriage_spouse ||
    pending?.form2555 !== undefined
  ) {
    throw new Error(
      "Form 8962 no-APTC annual PTC needs one full-year nonshared policy and a verified one- or two-person single return",
    );
  }
  if (hasVerifiedDependent) {
    reconcileOnePolicyDependentIdentity(
      policies,
      fields.household_size,
      pending?.general,
      context.filer.primarySSN,
    );
  }
  const povertyLine = reconcilePovertyTable(fields, context);
  const taxpayerIncome = form1040.data.line11_agi + sourcedTaxExemptInterest(
    pending,
    form1040.data.line2a_tax_exempt ?? 0,
  );
  const income = taxpayerIncome + dependentMagi;
  const incomeAmounts = simplePolicyIncomeAmounts(
    income,
    povertyLine,
    fields.household_size,
    policies.length,
    general.data.ptc_below_100_fpl_status?.basis === "lawfully_present",
    hasVerifiedDependent,
  );
  if (
    (form1040.data.line6a_ss_gross ?? 0) !==
      (form1040.data.line6b_ss_taxable ?? 0) ||
    fields.taxpayer_modified_agi !== taxpayerIncome ||
    fields.household_income !== income ||
    fields.federal_poverty_line !== povertyLine ||
    fields.federal_poverty_pct !== incomeAmounts.povertyPct ||
    fields.applicable_figure !== incomeAmounts.figure
  ) {
    throw new Error(
      "Form 8962 no-APTC annual household income and poverty table differ from Form 1040",
    );
  }
  const annualContribution = Math.round(income * incomeAmounts.figure);
  const monthlyContribution = Math.round(annualContribution / 12);
  const reportedPremium = policy.monthly_premiums.reduce(
    (total, premium) => total + premium,
    0,
  );
  const reportedSlcsp = policy.monthly_slcsps?.reduce(
    (total, slcsp) => total + slcsp,
    0,
  );
  if (
    fields.annual_applicable_contribution !== annualContribution ||
    fields.monthly_applicable_contribution !== monthlyContribution ||
    (policy.annual_premium === undefined ||
      Math.abs(policy.annual_premium - reportedPremium) > 0.01) ||
    (policy.annual_slcsp !== undefined &&
      Math.abs(policy.annual_slcsp - (reportedSlcsp ?? 0)) > 0.01) ||
    (policy.annual_aptc ?? 0) !== 0
  ) {
    throw new Error(
      "Form 8962 no-APTC annual Form 1095-A totals or contribution do not reconcile",
    );
  }
  const corrections = new Map(policy.slcsp_corrections.map((item) => [
    item.month,
    item,
  ]));
  const evidence = new Map(policy.no_aptc_monthly_evidence.map((item) => [
    item.month,
    item,
  ]));
  if (
    corrections.size !== 12 || evidence.size !== 12 ||
    policy.slcsp_corrections.length !== 12 ||
    policy.no_aptc_monthly_evidence.length !== 12
  ) {
    throw new Error(
      "Form 8962 no-APTC annual PTC needs twelve Marketplace determinations and premium-payment records",
    );
  }
  const monthlySlcsp = corrections.get(1)?.corrected_slcsp;
  if (!monthlySlcsp || monthlySlcsp <= 0) {
    throw new Error(
      "Form 8962 no-APTC annual PTC needs a positive determined SLCSP",
    );
  }
  for (let month = 1; month <= 12; month++) {
    const correction = corrections.get(month);
    const proof = evidence.get(month);
    if (
      !correction || !proof || correction.basis !== "no_aptc" ||
      correction.corrected_slcsp !== monthlySlcsp ||
      proof.marketplace_slcsp !== monthlySlcsp ||
      proof.marketplace_method !== correction.determination_source ||
      !validIsoDate(proof.marketplace_determined_on) ||
      paidNoAptcPremium(
          proof.premium_payment,
          policy.monthly_premiums[month - 1],
        ) === null
    ) {
      throw new Error(
        `Form 8962 no-APTC annual month ${month} lacks matching SLCSP and timely full premium-payment evidence`,
      );
    }
  }
  const annualPremium = Math.round(reportedPremium);
  const annualSlcsp = Math.round(monthlySlcsp * 12);
  const annualMaxAssistance = Math.max(0, annualSlcsp - annualContribution);
  const credit = Math.round(Math.min(annualPremium, annualMaxAssistance));
  const schedule3 = schedule3Schema.safeParse(pending?.schedule3);
  const schedule2 = schedule2Schema.safeParse(pending?.schedule2);
  if (
    credit <= 0 || fields.annual_premium !== annualPremium ||
    fields.annual_slcsp !== annualSlcsp || fields.annual_aptc !== 0 ||
    fields.annual_max_ptc !== annualMaxAssistance ||
    fields.annual_ptc_allowed !== credit ||
    fields.total_premium_tax_credit !== credit ||
    fields.total_advance_ptc !== 0 ||
    fields.net_premium_tax_credit !== credit ||
    (fields.excess_advance_payment ?? 0) !== 0 ||
    (fields.excess_advance_premium ?? 0) !== 0 ||
    fields.repayment_limitation !== undefined ||
    (schedule2.success &&
      (schedule2.data.line1a_excess_advance_premium ?? 0) !== 0) ||
    !schedule3.success ||
    schedule3.data.line9_premium_tax_credit !== credit ||
    form1040.data.line31_additional_payments !== credit
  ) {
    throw new Error(
      "Form 8962 no-APTC annual positive credit differs from source, Schedule 3, or Form 1040",
    );
  }
}

function reconcileTwoNoAptcAnnualPolicies(
  fields: Input,
  context?: MefBuildContext,
): void {
  const pending = context?.pending;
  const source = form1095aSchema.safeParse(pending?.f1095a);
  const general = generalSchema.safeParse(pending?.general);
  const form1040 = returnSchema.safeParse(pending?.f1040);
  if (
    !context?.filer || !source.success || !general.success || !form1040.success
  ) {
    throw new Error(
      "Form 8962 two-policy annual PTC needs verified return and Marketplace sources",
    );
  }
  const policies = current1095AStatements(source.data.f1095as);
  const ssn = context.filer.primarySSN.replaceAll("-", "");
  if (
    context.filer.filingStatus !== FilingStatus.Single ||
    context.filer.address.foreignCountry ||
    general.data.filing_status !== SourceFilingStatus.Single ||
    general.data.taxpayer_ssn?.replaceAll("-", "") !== ssn ||
    general.data.taxpayer_can_be_claimed_as_dependent !== false ||
    (general.data.dependents?.length ?? 0) !== 0 ||
    policies.length !== 2 ||
    new Set(policies.map((policy) => policy.policy_number)).size !== 2 ||
    policies.some((policy) =>
      !policy.policy_number ||
      policy.coverage_state !== context.filer?.address.state ||
      policy.covered_individual_ssns?.length !== 1 ||
      policy.covered_individual_ssns[0].replaceAll("-", "") !== ssn ||
      policy.shared_policy_periods || policy.slcsp_review_periods ||
      policy.alternative_marriage_owner ||
      !policy.monthly_premiums || !policy.monthly_slcsps ||
      !policy.monthly_aptcs || !policy.slcsp_corrections ||
      !policy.no_aptc_monthly_evidence ||
      policy.annual_premium === undefined ||
      policy.annual_slcsp === undefined ||
      policy.monthly_premiums.some((amount) =>
        amount <= 0 || amount !== policy.monthly_premiums![0]
      ) ||
      policy.monthly_slcsps.some((amount) =>
        amount !== policy.monthly_slcsps![0]
      ) ||
      policy.monthly_aptcs.some((amount) => amount !== 0) ||
      Math.abs(
          policy.annual_premium! -
            policy.monthly_premiums.reduce((sum, amount) => sum + amount, 0),
        ) >
        0.005 ||
      Math.abs(
          policy.annual_slcsp! -
            policy.monthly_slcsps.reduce((sum, amount) => sum + amount, 0),
        ) >
        0.005 ||
      (policy.annual_aptc ?? 0) !== 0
    ) ||
    fields.monthly_ptc_rows != null || fields.household_size !== 1 ||
    fields.dependents_modified_agi !== 0 ||
    fields.qsehra_ind === true || fields.mfs_exception_ind === true ||
    (fields.shared_policy_allocations?.length ?? 0) !== 0 ||
    fields.alternative_marriage_primary || fields.alternative_marriage_spouse ||
    source.data.alternative_marriage_month !== undefined ||
    pending?.form2555 !== undefined
  ) {
    throw new Error(
      "Form 8962 two-policy annual PTC needs distinct full-year same-state policies for one filer",
    );
  }
  const povertyLine = reconcilePovertyTable(fields, context);
  const income = form1040.data.line11_agi + sourcedTaxExemptInterest(
    pending,
    form1040.data.line2a_tax_exempt ?? 0,
  );
  const incomeAmounts = simplePolicyIncomeAmounts(income, povertyLine, 1, 1);
  const contribution = Math.round(income * incomeAmounts.figure);
  const monthlyContribution = Math.round(contribution / 12);
  const slcsp = policies[0].slcsp_corrections![0]?.corrected_slcsp;
  if (slcsp === undefined || slcsp <= 0) {
    throw new Error("Form 8962 two-policy annual PTC needs determined SLCSP");
  }
  for (const policy of policies) {
    const corrections = new Map(
      policy.slcsp_corrections!.map((item) => [item.month, item]),
    );
    const evidence = new Map(
      policy.no_aptc_monthly_evidence!.map((item) => [item.month, item]),
    );
    if (
      corrections.size !== 12 || evidence.size !== 12 ||
      policy.slcsp_corrections!.length !== 12 ||
      policy.no_aptc_monthly_evidence!.length !== 12
    ) {
      throw new Error(
        "Form 8962 two-policy annual PTC needs twelve determinations and payments per policy",
      );
    }
    for (let month = 1; month <= 12; month++) {
      const correction = corrections.get(month);
      const proof = evidence.get(month);
      if (
        !correction || !proof || correction.basis !== "no_aptc" ||
        correction.corrected_slcsp !== slcsp ||
        proof.marketplace_slcsp !== slcsp ||
        proof.marketplace_method !== correction.determination_source ||
        !validIsoDate(proof.marketplace_determined_on) ||
        paidNoAptcPremium(
            proof.premium_payment,
            policy.monthly_premiums![month - 1],
          ) === null
      ) {
        throw new Error(
          `Form 8962 two-policy annual month ${month} lacks matching SLCSP or full payment evidence`,
        );
      }
    }
  }
  const premium = roundForm8962Amounts(
    policies.map((policy) => policy.annual_premium!),
  );
  const annualSlcsp = roundForm8962Amounts(Array(12).fill(slcsp));
  const assistance = Math.max(0, annualSlcsp - contribution);
  const credit = Math.round(Math.min(premium, assistance));
  const schedule3 = schedule3Schema.safeParse(pending?.schedule3);
  const schedule2 = schedule2Schema.safeParse(pending?.schedule2);
  if (
    (form1040.data.line6a_ss_gross ?? 0) !==
      (form1040.data.line6b_ss_taxable ?? 0) ||
    fields.taxpayer_modified_agi !== income ||
    fields.household_income !== income ||
    fields.federal_poverty_line !== povertyLine ||
    fields.federal_poverty_pct !== incomeAmounts.povertyPct ||
    fields.applicable_figure !== incomeAmounts.figure ||
    fields.annual_applicable_contribution !== contribution ||
    fields.monthly_applicable_contribution !== monthlyContribution ||
    fields.annual_premium !== premium || fields.annual_slcsp !== annualSlcsp ||
    fields.annual_aptc !== 0 || fields.annual_max_ptc !== assistance ||
    fields.annual_ptc_allowed !== credit ||
    fields.total_premium_tax_credit !== credit ||
    fields.total_advance_ptc !== 0 ||
    fields.net_premium_tax_credit !== credit ||
    (fields.excess_advance_payment ?? 0) !== 0 ||
    (fields.excess_advance_premium ?? 0) !== 0 ||
    fields.repayment_limitation !== undefined ||
    (schedule2.success &&
      (schedule2.data.line1a_excess_advance_premium ?? 0) !== 0) ||
    !schedule3.success ||
    schedule3.data.line9_premium_tax_credit !== credit ||
    form1040.data.line31_additional_payments !== credit
  ) {
    throw new Error(
      "Form 8962 two-policy annual credit differs from sources or finalized return",
    );
  }
}

function reconcileSimplePolicyMonths(
  fields: Input,
  context?: MefBuildContext,
): void {
  const pending = context?.pending;
  const source = form1095aSchema.safeParse(pending?.f1095a);
  const form1040 = returnSchema.safeParse(pending?.f1040);
  if (!context?.filer || !source.success || !form1040.success) {
    throw new Error(
      "Form 8962 positive monthly filing needs Form 1095-A and finalized Form 1040 facts",
    );
  }
  const policies = current1095AStatements(source.data.f1095as);
  const policyNumbers = policies.map((policy) => policy.policy_number);
  const rows = fields.monthly_ptc_rows;
  const general = generalSchema.safeParse(pending?.general);
  const residenceStates = general.success
    ? general.data.ptc_residence_states_2025
    : undefined;
  const residenceMonths = (residenceStates?.length === 2 ||
      residenceStates?.length === 3) && general.success
    ? general.data.ptc_residence_months_2025
    : undefined;
  const interstateMove = residenceMonths !== undefined;
  const twoPersonPolicies = fields.household_size === 2 &&
    policies.length === 2;
  const threePersonPolicies = fields.household_size === 3 &&
    policies.length === 3;
  const twoStateFamilyPolicies = twoPersonPolicies &&
    new Set(policies.map((policy) => policy.coverage_state)).size === 2;
  const dependentMagi = reconcileDependentMagi(
    fields.household_size,
    fields.dependents_modified_agi,
    pending?.general,
  );
  const householdIncome = form1040.data.line11_agi + dependentMagi;
  const povertyLine = reconcilePovertyTable(fields, context);
  if (
    policies.length > 1 &&
    householdIncome < 4 * povertyLine &&
    (!general.success ||
      general.data.filing_status !== SourceFilingStatus.Single ||
      general.data.taxpayer_ssn?.replaceAll("-", "") !==
        context.filer.primarySSN.replaceAll("-", "") ||
      general.data.taxpayer_can_be_claimed_as_dependent !== false ||
      (general.data.dependents?.length ?? 0) !==
        (fields.household_size === 1 ? 0 : fields.household_size === 2 ? 1 : 2))
  ) {
    throw new Error(
      "Form 8962 below-400% multi-policy credit needs sourced single-filer eligibility",
    );
  }
  const incomeAmounts = simplePolicyIncomeAmounts(
    householdIncome,
    povertyLine,
    fields.household_size,
    policies.length,
    general.success &&
      general.data.ptc_below_100_fpl_status?.basis ===
        "marketplace_estimate" &&
      (fields.total_advance_ptc ?? 0) > 0,
    twoPersonPolicies || threePersonPolicies,
  );
  if (
    context.filer.filingStatus !== FilingStatus.Single ||
    context.filer.address.foreignCountry ||
    policies.length < 1 ||
    policies.length > 12 ||
    (policies.length > 2 && fields.household_size !== 1 &&
      !threePersonPolicies) ||
    (interstateMove &&
      (fields.household_size !== 1 ||
        policies.length !== residenceStates?.length)) ||
    policyNumbers.some((number) => !number) ||
    new Set(policyNumbers).size !== policyNumbers.length ||
    source.data.alternative_marriage_month !== undefined ||
    policies.some((policy) =>
      policy.alternative_marriage_owner !== undefined ||
      (interstateMove
        ? !residenceStates?.includes(policy.coverage_state ?? "")
        : twoPersonPolicies
        ? !policy.coverage_state
        : policy.coverage_state !== context.filer?.address.state) ||
      !policy.monthly_premiums || !policy.monthly_slcsps ||
      !policy.monthly_aptcs || policy.shared_policy_periods ||
      (!interstateMove && policy.slcsp_corrections &&
        !(fields.household_size === 1 && policies.length <= 4)) ||
      (!interstateMove && policy.slcsp_review_periods)
    ) ||
    fields.qsehra_ind === true || fields.mfs_exception_ind === true ||
    (fields.shared_policy_allocations?.length ?? 0) > 0 ||
    fields.alternative_marriage_primary || fields.alternative_marriage_spouse ||
    rows == null || rows.length !== 12 ||
    (fields.household_size !== 1 && fields.household_size !== 2 &&
      fields.household_size !== 3) ||
    (fields.household_size === 3 && !threePersonPolicies) ||
    fields.annual_premium !== undefined ||
    fields.annual_slcsp !== undefined ||
    fields.annual_aptc !== undefined ||
    fields.annual_ptc_allowed !== undefined ||
    pending?.form2555 !== undefined
  ) {
    throw new Error(
      "Form 8962 monthly filing supports identified family policies, same-state one-person policies, or a verified interstate move",
    );
  }
  if (twoPersonPolicies) {
    const dependent = general.success && general.data.dependents?.length === 1
      ? general.data.dependents[0]
      : undefined;
    const taxpayerSsn = general.success
      ? general.data.taxpayer_ssn?.replaceAll("-", "")
      : undefined;
    const coveredSsns = policies.flatMap((policy) =>
      policy.covered_individual_ssns?.map((ssn) => ssn.replaceAll("-", "")) ??
        []
    );
    if (
      !dependent?.ssn || dependent.dependent_on_another_return === true ||
      taxpayerSsn !== context.filer.primarySSN.replaceAll("-", "") ||
      policies.some((policy) => policy.covered_individual_ssns?.length !== 1) ||
      new Set(coveredSsns).size !== 2 ||
      !coveredSsns.includes(taxpayerSsn) ||
      !coveredSsns.includes(dependent.ssn.replaceAll("-", ""))
    ) {
      throw new Error(
        "Form 8962 monthly two-person policies need distinct taxpayer and claimed-dependent covered people",
      );
    }
    const taxpayerPolicy = policies.find((policy) =>
      policy.covered_individual_ssns?.[0]?.replaceAll("-", "") === taxpayerSsn
    );
    const taxpayerState = context.filer.address.state;
    const taxpayerInAlaskaOrHawaii = taxpayerState === "AK" ||
      taxpayerState === "HI";
    const verifiedSingleStateResidence = general.success &&
      general.data.ptc_residence_states_2025?.length === 1 &&
      general.data.ptc_residence_states_2025[0] === taxpayerState &&
      general.data.ptc_residence_months_2025?.length === 12 &&
      general.data.ptc_residence_months_2025.every((state) =>
        state === taxpayerState
      );
    const supportedFamilyStates = taxpayerInAlaskaOrHawaii
      ? verifiedSingleStateResidence &&
        policies.every((policy) =>
          policy === taxpayerPolicy ||
          CONTIGUOUS_STATES.has(policy.coverage_state ?? "")
        )
      : fields.fpl_region === "contiguous" &&
        policies.every((policy) =>
          CONTIGUOUS_STATES.has(policy.coverage_state ?? "")
        );
    if (
      taxpayerPolicy?.coverage_state !== taxpayerState ||
      (twoStateFamilyPolicies && !supportedFamilyStates)
    ) {
      throw new Error(
        "Form 8962 different-state family policies need the taxpayer policy in the verified filing state and a supported poverty region",
      );
    }
  }
  if (threePersonPolicies) {
    const dependents = general.success ? general.data.dependents ?? [] : [];
    const taxpayerSsn = general.success
      ? general.data.taxpayer_ssn?.replaceAll("-", "")
      : undefined;
    const familySsns = [
      taxpayerSsn,
      ...dependents.map((dependent) => dependent.ssn?.replaceAll("-", "")),
    ];
    const coveredSsns = policies.flatMap((policy) =>
      policy.covered_individual_ssns?.map((ssn) => ssn.replaceAll("-", "")) ??
        []
    );
    if (
      dependents.length !== 2 ||
      dependents.some((dependent) =>
        !dependent.ssn || dependent.dependent_on_another_return === true
      ) ||
      !taxpayerSsn ||
      taxpayerSsn !== context.filer.primarySSN.replaceAll("-", "") ||
      new Set(familySsns).size !== 3 ||
      policies.some((policy) =>
        policy.coverage_state !== context.filer?.address.state ||
        policy.covered_individual_ssns?.length !== 1
      ) ||
      new Set(coveredSsns).size !== 3 ||
      familySsns.some((ssn) => !ssn || !coveredSsns.includes(ssn))
    ) {
      throw new Error(
        "Form 8962 monthly three-person policies need distinct taxpayer and two claimed-dependent covered people in one state",
      );
    }
  }
  if (fields.household_size === 1) {
    reconcileSinglePersonPolicyIdentity(policies, context.filer.primarySSN);
  } else {
    reconcileOnePolicyDependentIdentity(
      policies,
      fields.household_size,
      pending?.general,
      context.filer.primarySSN,
    );
  }
  if (
    (form1040.data.line2a_tax_exempt ?? 0) !== 0 ||
    (form1040.data.line6a_ss_gross ?? 0) !==
      (form1040.data.line6b_ss_taxable ?? 0) ||
    fields.taxpayer_modified_agi !== form1040.data.line11_agi ||
    fields.household_income !== householdIncome ||
    fields.federal_poverty_line !== povertyLine ||
    fields.federal_poverty_pct !== incomeAmounts.povertyPct ||
    fields.applicable_figure !== incomeAmounts.figure
  ) {
    throw new Error(
      "Form 8962 household income and above-400%-FPL contribution must reconcile to finalized Form 1040",
    );
  }
  if (interstateMove) {
    if (residenceStates?.length === 3) {
      const moveIndexes = residenceMonths.flatMap((state, index) =>
        index > 0 && state !== residenceMonths[index - 1] ? [index] : []
      );
      const policyStates = policies.map((policy) => policy.coverage_state);
      if (
        moveIndexes.length !== 2 ||
        new Set(policyStates).size !== 3 ||
        residenceStates.some((state) => !policyStates.includes(state)) ||
        policies.some((policy) => policy.slcsp_corrections !== undefined) ||
        policies.some((policy) => {
          const moveIndex = moveIndexes.find((index) =>
            residenceMonths[index] === policy.coverage_state
          );
          if (moveIndex === undefined) {
            return policy.slcsp_review_periods !== undefined;
          }
          const nextMove = moveIndexes.find((index) => index > moveIndex);
          const reviews = policy.slcsp_review_periods;
          return reviews?.length !== 1 ||
            reviews[0].reason !== "move" ||
            reviews[0].reported_to_marketplace !== true ||
            reviews[0].start_month !== moveIndex + 1 ||
            reviews[0].end_month !== (nextMove ?? 12);
        })
      ) {
        throw new Error(
          "Form 8962 three-state move needs one reported Marketplace review on each distinct arrival policy and no corrected SLCSP",
        );
      }
    } else {
      const moveIndex = residenceMonths.findIndex((monthState, index) =>
        index > 0 && monthState !== residenceMonths[index - 1]
      );
      const arrivalState = residenceMonths[moveIndex];
      const arrivalPolicy = policies.find((policy) =>
        policy.coverage_state === arrivalState
      );
      const reviews = arrivalPolicy?.slcsp_review_periods;
      const review = reviews?.[0];
      const arrivalCorrections = arrivalPolicy?.slcsp_corrections;
      const correctedMove = arrivalCorrections !== undefined;
      if (
        moveIndex < 1 || reviews?.length !== 1 ||
        review?.reason !== "move" ||
        review?.reported_to_marketplace !== !correctedMove ||
        review?.start_month !== moveIndex + 1 ||
        review?.end_month !== 12 ||
        policies.some((policy) =>
          policy !== arrivalPolicy &&
          (policy.slcsp_review_periods !== undefined ||
            policy.slcsp_corrections !== undefined)
        )
      ) {
        throw new Error(
          "Form 8962 interstate move needs a matching Marketplace move review on the arrival policy",
        );
      }
      if (correctedMove) {
        const correctedMonths = new Set(
          arrivalCorrections.map((item) => item.month),
        );
        const coveredMonths = arrivalPolicy!.monthly_premiums!.flatMap((
          amount,
          index,
        ) =>
          amount > 0 || arrivalPolicy!.monthly_aptcs![index] > 0
            ? [index + 1]
            : []
        );
        if (
          arrivalCorrections.length !== coveredMonths.length ||
          correctedMonths.size !== coveredMonths.length ||
          coveredMonths.some((month) =>
            month < moveIndex + 1 || !correctedMonths.has(month)
          ) ||
          arrivalCorrections.some((item) =>
            item.basis !== "move" || item.corrected_slcsp <= 0 ||
            !item.determination_reference ||
            !item.determination_record_sha256 ||
            !item.determined_on || !validIsoDate(item.determined_on) ||
            item.determined_on <
              `2025-${String(item.month).padStart(2, "0")}-01` ||
            item.determined_on > "2026-04-15"
          )
        ) {
          throw new Error(
            "Form 8962 unreported interstate move needs a complete sourced Marketplace SLCSP correction for each covered arrival month",
          );
        }
      }
    }
  }
  if (!interstateMove) {
    const correctedPolicies = policies.filter((policy) =>
      policy.slcsp_corrections !== undefined
    );
    if (correctedPolicies.length > 0) {
      if (
        fields.household_size !== 1 || policies.length < 1 ||
        policies.length > 4 ||
        correctedPolicies.some((policy) => {
          const corrections = policy.slcsp_corrections ?? [];
          return corrections.length < 1 ||
            new Set(corrections.map((correction) => correction.month)).size !==
              corrections.length ||
            corrections.some((correction) => {
              const index = correction.month - 1;
              return correction.basis !== "marketplace_error" ||
                !correction.determination_reference ||
                !correction.determination_record_sha256 ||
                !correction.determined_on ||
                !validIsoDate(correction.determined_on) ||
                correction.determined_on <
                  `2025-${String(correction.month).padStart(2, "0")}-01` ||
                correction.determined_on > "2026-04-15" ||
                (policy.monthly_premiums?.[index] ?? 0) <= 0 ||
                (policy.monthly_aptcs?.[index] ?? 0) <= 0 ||
                (policy.monthly_slcsps?.[index] ?? 0) <= 0 ||
                correction.corrected_slcsp <= 0 ||
                correction.corrected_slcsp === policy.monthly_slcsps?.[index];
            });
        }) ||
        policies.some((item) => item.slcsp_review_periods !== undefined)
      ) {
        throw new Error(
          "Form 8962 same-state policies need sourced Marketplace-error SLCSP corrections on distinct covered APTC months",
        );
      }
    }
  }
  const annualContribution = Math.round(householdIncome * incomeAmounts.figure);
  const monthlyContribution = Math.round(annualContribution / 12);
  if (
    fields.annual_applicable_contribution !== annualContribution ||
    fields.monthly_applicable_contribution !== monthlyContribution
  ) {
    throw new Error(
      "Form 8962 applicable contribution differs from finalized household income",
    );
  }
  for (const policy of policies) {
    for (
      const [monthlyKey, annualKey] of [
        ["monthly_premiums", "annual_premium"],
        ["monthly_slcsps", "annual_slcsp"],
        ["monthly_aptcs", "annual_aptc"],
      ] as const
    ) {
      const reported = policy[annualKey];
      const monthly = policy[monthlyKey];
      if (!monthly) {
        throw new Error(
          "Form 8962 needs all three Form 1095-A monthly columns",
        );
      }
      if (
        reported !== undefined &&
        Math.abs(reported - monthly.reduce((sum, amount) => sum + amount, 0)) >
          0.01
      ) {
        throw new Error(
          `Form 8962 Form 1095-A ${annualKey} differs from its monthly column`,
        );
      }
    }
  }
  const activePolicyNumbers = new Set<string>();
  let previousPolicyNumber: string | undefined;
  let switches = 0;
  for (const [index, row] of rows.entries()) {
    const active = policies.filter((policy) =>
      (policy.monthly_premiums?.[index] ?? 0) > 0 ||
      (policy.monthly_slcsps?.[index] ?? 0) > 0 ||
      (policy.monthly_aptcs?.[index] ?? 0) > 0
    );
    // A month with no Marketplace coverage is blank even when two policies
    // cover different portions of the year. The chronological switch and
    // policy-identity checks below still apply to every covered month.
    if (active.length === 0) {
      if (
        row.month_code !== MONTH_CODES[index] || row.premium !== 0 ||
        row.slcsp !== 0 || row.aptc !== 0 ||
        row.contribution !== monthlyContribution ||
        row.max_assistance !== 0 || row.allowed_credit !== 0
      ) {
        throw new Error(
          `Form 8962 uncovered month ${
            index + 1
          } must have zero policy and credit amounts`,
        );
      }
      continue;
    }
    // This three-person route covers the whole verified family together in
    // each active month. A partial family enrollment changes the applicable
    // SLCSP and needs a separately verified coverage-family calculation.
    if (threePersonPolicies && active.length !== 3) {
      throw new Error(
        `Form 8962 month ${
          index + 1
        } three-person policies must cover the same months`,
      );
    }
    if (
      active.length !== 1 &&
      !(twoPersonPolicies && active.length === 2) &&
      !(threePersonPolicies && active.length === 3)
    ) {
      throw new Error(
        `Form 8962 month ${
          index + 1
        } needs exactly one active Marketplace policy in this bounded route`,
      );
    }
    const policy = active[0];
    if (!policy?.policy_number) {
      throw new Error(
        "Form 8962 needs an identified active Marketplace policy",
      );
    }
    if (
      interstateMove &&
      (policy.coverage_state !== residenceMonths?.[index] ||
        !residenceStates?.includes(policy.coverage_state ?? ""))
    ) {
      throw new Error(
        `Form 8962 month ${
          index + 1
        } policy state differs from verified residence`,
      );
    }
    if (!twoPersonPolicies && !threePersonPolicies) {
      if (
        previousPolicyNumber && previousPolicyNumber !== policy.policy_number
      ) {
        switches += 1;
      }
      previousPolicyNumber = policy.policy_number;
    }
    for (const activePolicy of active) {
      activePolicyNumbers.add(activePolicy.policy_number!);
    }
    const premium = active.reduce(
      (sum, activePolicy) =>
        sum + (activePolicy.monthly_premiums?.[index] ?? 0),
      0,
    );
    const correctedSlcsp = policy.slcsp_corrections?.find((item) =>
      item.month === index + 1
    )?.corrected_slcsp;
    const slcsp = twoStateFamilyPolicies && active.length === 2
      ? active.reduce(
        (sum, activePolicy) =>
          sum + (activePolicy.monthly_slcsps?.[index] ?? 0),
        0,
      )
      : correctedSlcsp ?? policy.monthly_slcsps?.[index];
    const aptc = active.reduce(
      (sum, activePolicy) => sum + (activePolicy.monthly_aptcs?.[index] ?? 0),
      0,
    );
    if (premium === undefined || slcsp === undefined || aptc === undefined) {
      throw new Error("Form 8962 needs all three Form 1095-A monthly columns");
    }
    const filedPremium = roundForm8962Amounts(
      active.map((activePolicy) => activePolicy.monthly_premiums![index]),
    );
    const filedSlcsp = roundForm8962Amounts(
      twoStateFamilyPolicies && active.length === 2
        ? active.map((activePolicy) => activePolicy.monthly_slcsps![index])
        : [correctedSlcsp ?? policy.monthly_slcsps![index]],
    );
    const filedAptc = roundForm8962Amounts(
      active.map((activePolicy) => activePolicy.monthly_aptcs![index]),
    );
    if (
      active.length > 1 &&
      active.some((activePolicy) =>
        (twoStateFamilyPolicies
          ? (activePolicy.monthly_slcsps?.[index] ?? 0) <= 0
          : activePolicy.monthly_slcsps?.[index] !== slcsp) ||
        (activePolicy.monthly_premiums?.[index] ?? 0) <= 0 ||
        (activePolicy.monthly_aptcs?.[index] ?? 0) <= 0
      )
    ) {
      throw new Error(
        `Form 8962 month ${
          index + 1
        } overlapping family policies need positive premiums and APTC, and the same positive SLCSP within a state`,
      );
    }
    const maxAssistance = Math.max(0, filedSlcsp - monthlyContribution);
    if (
      row.month_code !== MONTH_CODES[index] || row.premium !== filedPremium ||
      row.slcsp !== filedSlcsp || row.aptc !== filedAptc ||
      row.contribution !== monthlyContribution ||
      row.max_assistance !== maxAssistance ||
      row.allowed_credit !== Math.min(filedPremium, maxAssistance) ||
      premium <= 0 || slcsp <= 0 || aptc <= 0
    ) {
      throw new Error(
        `Form 8962 month ${
          index + 1
        } differs from its Form 1095-A policy or calculated PTC`,
      );
    }
  }
  if (activePolicyNumbers.size !== policies.length) {
    throw new Error(
      "Form 8962 monthly filing needs a covered month for every source policy",
    );
  }
  if (interstateMove && switches !== residenceStates!.length - 1) {
    throw new Error(
      "Form 8962 interstate move needs one chronological policy switch per residence change",
    );
  }
  const credit = Math.round(rows.reduce(
    (sum, row) => sum + (row.allowed_credit ?? 0),
    0,
  ));
  const advance = rows.reduce((sum, row) => sum + (row.aptc ?? 0), 0);
  const net = Math.max(0, credit - advance);
  const excess = Math.max(0, advance - credit);
  const repayment = Math.min(excess, incomeAmounts.repaymentCap ?? excess);
  if (
    fields.total_premium_tax_credit !== credit ||
    fields.total_advance_ptc !== advance ||
    (fields.net_premium_tax_credit ?? 0) !== net ||
    (fields.excess_advance_payment ?? 0) !== excess ||
    (fields.excess_advance_premium ?? 0) !== repayment ||
    fields.repayment_limitation !==
      (excess > 0 ? incomeAmounts.repaymentCap : undefined)
  ) {
    throw new Error(
      "Form 8962 lines 24 through 29 differ from sourced monthly policy totals",
    );
  }
  const schedule2 = schedule2Schema.safeParse(pending?.schedule2);
  const schedule3 = schedule3Schema.safeParse(pending?.schedule3);
  if (
    (repayment > 0 && (
      !schedule2.success ||
      schedule2.data.line1a_excess_advance_premium !== repayment ||
      form1040.data.line17_additional_taxes !== repayment
    )) ||
    (net > 0 && (
      !schedule3.success ||
      schedule3.data.line9_premium_tax_credit !== net ||
      form1040.data.line31_additional_payments !== net
    )) ||
    (repayment === 0 && schedule2.success &&
      (schedule2.data.line1a_excess_advance_premium ?? 0) !== 0) ||
    (net === 0 && schedule3.success &&
      (schedule3.data.line9_premium_tax_credit ?? 0) !== 0)
  ) {
    throw new Error(
      "Form 8962 net credit or repayment differs from finalized Schedule 2/3 and Form 1040",
    );
  }
}

function reconcileMfsSharedPolicy(
  fields: Input,
  context?: MefBuildContext,
): void {
  const pending = context?.pending;
  const source = form1095aSchema.safeParse(pending?.f1095a);
  const general = generalSchema.safeParse(pending?.general);
  const form1040 = returnSchema.safeParse(pending?.f1040);
  const rows = fields.monthly_ptc_rows;
  const allocations = fields.shared_policy_allocations ?? [];
  if (
    !context?.filer || !source.success || !general.success ||
    !form1040.success || !Array.isArray(rows) || rows.length !== 12 ||
    context.filer.filingStatus !== FilingStatus.MarriedFilingSeparately ||
    context.filer.address.foreignCountry ||
    general.data.filing_status !== SourceFilingStatus.MFS ||
    general.data.ptc_mfs_status?.policy_scope !== "shared_with_spouse" ||
    general.data.taxpayer_ssn?.replaceAll("-", "") !==
      context.filer.primarySSN.replaceAll("-", "") ||
    !general.data.spouse_ssn ||
    (general.data.dependents?.length ?? 0) !== 0 ||
    fields.household_size !== 1 ||
    fields.dependents_modified_agi !== 0 ||
    fields.qsehra_ind === true ||
    fields.alternative_marriage_primary || fields.alternative_marriage_spouse ||
    source.data.alternative_marriage_month !== undefined ||
    pending?.form2555 !== undefined ||
    allocations.length !== 1
  ) {
    throw new Error(
      "Form 8962 shared MFS filing needs one identified spouse policy and a finalized one-person return",
    );
  }
  const status = general.data.ptc_mfs_status!;
  const exception = status.basis !== "no_exception";
  const allocation = allocations[0];
  const policy = current1095AStatements(source.data.f1095as)[0];
  const period = policy?.shared_policy_periods?.[0];
  const filerSsn = context.filer.primarySSN.replaceAll("-", "");
  const spouseSsn = general.data.spouse_ssn.replaceAll("-", "");
  const covered = policy?.covered_individual_ssns?.map((ssn) =>
    ssn.replaceAll("-", "")
  );
  if (
    current1095AStatements(source.data.f1095as).length !== 1 ||
    !policy?.policy_number ||
    policy.policy_number.slice(-15) !== allocation.policy_number ||
    policy.coverage_state !== context.filer.address.state ||
    policy.alternative_marriage_owner !== undefined ||
    policy.slcsp_corrections || policy.slcsp_review_periods ||
    !policy.monthly_premiums || !policy.monthly_slcsps ||
    !policy.monthly_aptcs ||
    policy.shared_policy_periods?.length !== 1 ||
    covered?.length !== 2 || new Set(covered).size !== 2 ||
    !covered.includes(filerSsn) || !covered.includes(spouseSsn) ||
    (!period || !("other_taxpayer_ssn" in period) ||
      period.other_taxpayer_ssn.replaceAll("-", "") !== spouseSsn) ||
    period?.start_month !== 1 || period?.end_month !== 12 ||
    allocation.other_taxpayer_ssn !== spouseSsn ||
    allocation.start_month !== 1 || allocation.end_month !== 12 ||
    allocation.aptc_pct !== 0.5 ||
    allocation.slcsp_pct !== undefined ||
    (exception
      ? period?.basis !== "mfs_exception" ||
        allocation.basis !== "mfs_exception" ||
        allocation.premium_pct !== 0.5 ||
        fields.mfs_exception_ind !== true
      : period?.basis !== "mfs_no_exception" ||
        allocation.basis !== "mfs_no_exception" ||
        allocation.premium_pct !== undefined ||
        fields.mfs_exception_ind === true ||
        status.exception_reviewed !== true ||
        status.no_one_can_claim_taxpayer !== true ||
        status.all_covered_individuals_lawfully_present !== true ||
        status.no_self_employed_health_insurance_deduction !== true)
  ) {
    throw new Error(
      "Form 8962 shared MFS allocation differs from the identified spouse policy",
    );
  }
  const povertyLine = reconcilePovertyTable(fields, context);
  const derivedSource = f1095a.compute(
    { taxYear: 2025, formType: "f1040" },
    source.data,
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  if (!derivedSource) {
    throw new Error(
      "Form 8962 shared MFS policy has no allocated source amounts",
    );
  }
  const derivedInput = form8962InputSchema.parse({
    ...derivedSource,
    taxpayer_modified_agi: form1040.data.line11_agi,
    dependents_modified_agi: 0,
    household_size: 1,
    fpl_region: fields.fpl_region,
    filing_status: SourceFilingStatus.MFS,
    mfs_ptc_status: status,
    dependent_income_complete: true,
  });
  const expected = form8962Calculation.compute(
    { taxYear: 2025, formType: "f1040" },
    derivedInput,
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  if (
    !expected || fields.federal_poverty_line !== povertyLine ||
    (form1040.data.line2a_tax_exempt ?? 0) !== 0 ||
    (form1040.data.line6a_ss_gross ?? 0) !==
      (form1040.data.line6b_ss_taxable ?? 0) ||
    Object.entries(expected).some(([key, value]) =>
      JSON.stringify(fields[key]) !== JSON.stringify(value)
    )
  ) {
    throw new Error(
      "Form 8962 shared MFS amounts differ from source allocation and calculated credit",
    );
  }
  const net = typeof expected.net_premium_tax_credit === "number"
    ? expected.net_premium_tax_credit
    : 0;
  const excess = typeof expected.excess_advance_premium === "number"
    ? expected.excess_advance_premium
    : 0;
  const schedule2 = schedule2Schema.safeParse(pending?.schedule2);
  const schedule3 = schedule3Schema.safeParse(pending?.schedule3);
  if (
    (net > 0 && (!schedule3.success ||
      schedule3.data.line9_premium_tax_credit !== net ||
      form1040.data.line31_additional_payments !== net)) ||
    (excess > 0 && (!schedule2.success ||
      schedule2.data.line1a_excess_advance_premium !== excess ||
      form1040.data.line17_additional_taxes !== excess)) ||
    (net === 0 && pending?.schedule3 !== undefined) ||
    (excess === 0 && pending?.schedule2 !== undefined)
  ) {
    throw new Error(
      "Form 8962 shared MFS credit or repayment differs from finalized return",
    );
  }
}

function reconcileAgreedSharedPolicy(
  fields: Input,
  context?: MefBuildContext,
): void {
  const pending = context?.pending;
  const source = form1095aSchema.safeParse(pending?.f1095a);
  const form1040 = returnSchema.safeParse(pending?.f1040);
  const general = generalSchema.safeParse(pending?.general);
  const allocations = fields.shared_policy_allocations ?? [];
  if (allocations.length === 1 && allocations[0].basis === "no_aptc") {
    reconcileNoAptcSharedPolicy(fields, context);
    return;
  }
  const rows = fields.monthly_ptc_rows;
  if (
    !context?.filer || !source.success || !form1040.success ||
    !general.success || !Array.isArray(rows) || rows.length !== 12 ||
    context.filer.filingStatus !== FilingStatus.Single ||
    context.filer.address.foreignCountry ||
    fields.household_size !== 1 ||
    general.data.taxpayer_ssn?.replaceAll("-", "") !==
      context.filer.primarySSN.replaceAll("-", "") ||
    (general.data.dependents?.length ?? 0) !== 0 ||
    source.data.alternative_marriage_month !== undefined ||
    fields.qsehra_ind === true || fields.mfs_exception_ind === true ||
    fields.alternative_marriage_primary || fields.alternative_marriage_spouse ||
    pending?.form2555 !== undefined ||
    allocations.length < 1 || allocations.length > 5 ||
    allocations.some((allocation) =>
      (allocation.basis !== "other_agreed" &&
        allocation.basis !== "divorce_agreed") ||
      allocation.premium_pct === undefined ||
      allocation.premium_pct <= 0 ||
      allocation.premium_pct !== allocation.slcsp_pct ||
      allocation.premium_pct !== allocation.aptc_pct
    )
  ) {
    throw new Error(
      "Form 8962 shared filing needs reviewed nonoverlapping periods, two covered taxpayers, and a finalized one-person single return",
    );
  }
  const policies = current1095AStatements(source.data.f1095as);
  const policy = policies[0];
  const filerSsn = context.filer.primarySSN.replaceAll("-", "");
  const covered = policy?.covered_individual_ssns?.map((ssn) =>
    ssn.replaceAll("-", "")
  );
  const sharedSourcePeriods = policy?.shared_policy_periods?.filter((period) =>
    period.basis !== "family_only"
  );
  const familyOnlyPeriods = policy?.shared_policy_periods?.filter((period) =>
    period.basis === "family_only"
  );
  if (
    policies.length !== 1 || !policy?.policy_number ||
    allocations.some((allocation) =>
      policy.policy_number!.slice(-15) !== allocation.policy_number
    ) ||
    policy.coverage_state !== context.filer.address.state ||
    policy.alternative_marriage_owner !== undefined ||
    policy.slcsp_corrections || policy.slcsp_review_periods ||
    !policy.monthly_premiums || !policy.monthly_slcsps ||
    !policy.monthly_aptcs ||
    sharedSourcePeriods?.length !== allocations.length ||
    sharedSourcePeriods.some((period, index) =>
      period.basis !== allocations[index].basis
    ) ||
    (familyOnlyPeriods?.length ?? 0) > 1 ||
    familyOnlyPeriods?.some((period) =>
      period.only_tax_family_covered !== true
    ) ||
    covered?.length !== 2 || new Set(covered).size !== 2 ||
    !covered.includes(filerSsn) ||
    allocations.some((allocation, index) => {
      if (allocation.other_taxpayer_ssn === filerSsn) return true;
      const period = sharedSourcePeriods?.[index];
      const review = period?.basis === "other_agreed"
        ? period.other_family_claim_review
        : undefined;
      if (covered?.includes(allocation.other_taxpayer_ssn)) {
        return review !== undefined;
      }
      // The other Part IV taxpayer can claim a covered dependent without
      // being an enrollee. Bind the recipient, covered person, tax-family
      // review, Marketplace enrollment, and agreed percentage to this policy.
      return allocation.basis !== "other_agreed" || !review ||
        allocations.length !== 1 || allocation.start_month !== 1 ||
        allocation.end_month !== 12 ||
        !policy.monthly_premiums?.every((amount) => amount > 0) ||
        !policy.monthly_aptcs?.every((amount) => amount > 0) ||
        policy.recipient_ssn?.replaceAll("-", "") !== filerSsn ||
        !covered?.includes(review.covered_individual_ssn.replaceAll("-", "")) ||
        review.covered_individual_ssn.replaceAll("-", "") === filerSsn ||
        review.other_taxpayer_ssn.replaceAll("-", "") !==
          allocation.other_taxpayer_ssn ||
        review.policy_number !== policy.policy_number ||
        review.filer_allocation_pct !== allocation.premium_pct ||
        !review.marketplace_enrollment_reference ||
        !review.tax_family_review_reference ||
        !review.allocation_agreement_reference;
    })
  ) {
    throw new Error(
      "Form 8962 agreed shared policy must match the source policy, covered family member, and other allocating taxpayer",
    );
  }
  const changedSituation4Percentage = allocations.length > 1 &&
    allocations.every((row) => row.basis === "other_agreed") &&
    new Set(allocations.map((row) => row.premium_pct)).size > 1;
  if (changedSituation4Percentage) {
    const reviews = allocations.map((allocation) => {
      const matches = sharedSourcePeriods?.filter((period) =>
        period.basis === "other_agreed" &&
        period.other_taxpayer_ssn.replaceAll("-", "") ===
          allocation.other_taxpayer_ssn &&
        period.start_month === allocation.start_month &&
        period.end_month === allocation.end_month &&
        period.allocation_pct === allocation.premium_pct
      ) ?? [];
      const matched = matches.length === 1 ? matches[0] : undefined;
      return matched?.basis === "other_agreed"
        ? matched.agreement_review
        : undefined;
    });
    if (
      policy.recipient_ssn?.replaceAll("-", "") !== filerSsn ||
      reviews.some((review, index) => {
        const allocation = allocations[index];
        return !review ||
          review.policy_number !== policy.policy_number ||
          review.filer_ssn.replaceAll("-", "") !== filerSsn ||
          review.other_taxpayer_ssn.replaceAll("-", "") !==
            allocation.other_taxpayer_ssn ||
          review.start_month !== allocation.start_month ||
          review.end_month !== allocation.end_month ||
          review.filer_allocation_pct !== allocation.premium_pct;
      }) ||
      new Set(reviews.map((review) => review?.agreement_reference)).size !==
        reviews.length ||
      new Set(reviews.map((review) => review?.agreement_sha256)).size !==
        reviews.length
    ) {
      throw new Error(
        "Form 8962 changed Situation 4 percentages need distinct source agreements for each period",
      );
    }
  }
  const povertyLine = reconcilePovertyTable(fields, context);
  const derivedSource = f1095a.compute(
    { taxYear: 2025, formType: "f1040" },
    source.data,
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  if (!derivedSource) {
    throw new Error("Form 8962 shared policy has no allocated source amounts");
  }
  const derivedInput = form8962InputSchema.parse({
    ...derivedSource,
    taxpayer_modified_agi: form1040.data.line11_agi,
    dependents_modified_agi: 0,
    household_size: 1,
    fpl_region: fields.fpl_region,
    filing_status: SourceFilingStatus.Single,
    dependent_income_complete: true,
  });
  const expected = form8962Calculation.compute(
    { taxYear: 2025, formType: "f1040" },
    derivedInput,
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  if (
    !expected || fields.federal_poverty_line !== povertyLine ||
    Object.entries(expected).some(([key, value]) =>
      JSON.stringify(fields[key]) !== JSON.stringify(value)
    )
  ) {
    throw new Error(
      "Form 8962 shared policy amounts differ from source allocation and calculated credit",
    );
  }
  const net = typeof expected.net_premium_tax_credit === "number"
    ? expected.net_premium_tax_credit
    : 0;
  const excess = typeof expected.excess_advance_premium === "number"
    ? expected.excess_advance_premium
    : 0;
  const schedule2 = schedule2Schema.safeParse(pending?.schedule2);
  const schedule3 = schedule3Schema.safeParse(pending?.schedule3);
  if (
    (net > 0 && (!schedule3.success ||
      schedule3.data.line9_premium_tax_credit !== net ||
      form1040.data.line31_additional_payments !== net)) ||
    (excess > 0 && (!schedule2.success ||
      schedule2.data.line1a_excess_advance_premium !== excess ||
      form1040.data.line17_additional_taxes !== excess))
  ) {
    throw new Error(
      "Form 8962 shared policy credit or repayment differs from finalized return",
    );
  }
}

function reconcileNoAptcSharedPolicy(
  fields: Input,
  context?: MefBuildContext,
): void {
  const pending = context?.pending;
  const source = form1095aSchema.safeParse(pending?.f1095a);
  const general = generalSchema.safeParse(pending?.general);
  const form1040 = returnSchema.safeParse(pending?.f1040);
  const allocations = fields.shared_policy_allocations ?? [];
  const allocation = allocations[0];
  const rows = fields.monthly_ptc_rows;
  if (
    !context?.filer || !source.success || !general.success ||
    !form1040.success || !Array.isArray(rows) || rows.length !== 12 ||
    context.filer.filingStatus !== FilingStatus.Single ||
    context.filer.address.foreignCountry ||
    general.data.filing_status !== SourceFilingStatus.Single ||
    general.data.taxpayer_ssn?.replaceAll("-", "") !==
      context.filer.primarySSN.replaceAll("-", "") ||
    (general.data.dependents?.length ?? 0) !== 0 ||
    fields.household_size !== 1 || fields.dependents_modified_agi !== 0 ||
    fields.qsehra_ind === true || fields.mfs_exception_ind === true ||
    allocations.length !== 1 || allocation?.basis !== "no_aptc" ||
    allocation.premium_pct === undefined ||
    allocation.premium_pct <= 0 ||
    allocation.slcsp_pct !== undefined || allocation.aptc_pct !== undefined ||
    fields.alternative_marriage_primary || fields.alternative_marriage_spouse ||
    source.data.alternative_marriage_month !== undefined ||
    pending?.form2555 !== undefined
  ) {
    throw new Error(
      "Form 8962 no-APTC shared filing needs one reviewed policy and a finalized one-person return",
    );
  }
  const policies = current1095AStatements(source.data.f1095as);
  const policy = policies[0];
  const ssn = context.filer.primarySSN.replaceAll("-", "");
  const covered = policy?.covered_individual_ssns?.map((value) =>
    value.replaceAll("-", "")
  );
  const period = policy?.shared_policy_periods?.[0];
  const coveredMonths =
    policy?.monthly_premiums?.flatMap((amount, index) =>
      amount > 0 ? [index + 1] : []
    ) ?? [];
  if (
    policies.length !== 1 || !policy?.policy_number ||
    policy.policy_number.slice(-15) !== allocation.policy_number ||
    policy.coverage_state !== context.filer.address.state ||
    covered?.length !== 2 || new Set(covered).size !== 2 ||
    !covered.includes(ssn) ||
    !covered.includes(allocation.other_taxpayer_ssn) ||
    allocation.other_taxpayer_ssn === ssn ||
    policy.shared_policy_periods?.length !== 1 ||
    period?.basis !== "no_aptc" ||
    period.other_taxpayer_ssn?.replaceAll("-", "") !==
      allocation.other_taxpayer_ssn ||
    policy.alternative_marriage_owner || policy.slcsp_review_periods ||
    !policy.monthly_premiums || !policy.monthly_aptcs ||
    policy.monthly_aptcs.some((amount) => amount !== 0) ||
    coveredMonths.length === 0 ||
    !policy.slcsp_corrections || !policy.no_aptc_monthly_evidence
  ) {
    throw new Error(
      "Form 8962 no-APTC shared allocation differs from its identified policy",
    );
  }
  const corrections = new Map(
    policy.slcsp_corrections.map((item) => [item.month, item]),
  );
  const payments = new Map(
    policy.no_aptc_monthly_evidence.map((item) => [item.month, item]),
  );
  if (
    corrections.size !== coveredMonths.length ||
    payments.size !== coveredMonths.length ||
    policy.slcsp_corrections.length !== coveredMonths.length ||
    policy.no_aptc_monthly_evidence.length !== coveredMonths.length ||
    coveredMonths.some((month) =>
      !corrections.has(month) || !payments.has(month)
    )
  ) {
    throw new Error(
      "Form 8962 no-APTC shared policy needs reviewed SLCSP and payment evidence for every covered month",
    );
  }
  for (const month of coveredMonths) {
    const correction = corrections.get(month);
    const proof = payments.get(month);
    if (
      !correction || !proof || correction.basis !== "no_aptc" ||
      correction.corrected_slcsp <= 0 ||
      proof.marketplace_slcsp !== correction.corrected_slcsp ||
      proof.marketplace_method !== correction.determination_source ||
      !validIsoDate(proof.marketplace_determined_on) ||
      paidNoAptcPremium(
          proof.premium_payment,
          policy.monthly_premiums[month - 1],
        ) === null
    ) {
      throw new Error(
        `Form 8962 no-APTC shared month ${month} lacks matching SLCSP or timely full payment`,
      );
    }
  }
  const povertyLine = reconcilePovertyTable(fields, context);
  const income = form1040.data.line11_agi + sourcedTaxExemptInterest(
    pending,
    form1040.data.line2a_tax_exempt ?? 0,
  );
  if (
    (form1040.data.line6a_ss_gross ?? 0) !==
      (form1040.data.line6b_ss_taxable ?? 0) ||
    fields.taxpayer_modified_agi !== income ||
    fields.household_income !== income
  ) {
    throw new Error(
      "Form 8962 no-APTC shared income differs from finalized Form 1040",
    );
  }
  const derivedSource = f1095a.compute(
    { taxYear: 2025, formType: "f1040" },
    source.data,
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  if (!derivedSource) {
    throw new Error(
      "Form 8962 no-APTC shared policy has no allocated source amounts",
    );
  }
  const derivedInput = form8962InputSchema.parse({
    ...derivedSource,
    taxpayer_modified_agi: income,
    dependents_modified_agi: 0,
    household_size: 1,
    fpl_region: fields.fpl_region,
    filing_status: SourceFilingStatus.Single,
    dependent_income_complete: true,
  });
  const expected = form8962Calculation.compute(
    { taxYear: 2025, formType: "f1040" },
    derivedInput,
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  if (
    !expected || fields.federal_poverty_line !== povertyLine ||
    Object.entries(expected).some(([key, value]) =>
      JSON.stringify(fields[key]) !== JSON.stringify(value)
    )
  ) {
    throw new Error(
      "Form 8962 no-APTC shared amounts differ from source allocation or calculated credit",
    );
  }
  const net = typeof expected.net_premium_tax_credit === "number"
    ? expected.net_premium_tax_credit
    : 0;
  const schedule3 = schedule3Schema.safeParse(pending?.schedule3);
  const schedule2 = schedule2Schema.safeParse(pending?.schedule2);
  if (
    net <= 0 || fields.total_advance_ptc !== 0 ||
    (fields.excess_advance_premium ?? 0) !== 0 ||
    (schedule2.success &&
      (schedule2.data.line1a_excess_advance_premium ?? 0) !== 0) ||
    !schedule3.success ||
    schedule3.data.line9_premium_tax_credit !== net ||
    form1040.data.line31_additional_payments !== net
  ) {
    throw new Error(
      "Form 8962 no-APTC shared credit differs from finalized return",
    );
  }
}

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["mfs_exception_ind", "MarriedFilingSeparatelyExcInd"],
  ["household_size", "TotalExemptionsCnt"],
  ["taxpayer_modified_agi", "ModifiedAGIAmt"],
  ["dependents_modified_agi", "TotalDependentsModifiedAGIAmt"],
  ["household_income", "HouseholdIncomeAmt"],
  ["federal_poverty_line", "PovertyLevelAmt"],
  ["federal_poverty_pct", "FederalPovertyLevelPct"],
  ["applicable_figure", "ApplicableFigureRt"],
  ["annual_applicable_contribution", "AnnualContributionAmt"],
  ["monthly_applicable_contribution", "MonthlyContriHealthCareCvrAmt"],
  ["total_premium_tax_credit", "TotalPremiumTaxCreditAmt"],
  ["total_advance_ptc", "TotalAdvancedPTCAmt"],
  ["net_premium_tax_credit", "ReconciledPremiumTaxCreditAmt"],
  ["excess_advance_payment", "ExcessAdvncPaymentAmt"],
  ["repayment_limitation", "AdditionalTaxLimitationAmt"],
  ["excess_advance_premium", "PremiumTaxCreditTaxLiabAmt"],
];

function numberElement(tag: string, value: unknown): string {
  return typeof value === "number" ? element(tag, value) : "";
}

function monthlyXml(rows: readonly MonthlyRow[]): string[] {
  return rows.filter((row) =>
    (row.premium ?? 0) > 0 || (row.slcsp ?? 0) > 0 || row.aptc > 0
  )
    .map((row) =>
      elements("MonthlyPTCCalculationGrp", [
        element("MonthCd", row.month_code),
        numberElement("MonthlyPremiumAmt", row.premium),
        numberElement("MonthlyPremiumSLCSPAmt", row.slcsp),
        numberElement("MonthlyContributionAmt", row.contribution),
        numberElement("MonthlyMaxPremiumAssistanceAmt", row.max_assistance),
        numberElement("MonthlyPremiumTaxCreditAllwAmt", row.allowed_credit),
        element("MonthlyAdvancedPTCAmt", row.aptc),
      ])
    );
}

function alternativeMarriageXml(
  tag: string,
  group: AlternativeMarriageGroup | null | undefined,
): string {
  if (!group) return "";
  return elements(tag, [
    element("FamilySizeCnt", group.family_size),
    element("MonthlyContributionAmt", group.monthly_contribution),
    element("StartMonthNumberCd", String(group.start_month).padStart(2, "0")),
    element("EndMonthNumberCd", String(group.end_month).padStart(2, "0")),
  ]);
}

function buildIRS8962(fields: Input, context?: MefBuildContext): string {
  const monthlyRows = fields.monthly_ptc_rows;
  const allocations = fields.shared_policy_allocations ?? [];
  const marriagePrimary = fields.alternative_marriage_primary;
  const marriageSpouse = fields.alternative_marriage_spouse;
  const hasSource = Array.isArray(monthlyRows) ||
    typeof fields.annual_premium === "number" ||
    typeof fields.annual_slcsp === "number" ||
    typeof fields.annual_aptc === "number";
  if (!hasSource) {
    const hasFilingAmount = [
      fields.total_premium_tax_credit,
      fields.total_advance_ptc,
      fields.net_premium_tax_credit,
      fields.excess_advance_payment,
      fields.excess_advance_premium,
      fields.annual_ptc_allowed,
      fields.annual_aptc,
      fields.repayment_limitation,
    ].some((value) => typeof value === "number" && value > 0);
    if (
      hasFilingAmount || allocations.length > 0 || marriagePrimary ||
      marriageSpouse
    ) {
      throw new Error(
        "Form 8962 calculated PTC, APTC, or allocation needs annual or monthly 1095-A source amounts",
      );
    }
    return "";
  }
  if (Array.isArray(monthlyRows) && monthlyRows.length === 0) {
    throw new Error(
      "Form 8962 monthly calculation needs at least one month row",
    );
  }
  if (
    Array.isArray(monthlyRows) &&
    !monthlyRows.some((row) =>
      (row.premium ?? 0) > 0 || (row.slcsp ?? 0) > 0 || row.aptc > 0
    ) &&
    ((fields.total_premium_tax_credit ?? 0) > 0 ||
      (fields.total_advance_ptc ?? 0) > 0 || allocations.length > 0)
  ) {
    throw new Error(
      "Form 8962 positive credit, advance payment, or allocation needs a reportable monthly policy row",
    );
  }
  if (
    typeof fields.household_size !== "number" ||
    typeof fields.taxpayer_modified_agi !== "number" ||
    typeof fields.household_income !== "number" ||
    typeof fields.federal_poverty_line !== "number" ||
    typeof fields.federal_poverty_pct !== "number" ||
    typeof fields.total_premium_tax_credit !== "number" ||
    typeof fields.total_advance_ptc !== "number" ||
    !fields.fpl_region
  ) {
    throw new Error(
      "Form 8962 MeF requires the completed 2025 calculation, not source premiums alone",
    );
  }
  if (
    allocations.length > 99 ||
    (allocations.length > 0 && !Array.isArray(monthlyRows)) ||
    ((marriagePrimary || marriageSpouse) && !Array.isArray(monthlyRows))
  ) {
    throw new Error(
      "Form 8962 Part IV/V needs monthly rows and at most 99 MeF allocations",
    );
  }
  if (
    fields.household_income !== Math.max(
      0,
      fields.taxpayer_modified_agi + (fields.dependents_modified_agi ?? 0),
    )
  ) {
    throw new Error(
      "Form 8962 household income must reconcile to taxpayer and dependent modified AGI",
    );
  }
  if (
    (fields.total_premium_tax_credit ?? 0) > 0 ||
    (fields.total_advance_ptc ?? 0) > 0 ||
    (fields.annual_ptc_allowed ?? 0) > 0 ||
    (fields.annual_aptc ?? 0) > 0 ||
    (fields.net_premium_tax_credit ?? 0) > 0 ||
    (fields.excess_advance_payment ?? 0) > 0 ||
    (fields.excess_advance_premium ?? 0) > 0 ||
    (fields.repayment_limitation ?? 0) > 0 ||
    (monthlyRows?.some((row) =>
      (row.allowed_credit ?? 0) > 0 || row.aptc > 0
    ) ?? false)
  ) {
    if (isBelow100AptcOnly(fields, context)) {
      reconcileBelow100AptcOnly(fields, context);
    } else if (isMfsNoExceptionAptcOnly(context)) {
      reconcileMfsNoExceptionAptcOnly(fields, context);
    } else if (isMfsSharedPolicy(context)) {
      reconcileMfsSharedPolicy(fields, context);
    } else if (Array.isArray(monthlyRows)) {
      if (allocations.length > 0) {
        reconcileAgreedSharedPolicy(fields, context);
      } else if (isNoAptcClaim(context)) {
        const policyCount = form1095aSchema.safeParse(context?.pending?.f1095a);
        const currentPolicyCount = policyCount.success
          ? current1095AStatements(policyCount.data.f1095as).length
          : 0;
        if (
          currentPolicyCount >= 2 && currentPolicyCount <= 12
        ) {
          reconcileMultiNoAptcPolicyMonths(fields, context);
        } else {
          reconcileNoAptcPolicyMonths(fields, context);
        }
      } else {
        reconcileSimplePolicyMonths(fields, context);
      }
    } else {
      if (isNoAptcClaim(context)) {
        const policyCount = form1095aSchema.safeParse(context?.pending?.f1095a);
        if (
          policyCount.success &&
          current1095AStatements(policyCount.data.f1095as).length === 2
        ) {
          reconcileTwoNoAptcAnnualPolicies(fields, context);
        } else {
          reconcileNoAptcAnnualPolicy(fields, context);
        }
      } else {
        reconcileSimpleAnnualPolicy(fields, context);
      }
    }
  }

  const location = fields.fpl_region === "alaska"
    ? "A"
    : fields.fpl_region === "hawaii"
    ? "B"
    : "C";
  const mfsNoException = isMfsNoExceptionAptcOnly(context);
  const annualGroup = Array.isArray(monthlyRows) ? [] : [
    elements("AnnualPTCCalculationGrp", [
      numberElement(
        "AnnualPremiumAmt",
        mfsNoException ? undefined : fields.annual_premium,
      ),
      numberElement(
        "AnnualPremiumSLCSPAmt",
        mfsNoException ? undefined : fields.annual_slcsp,
      ),
      numberElement(
        "AnnualContributionAmt",
        mfsNoException ? undefined : fields.annual_applicable_contribution,
      ),
      numberElement(
        "AnnualMaxPremiumAssistanceAmt",
        mfsNoException ? undefined : fields.annual_max_ptc,
      ),
      numberElement(
        "AnnualPremiumTaxCreditAllwAmt",
        mfsNoException ? undefined : fields.annual_ptc_allowed,
      ),
      numberElement("AnnualAdvancedPTCAmt", fields.annual_aptc),
    ]),
  ];
  return elements("IRS8962", [
    element("QSEHRAInd", fields.qsehra_ind === true ? "true" : "false"),
    fields.mfs_exception_ind === true
      ? element("MarriedFilingSeparatelyExcInd", "X")
      : "",
    element("TotalExemptionsCnt", fields.household_size),
    element("ModifiedAGIAmt", fields.taxpayer_modified_agi),
    numberElement(
      "TotalDependentsModifiedAGIAmt",
      fields.dependents_modified_agi,
    ),
    element("HouseholdIncomeAmt", fields.household_income),
    element("PovertyLevelAmt", fields.federal_poverty_line),
    element("FederalPovertyTableLocCd", location),
    element("FederalPovertyLevelPct", fields.federal_poverty_pct),
    fields.federal_poverty_pct === 401
      ? element("FederalPovertyLevelPct401Ind", "true")
      : "",
    typeof fields.applicable_figure === "number"
      ? element("ApplicableFigureRt", fields.applicable_figure.toFixed(4))
      : "",
    numberElement(
      "AnnualContributionAmt",
      fields.annual_applicable_contribution,
    ),
    numberElement(
      "MonthlyContriHealthCareCvrAmt",
      fields.monthly_applicable_contribution,
    ),
    allocations.length > 0 || marriagePrimary || marriageSpouse
      ? element("SharePolicyMarriedAltCalcInd", "true")
      : "",
    element(
      "FullYrCoverage1095AInd",
      Array.isArray(monthlyRows) ? "false" : "true",
    ),
    ...(Array.isArray(monthlyRows) ? monthlyXml(monthlyRows) : annualGroup),
    element("TotalPremiumTaxCreditAmt", fields.total_premium_tax_credit),
    element("TotalAdvancedPTCAmt", fields.total_advance_ptc),
    numberElement(
      "ReconciledPremiumTaxCreditAmt",
      fields.net_premium_tax_credit,
    ),
    numberElement("ExcessAdvncPaymentAmt", fields.excess_advance_payment),
    numberElement("AdditionalTaxLimitationAmt", fields.repayment_limitation),
    numberElement("PremiumTaxCreditTaxLiabAmt", fields.excess_advance_premium),
    ...allocations.map((row) =>
      elements("SharedPolicyAllocationGrp", [
        element("PolicyNum", row.policy_number),
        element("SSN", row.other_taxpayer_ssn),
        element("StartMonthNumberCd", String(row.start_month).padStart(2, "0")),
        element("EndMonthNumberCd", String(row.end_month).padStart(2, "0")),
        typeof row.premium_pct === "number"
          ? element("MonthlyPremiumPct", row.premium_pct.toFixed(2))
          : "",
        typeof row.slcsp_pct === "number"
          ? element("MonthlyPremiumSLCSPPct", row.slcsp_pct.toFixed(2))
          : "",
        typeof row.aptc_pct === "number"
          ? element("MonthlyAdvancedPTCPct", row.aptc_pct.toFixed(2))
          : "",
      ])
    ),
    allocations.length > 0
      ? element(
        "SharedPolicyAllocationInfoInd",
        allocations.length <= 4 ? "true" : "false",
      )
      : "",
    alternativeMarriageXml("AltCalcForMarriagePrimaryGrp", marriagePrimary),
    alternativeMarriageXml("AltCalcForMarriageSpouseGrp", marriageSpouse),
  ]);
}

export const form8962: MefFormDescriptor<"form8962", Input> = {
  pendingKey: "form8962",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8962.pdf",
  build(fields, context) {
    return buildIRS8962(fields, context);
  },
};
