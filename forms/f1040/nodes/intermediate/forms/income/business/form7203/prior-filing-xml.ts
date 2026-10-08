import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { VerifiedSourceDocuments } from "../../../../../../../../core/runtime/source-documents.ts";
import type { ReviewedPriorReducedNote } from "./prior-reduced-note.ts";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false,
  processEntities: false,
});

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Form 7203 prior filing needs one ${label} XML element`);
  }
  return value as Record<string, unknown>;
}

function value(row: Record<string, unknown>, key: string): string {
  const found = row[key];
  if (
    typeof found !== "string" || found.length === 0 || found !== found.trim()
  ) {
    throw new Error(`Form 7203 prior filing needs one exact ${key} XML value`);
  }
  return found;
}

function amount(row: Record<string, unknown>, key: string): number {
  const found = value(row, key);
  if (
    !/^(0|[1-9][0-9]*)$/.test(found) || !Number.isSafeInteger(Number(found))
  ) {
    throw new Error(`Form 7203 prior filing has invalid ${key} amount`);
  }
  return Number(found);
}

function assertMeFNamespaceTree(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertMeFNamespaceTree);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, child] of Object.entries(value)) {
    if (key === "@xmlns") {
      if (child !== "http://www.irs.gov/efile") {
        throw new Error(
          "Form 7203 prior filing contains a foreign XML namespace",
        );
      }
    } else if (!key.startsWith("@") && key.includes(":")) {
      throw new Error(
        "Form 7203 prior filing contains unsupported prefixed XML",
      );
    } else {
      assertMeFNamespaceTree(child);
    }
  }
}

// Attribute and element order does not change a parsed copy. The separate root
// needs its namespace declaration; its other content must equal the embedded copy.
function canonicalFormContent(value: unknown): string {
  function normalize(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(normalize);
    if (typeof value !== "object" || value === null) return value;
    return Object.fromEntries(
      Object.entries(value).filter(([key]) => key !== "@xmlns")
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, normalize(child)]),
    );
  }
  return JSON.stringify(normalize(value));
}

function xml(
  documents: VerifiedSourceDocuments,
  reference: string,
  rootName: string,
): Record<string, unknown> {
  const bytes = documents.getBytes(reference);
  if (!bytes || bytes.length > 5_000_000) {
    throw new Error(
      `Form 7203 prior ${rootName} XML bytes are missing or oversized`,
    );
  }
  const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (
    /<!DOCTYPE|<!ENTITY|<!\[CDATA\[/i.test(content) ||
    XMLValidator.validate(content) !== true
  ) {
    throw new Error(
      `Form 7203 prior ${rootName} XML is malformed or unsupported`,
    );
  }
  const parsed = record(parser.parse(content), rootName);
  if (Object.keys(parsed).filter((key) => key !== "?xml").length !== 1) {
    throw new Error(`Form 7203 prior ${rootName} XML needs one root`);
  }
  const root = record(parsed[rootName], rootName);
  if (root["@xmlns"] !== "http://www.irs.gov/efile") {
    throw new Error(`Form 7203 prior ${rootName} XML needs the MeF namespace`);
  }
  assertMeFNamespaceTree(root);
  return root;
}

function reviewedForm7203(
  raw: unknown,
  source: ReviewedPriorReducedNote,
): void {
  const form = record(raw, "IRS7203");
  const debt = record(form.ShareholderDebtBasisGrp, "formal-note debt group");
  if (
    value(form, "ShareholderSSN") !== source.shareholder_ssn ||
    value(form, "SCorporationEIN") !== source.corporation_ein ||
    value(debt, "FormalNoteInd") !== "X" ||
    amount(form, "StockBasisEndTaxYearAmt") !==
      source.beginning_stock_basis ||
    amount(debt, "LoanBalanceEndTaxYrAmt") !==
      source.prior_form7203_line20_ending_face ||
    amount(debt, "DebtBasisEndTaxYrAmt") !==
      source.prior_form7203_line31_ending_basis ||
    amount(form, "TotLoanBalanceEndTaxYrAmt") !==
      source.prior_form7203_line20_ending_face ||
    amount(form, "TotDebtBasisEndTaxYrAmt") !==
      source.prior_form7203_line31_ending_basis
  ) {
    throw new Error(
      "Form 7203 prior filed shareholder, corporation, stock, or note balances differ",
    );
  }
}

/**
 * Readable MeF XML content check only. This does not prove the bytes came from
 * the IRS or that the acknowledgment corresponds to an archived transmission.
 */
export function inspectPrior7203MeFXml(
  source: ReviewedPriorReducedNote,
  documents: VerifiedSourceDocuments,
) {
  const filed = xml(documents, source.prior_filed_return_reference, "Return");
  const header = record(filed.ReturnHeader, "ReturnHeader");
  const filer = record(header.Filer, "Filer");
  const returnData = record(filed.ReturnData, "ReturnData");
  if (
    value(header, "TaxYr") !== "2024" ||
    value(header, "TaxPeriodEndDt") !== "2024-12-31" ||
    value(header, "ReturnTypeCd") !== "1040" ||
    value(filer, "PrimarySSN") !== source.shareholder_ssn ||
    returnData.IRS1040 === undefined
  ) {
    throw new Error("Form 7203 prior return year, type, or filer differs");
  }
  reviewedForm7203(returnData.IRS7203, source);

  const copy = xml(
    documents,
    source.prior_filed_form7203_reference,
    "IRS7203",
  );
  reviewedForm7203(copy, source);
  if (canonicalFormContent(returnData.IRS7203) !== canonicalFormContent(copy)) {
    throw new Error(
      "Form 7203 separate filed copy differs from the complete embedded return form",
    );
  }

  const manifest = xml(
    documents,
    source.prior_submission_manifest_reference,
    "IRSSubmissionManifest",
  );
  if (
    value(manifest, "SubmissionId") !== source.prior_submission_id ||
    value(manifest, "TIN") !== source.shareholder_ssn ||
    value(manifest, "TaxYr") !== "2024" ||
    value(manifest, "GovernmentCd") !== "IRS" ||
    value(manifest, "FederalSubmissionTypeCd") !== "1040"
  ) {
    throw new Error(
      "Form 7203 prior manifest differs from the claimed submission",
    );
  }
  // MeF's ordinary manifest does not contain the submitted Return XML digest.
  // Compare this exact optional extension when a retained archive supplies it;
  // absence remains explicit and never authenticates a submission.
  const manifestReturnDigest = manifest.SubmissionXmlSha256;
  if (
    manifestReturnDigest !== undefined &&
    (typeof manifestReturnDigest !== "string" ||
      !/^[a-f0-9]{64}$/.test(manifestReturnDigest) ||
      manifestReturnDigest !== source.prior_filed_return_sha256)
  ) {
    throw new Error("Form 7203 prior manifest Return XML digest differs");
  }

  const acknowledgement = xml(
    documents,
    source.prior_accepted_acknowledgement_reference,
    "Acknowledgement",
  );
  if (
    value(acknowledgement, "SubmissionId") !== source.prior_submission_id ||
    value(acknowledgement, "TIN") !== source.shareholder_ssn ||
    value(acknowledgement, "TaxYear") !== "2024" ||
    value(acknowledgement, "GovernmentCode") !== "IRS" ||
    value(acknowledgement, "SubmissionType") !== "1040" ||
    value(acknowledgement, "SubmissionCategory") !== "IND" ||
    value(acknowledgement, "TaxPeriodEndDate") !== "2024-12-31" ||
    value(acknowledgement, "AcceptanceStatus") !== "Accepted" ||
    value(acknowledgement, "CompletedValidation") !== "true" ||
    acknowledgement.ErrorList !== undefined
  ) {
    throw new Error(
      "Form 7203 prior acknowledgment lacks a matching accepted 2024 return",
    );
  }
  return {
    submissionId: source.prior_submission_id,
    taxpayerSsn: source.shareholder_ssn,
    taxYear: 2024,
    noteFace: source.opening_note_face_amount,
    noteBasis: source.opening_note_debt_basis,
    parsedAcknowledgmentStatus: "Accepted" as const,
    returnDigestLinkedToManifest: manifestReturnDigest !== undefined,
    separateFormMatchesEmbeddedContent: true as const,
    issuerAuthenticated: false as const,
  };
}
