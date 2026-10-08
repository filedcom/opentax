import { normalizeAllPending } from "./pending.ts";
import type { FilerIdentity } from "../../../mef/header.ts";

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/** Bind a PDF projection to the source and filer serialized by MeF. */
export function preparedSourceBytes(
  pending: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): Uint8Array {
  const normalized: Record<string, unknown> = normalizeAllPending(pending);
  // MeF keeps computed Form 8949 rows as a top-level array. Bind those rows
  // to the prepared source even though generic pending normalization omits it.
  if (Array.isArray(pending.form8949)) {
    normalized.form8949 = pending.form8949;
  }
  return new TextEncoder().encode(
    JSON.stringify({ pending: normalized, filer }),
  );
}

/** Bind a PDF projection to the source and filer serialized by MeF. */
export async function preparedSourceSha256(
  pending: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): Promise<string> {
  return sha256Hex(preparedSourceBytes(pending, filer));
}
