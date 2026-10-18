import { additionalMedicareTax } from "../../../../../nodes/intermediate/forms/taxes/employment/form8959/index.ts";
import {
  assertMultiBusinessInvestmentSources,
  assertMultiBusinessInvestmentTax,
} from "../../../../mef/forms/deductions/business/f8995/f8995-investment.ts";
import { assertIndependentPatronReturn } from "./form8995a_independent_patron_reconciliation.ts";
import {
  type FilerIdentity,
  FilingStatus as MefFilingStatus,
} from "../../../../../mef/header.ts";
import { inputSchema as w2Schema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import {
  calculateOneBusiness8995ALines,
  type Form8995AInput,
} from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";
import {
  patronSourceAmounts,
  sourceSchema,
} from "../../../../../nodes/inputs/deductions/business/qbi_patron/calculation.ts";
import {
  inputSchema as reviewSchema,
  patronW2Sources,
} from "../../../../../nodes/inputs/deductions/business/qbi_patron/schema.ts";
import { inputSchema as cSchema } from "../../../../../nodes/inputs/income/business/schedule_c/model.ts";
import { inputSchema as fSchema } from "../../../../../nodes/intermediate/forms/income/business/schedule_f/index.ts";
import { inputSchema as seSchema } from "../../../../../nodes/intermediate/forms/taxes/self-employment/schedule_se/index.ts";
import { scheduleSELines } from "../../../../../nodes/intermediate/forms/taxes/self-employment/schedule_se/calculation.ts";
import {
  calculateSingleScheduleCForm7206,
  reconcileSingleScheduleCGraphSource,
} from "../../../../../nodes/intermediate/forms/adjustments/health/form7206/index.ts";
import { singleScheduleCPlanSchema } from "../../../../../nodes/intermediate/forms/adjustments/health/form7206/index.ts";
import { CONFIG_BY_YEAR } from "../../../../../nodes/config/index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";

/** Replay public patron review, owned business, deductions and final tax joins. */
export function assertForm8995APatronReturn(
  input: Form8995AInput,
  raw: Readonly<Record<string, unknown>> | undefined,
): void {
  if (input.independent_patron_sources) {
    assertIndependentPatronReturn(input, raw);
    return;
  }
  if (!input.patron_business_source) return;
  if (!raw) throw new Error("Patron filing needs its complete source return");
  const pending = normalizeAllPending(raw as Record<string, unknown>);
  const source = sourceSchema.parse(input.patron_business_source);
  const review = reviewSchema.parse(pending.qbi_patron);
  if (JSON.stringify(review) !== JSON.stringify(source.review)) {
    throw new Error("Patron review differs from the retained public source");
  }
  const isC = review.business.kind === "schedule_c";
  const rows = isC
    ? cSchema.parse(pending.schedule_c).schedule_cs
    : fSchema.parse(pending.schedule_f).schedule_fs;
  if (
    rows.length !== 1 ||
    JSON.stringify(rows[0]) !== JSON.stringify(source.business_source)
  ) throw new Error("Patron business differs from its retained Schedule C/F");
  const retainedBusinessReview =
    (isC
      ? cSchema.parse(pending.schedule_c)
      : fSchema.parse(pending.schedule_f)).patron_filing_review;
  if (JSON.stringify(retainedBusinessReview) !== JSON.stringify(review)) {
    throw new Error(
      "Patron business filed rounding review differs from its public source",
    );
  }
  const joint = input.filing_status === "mfj";
  if (input.filing_status === "mfs") {
    const mfs = review.mfs_filing_review;
    if (
      !mfs || pending.general?.address_state !== mfs.mailing_address_state ||
      String(pending.general?.spouse_ssn ?? "").replaceAll("-", "") !==
        mfs.spouse_ssn ||
      String(pending.f1040?.spouse_ssn ?? "").replaceAll("-", "") !==
        mfs.spouse_ssn ||
      pending.general?.mfs_spouse_itemizing !== false ||
      pending.f1040?.mfs_spouse_itemizing !== false ||
      pending.f1040?.filing_status !== input.filing_status
    ) {
      throw new Error(
        "MFS patron needs the retained noncommunity property, actual spouse and deduction review to match the return",
      );
    }
  }
  const primary = String(pending.general?.taxpayer_ssn ?? "").replaceAll(
    "-",
    "",
  );
  const spouse = String(pending.general?.spouse_ssn ?? "").replaceAll("-", "");
  const recipient =
    (source.business_source as { proprietor_recipient?: string })
      .proprietor_recipient;
  const spouseOwned = recipient === "S";
  const owner = spouseOwned ? spouse : primary;
  const primaryCopies = review.primary_w2_sources
    ? w2Schema.parse({ w2s: review.primary_w2_sources }).w2s
    : [];
  const spouseCopies = review.spouse_w2_sources
    ? w2Schema.parse({ w2s: review.spouse_w2_sources }).w2s
    : [];
  const copies = patronW2Sources(review).length
    ? w2Schema.parse({ w2s: patronW2Sources(review) }).w2s
    : [];
  const w2Input = pending.w2 ? w2Schema.parse(pending.w2) : undefined;
  const w2s = w2Input?.w2s ?? [];
  if (
    pending.general?.filing_status !== input.filing_status ||
    owner !== review.source_1099patr.recipient_tin ||
    (spouseOwned && !joint) ||
    (!joint && spouseCopies.length > 0) ||
    primaryCopies.some((row) =>
      row.employee_ssn?.replaceAll("-", "") !== primary
    ) ||
    spouseCopies.some((row) =>
      row.employee_ssn?.replaceAll("-", "") !== spouse
    ) ||
    String(pending.f1040?.taxpayer_ssn ?? "").replaceAll("-", "") !== primary ||
    (joint && (!/^\d{9}$/.test(spouse) || spouse === primary ||
      String(pending.f1040?.spouse_ssn ?? "").replaceAll("-", "") !==
        spouse)) ||
    JSON.stringify(w2s) !== JSON.stringify(copies) ||
    (copies.length > 0 &&
      JSON.stringify(w2Input?.patron_filing_review) !==
        JSON.stringify(review)) ||
    copies.some((row) =>
      !row.source_document_reference || !row.employer_name ||
      !/^\d{9}$/.test((row.employer_ein ?? "").replaceAll("-", "")) ||
      !(row.box5_medicare_wages! > 0) ||
      row.box13_statutory_employee === true ||
      (row.box7_ss_tips ?? 0) !== 0 || (row.box8_allocated_tips ?? 0) !== 0 ||
      (row.box12_entries ?? []).length > 0
    )
  ) {
    throw new Error(
      "Patron proprietor and reviewed primary/spouse W-2 issued copies must match the source return",
    );
  }
  const ownerSocialSecurityWages = (spouseOwned ? spouseCopies : primaryCopies)
    .reduce((sum, row) => sum + (row.box3_ss_wages ?? 0), 0);
  const wageIncome = copies.reduce((sum, row) => sum + row.box1_wages, 0);
  const medicareWages = Math.round(
    copies.reduce((sum, row) => sum + (row.box5_medicare_wages ?? 0), 0),
  );
  const amounts = patronSourceAmounts(source);
  const se = seSchema.parse(pending.schedule_se);
  const seLines = scheduleSELines(se, CONFIG_BY_YEAR[2025].ssWageBase);
  const noAmount = (value: unknown) => value === undefined || value === 0;
  const s1 = pending.schedule1;
  const f1040 = pending.f1040;
  let health = 0;
  if (pending.form7206?.single_schedule_c_plan !== undefined) {
    if (!isC) {
      throw new Error(
        "Patron farm health deduction needs an owned policy route",
      );
    }
    const plan = singleScheduleCPlanSchema.parse(
      pending.form7206.single_schedule_c_plan,
    );
    const result = calculateSingleScheduleCForm7206(plan);
    reconcileSingleScheduleCGraphSource(
      pending.form7206,
      plan,
      seLines?.line13 ?? 0,
    );
    if (
      plan.schedule_c_line31_net_profit !== amounts.profit ||
      plan.schedule1_line15_se_tax_deduction !== seLines?.line13 ||
      review.business.kind !== "schedule_c" ||
      plan.business_reference !== review.business.business_reference ||
      plan.recipient !== recipient ||
      (spouseOwned ? plan.spouse_identity?.ssn : plan.taxpayer_identity.ssn)
          ?.replace(/\D/g, "") !==
        review.source_1099patr.recipient_tin
    ) {
      throw new Error(
        "Patron health plan differs from the owned business and SE source",
      );
    }
    health = result.line14;
  }
  // Retirement plans still need a distinct owned allocation source; never infer one.
  if (
    source.retirement_plan_deduction !== 0 ||
    pending.sep_retirement !== undefined
  ) {
    throw new Error(
      "Patron retirement adjustments need an owned plan allocation route",
    );
  }
  const lines = calculateOneBusiness8995ALines(input);
  const medicareThreshold = joint
    ? 250000
    : input.filing_status === "mfs"
    ? 125000
    : 200000;
  const medicareTax =
    additionalMedicareTax(Math.max(0, medicareWages - medicareThreshold)) +
    additionalMedicareTax(
      Math.max(
        0,
        Math.round(seLines?.line6 ?? 0) -
          Math.max(0, medicareThreshold - medicareWages),
      ),
    );
  const investment = assertMultiBusinessInvestmentSources(
    { ...input, taxpayer_ssn: primary },
    pending,
    true,
    joint ? spouse : undefined,
  );
  assertMultiBusinessInvestmentTax(
    pending,
    investment,
    2025,
    input.filing_status,
  );
  const investmentIncome = investment.interest + investment.ordinary +
    investment.returnCapital;
  const expectedAgi = Math.round(
    amounts.profit + wageIncome + investmentIncome - source.se_tax_deduction -
      health,
  );
  const niitThreshold = joint || input.filing_status === "qss"
    ? 250000
    : input.filing_status === "mfs"
    ? 125000
    : 200000;
  const niit = Math.round(
    Math.min(investmentIncome, Math.max(0, expectedAgi - niitThreshold)) * .038,
  );
  if (investmentIncome !== 0) {
    const expectedNiit = {
      line1_taxable_interest: investment.interest,
      line2_ordinary_dividends: investment.ordinary,
      line3_annuities: 0,
      line4a_passive_income: 0,
      line4b_rental_net: 0,
      line5a_net_gain: investment.returnCapital,
      line5b_net_gain_adjustment: 0,
      line7_other_modifications: 0,
      line8_total_investment_income: investmentIncome,
      line9a_investment_interest_expense: 0,
      line9b_state_local_tax: 0,
      line10_additional_modifications: 0,
      line11_total_deductions: 0,
      line12_net_investment_income: investmentIncome,
      line13_magi: expectedAgi,
      line14_threshold: niitThreshold,
      line15_magi_excess: Math.max(0, expectedAgi - niitThreshold),
      line16_taxable_base: Math.min(
        investmentIncome,
        Math.max(0, expectedAgi - niitThreshold),
      ),
    };
    if (
      Object.entries(expectedNiit).some(([key, value]) =>
        Math.round(Number(pending.form8960?.[key] ?? 0)) !== Math.round(value)
      )
    ) {
      throw new Error(
        "Patron NIIT source lines must match the owned investment copies and income",
      );
    }
  }
  if (
    (input.net_capital_gain ?? 0) !== investment.filedQbiCapitalLimit ||
    input.business_filing_details?.qualified_dividends_zero_confirmed !==
      (investment.qualified === 0) ||
    Math.round(Number(pending.form8960?.line17_niit ?? 0)) !== niit ||
    (pending.schedule2?.line12_niit ?? 0) !== niit
  ) {
    throw new Error(
      "Patron investment sources, capital limit and NIIT must reconcile to the return",
    );
  }
  if (
    !seLines ||
    se[isC ? "net_profit_schedule_c" : "net_profit_schedule_f"] !==
      amounts.profit ||
    !noAmount(se[isC ? "net_profit_schedule_f" : "net_profit_schedule_c"]) ||
    se.farm_optional_method_elected === true ||
    (se.w2_ss_wages ?? 0) !== ownerSocialSecurityWages ||
    !noAmount(se.unreported_tips_4137) ||
    !noAmount(se.wages_8919) ||
    seLines.line13 !== source.se_tax_deduction ||
    health !== source.health_insurance_deduction ||
    s1?.line15_se_deduction !== seLines.line13 ||
    !noAmount(s1?.line16_sep_simple) ||
    (s1?.line17_se_health_insurance ?? 0) !== health ||
    s1?.[isC ? "line3_schedule_c" : "line6_schedule_f"] !== amounts.profit ||
    s1?.line10_total_additional_income !== amounts.profit ||
    pending.schedule2?.line4_se_tax !== seLines.line12 ||
    f1040?.line8_additional_income !== amounts.profit ||
    Math.round(Number(f1040?.line9_total_income)) !==
      Math.round(amounts.profit + wageIncome + investmentIncome) ||
    Math.round(Number(f1040?.line1a_wages ?? 0)) !== Math.round(wageIncome) ||
    Math.round(Number(f1040?.line1z_total_wages ?? 0)) !==
      Math.round(wageIncome) ||
    f1040?.line10_adjustments !== source.se_tax_deduction + health ||
    Math.round(Number(f1040?.line11_agi)) !== expectedAgi ||
    !noAmount(f1040?.line13b_additional_deductions) ||
    input.taxable_income !==
      Math.max(0, expectedAgi - Number(f1040?.line12c_deduction_total)) ||
    f1040?.line13_qbi_deduction !== lines.line39 ||
    Math.round(Number(f1040?.line15_taxable_income)) !==
      Math.max(0, input.taxable_income - lines.line39) ||
    (pending.form8959?.line18_total_tax ?? 0) !== medicareTax ||
    (pending.schedule2?.line11_additional_medicare ?? 0) !== medicareTax ||
    f1040?.line23_other_taxes !== (seLines?.line12 ?? 0) + medicareTax + niit ||
    f1040?.line24_total_tax !==
      Number(f1040?.line22_tax_after_credits) +
        Number(f1040?.line23_other_taxes) ||
    f1040?.line14_deductions_qbi_total !==
      Number(f1040?.line12c_deduction_total) + lines.line39 ||
    pending.general?.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    pending.general?.qbi_not_patron_of_specified_cooperative_confirmed ===
      true ||
    [
      isC ? "schedule_f" : "schedule_c",
      "schedule_e",
      "k1_partnership",
      "k1_s_corp",
      "f1099b",
      "f5884",
      "form8829",
    ].some((key) => pending[key] !== undefined)
  ) {
    throw new Error(
      "Patron business, attributable SE/health deductions and final Schedule 1/1040 tax do not reconcile",
    );
  }
}

/** Select the actual cooperative business owner; unsourced legacy projections stay primary. */
export function patronProprietorSsn(
  input: Form8995AInput,
  filer: FilerIdentity | undefined,
): string | undefined {
  if (input.patron_business_source && input.filing_status === "mfs") {
    const review = sourceSchema.parse(input.patron_business_source).review;
    const mfs = review.mfs_filing_review;
    if (
      !mfs || filer?.filingStatus !== MefFilingStatus.MarriedFilingSeparately ||
      filer.primarySSN.replaceAll("-", "") !==
        review.source_1099patr.recipient_tin ||
      filer.spouse?.ssn.replaceAll("-", "") !== mfs.spouse_ssn ||
      filer.address.state !== mfs.mailing_address_state
    ) {
      throw new Error(
        "MFS patron owner, spouse and mailing state must match the final filer and separate-income review",
      );
    }
  }
  const recipient = input.patron_business_source
    ? (sourceSchema.parse(input.patron_business_source).business_source as {
      proprietor_recipient?: string;
    }).proprietor_recipient
    : "T";
  if (recipient === "S") {
    if (
      input.filing_status !== "mfj" ||
      filer?.filingStatus !== MefFilingStatus.MarriedFilingJointly
    ) throw new Error("Spouse patron needs actual joint filer identity");
    return filer?.spouse?.ssn.replaceAll("-", "");
  }
  return filer?.primarySSN.replaceAll("-", "");
}
