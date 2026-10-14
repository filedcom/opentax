import type { MefPdfAttachment } from "../form-descriptor.ts";

/** Reject bytes that cannot be a complete MeF PDF attachment. */
export function assertMefPdfEnvelope(
  attachment: MefPdfAttachment,
): void {
  const { bytes, fileName } = attachment;
  if (bytes.length === 0 || bytes.length > 60_000_000) {
    throw new Error(`MeF PDF size is invalid: ${fileName}`);
  }
  const start = new TextDecoder().decode(bytes.subarray(0, 9));
  const end = new TextDecoder().decode(
    bytes.subarray(Math.max(0, bytes.length - 128)),
  );
  if (
    !/^%PDF-(?:1\.[0-7]|2\.0)(?:\r|\n)/.test(start) ||
    !/startxref\s+\d+\s+%%EOF\s*$/.test(end)
  ) {
    throw new Error(`MeF attachment is not a complete PDF: ${fileName}`);
  }
}
