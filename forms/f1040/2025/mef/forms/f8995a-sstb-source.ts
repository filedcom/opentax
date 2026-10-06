import type { FilerIdentity } from "../../../mef/header.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import {
  computeNetProfit,
  inputSchema as scheduleCSchema,
} from "../../../nodes/inputs/schedule_c/model.ts";
import { inputSchema as w2Schema } from "../../../nodes/inputs/w2/index.ts";
import { scheduleSELines } from "../../../nodes/intermediate/forms/schedule_se/calculation.ts";
import { CONFIG_BY_YEAR } from "../../../nodes/config/index.ts";
import {
  calculateOneSstb8995ALines,
  type Form8995AInput,
} from "../../../nodes/intermediate/forms/form8995a/index.ts";

/** Reconcile the new public accounting source; historical staged claims are separate. */
export function assertSstbScheduleCSource(
  input: Form8995AInput,
  pending: Readonly<Record<string, unknown>> | undefined,
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
  const se = pending.schedule_se as
    | Parameters<typeof scheduleSELines>[0]
    | undefined;
  const w2 = pending.w2 === undefined ? [] : w2Schema.parse(pending.w2).w2s;
  const wageBase = w2.reduce(
    (total, row) => total + (row.box3_ss_wages ?? 0),
    0,
  );
  const ssn = retained.owner_ssn;
  const profit = computeNetProfit(source);
  const seLines = se && scheduleSELines(se, CONFIG_BY_YEAR[2025].ssWageBase);
  const payroll = review?.employee_w2_records ?? [];
  if (
    !review || !f || !g || !s1 || !seLines || c.schedule_cs.length !== 1 ||
    JSON.stringify(item) !== JSON.stringify(source) ||
    g.taxpayer_ssn?.toString().replaceAll("-", "") !== ssn ||
    f.taxpayer_ssn?.toString().replaceAll("-", "") !== ssn ||
    (filerSSN !== undefined && filerSSN.replaceAll("-", "") !== ssn) ||
    g.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    g.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    g.filing_status !== input.filing_status ||
    review.owner_ssn !== ssn || source.proprietor_recipient !== "T" ||
    source.qbi_specified_service !== true ||
    source.line_b_business_code !== "541211" ||
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
    w2.some((row) => row.employee_ssn?.replaceAll("-", "") !== ssn) ||
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
    (f.line3a_qualified_dividends ?? 0) !== 0 ||
    (f.line7_capital_gain ?? 0) !== 0
  ) {
    throw new Error(
      "SSTB accounting source, payroll, owner and filed SE adjustment must match the retained return",
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
  const lines = calculateOneSstb8995ALines(input);
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
      "SSTB accounting income and credit must match finalized Form1040",
    );
  }
}
