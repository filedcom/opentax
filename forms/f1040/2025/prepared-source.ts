import { normalizeAllPending } from "./pending.ts";
import type { FilerIdentity } from "../mef/header.ts";

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/** Bind a PDF projection to the source and filer serialized by MeF. */
export async function preparedSourceSha256(
  pending: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): Promise<string> {
  const bytes = new TextEncoder().encode(
    JSON.stringify({ pending: normalizeAllPending(pending), filer }),
  );
  return sha256Hex(bytes);
}
