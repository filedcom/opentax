/** Reviewed local TY2025 v5.4 Return1040.xsd bytes; this is not an IRS-issued digest. */
export const REVIEW_RETURN1040_XSD_SHA256 =
  "e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c";

export function assertReviewSchemaDigest(actualDigest: string): void {
  if (actualDigest !== REVIEW_RETURN1040_XSD_SHA256) {
    throw new Error(
      "TY2025 Return1040.xsd SHA-256 differs from the reviewed local v5.4 schema",
    );
  }
}
