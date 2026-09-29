import { normalizeAllPending } from "./pending.ts";
import type { FilerIdentity } from "../mef/header.ts";

/** Bind a PDF projection to the source and filer serialized by MeF. */
export async function preparedSourceSha256(
  pending: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): Promise<string> {
  const bytes = new TextEncoder().encode(
    JSON.stringify({ pending: normalizeAllPending(pending), filer }),
  );
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
