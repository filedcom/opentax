import { inputSchema as f1099rSchema } from "../nodes/inputs/f1099r/index.ts";
import {
  distributionEvidenceSchema,
  IraOwner,
  printSchema,
} from "../nodes/intermediate/forms/form8606/index.ts";
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
  const evidence = distributionEvidenceSchema.parse(
    fields.distribution_evidence,
  );
  const item = entered[0];
  const basis = evidence.prior_form8606.filed_line14_basis;
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
  if (
    !filer || filer.filingStatus !== FilingStatus.Single ||
    !filer.fullName?.trim() ||
    entered.length !== 1 || !item ||
    item.box7_ira_simple_indicator !== true || item.ts !== "T" ||
    item.no_distribution_received === true ||
    item.source_document_reference !==
      evidence.form1099r_source_document_reference ||
    item.prior_ira_basis !== basis ||
    (item.year_end_ira_value ?? 0) !== yearEnd ||
    JSON.stringify(item.form8606_distribution_evidence) !==
      JSON.stringify(evidence) ||
    evidence.prior_form8606.owner_ssn !== filer.primarySSN ||
    evidence.year_end_statement.owner_ssn !== filer.primarySSN ||
    fields.filing_details?.owner !== IraOwner.Taxpayer ||
    fields.filing_details.no_ira_distributions_or_conversions_confirmed !==
      false ||
    fields.source_traditional_distributions !== distribution ||
    fields.source_roth_conversion !== 0 ||
    fields.source_roth_distribution !== 0 ||
    fields.print_line1_nondeductible !== 0 ||
    fields.print_line2_prior_basis !== basis ||
    fields.print_line3_total_basis !== basis ||
    fields.print_line4_post_year_contributions !== 0 ||
    fields.print_line5_current_basis !== basis ||
    fields.print_line6_year_end_value !== yearEnd ||
    fields.print_line7_distributions !== distribution ||
    fields.print_line8_conversions !== 0 ||
    fields.print_line9_combined_value !== denominator ||
    fields.print_line10_basis_ratio !== ratio ||
    fields.print_line11_nontaxable_conversion !== 0 ||
    fields.print_line12_nontaxable_distribution !== nontaxable ||
    fields.print_line13_nontaxable !== nontaxable ||
    fields.print_line14_remaining_basis !== basis - nontaxable ||
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
  };
}
