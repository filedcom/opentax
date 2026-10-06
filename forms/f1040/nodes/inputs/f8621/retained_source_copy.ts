import { createHash } from "node:crypto";
import { z } from "zod";

export const retainedSourceCopySchema = z.object({
  document_id: z.string().trim().min(1),
  sha256: z.string().regex(/^[a-fA-F0-9]{64}$/),
  bytes_base64: z.string().regex(
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
  ),
}).strict();

export type RetainedSourceCopy = z.infer<typeof retainedSourceCopySchema>;

/** Verify retained bytes against the source locator before a printable claim. */
export function assertRetainedSourceCopy(
  value: RetainedSourceCopy | undefined,
  label: string,
): Uint8Array {
  if (!value) throw new Error(`${label} needs its retained source bytes`);
  const bytes = Uint8Array.from(
    atob(value.bytes_base64),
    (c) => c.charCodeAt(0),
  );
  if (
    bytes.length === 0 ||
    createHash("sha256").update(bytes).digest("hex") !==
      value.sha256.toLowerCase()
  ) {
    throw new Error(`${label} retained source bytes differ from SHA-256`);
  }
  return bytes;
}
