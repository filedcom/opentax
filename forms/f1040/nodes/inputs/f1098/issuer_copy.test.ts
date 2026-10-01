import { assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { verifyForm1098IssuerCopy } from "./issuer_copy.ts";

const item = {
  lender_name: "Test Mortgage Bank",
  recipient_tin: "111-22-3333",
  source_document_reference: "2025 lender Form 1098 account 001",
  box1_mortgage_interest: 18_000,
  box1_current_year_deductible_interest: 18_000,
  box1_deduction_workpaper_reference: "Pub 936 mortgage workpaper",
  box4_refund_overpaid: 2_000,
  box4_prior_year_refund: true,
  box4_taxable_recovery_verified_amount: 1_200,
  box4_recovery_workpaper_reference: "Pub 525 recovery workpaper",
  box6_points_paid: 2_400,
  box6_current_year_deductible_points: 2_400,
  box6_deduction_workpaper_reference: "Pub 936 points workpaper",
};

async function copy(box1 = "18000", includeBox6 = true): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  const form = pdf.getForm();
  const prefix = "topmostSubform[0].CopyB[0]";
  const values: Record<string, string> = {
    [`${prefix}.CopyHeader[0].CalendarYear[0].f2_1[0]`]: "25",
    [`${prefix}.LeftCol[0].f2_2[0]`]: "Test Mortgage Bank\n1 Bank St",
    [`${prefix}.LeftCol[0].f2_4[0]`]: "***-**-3333",
    [`${prefix}.RightCol[0].f2_11[0]`]: box1,
    [`${prefix}.RightCol[0].f2_12[0]`]: "",
    [`${prefix}.RightCol[0].f2_13[0]`]: "",
    [`${prefix}.RightCol[0].f2_14[0]`]: "2000",
    [`${prefix}.RightCol[0].f2_15[0]`]: "",
    ...(includeBox6 ? { [`${prefix}.RightCol[0].f2_16[0]`]: "2400" } : {}),
  };
  for (const [name, value] of Object.entries(values)) {
    form.createTextField(name).setText(value);
  }
  return pdf.save();
}

async function review(bytes: Uint8Array) {
  const sha256 = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  return {
    source_document_reference: item.source_document_reference,
    file_name: "Lender1098.pdf",
    pdf_sha256: sha256,
  };
}

Deno.test("Form 1098 official Copy B fields bind reviewed bytes and tax boxes", async () => {
  const bytes = await copy();
  await verifyForm1098IssuerCopy(
    item,
    await review(bytes),
    bytes,
    "Lender1098.pdf",
  );
  const changed = await copy("17999");
  const reviewForChanged = await review(changed);
  await assertRejects(
    () =>
      verifyForm1098IssuerCopy(item, reviewForChanged, bytes, "Lender1098.pdf"),
    Error,
    "exact PDF SHA-256",
  );
  await assertRejects(
    () =>
      verifyForm1098IssuerCopy(
        item,
        reviewForChanged,
        changed,
        "Lender1098.pdf",
      ),
    Error,
    "box1_mortgage_interest differs",
  );
  const missing = await copy("18000", false);
  const reviewForMissing = await review(missing);
  await assertRejects(
    () =>
      verifyForm1098IssuerCopy(
        item,
        reviewForMissing,
        missing,
        "Lender1098.pdf",
      ),
    Error,
    "lacks readable Copy B field",
  );
});
