import { PDFDocument } from "pdf-lib";
import { inputSchema } from "../../nodes/inputs/w2g/index.ts";
import { w2gPdf } from "../pdf/forms/w2g.ts";
import type { FilerIdentity } from "../../mef/header.ts";
import type { MefPdfAttachment } from "./form-descriptor.ts";
import type { MefFormsPending } from "./types.ts";

function normalized(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").toUpperCase();
}

function digits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function sameField(key: string, expected: unknown, actual: string): boolean {
  if (expected === undefined || expected === null) {
    return actual.trim() === "";
  }
  if (key === "year") {
    return digits(actual) === "25" || digits(actual) === "2025";
  }
  if (key === "payer_ein" || key === "winner_tin") {
    return digits(actual) === digits(expected);
  }
  if (typeof expected === "number") {
    if (actual.trim() === "") return false;
    const number = Number(actual.replace(/[$,\s]/g, ""));
    return Number.isFinite(number) && number === expected;
  }
  return normalized(actual) === normalized(expected);
}

/** Compare exact submitted payer-copy bytes with every modeled Copy B value. */
export async function assertW2GPayerCopyContents(
  pending: MefFormsPending,
  filer: FilerIdentity | undefined,
  attachments: ReadonlyArray<MefPdfAttachment>,
): Promise<void> {
  if (!pending.w2g) return;
  const source = inputSchema.parse(pending.w2g);
  const active = source.w2gs.filter((item) =>
    (item.box4_federal_withheld ?? 0) > 0
  );
  if (active.length === 0) return;
  const projected = w2gPdf.instances?.(
    source,
    filer,
    pending as Readonly<Record<string, Record<string, unknown>>>,
  );
  if (!projected || projected.length !== active.length) {
    throw new Error(
      "W-2G payer copy needs the reconciled recipient projection",
    );
  }
  for (const [index, item] of active.entries()) {
    const attachment = attachments.find((candidate) =>
      candidate.fileName === item.issued_copy_attachment_file_name
    );
    if (!attachment) {
      throw new Error("W-2G payer copy content needs its exact attached PDF");
    }
    const pdf = await PDFDocument.load(attachment.bytes);
    const form = pdf.getForm();
    for (const field of w2gPdf.fields) {
      if (field.kind !== "text" || field.domainKey === "payer_phone") {
        continue;
      }
      let actual: string;
      try {
        actual = form.getTextField(field.pdfField).getText() ?? "";
      } catch {
        throw new Error(
          `W-2G payer copy needs a readable official Copy B ${field.domainKey} field`,
        );
      }
      if (
        !sameField(field.domainKey, projected[index]?.[field.domainKey], actual)
      ) {
        throw new Error(
          `W-2G payer copy ${field.domainKey} differs from the sourced filing value`,
        );
      }
    }
  }
}
