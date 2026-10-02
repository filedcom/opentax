import type { FilerIdentity } from "../forms/f1040/mef/header.ts";

/** Fixed header time for synthetic review artifacts, not production exports. */
export const REVIEW_RETURN_TIMESTAMP = "2025-12-31T12:00:00Z";

export function reviewFiler(filer: FilerIdentity): FilerIdentity {
  return { ...filer, timestamp: REVIEW_RETURN_TIMESTAMP };
}
