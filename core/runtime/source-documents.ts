const digestPattern = /^[a-f0-9]{64}$/;

export type SourceDocumentClaim = Readonly<{
  reference: string;
  sha256: string;
}>;

export type SourceDocumentBytes = Readonly<{
  reference: string;
  bytes: Uint8Array;
}>;

/** Verified bytes are copied and kept private to the execution result. */
export class VerifiedSourceDocuments {
  readonly manifest: readonly SourceDocumentClaim[];
  readonly #bytesByReference: ReadonlyMap<string, Uint8Array>;

  private constructor(
    manifest: readonly SourceDocumentClaim[],
    bytesByReference: ReadonlyMap<string, Uint8Array>,
  ) {
    this.manifest = Object.freeze(
      manifest.map((claim) => Object.freeze({ ...claim })),
    );
    this.#bytesByReference = bytesByReference;
  }

  getBytes(reference: string): Uint8Array | undefined {
    const bytes = this.#bytesByReference.get(reference);
    return bytes === undefined ? undefined : Uint8Array.from(bytes);
  }

  static async verify(
    claims: readonly SourceDocumentClaim[],
    documents: readonly SourceDocumentBytes[],
  ): Promise<VerifiedSourceDocuments> {
    const expected = new Map<string, string>();
    for (const claim of claims) {
      if (
        !claim.reference?.trim() || !digestPattern.test(claim.sha256) ||
        expected.has(claim.reference)
      ) {
        throw new Error(
          "Source-document claims need distinct references and SHA-256 digests",
        );
      }
      expected.set(claim.reference, claim.sha256);
    }
    if (
      expected.size === 0 || documents.length !== expected.size ||
      new Set(documents.map((document) => document.reference)).size !==
        documents.length
    ) {
      throw new Error(
        "Source-document bytes must match the exact claimed document set",
      );
    }
    const copied = new Map<string, Uint8Array>();
    for (const document of documents) {
      if (
        !expected.has(document.reference) ||
        !(document.bytes instanceof Uint8Array) ||
        document.bytes.length === 0
      ) {
        throw new Error(
          "Source-document bytes must match the exact claimed document set",
        );
      }
      const bytes = Uint8Array.from(document.bytes);
      const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
      const actual = Array.from(
        hash,
        (byte) => byte.toString(16).padStart(2, "0"),
      )
        .join("");
      if (actual !== expected.get(document.reference)) {
        throw new Error(
          `Source-document bytes differ from SHA-256 for ${document.reference}`,
        );
      }
      copied.set(document.reference, bytes);
    }
    return new VerifiedSourceDocuments(
      [...expected].map(([reference, sha256]) => ({ reference, sha256 })),
      copied,
    );
  }
}
