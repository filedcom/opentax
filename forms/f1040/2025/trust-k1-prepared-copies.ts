import type { FilerIdentity } from "../mef/header.ts";
import { assertOtherFormsWithholding } from "./f8288-withholding-reconciliation.ts";
import { normalizeAllPending } from "./pending.ts";
import { preparedSourceSha256 } from "./prepared-source.ts";
import {
  type ReconciledTrustK1SourceCopy,
  reconcileTrustK1SourceCopies,
} from "./trust-k1-source-copy-reconciliation.ts";

function freeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

/** Immutable prepared source/native evidence, not an authorized filing packet.
 * Source authenticity, statements and final export integration stay separate. */
export class PreparedTrustK1Copies {
  readonly sourceSha256: string;
  readonly copies: readonly ReconciledTrustK1SourceCopy[];
  readonly filingReady = false;
  readonly #bytes: ReadonlyMap<string, Uint8Array>;

  private constructor(
    sourceSha256: string,
    copies: readonly ReconciledTrustK1SourceCopy[],
    documents: ReadonlyArray<{ reference: string; bytes: Uint8Array }>,
  ) {
    this.sourceSha256 = sourceSha256;
    this.copies = freeze(copies);
    this.#bytes = new Map(
      documents.map((doc) => [doc.reference, Uint8Array.from(doc.bytes)]),
    );
    Object.freeze(this);
  }

  static async prepare(
    pending: Record<string, unknown>,
    filer: FilerIdentity,
    documents: ReadonlyArray<{ reference: string; bytes: Uint8Array }>,
    transcriptions: readonly unknown[],
  ): Promise<PreparedTrustK1Copies> {
    // Capture all caller-owned inputs before the first asynchronous digest.
    const source = structuredClone(pending);
    const normalized = normalizeAllPending(source);
    const owner = structuredClone(filer);
    const retained = documents.map((doc) => ({
      reference: doc.reference,
      bytes: Uint8Array.from(doc.bytes),
    }));
    const recipients = structuredClone(transcriptions);
    const fields = normalized.f1040;
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      throw Error("Prepared trust K-1 copies need finalized Form1040 fields");
    }
    assertOtherFormsWithholding(fields, normalized, true);
    const copies = await reconcileTrustK1SourceCopies(
      normalized.k1_trust,
      owner,
      retained,
      recipients,
    );
    const sourceSha256 = await preparedSourceSha256(source, owner);
    return new PreparedTrustK1Copies(sourceSha256, copies, retained);
  }

  /** Defensive copies: packet assembly must never alias the verified bytes. */
  getCopyBytes(reference: string): Uint8Array {
    const bytes = this.#bytes.get(reference);
    if (!bytes) {
      throw Error("Prepared trust K-1 source copy reference is unavailable");
    }
    return Uint8Array.from(bytes);
  }

  /** Reject changes to source, owner or return totals after preparation. */
  async assertCurrent(
    pending: Record<string, unknown>,
    filer: FilerIdentity,
  ): Promise<void> {
    const source = structuredClone(pending);
    const owner = structuredClone(filer);
    if (await preparedSourceSha256(source, owner) !== this.sourceSha256) {
      throw Error(
        "Prepared trust K-1 copies differ from the current return source or filer",
      );
    }
  }
}
