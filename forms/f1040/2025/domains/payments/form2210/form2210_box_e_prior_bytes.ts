import { XMLParser, XMLValidator } from "fast-xml-parser";
import { VerifiedSourceDocuments } from "../../../../../../core/runtime/source-documents.ts";
import {
  type Form2210BoxEInput,
  form2210BoxEInputSchema,
} from "./form2210_box_e.ts";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false,
  processEntities: false,
});

function row(raw: unknown, label: string): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(`Form 2210 box E needs one ${label} in the 2024 return`);
  }
  return raw as Record<string, unknown>;
}

function exact(record: Record<string, unknown>, key: string): string {
  const found = record[key];
  if (typeof found !== "string" || found.trim() !== found || !found) {
    throw new Error(`Form 2210 box E needs exact 2024 ${key}`);
  }
  return found;
}

function amount(record: Record<string, unknown>, key: string): number {
  const raw = record[key];
  if (raw === undefined) return 0;
  const found = exact(record, key);
  if (!/^(0|[1-9][0-9]*)$/.test(found) || !Number.isSafeInteger(+found)) {
    throw new Error(`Form 2210 box E has invalid 2024 ${key}`);
  }
  return +found;
}

export type Form2210BoxEPriorIdentity = Readonly<{
  taxpayer_ssn: string;
  spouse_ssn: string;
}>;

/** Inspect both retained 2024 MeF return copies against the page-1 source.
 * Digest verification binds actual bytes, but an archive's IRS origin and
 * acceptance still need separate authentication before public export. */
export async function inspectForm2210BoxEPriorReturnBytes(
  rawSource: unknown,
  identity: Form2210BoxEPriorIdentity,
  documents: ReadonlyArray<{ reference: string; bytes: Uint8Array }>,
): Promise<Form2210BoxEInput> {
  const source = form2210BoxEInputSchema.parse(rawSource);
  if (
    !/^\d{9}$/.test(identity.taxpayer_ssn) ||
    !/^\d{9}$/.test(identity.spouse_ssn) ||
    identity.taxpayer_ssn === identity.spouse_ssn
  ) {
    throw new Error("Form 2210 box E needs distinct current filer SSNs");
  }
  const verified = await VerifiedSourceDocuments.verify(
    source.prior_separate_returns.map((prior) => ({
      reference: prior.filed_return_reference,
      sha256: prior.filed_return_sha256,
    })),
    documents,
  );
  for (const prior of source.prior_separate_returns) {
    const bytes = verified.getBytes(prior.filed_return_reference);
    if (!bytes || bytes.length > 5_000_000) {
      throw new Error("Form 2210 box E prior return bytes are unavailable");
    }
    const xml = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (
      /<!DOCTYPE|<!ENTITY|<!\[CDATA\[/i.test(xml) ||
      XMLValidator.validate(xml) !== true
    ) {
      throw new Error("Form 2210 box E prior return XML is invalid");
    }
    const parsed = row(parser.parse(xml), "Return root");
    if (Object.keys(parsed).filter((key) => key !== "?xml").length !== 1) {
      throw new Error("Form 2210 box E prior return needs one XML root");
    }
    const root = row(parsed.Return, "Return");
    const header = row(root.ReturnHeader, "ReturnHeader");
    const filer = row(header.Filer, "Filer");
    const data = row(root.ReturnData, "ReturnData");
    const f1040 = row(data.IRS1040, "IRS1040");
    const expectedSsn = prior.owner === "taxpayer"
      ? identity.taxpayer_ssn
      : identity.spouse_ssn;
    if (
      root["@xmlns"] !== "http://www.irs.gov/efile" ||
      exact(header, "TaxYr") !== "2024" ||
      exact(header, "TaxPeriodBeginDt") !== "2024-01-01" ||
      exact(header, "TaxPeriodEndDt") !== "2024-12-31" ||
      exact(header, "ReturnTypeCd") !== "1040" ||
      exact(filer, "PrimarySSN") !== expectedSsn ||
      exact(f1040, "IndividualReturnFilingStatusCd") !== "3" ||
      amount(f1040, "AdjustedGrossIncomeAmt") !==
        prior.adjusted_gross_income ||
      amount(f1040, "TaxLessCreditsAmt") !==
        prior.line22_tax_after_credits ||
      amount(f1040, "TotalOtherTaxesAmt") !== 0 ||
      amount(f1040, "RefundableCreditsAmt") !== 0 ||
      amount(f1040, "TotalTaxAmt") !== prior.line22_tax_after_credits
    ) {
      throw new Error(
        "Form 2210 box E filed 2024 status, filer, period, tax, or credits differ",
      );
    }
  }
  return source;
}
