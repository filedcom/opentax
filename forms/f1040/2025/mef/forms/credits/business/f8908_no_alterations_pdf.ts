import { PDFDocument } from "pdf-lib";
import {
  type Form8908Source,
  form8908SourceSchema,
} from "../../../../domains/credits/business/form8908/form8908_source.ts";

function normalized(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

function formDate(iso: string): string {
  return `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}`;
}

const noAlterationsText =
  "No alterations or repairs were performed to the facility during the tax year.";
const perjuryDeclarationText =
  "Under penalties of perjury, I declare that I have examined this statement, including accompanying documents, and to the best of my knowledge and belief, the facts presented in support of this statement are true, correct, and complete.";

/** Check the exact staged statement PDF's AcroForm identity and date fields. */
export async function assertForm8908NoAlterationsStatementPdf(
  raw: Form8908Source,
  acquisitionRecordReference: string,
  pdfBytes: Uint8Array,
): Promise<void> {
  const source = form8908SourceSchema.parse(raw);
  const home = source.homes.find((candidate) =>
    candidate.acquisition_record_reference === acquisitionRecordReference
  );
  if (!home?.form7220) {
    throw new Error("Form 8908 signed statement has no matching PWA home");
  }
  const statement = home.form7220.signed_no_alterations_statement;
  const digest = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", Uint8Array.from(pdfBytes)),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  if (digest !== statement.pdf_sha256) {
    throw new Error(
      "Form 8908 signed statement differs from reviewed exact bytes",
    );
  }
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(pdfBytes);
  } catch {
    throw new Error("Form 8908 signed statement is not a readable PDF");
  }
  if (pdf.getPageCount() < 1) {
    throw new Error("Form 8908 signed statement has no pages");
  }
  const form = pdf.getForm();
  const prefix = "Form7220NoAlterationsStatement.";
  const requireText = (key: string, expected: string) => {
    let actual: string;
    try {
      actual = form.getTextField(`${prefix}${key}`).getText() ?? "";
    } catch {
      throw new Error(`Form 8908 signed statement lacks readable ${key}`);
    }
    if (normalized(actual) !== normalized(expected)) {
      throw new Error(
        `Form 8908 signed statement ${key} differs from reviewed source`,
      );
    }
  };
  const requireTin = (key: string, expected: string) => {
    let actual: string;
    try {
      actual = form.getTextField(`${prefix}${key}`).getText() ?? "";
    } catch {
      throw new Error(`Form 8908 signed statement lacks readable ${key}`);
    }
    if (actual.replace(/\D/g, "") !== expected) {
      throw new Error(
        `Form 8908 signed statement ${key} differs from reviewed taxpayer`,
      );
    }
  };
  const requireMark = (key: string) => {
    try {
      if (!form.getCheckBox(`${prefix}${key}`).isChecked()) {
        throw new Error("unchecked");
      }
    } catch {
      throw new Error(`Form 8908 signed statement lacks required ${key} mark`);
    }
  };
  requireText("TaxpayerName", home.form7220.reviewed_record.taxpayer_name);
  requireTin("TaxpayerTIN", home.form7220.reviewed_record.taxpayer_tin);
  requireText(
    "FacilityDescription",
    home.form7220.reviewed_record.facility_description,
  );
  requireText("OwnerName", statement.owner_name);
  requireText(
    "HomeStreet",
    `${home.street}${home.unit ? ` ${home.unit}` : ""}`,
  );
  requireText("HomeCityStateZIP", `${home.city}, ${home.state} ${home.zip}`);
  requireText("AcquiredOn", formDate(home.acquired_on));
  requireText("Form7220ReviewReference", home.form7220.review_reference);
  requireText("AcquisitionRecordReference", home.acquisition_record_reference);
  requireText("StatementReviewReference", statement.review_reference);
  requireText("SignerName", statement.signer_name);
  requireText("SignedOn", formDate(statement.signed_on));
  requireText("NoAlterationsText", noAlterationsText);
  requireText("PerjuryDeclarationText", perjuryDeclarationText);
  requireMark("NoAlterationsOrRepairs");
  requireMark("PerjuryDeclarationAcknowledged");
  // These fields establish that reviewed source facts are present in the
  // exact PDF. They cannot authenticate a handwritten or digital signature.
}
