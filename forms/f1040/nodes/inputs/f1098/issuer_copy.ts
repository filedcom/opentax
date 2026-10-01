import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import { inputSchema, itemSchema } from "./index.ts";

export const form1098IssuerCopyReviewSchema = z.object({
  source_document_reference: z.string().trim().min(1),
  file_name: z.string().trim().regex(/^[^/\\]+\.pdf$/i),
  pdf_sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

const copyB = "topmostSubform[0].CopyB[0]";
const headerYear = `${copyB}.CopyHeader[0].CalendarYear[0].f2_1[0]`;
const left = `${copyB}.LeftCol[0]`;
const right = `${copyB}.RightCol[0]`;

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

function amount(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

/**
 * Read the official 2025 Form 1098 Copy B AcroForm from exact reviewed bytes.
 * Scans and flattened copies have no readable fields and intentionally reject.
 */
export async function verifyForm1098IssuerCopy(
  rawItem: unknown,
  rawReview: unknown,
  bytes: Uint8Array,
  fileName: string,
): Promise<void> {
  const item = itemSchema.parse(rawItem);
  const review = form1098IssuerCopyReviewSchema.parse(rawReview);
  const digest = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  if (
    !item.source_document_reference ||
    item.source_document_reference !== review.source_document_reference ||
    fileName !== review.file_name || digest !== review.pdf_sha256
  ) {
    throw new Error(
      "Form 1098 issuer copy needs matching source, file, and exact PDF SHA-256",
    );
  }
  let form: ReturnType<PDFDocument["getForm"]>;
  try {
    form = (await PDFDocument.load(bytes)).getForm();
  } catch {
    throw new Error("Form 1098 issuer copy needs a readable unencrypted PDF");
  }
  const field = (name: string): string => {
    try {
      return form.getTextField(name).getText()?.trim() ?? "";
    } catch {
      throw new Error(
        `Form 1098 issuer copy lacks readable Copy B field ${name}`,
      );
    }
  };
  const year = digits(field(headerYear));
  const lender = field(`${left}.f2_2[0]`).split(/\r?\n/)[0]?.trim() ?? "";
  const borrowerTin = digits(field(`${left}.f2_4[0]`));
  if (
    (year !== "25" && year !== "2025") ||
    !item.lender_name ||
    lender.toUpperCase() !== item.lender_name.trim().toUpperCase() ||
    !item.recipient_tin ||
    (borrowerTin !== digits(item.recipient_tin) &&
      borrowerTin !== digits(item.recipient_tin).slice(-4))
  ) {
    throw new Error(
      "Form 1098 issuer Copy B year, lender, or borrower TIN differs from source",
    );
  }
  const boxes = [
    [
      "box1_mortgage_interest",
      `${right}.f2_11[0]`,
      item.box1_mortgage_interest,
    ],
    [
      "box2_outstanding_principal",
      `${right}.f2_12[0]`,
      item.box2_outstanding_principal,
    ],
    ["box4_refund_overpaid", `${right}.f2_14[0]`, item.box4_refund_overpaid],
    ["box5_mip", `${right}.f2_15[0]`, item.box5_mip],
    ["box6_points_paid", `${right}.f2_16[0]`, item.box6_points_paid],
  ] as const;
  for (const [label, name, expected] of boxes) {
    const printed = amount(field(name));
    if (expected === undefined ? printed !== undefined : printed !== expected) {
      throw new Error(`Form 1098 issuer Copy B ${label} differs from source`);
    }
  }
  const printed = field(`${right}.f2_13[0]`);
  if (item.box3_origination_date === undefined) {
    if (printed !== "") {
      throw new Error("Form 1098 issuer Copy B box 3 date differs from source");
    }
  } else {
    const sourceDate = item.box3_origination_date.replace(/\D/g, "");
    if (
      digits(printed) !== sourceDate &&
      digits(printed) !== `${sourceDate.slice(4)}${sourceDate.slice(0, 4)}`
    ) {
      throw new Error("Form 1098 issuer Copy B box 3 date differs from source");
    }
  }
}

/** Bind every positive box 6 source in the prepared Form 1098 input. */
export async function assertForm1098IssuerCopies(
  pending: Record<string, unknown>,
): Promise<void> {
  const raw = pending.f1098;
  if (raw === undefined) return;
  const { f1098s } = inputSchema.parse(raw);
  for (const item of f1098s) {
    if ((item.box6_points_paid ?? 0) <= 0) continue;
    if (!item.issuer_copy) {
      throw new Error(
        "Positive Form 1098 box 6 needs the reviewed issuer Copy B bytes",
      );
    }
    await verifyForm1098IssuerCopy(
      item,
      {
        source_document_reference: item.source_document_reference,
        file_name: item.issuer_copy.file_name,
        pdf_sha256: item.issuer_copy.pdf_sha256,
      },
      item.issuer_copy.bytes,
      item.issuer_copy.file_name,
    );
  }
}
