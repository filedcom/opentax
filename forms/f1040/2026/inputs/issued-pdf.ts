import { createHash } from "node:crypto";
/** Retain issued copies unchanged; a regenerated information return is not source evidence. */
export function issuedPdfAttachment2026(c: {
  source_document_reference: string;
  issued_copy_pdf_base64?: string;
  issued_copy_pdf_sha256?: string;
  issued_copy_attachment_file_name?: string;
}, label: string) {
  if (
    !c.issued_copy_pdf_base64 || !c.issued_copy_pdf_sha256 ||
    !c.issued_copy_attachment_file_name
  ) {
    throw new Error(
      `Withheld ${label} needs its original issued PDF for draft assembly`,
    );
  }
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(
      atob(c.issued_copy_pdf_base64),
      (v) => v.charCodeAt(0),
    );
  } catch {
    throw new Error(`Invalid issued ${label} PDF bytes`);
  }
  if (
    new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-" ||
    !new TextDecoder().decode(bytes.slice(-16)).includes("%%EOF") ||
    createHash("sha256").update(bytes).digest("hex") !==
      c.issued_copy_pdf_sha256
  ) {
    throw new Error(`Issued ${label} PDF differs from retained digest`);
  }
  return {
    reference: c.source_document_reference,
    fileName: c.issued_copy_attachment_file_name,
    sha256: c.issued_copy_pdf_sha256,
    bytes,
    requiredForForms: ["f1040"],
    pages: 0,
  };
}
