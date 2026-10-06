import { reconcileForm8606RothInventories } from "./form8606_roth_inventory_reconciliation.ts";
import { reconcileForm8606RothActivity } from "./form8606_roth_activity_reconciliation.ts";
import { inputSchema as f1099rSchema } from "../nodes/inputs/f1099r/index.ts";
import {
  printSchema,
  rothDistributionEvidenceSchema,
} from "../nodes/intermediate/forms/form8606/index.ts";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";

/** Replays the bounded first-year Roth contribution and one code J payment. */
export function reconcileForm8606Roth(
  rawFields: unknown,
  pending: Readonly<Record<string, unknown>> | undefined,
  filer: FilerIdentity | undefined,
) {
  const collection = pending ? reconcileForm8606RothInventories(pending, filer) : undefined;
  if (collection) {
    const fields = printSchema.parse(rawFields);
    const owner = collection.owners.find((row) => row.review.owner === fields.roth_owner_inventory_review?.owner);
    if (!owner?.fields || JSON.stringify(fields) !== JSON.stringify(printSchema.parse(owner.fields))) {
      throw new Error("Form8606 owner descriptor differs from the complete retained current inventory");
    }
    return { fields, gross: owner.nonqualifiedGross, contribution: owner.basis,
      taxable: owner.taxable, ownerName: owner.ownerName!, ownerSsn: owner.ownerSsn! };
  }
  const activity = pending
    ? reconcileForm8606RothActivity(pending, filer)
    : undefined;
  if (activity) {
    if (activity.qualified || !activity.fields) {
      throw new Error(
        "Qualified Roth distribution cannot file Form8606 PartIII",
      );
    }
    if (
      JSON.stringify(printSchema.parse(rawFields)) !==
        JSON.stringify(activity.fields)
    ) {
      throw new Error(
        "Form8606 Roth activity descriptor fields differ from actual pending source",
      );
    }
    return {
      fields: activity.fields,
      gross: activity.gross,
      contribution: activity.basis,
      taxable: activity.taxable,
      ownerName: activity.ownerName,
      ownerSsn: activity.ownerSsn!,
    };
  }
  const fields = printSchema.parse(rawFields);
  const source = f1099rSchema.safeParse(pending?.f1099r);
  const hasSource = source.success &&
    source.data.f1099rs.some((item) =>
      item.roth_distribution_evidence !== undefined
    );
  if (!fields.roth_distribution_evidence && !hasSource) return undefined;
  const evidence = rothDistributionEvidenceSchema.parse(
    fields.roth_distribution_evidence,
  );
  const entered = source.success ? source.data.f1099rs : [];
  const item = entered[0];
  const spouseOwned = item?.ts === "S";
  const ownerSsn = spouseOwned ? filer?.spouse?.ssn : filer?.primarySSN;
  const ownerName = spouseOwned
    ? [
      filer?.spouse?.firstName,
      filer?.spouse?.middleInitial,
      filer?.spouse?.lastName,
    ].filter(Boolean).join(" ")
    : filer?.fullName;
  const contribution = evidence.form5498.box10_roth_ira_contributions;
  const gross = item?.box1_gross_distribution ?? 0;
  const taxable = gross - contribution;
  const f1040 = pending?.f1040 as Record<string, unknown> | undefined;
  const form5329 = pending?.form5329 as
    | { owner_forms?: Record<string, unknown>[] }
    | undefined;
  const ownerForms = form5329?.owner_forms ?? [];
  const early = ownerForms.find((row) =>
    row.owner === (spouseOwned ? "S" : "T")
  );
  const references = [
    evidence.opening_statement.source_document_reference,
    evidence.form5498.source_document_reference,
    evidence.contribution_receipt.source_document_reference,
    evidence.form1099r_source_document_reference,
  ];
  if (
    !filer ||
    !(spouseOwned
      ? filer.filingStatus === FilingStatus.MarriedFilingJointly &&
        !!filer.spouse?.firstName && !!filer.spouse?.lastName
      : filer.filingStatus === FilingStatus.Single) ||
    !ownerName?.trim() || !ownerSsn || !/^\d{9}$/.test(ownerSsn) ||
    entered.length !== 1 || !item ||
    item.ts !== (spouseOwned ? "S" : "T") ||
    item.box7_distribution_code !== "J" ||
    item.box7_ira_simple_indicator !== true ||
    item.exclude_8606_roth !== true ||
    item.box2a_taxable_amount !== undefined ||
    item.box2b_not_determined !== true ||
    !item.box13_date_of_payment ||
    !/^2025-\d{2}-\d{2}$/.test(item.box13_date_of_payment) ||
    Number.isNaN(Date.parse(`${item.box13_date_of_payment}T00:00:00Z`)) ||
    new Date(`${item.box13_date_of_payment}T00:00:00Z`).toISOString()
        .slice(0, 10) !== item.box13_date_of_payment ||
    item.box13_date_of_payment <=
      evidence.contribution_receipt.received_on ||
    item.box13_date_of_payment < "2025-01-01" ||
    item.box13_date_of_payment > "2025-12-31" ||
    item.source_document_reference !==
      evidence.form1099r_source_document_reference ||
    item.recipient_ssn?.replace(/\D/g, "") !== ownerSsn ||
    item.payer_ein.replace(/\D/g, "") !== evidence.form5498.custodian_ein ||
    evidence.opening_statement.owner_ssn !== ownerSsn ||
    evidence.form5498.owner_ssn !== ownerSsn ||
    evidence.contribution_receipt.owner_ssn !== ownerSsn ||
    evidence.form5498.custodian_ein !==
      evidence.contribution_receipt.custodian_ein ||
    evidence.opening_statement.first_roth_ira_opened_on >
      evidence.contribution_receipt.received_on ||
    evidence.contribution_receipt.amount !== contribution ||
    new Set(references).size !== references.length ||
    JSON.stringify(item.roth_distribution_evidence) !==
      JSON.stringify(evidence) ||
    gross <= contribution || taxable <= 0 ||
    fields.source_traditional_distributions !== 0 ||
    fields.source_roth_conversion !== 0 ||
    fields.source_roth_distribution !== gross ||
    fields.source_roth_basis_contributions !== contribution ||
    fields.source_roth_basis_conversions !== 0 ||
    fields.print_line1_nondeductible !== 0 ||
    fields.print_line2_prior_basis !== 0 ||
    fields.print_line3_total_basis !== 0 ||
    fields.print_line14_remaining_basis !== 0 ||
    fields.print_roth_line19_distributions !== gross ||
    fields.print_roth_line20_homebuyer !== 0 ||
    fields.print_roth_line21_after_homebuyer !== gross ||
    fields.print_roth_line22_contribution_basis !== contribution ||
    fields.print_roth_line23_after_contribution_basis !== taxable ||
    fields.print_roth_line24_conversion_basis !== 0 ||
    fields.print_roth_line25a_earnings !== taxable ||
    fields.print_roth_line25b_disaster !== 0 ||
    fields.print_roth_line25c_taxable !== taxable ||
    !f1040 || f1040.line4a_ira_gross !== gross ||
    f1040.line4b_ira_taxable !== taxable ||
    ownerForms.length !== 1 || !early ||
    early.early_distribution !== taxable
  ) {
    throw new Error(
      "Form 8606 Roth Part III needs one matched first-year contribution, code J payment, owner, Form 5329 and finalized Form 1040",
    );
  }
  return { fields, gross, contribution, taxable, ownerName, ownerSsn };
}
