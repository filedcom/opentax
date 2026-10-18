import { assertSstbServiceClassification } from "../../../../../../nodes/inputs/income/business/schedule_c/sstb-classification.ts";
import {
  assertMultiBusinessInvestmentSources,
  assertMultiBusinessInvestmentTax,
} from "../f8995/f8995-investment.ts";
import { assertOwnedScheduleSE } from "../../../../../domains/taxes/self-employment/schedule-se/schedule-se-owner-source.ts";
import type { FilerIdentity } from "../../../../../../mef/header.ts";
import { FilingStatus } from "../../../../../../nodes/types.ts";
import {
  computeNetProfit,
  inputSchema as scheduleCSchema,
} from "../../../../../../nodes/inputs/income/business/schedule_c/model.ts";
import { inputSchema as w2Schema } from "../../../../../../nodes/inputs/income/wages/w2/index.ts";
import { scheduleSELines } from "../../../../../../nodes/intermediate/forms/taxes/self-employment/schedule_se/calculation.ts";
import { qbiYearConfig } from "../../../../../../nodes/intermediate/forms/deductions/business/form8995a/thresholds.ts";
import {
  calculateOneSstb8995ALines,
  type Form8995AInput,
} from "../../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";

/** Reconcile the new public accounting source; historical staged claims are separate. */
export function assertSstbScheduleCSource(
  input: Form8995AInput,
  pending: Readonly<Record<string, unknown>> | undefined,
  taxYear: number,
  filerSSN?: string,
  filer?: FilerIdentity,
): void {
  const retained = input.single_sstb_schedule_c_source;
  if (!retained) return;
  if (!pending) {
    throw new Error("SSTB source needs the complete retained return");
  }
  const c = scheduleCSchema.parse(pending.schedule_c);
  const item = c.schedule_cs[0];
  const review = item?.qbi_sstb_filing_review;
  const source = retained.business.source_schedule_c;
  const s1 = pending.schedule1 as Record<string, unknown> | undefined;
  const f = pending.f1040 as Record<string, unknown> | undefined;
  const g = pending.general as Record<string, unknown> | undefined;
  const joint = input.filing_status === FilingStatus.MFJ;
  const owned = joint
    ? assertOwnedScheduleSE(
      pending as Readonly<Record<string, Record<string, unknown>>>,
      taxYear,
      filer,
    )
    : undefined;
  const se =
    (joint
      ? owned?.instances.find((row) =>
        row.recipient === source.proprietor_recipient
      )
      : pending.schedule_se) as
        | Parameters<typeof scheduleSELines>[0]
        | undefined;
  const w2 = pending.w2 === undefined ? [] : w2Schema.parse(pending.w2).w2s;
  const wageBase = w2.filter((row) =>
    row.employee_ssn?.replaceAll("-", "") === retained.owner_ssn
  ).reduce(
    (total, row) => total + (row.box3_ss_wages ?? 0) + (row.box7_ss_tips ?? 0),
    0,
  );
  const ssn = retained.owner_ssn;
  const ownerKey = source.proprietor_recipient === "S"
    ? "spouse_ssn"
    : "taxpayer_ssn";
  assertSstbServiceClassification(source);
  const profit = computeNetProfit(source);
  const seLines = se && scheduleSELines(se, qbiYearConfig(taxYear).ssWageBase);
  const payroll = review?.employee_w2_records ?? [];
  if (
    !review || !f || !g || !s1 || !seLines || c.schedule_cs.length !== 1 ||
    JSON.stringify(item) !== JSON.stringify(source) ||
    g[ownerKey]?.toString().replaceAll("-", "") !== ssn ||
    f[ownerKey]?.toString().replaceAll("-", "") !== ssn ||
    (filerSSN !== undefined && filerSSN.replaceAll("-", "") !==
        g.taxpayer_ssn?.toString().replaceAll("-", "")) ||
    g.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    g.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    g.filing_status !== input.filing_status ||
    review.owner_ssn !== ssn ||
    (source.proprietor_recipient !== "T" &&
      !(joint && source.proprietor_recipient === "S")) ||
    source.qbi_specified_service !== true ||
    review.business_activity_description !== source.line_a_principal_business ||
    source.qbi_no_other_adjustments_confirmed !== true ||
    retained.business.qbi !== profit ||
    retained.business.wotc_wage_reduction !== undefined ||
    (source.qbi_unadjusted_basis ?? 0) !== 0 ||
    (payroll.length === 0 && (
      !review.no_business_employees_review ||
      (source.line_26_wages ?? 0) !== 0 || source.qbi_w2_wages !== 0
    )) ||
    payroll.some((row) =>
      row.employee_ssn === ssn || row.employer_ein !== source.line_d_ein ||
      row.box1_wages > row.box5_wages
    ) ||
    new Set(payroll.map((row) => row.employee_ssn)).size !== payroll.length ||
    new Set(payroll.map((row) => row.source_document_reference)).size !==
      payroll.length ||
    payroll.reduce((total, row) => total + row.box1_wages, 0) !==
      source.qbi_w2_wages ||
    (source.line_26_wages ?? 0) < (source.qbi_w2_wages ?? 0) ||
    (!joint &&
      w2.some((row) => row.employee_ssn?.replaceAll("-", "") !== ssn)) ||
    se?.net_profit_schedule_c !== profit ||
    (se.net_profit_schedule_f ?? 0) !== 0 ||
    (se.w2_ss_wages ?? 0) !== wageBase ||
    seLines.line13 !== retained.se_tax_deduction ||
    s1.line15_se_deduction !== retained.se_tax_deduction ||
    s1.line3_schedule_c !== profit ||
    (s1.line16_sep_simple ?? 0) !== 0 ||
    (s1.line17_se_health_insurance ?? 0) !== 0 ||
    input.sstb_qbi !== profit - retained.se_tax_deduction ||
    input.sstb_filing_details?.business_name !== source.line_c_business_name ||
    input.sstb_filing_details?.ein !== source.line_d_ein ||
    input.sstb_filing_details?.qbi_wages_ubia_source_reference !==
      review.review_reference ||
    input.sstb_w2_wages !== source.qbi_w2_wages ||
    input.sstb_unadjusted_basis !== 0 ||
    review.qualified_dividends_zero_confirmed !==
      ((f.line3a_qualified_dividends ?? 0) === 0) ||
    input.sstb_filing_details?.qualified_dividends_zero_confirmed !==
      review.qualified_dividends_zero_confirmed
  ) {
    throw new Error(
      "SSTB service source, payroll, owner and filed SE adjustment must match the retained return",
    );
  }
  if (input.filing_status === FilingStatus.MFS) {
    const mfs = review.mfs_filing_review;
    if (
      !mfs || g.address_state !== mfs.mailing_address_state ||
      g.spouse_ssn?.toString().replaceAll("-", "") !== mfs.spouse_ssn ||
      f.spouse_ssn?.toString().replaceAll("-", "") !== mfs.spouse_ssn ||
      (filer !== undefined &&
        (filer.address.state !== mfs.mailing_address_state ||
          filer.spouse?.ssn.replaceAll("-", "") !== mfs.spouse_ssn)) ||
      mfs.spouse_ssn === ssn || g.mfs_spouse_itemizing !== false ||
      f.mfs_spouse_itemizing !== false ||
      f.filing_status !== input.filing_status ||
      input.sstb_filing_details?.mfs_owner_ssn !== ssn ||
      input.sstb_filing_details?.mfs_allocation_source_reference !==
        mfs.domicile_record_reference ||
      input.sstb_filing_details?.mfs_no_spouse_share_confirmed !== true
    ) {
      throw new Error(
        "MFS SSTB needs reviewed noncommunity domicile/property regime and spouse deduction review in the actual return",
      );
    }
  }
  const portfolio = input.qbi_capital_sources !== undefined ||
    input.investment_interest_sources !== undefined ||
    input.investment_dividend_sources !== undefined ||
    pending.f1099int !== undefined || pending.f1099div !== undefined ||
    pending.f1099b !== undefined;
  if (portfolio) {
    const retainedPending = pending as Record<string, Record<string, unknown>>;
    const totals = assertMultiBusinessInvestmentSources(
      { ...input, taxpayer_ssn: String(g.taxpayer_ssn) },
      retainedPending,
      true,
      joint ? String(g.spouse_ssn) : undefined,
    );
    const wages = w2.reduce((sum, row) => sum + row.box1_wages, 0);
    const income = wages + profit + totals.interest + totals.ordinary +
      totals.returnCapital;
    if (
      input.net_capital_gain !== totals.filedQbiCapitalLimit ||
      f.line9_total_income !== income ||
      f.line11_agi !== income - retained.se_tax_deduction ||
      (f.line10_adjustments ?? 0) !== retained.se_tax_deduction ||
      (f.line1a_wages ?? 0) !== wages || (f.line1z_total_wages ?? 0) !== wages
    ) {
      throw Error(
        "SSTB income must reconcile owned wage, business and investment sources",
      );
    }
    assertMultiBusinessInvestmentTax(
      retainedPending,
      totals,
      2025,
      input.filing_status,
    );
  } else if (
    (input.net_capital_gain ?? 0) !== 0 ||
    (f.line3a_qualified_dividends ?? 0) !== 0 ||
    (f.line7_capital_gain ?? 0) !== 0
  ) {
    throw Error("SSTB capital limit needs retained investment sources");
  }
  const lines = calculateOneSstb8995ALines(input, taxYear);
  if (
    typeof f.line11_agi !== "number" ||
    typeof f.line12c_deduction_total !== "number" ||
    (f.line13b_additional_deductions ?? 0) !== 0 ||
    f.line11_agi - f.line12c_deduction_total !== input.taxable_income ||
    f.line13_qbi_deduction !== lines.line39 ||
    f.line14_deductions_qbi_total !==
      f.line12c_deduction_total + lines.line39 ||
    f.line15_taxable_income !== input.taxable_income - lines.line39
  ) {
    throw new Error(
      "SSTB service income and credit must match finalized Form1040",
    );
  }
}
