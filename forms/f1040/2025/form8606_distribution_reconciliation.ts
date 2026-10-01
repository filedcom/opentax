import { inputSchema as f1099rSchema } from "../nodes/inputs/f1099r/index.ts";
import {
  currentContributionSourceSchema,
  distributionEvidenceSchema,
  IraOwner,
  printSchema,
} from "../nodes/intermediate/forms/form8606/index.ts";
import { inputSchema as iraWorksheetSchema } from "../nodes/intermediate/worksheets/ira_deduction_worksheet/index.ts";
import { inputSchema as w2Schema } from "../nodes/inputs/w2/index.ts";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";

/** The source and all printable Part I lines for one taxpayer IRA distribution. */
export function reconcileForm8606Distribution(
  rawFields: unknown,
  pending: Readonly<Record<string, unknown>> | undefined,
  filer: FilerIdentity | undefined,
) {
  const source = f1099rSchema.safeParse(pending?.f1099r);
  const entered = source.success ? source.data.f1099rs : [];
  const hasSource = entered.some((item) =>
    item.form8606_distribution_evidence !== undefined
  );
  const fields = printSchema.parse(rawFields);
  if (!hasSource && !fields.distribution_evidence) return undefined;
  const spouseOwned = fields.filing_details?.owner === IraOwner.Spouse;
  const ownerSsn = spouseOwned ? filer?.spouse?.ssn : filer?.primarySSN;
  const ownerName = spouseOwned
    ? [
      filer?.spouse?.firstName,
      filer?.spouse?.middleInitial,
      filer?.spouse?.lastName,
    ].filter(Boolean).join(" ")
    : filer?.fullName;
  const evidence = distributionEvidenceSchema.parse(
    fields.distribution_evidence,
  );
  const contributionSource = fields.current_contribution_source === undefined
    ? undefined
    : currentContributionSourceSchema.parse(fields.current_contribution_source);
  const contribution = contributionSource?.form5498.box1_ira_contributions ?? 0;
  const received = contributionSource?.contribution_receipt.received_on;
  const line4 = received?.startsWith("2026-") ? contribution : 0;
  const item = entered[0];
  const priorBasis = evidence.prior_form8606.filed_line14_basis;
  const totalBasis = priorBasis + contribution;
  const basis = totalBasis - line4;
  const distribution = item?.box1_gross_distribution ?? 0;
  const yearEnd = evidence.year_end_statement.total_fair_market_value;
  const denominator = distribution + yearEnd;
  const ratio = denominator > 0
    ? Math.min(1, Math.round(basis / denominator * 1_000) / 1_000)
    : NaN;
  const nontaxable = Math.min(
    basis,
    distribution,
    Math.round(distribution * ratio),
  );
  const taxable = distribution - nontaxable;
  const f1040 = pending?.f1040 as Record<string, unknown> | undefined;
  const schedule1 = pending?.schedule1 as Record<string, unknown> | undefined;
  const worksheet = contributionSource
    ? iraWorksheetSchema.safeParse(pending?.ira_deduction_worksheet)
    : undefined;
  const w2s = contributionSource ? w2Schema.safeParse(pending?.w2) : undefined;
  const receipt = contributionSource?.contribution_receipt;
  const form5498 = contributionSource?.form5498;
  const contributionSourcesMatch = !contributionSource || (
    receipt !== undefined && form5498 !== undefined &&
    received !== undefined &&
    received >= "2025-01-01" && received <= "2026-04-15" &&
    !Number.isNaN(Date.parse(`${received}T00:00:00Z`)) &&
    new Date(`${received}T00:00:00Z`).toISOString().slice(0, 10) === received &&
    receipt.contribution_amount === contribution &&
    receipt.owner_ssn === ownerSsn &&
    form5498.owner_ssn === ownerSsn &&
    receipt.custodian_ein === form5498.custodian_ein &&
    new Set([
        receipt.source_document_reference,
        form5498.source_document_reference,
        evidence.prior_form8606.source_document_reference,
        evidence.year_end_statement.source_document_reference,
        evidence.form1099r_source_document_reference,
      ]).size === 5 &&
    worksheet?.success === true && w2s?.success === true &&
    w2s.data.w2s.length === 1 &&
    worksheet.data.ira_contribution === contribution &&
    worksheet.data.form8606_filing_details?.owner ===
      (spouseOwned ? IraOwner.Spouse : IraOwner.Taxpayer) &&
    worksheet.data.form8606_filing_details
        ?.no_ira_distributions_or_conversions_confirmed === false &&
    JSON.stringify(worksheet.data.form8606_current_contribution_source) ===
      JSON.stringify(contributionSource) &&
    worksheet.data.active_participant === true &&
    worksheet.data.magi === f1040?.line11_agi &&
    w2s.data.w2s[0].box13_retirement_plan === true &&
    w2s.data.w2s[0].employee_ssn?.replace(/\D/g, "") ===
      ownerSsn &&
    f1040?.line11_agi === w2s.data.w2s[0].box1_wages + taxable &&
    (schedule1?.line20_ira_deduction ?? 0) === 0
  );
  if (
    !filer || !ownerSsn || !ownerName?.trim() ||
    (spouseOwned
      ? filer.filingStatus !== FilingStatus.MarriedFilingJointly ||
        !filer.spouse?.firstName || !filer.spouse?.lastName
      : filer.filingStatus !== FilingStatus.Single) ||
    entered.length !== 1 || !item ||
    item.box7_ira_simple_indicator !== true ||
    item.ts !== (spouseOwned ? "S" : "T") ||
    (spouseOwned && contributionSource !== undefined &&
      item.recipient_ssn?.replace(/\D/g, "") !== ownerSsn) ||
    item.no_distribution_received === true ||
    item.source_document_reference !==
      evidence.form1099r_source_document_reference ||
    item.prior_ira_basis !== priorBasis ||
    (item.year_end_ira_value ?? 0) !== yearEnd ||
    JSON.stringify(item.form8606_distribution_evidence) !==
      JSON.stringify(evidence) ||
    evidence.no_current_nondeductible_contribution_confirmed !==
      (contributionSource === undefined) ||
    !contributionSourcesMatch ||
    evidence.prior_form8606.owner_ssn !== ownerSsn ||
    evidence.year_end_statement.owner_ssn !== ownerSsn ||
    fields.filing_details?.owner !==
      (spouseOwned ? IraOwner.Spouse : IraOwner.Taxpayer) ||
    fields.filing_details.no_ira_distributions_or_conversions_confirmed !==
      false ||
    fields.source_traditional_distributions !== distribution ||
    fields.source_roth_conversion !== 0 ||
    fields.source_roth_distribution !== 0 ||
    fields.print_line1_nondeductible !== contribution ||
    fields.print_line2_prior_basis !== priorBasis ||
    fields.print_line3_total_basis !== totalBasis ||
    fields.print_line4_post_year_contributions !== line4 ||
    fields.print_line5_current_basis !== basis ||
    fields.print_line6_year_end_value !== yearEnd ||
    fields.print_line7_distributions !== distribution ||
    fields.print_line8_conversions !== 0 ||
    fields.print_line9_combined_value !== denominator ||
    fields.print_line10_basis_ratio !== ratio ||
    fields.print_line11_nontaxable_conversion !== 0 ||
    fields.print_line12_nontaxable_distribution !== nontaxable ||
    fields.print_line13_nontaxable !== nontaxable ||
    fields.print_line14_remaining_basis !== totalBasis - nontaxable ||
    fields.print_line15a_not_converted !== taxable ||
    fields.print_line15b_disaster !== 0 ||
    fields.print_line15c_taxable !== taxable ||
    !f1040 || f1040.line4a_ira_gross !== distribution ||
    f1040.line4b_ira_taxable !== taxable
  ) {
    throw new Error(
      "Form 8606 distribution needs one matched owner, prior basis, year-end IRA source, calculated Part I, and finalized Form 1040",
    );
  }
  return {
    fields,
    basis,
    distribution,
    yearEnd,
    denominator,
    ratio,
    nontaxable,
    taxable,
    ownerName,
    ownerSsn,
  };
}
