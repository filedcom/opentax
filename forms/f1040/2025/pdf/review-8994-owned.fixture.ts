import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  form8994DirectEmployer,
  form8994MatchedPending,
} from "../../nodes/inputs/f8994/fixture.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import { sha256Hex } from "../prepared-source.ts";
import type { PdfReviewFixture } from "./review-fixtures.ts";
import type { MefPdfAttachment } from "../mef/form-descriptor.ts";

const source = structuredClone(form8994DirectEmployer);
const evidence = source.reviewed_evidence;
const documents = [
  evidence.written_policy,
  evidence.schedule_c_wage_ledger,
  ...evidence.employee_records.flatMap(
    (row) => [row.leave_payroll, row.prior_2024_compensation],
  ),
];
/** Deterministic, explicitly synthetic copies of all reviewed source facts. */
async function evidencePdf(
  record: typeof documents[number],
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create({ updateMetadata: false });
  pdf.setCreationDate(new Date("2025-12-31T12:00:00Z"));
  pdf.setModificationDate(new Date("2025-12-31T12:00:00Z"));
  pdf.setProducer("OpenTax synthetic Form8994 source review");
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText("SYNTHETIC FORM 8994 REVIEW RECORD", {
    x: 36,
    y: 750,
    size: 13,
    font,
  });
  const { sha256: _hash, ...facts } = record;
  const text = JSON.stringify(facts, null, 2);
  const lines = text.split("\n").flatMap((line) =>
    line.match(/.{1,94}/g) ?? [""]
  );
  let y = 720;
  let current = page;
  for (const line of lines) {
    if (y < 42) {
      current = pdf.addPage([612, 792]);
      y = 750;
    }
    current.drawText(line, { x: 36, y, size: 9, font });
    y -= 13;
  }
  return pdf.save();
}
export const form8994OwnedAttachments: readonly MefPdfAttachment[] =
  await Promise.all(documents.map(async (record) => {
    const bytes = await evidencePdf(record);
    record.sha256 = await sha256Hex(bytes);
    return {
      fileName: record.attachment_file_name,
      description: `Form8994 synthetic record ${record.document_reference}`,
      bytes,
    };
  }));

export function form8994OwnedInputs(receipts = 100000) {
  return {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_ssn: "123456789",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Example Way",
      address_city: "Boise",
      address_state: "ID",
      address_zip: "83702",
      digital_assets: false,
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    f8994: structuredClone(source),
    schedule_c: form8994MatchedPending.schedule_c.schedule_cs.map((c) => ({
      ...c,
      line_1_gross_receipts: receipts,
      line_32_at_risk: "a",
      line_i_made_1099_payments: false,
      qbi_specified_service: false,
      qbi_no_other_adjustments_confirmed: true,
    })),
  };
}
export function form8994OwnedReviewFixture(
  kind: "full" | "partial" | "zero",
): PdfReviewFixture {
  const inputs = form8994OwnedInputs(
    kind === "full" ? 100000 : kind === "partial" ? 75000 : 65000,
  );
  return {
    id: `single-form8994-direct-employer-${kind}`,
    inputs,
    filer: extractFilerIdentity(inputs.general)!,
    attachments: form8994OwnedAttachments,
    expectedPdfForms: [
      "f1040",
      "schedule1",
      "schedule2",
      ...(kind === "zero" ? [] : ["schedule3"]),
      "schedule_c",
      "schedule_se",
      "f3800",
      "form6251",
      "form8995",
      "f8994",
    ],
    reviewFocus: [
      "Actual policy, two employee leave payroll and prior compensation records bind six validated PDF attachment bytes and determine credit1250",
      "Gross payroll50000 retains source; full credit1250 reduces wage deduction to48750 before SE/QBI regardless current tax use",
      `Actual ${kind} tax-use allocation joins Form3800 III4j/V, Schedule3/1040; no prior carryover acceptance asserted`,
    ],
  };
}
