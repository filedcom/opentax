import { z } from "zod";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import {
  type SourceDocumentBytes,
  VerifiedSourceDocuments,
} from "../../../core/runtime/source-documents.ts";
import { form8801ReviewPackageSchema } from "./form8801_reviewed_return.ts";
import { stageForm8801SettledReturn } from "./form8801_settled_return.ts";

const namespace = "http://www.irs.gov/efile";
const documentId = z.string().regex(/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/);
export const form8801PriorReturnBindingSchema = z.object({
  reference: z.string().trim().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  form6251_document_id: documentId.optional(),
  form8801_document_id: documentId.optional(),
  schedule3_document_id: documentId.optional(),
}).strict();

// 2024 mappings confirmed in the IRS py2025r1 stylesheets, not TY2025 XSD.
// A refund is stored as a nonnegative magnitude and printed as a negative.
export const form8801Prior6251Map = [
  ["line1", "AGIOrAGILessDeductionAmt", 1],
  ["line2a", "ScheduleATaxesAmt", 1],
  ["line2b", "TotalRefundReceivedAmt", -1],
  ["line2c", "InvestmentInterestAmt", 1],
  ["line2d", "DepletionAmt", 1],
  ["line2e", "NetOperatingLossDeductionAmt", 1],
  ["line2g", "ExemptPrivateActivityBondsAmt", 1],
  ["line2h", "Section1202ExclusionAmt", 1],
  ["line10", "AdjustedRegularTaxAmt", 1],
  ["line11", "AlternativeMinimumTaxAmt", 1],
] as const;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false,
  processEntities: false,
});
type Row = Record<string, unknown>;
function row(value: unknown, label: string): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Form 8801 prior copy needs one ${label}`);
  }
  return value as Row;
}

// Resolve namespace bindings before dropping prefixes. Equal local names in
// different namespaces cannot masquerade as IRS amounts or identity fields.
function normalized(
  tag: string,
  value: unknown,
  inherited: Record<string, string>,
): [string, unknown] {
  if (Array.isArray(value)) {
    return [
      tag.split(":").at(-1)!,
      value.map((v) => normalized(tag, v, inherited)[1]),
    ];
  }
  const bindings = { ...inherited };
  if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value as Row)) {
      if (key === "@xmlns") bindings[""] = String(v);
      else if (key.startsWith("@xmlns:")) bindings[key.slice(7)] = String(v);
    }
  }
  const parts = tag.split(":");
  if (
    parts.length > 2 ||
    bindings[parts.length === 2 ? parts[0] : ""] !== namespace
  ) {
    throw new Error("Form 8801 prior copy has a non-IRS element namespace");
  }
  const local = parts.at(-1)!;
  if (!value || typeof value !== "object") return [local, value];
  const out: Row = {};
  for (const [key, v] of Object.entries(value as Row)) {
    if (key === "@xmlns" || key.startsWith("@xmlns:")) continue;
    if (key.startsWith("@") || key === "#text") {
      out[key] = v;
      continue;
    }
    const [name, child] = normalized(key, v, bindings);
    if (name in out) {
      throw new Error("Form 8801 prior copy has ambiguous duplicate elements");
    }
    out[name] = child;
  }
  return [local, out];
}

function text(record: Row, key: string): string {
  let value = record[key];
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const scalar = row(value, key);
    if (Object.keys(scalar).some((k) => !k.startsWith("@") && k !== "#text")) {
      throw new Error(`Form 8801 prior copy has nested ${key}`);
    }
    value = scalar["#text"];
  }
  if (typeof value !== "string" || !value || value.trim() !== value) {
    throw new Error(`Form 8801 prior copy needs exact ${key}`);
  }
  return value;
}
function dollars(record: Row, key: string, nonnegative = false): number {
  if (record[key] === undefined) return 0;
  const value = text(record, key);
  if (
    !/^(0|[1-9][0-9]*|-[1-9][0-9]*)$/.test(value) ||
    !Number.isSafeInteger(Number(value)) ||
    Math.abs(Number(value)) > 1_000_000_000 ||
    (nonnegative && Number(value) < 0)
  ) {
    throw new Error(`Form 8801 prior copy has invalid dollars in ${key}`);
  }
  return Number(value);
}

/** Reconcile reviewed 2024 Forms 6251/8801 to an exact retained return copy.
 * A matching digest/copy proves consistency, not issuer origin or IRS acceptance.
 * Other exclusion inventories, MTCNOL, MTFTCE, QEV and capital workpapers still
 * require separate provenance. No filing or accepted-ledger admission occurs. */
export async function inspectForm8801PriorReturnBytes(
  rawReview: unknown,
  rawBinding: unknown,
  rawDocuments: readonly SourceDocumentBytes[],
) {
  const review = form8801ReviewPackageSchema.parse(rawReview);
  const binding = form8801PriorReturnBindingSchema.parse(rawBinding);
  const documents = rawDocuments.map((d) => ({
    reference: d.reference,
    bytes: new Uint8Array(d.bytes),
  }));
  const verified = await VerifiedSourceDocuments.verify([binding], documents);
  const bytes = verified.getBytes(binding.reference)!;
  if (bytes.length > 5_000_000) {
    throw new Error("Form 8801 prior return is too large");
  }
  const xml = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (
    /<!DOCTYPE|<!ENTITY|<!\[CDATA\[/i.test(xml) ||
    XMLValidator.validate(xml) !== true
  ) {
    throw new Error("Form 8801 prior return XML is invalid");
  }
  const parsed = row(parser.parse(xml), "root");
  const roots = Object.entries(parsed).filter(([key]) => key !== "?xml");
  if (roots.length !== 1) {
    throw new Error("Form 8801 prior copy needs one return root");
  }
  const [name, normalizedRoot] = normalized(roots[0][0], roots[0][1], {});
  if (name !== "Return") throw new Error("Form 8801 prior copy needs Return");
  const root = row(normalizedRoot, "Return");
  const header = row(root.ReturnHeader, "ReturnHeader");
  const filer = row(header.Filer, "Filer");
  const data = row(root.ReturnData, "ReturnData");
  const f1040 = row(data.IRS1040, "IRS1040");
  const statuses = {
    single: "1",
    married_filing_jointly: "2",
    married_filing_separately: "3",
    head_of_household: "4",
    qualifying_surviving_spouse: "5",
  };
  if (
    text(header, "TaxYr") !== "2024" ||
    text(header, "TaxPeriodBeginDt") !== "2024-01-01" ||
    text(header, "TaxPeriodEndDt") !== "2024-12-31" ||
    text(header, "ReturnTypeCd") !== "1040" ||
    text(filer, "PrimarySSN") !== review.taxpayer_ssn ||
    text(f1040, "IndividualReturnFilingStatusCd") !==
      statuses[review.prior_filing_status]
  ) {
    throw new Error(
      "Form 8801 prior copy year, period, primary owner or status differs",
    );
  }
  if (
    review.prior_spouse_ssn !== undefined &&
    text(filer, "SpouseSSN") !== review.prior_spouse_ssn
  ) {
    throw new Error("Form 8801 prior copy spouse owner differs");
  }
  const ids = new Set<string>();
  for (const [tag, item] of Object.entries(data)) {
    if (tag.startsWith("@")) continue;
    for (const doc of Array.isArray(item) ? item : [item]) {
      const id = row(doc, tag)["@documentId"];
      if (id !== undefined) {
        if (typeof id !== "string" || ids.has(id)) {
          throw new Error("Form 8801 prior copy has duplicate document IDs");
        }
        ids.add(id);
      }
    }
  }
  const prior6251 = data.IRS6251 === undefined
    ? undefined
    : row(data.IRS6251, "IRS6251");
  if (
    prior6251
      ? text(prior6251, "@documentId") !== binding.form6251_document_id
      : binding.form6251_document_id !== undefined
  ) {
    throw new Error("Form 8801 prior Form 6251 document binding differs");
  }
  for (const [line, tag, sign] of form8801Prior6251Map) {
    const nonnegative = [
      "line2b",
      "line2e",
      "line2g",
      "line2h",
      "line10",
      "line11",
    ].includes(line);
    const amount = prior6251 ? dollars(prior6251, tag, nonnegative) * sign : 0;
    if (amount !== review.prior_form6251[line]) {
      throw new Error(`Form 8801 prior Form 6251 ${line} differs`);
    }
  }
  const prior8801 = data.IRS8801 === undefined
    ? undefined
    : row(data.IRS8801, "IRS8801");
  if (
    prior8801
      ? text(prior8801, "@documentId") !== binding.form8801_document_id
      : binding.form8801_document_id !== undefined
  ) {
    throw new Error("Form 8801 prior Form 8801 document binding differs");
  }
  const carry = prior8801
    ? dollars(prior8801, "AMTCrCarryforwardToNextYearAmt", true)
    : 0;
  if (carry !== review.prior_credit_carryforward.amount) {
    throw new Error("Form 8801 prior Form 8801 carry differs");
  }
  let minimumTaxForeignCreditAmountReconciled = false;
  if (
    review.minimum_tax_foreign_credit_exclusion_workpaper.method ===
      "without_form1116_election"
  ) {
    if (Object.keys(data).some((key) => key.startsWith("IRS1116"))) {
      throw new Error(
        "Form 8801 no-Form-1116 election conflicts with retained Form 1116 documents",
      );
    }
    const schedule3 = data.IRS1040Schedule3 === undefined
      ? undefined
      : row(data.IRS1040Schedule3, "IRS1040Schedule3");
    if (
      schedule3
        ? text(schedule3, "@documentId") !== binding.schedule3_document_id
        : binding.schedule3_document_id !== undefined
    ) {
      throw new Error("Form 8801 prior Schedule 3 document binding differs");
    }
    const foreignCredit = schedule3
      ? dollars(schedule3, "ForeignTaxCreditAmt", true)
      : 0;
    if (
      foreignCredit !==
        review.minimum_tax_foreign_credit_exclusion_workpaper.amount
    ) {
      throw new Error(
        "Form 8801 elected MTFTCE differs from prior Schedule 3 line 1",
      );
    }
    minimumTaxForeignCreditAmountReconciled = true;
  } else if (binding.schedule3_document_id !== undefined) {
    throw new Error(
      "Form 8801 prior Schedule 3 binding requires the reviewed no-Form-1116 election",
    );
  }
  return {
    review,
    prior_return_manifest: verified.manifest,
    priorForm6251AndCarryBytesReconciled: true as const,
    minimumTaxForeignCreditAmountReconciled,
    priorJointSpouseBytesReconciled:
      review.prior_filing_status === "married_filing_jointly",
    priorReturnBytesVerified: true as const,
    priorAcceptanceVerified: false as const,
    workpaperAuthenticityVerified: false as const,
    filingReady: false as const,
  };
}

export async function stageForm8801PriorBoundReturn(
  rawInputs: Readonly<Record<string, unknown>>,
  rawReviewBinding: unknown,
  rawReviewDocuments: readonly SourceDocumentBytes[],
  rawPriorBinding: unknown,
  rawPriorDocuments: readonly SourceDocumentBytes[],
) {
  const inputs = structuredClone(rawInputs),
    reviewBinding = structuredClone(rawReviewBinding),
    priorBinding = structuredClone(rawPriorBinding);
  const copy = (docs: readonly SourceDocumentBytes[]) =>
    docs.map((d) => ({
      reference: d.reference,
      bytes: new Uint8Array(d.bytes),
    }));
  const reviewDocuments = copy(rawReviewDocuments),
    priorDocuments = copy(rawPriorDocuments);
  if (
    row(reviewBinding, "review binding").reference ===
      row(priorBinding, "prior binding").reference
  ) {
    throw new Error(
      "Form 8801 review and prior-return references must be distinct",
    );
  }
  const result = await stageForm8801SettledReturn(
    inputs,
    reviewBinding,
    reviewDocuments,
  );
  const inspected = await inspectForm8801PriorReturnBytes(
    result.reviewed_calculation_source,
    priorBinding,
    priorDocuments,
  );
  return { ...result, ...inspected };
}
