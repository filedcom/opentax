import { isDeepStrictEqual } from "node:util";
import { inputSchema as rSchema } from "../../../../nodes/inputs/f1099r/index.ts";
import { printSchema } from "../../../../nodes/intermediate/forms/form8606/index.ts";
import { reviewedRothActivity } from "../../../../nodes/intermediate/forms/form8606/roth-activity.ts";
import { type FilerIdentity, FilingStatus } from "../../../../mef/header.ts";

/** Source replay for regular-contribution Roth J/T claims and their filed consequences. */
export function reconcileForm8606RothActivity(
  pending: Readonly<Record<string, unknown>>,
  filer: FilerIdentity | undefined,
) {
  const sources = pending.f1099r ? rSchema.parse(pending.f1099r).f1099rs : [];
  const items = sources.filter((item) => item.roth_activity_review);
  if (!items.length) {
    if (
      (pending.form8606 as Record<string, unknown> | undefined)
        ?.roth_activity_review
    ) {
      throw new Error(
        "Form8606 Roth activity has no actual issued/substitute source",
      );
    }
    return undefined;
  }
  if (
    items.length !== 1 ||
    sources.filter((item) => item.box7_ira_simple_indicator || ["J", "T", "Q"].includes(item.box7_distribution_code ?? "")).length !== 1
  ) {
    throw new Error(
      "Roth activity requires its complete one-payment owner IRA inventory; multiple owner/source joins remain guarded",
    );
  }
  const item = items[0];
  const facts = reviewedRothActivity(item.roth_activity_review);
  const spouse = item.ts === "S";
  const ownerSsn = (spouse ? filer?.spouse?.ssn : filer?.primarySSN)?.replace(
    /\D/g,
    "",
  );
  const ownerName = spouse
    ? [
      filer?.spouse?.firstName,
      filer?.spouse?.middleInitial,
      filer?.spouse?.lastName,
    ].filter(Boolean).join(" ")
    : filer?.fullName;
  const general = pending.general as Record<string, unknown> | undefined;
  const f1040 = pending.f1040 as Record<string, unknown> | undefined;
  const forms = (pending.form5329 as
    | { owner_forms?: Record<string, unknown>[] }
    | undefined)?.owner_forms ?? [];
  const ownerForms = forms.filter((row) => row.owner === item.ts);
  if (
    !filer ||
    !(filer.filingStatus === FilingStatus.Single ||
      filer.filingStatus === FilingStatus.MarriedFilingJointly) ||
    (spouse && filer.filingStatus !== FilingStatus.MarriedFilingJointly) ||
    !ownerName ||
    ownerSsn !== facts.review.owner_identity.owner_ssn ||
    item.recipient_ssn?.replace(/\D/g, "") !== ownerSsn ||
    facts.review.owner_identity.date_of_birth !==
      general?.[spouse ? "spouse_dob" : "taxpayer_dob"] ||
    item.payer_ein.replace(/\D/g, "") !== facts.review.payment.custodian_ein ||
    item.account_number !== facts.review.payment.account_number ||
    item.box13_date_of_payment !== facts.review.payment.distributed_on ||
    item.box1_gross_distribution !== facts.review.payment.gross_distribution ||
    item.box7_distribution_code !== facts.review.payment.distribution_code ||
    item.box7_code2 !== undefined ||
    item.box2a_taxable_amount !== undefined ||
    item.box2b_not_determined !== true ||
    item.source_document_reference !==
      facts.review.form1099r_source_document_reference ||
    item.exclude_8606_roth !== !facts.qualified ||
    item.box7_ira_simple_indicator === true ||
    f1040?.line4a_ira_gross !== facts.gross ||
    (f1040?.line4b_ira_taxable ?? 0) !== facts.taxable ||
    (facts.earlyTaxable > 0
      ? ownerForms.length !== 1 ||
        ownerForms[0].early_distribution !== facts.earlyTaxable
      : ownerForms.length !== 0)
  ) {
    throw new Error(
      "Roth activity owner/birth/account/payment and finalized1040/5329 source joins differ",
    );
  }
  if (facts.qualified) {
    if (pending.form8606 !== undefined) {
      throw new Error(
        "Qualified Roth activity cannot fabricate an inapplicable Form8606",
      );
    }
    return { ...facts, ownerName, ownerSsn, fields: undefined };
  }
  const fields = printSchema.parse(pending.form8606);
  if (
    !isDeepStrictEqual(fields.roth_activity_review, facts.review) ||
    fields.roth_distribution_evidence ||
    fields.source_traditional_distributions !== 0 ||
    fields.source_roth_conversion !== 0 ||
    fields.source_roth_distribution !== facts.gross ||
    fields.source_roth_basis_contributions !== facts.basis ||
    fields.source_roth_basis_conversions !== 0 ||
    fields.print_line1_nondeductible !== 0 ||
    fields.print_line2_prior_basis !== 0 ||
    fields.print_line3_total_basis !== 0 ||
    fields.print_line14_remaining_basis !== 0 ||
    Object.entries(facts.print).some(([key, value]) =>
      fields[key as keyof typeof fields] !== value
    )
  ) {
    throw new Error(
      "Form8606 Roth activity printed basis/earnings differ from complete source records",
    );
  }
  return { ...facts, ownerName, ownerSsn, fields };
}
