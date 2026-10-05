import { PDFDocument, StandardFonts } from "pdf-lib";
import type { MefPdfAttachment } from "../mef/form-descriptor.ts";
import { sha256Hex } from "../prepared-source.ts";

const issuedOn = new Date("2025-12-31T12:00:00Z");
const records = [
  ["decree-1", "Final adoption decree", [
    "Child: Ada Example; SSN: 111223334",
    "Adoptive parent: Alex Example; SSN: 111223333",
    "Finalized: 2025-07-15; jurisdiction: TX; origin: US",
  ]],
  ["birth-1", "Birth record", [
    "Child: Ada Example; born: 2020-02-01",
  ]],
  ["invoice-1", "Adoption counsel invoice", [
    "Case: case-TX-2025-1; payee: Adoption Counsel",
    "Attorney fee: USD 11,000; paid: 2025-03-12",
  ]],
  ["payment-1", "Adoption counsel payment proof", [
    "Case: case-TX-2025-1; paid: 2025-03-12",
    "Payee: Adoption Counsel; amount: USD 11,000",
  ]],
] as const;

async function syntheticPdf(lines: readonly string[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create({ updateMetadata: false });
  pdf.setCreationDate(issuedOn);
  pdf.setModificationDate(issuedOn);
  pdf.setProducer("OpenTax synthetic review fixture");
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText("SYNTHETIC FORM 8839 REVIEW EVIDENCE", {
    x: 48,
    y: 740,
    size: 14,
    font,
  });
  for (const [index, line] of lines.entries()) {
    page.drawText(line, { x: 48, y: 700 - index * 24, size: 11, font });
  }
  return await pdf.save();
}

export const adoptionReviewAttachments: readonly MefPdfAttachment[] =
  await Promise.all(records.map(async ([id, description, lines]) => ({
    fileName: `${id}.pdf`,
    description: `Synthetic Form 8839 ${description}`,
    bytes: await syntheticPdf(lines),
  })));

const hashes = Object.fromEntries(
  await Promise.all(
    adoptionReviewAttachments.map(async (attachment, index) =>
      [
        records[index][0],
        await sha256Hex(attachment.bytes),
      ] as const
    ),
  ),
);

export const adoptionReviewSource = {
  filing_status: "single" as const,
  adoption_benefits: 0,
  children: [{
    first_name: "Ada",
    last_name: "Example",
    birth_year: 2020,
    ssn: "111223334",
    final_decree: {
      source_document_id: "decree-1",
      finalization_date: "2025-07-15",
      issuing_jurisdiction: "TX",
      child_origin: "US" as const,
    },
    expenses: [{
      source_document_id: "invoice-1",
      paid_date: "2025-03-12",
      category: "attorney_fee" as const,
      payee: "Adoption Counsel",
      amount: 11_000,
      reimbursed_amount: 0,
    }],
  }],
  reviewed_source: {
    reviewed_by: "Synthetic Adoption Reviewer",
    reviewed_on: "2026-04-01",
    adoption_case_reference: "case-TX-2025-1",
    decree: {
      source_document_id: "decree-1",
      document_sha256: hashes["decree-1"],
      child_first_name: "Ada",
      child_last_name: "Example",
      child_ssn: "111223334",
      finalization_date: "2025-07-15",
      issuing_jurisdiction: "TX",
      child_origin: "US" as const,
      taxpayer_named_as_adoptive_parent_confirmed: true as const,
    },
    birth_record: {
      source_document_id: "birth-1",
      document_sha256: hashes["birth-1"],
      child_first_name: "Ada",
      child_last_name: "Example",
      date_of_birth: "2020-02-01",
    },
    reviewed_facts: {
      child_us_citizen_or_resident_when_effort_began_confirmed: true as const,
      child_under_18_on_2025_12_31_confirmed: true as const,
      child_not_taxpayers_spouses_child_confirmed: true as const,
      no_other_nonspouse_taxpayer_claim_confirmed: true as const,
      no_prior_form8839_claim_for_child_confirmed: true as const,
      no_employer_adoption_benefits_confirmed: true as const,
      all_reimbursements_disclosed_confirmed: true as const,
      no_other_federal_credit_or_deduction_for_expenses_confirmed:
        true as const,
      no_surrogacy_or_illegal_expenses_confirmed: true as const,
    },
    expenses: [{
      source_document_id: "invoice-1",
      receipt_sha256: hashes["invoice-1"],
      payment_proof_document_id: "payment-1",
      payment_proof_sha256: hashes["payment-1"],
      paid_date: "2025-03-12",
      category: "attorney_fee" as const,
      payee: "Adoption Counsel",
      amount: 11_000,
      directly_related_to_legal_adoption_confirmed: true as const,
    }],
  },
  magi_review: {
    reviewed_by: "Synthetic Return Reviewer",
    reviewed_on: "2026-04-01",
    section933: {
      no_puerto_rico_excluded_income_confirmed: true as const,
      return_wide_review_reference: "territory-review",
    },
    form2555: {
      no_form2555_filing_or_exclusion_confirmed: true as const,
      return_wide_review_reference: "foreign-income-review",
    },
    form4563: {
      no_form4563_filing_or_exclusion_confirmed: true as const,
      return_wide_review_reference: "territory-return-review",
    },
  },
  documents: records.map(([id], index) => ({
    source_document_id: id,
    file_name: adoptionReviewAttachments[index].fileName,
    description: adoptionReviewAttachments[index].description,
    sha256: hashes[id],
  })),
};
