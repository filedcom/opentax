export interface ObservedAtsAttachment {
  description: string;
  fileName: string;
  byteLength: number;
  sha256: string;
}

/** Observations must come from a successfully verified prepared manifest.
 * Exact descriptions and retained bytes do not authenticate statement contents.
 * Null requirements mean uninventoried; null observations mean blocked.
 */
export function compareAtsAttachments(
  requiredDescriptions: readonly string[] | null,
  observed: readonly ObservedAtsAttachment[] | null,
) {
  const rows = requiredDescriptions?.map((description) => {
    const matches = observed?.filter((item) =>
      item.description === description
    ) ?? null;
    const retained = matches?.filter((item) =>
      item.byteLength > 0 && /^[a-f0-9]{64}$/.test(item.sha256)
    ) ?? null;
    return {
      description,
      result: matches === null
        ? "not-evaluated"
        : matches.length === 0
        ? "missing"
        : matches.length === 1 && retained?.length === 1
        ? "present-in-verified-manifest"
        : "invalid-or-ambiguous",
      observed: matches,
    };
  }) ?? null;
  return {
    scope:
      "Known binary attachment descriptions and retained bytes only; not exhaustive requirements, statement content, authenticity, business rules or IRS acceptance",
    requirementsInventoried: requiredDescriptions !== null,
    knownRequiredCount: requiredDescriptions?.length ?? null,
    allKnownRequiredPresent: rows === null || observed === null
      ? null
      : rows.every((row) => row.result === "present-in-verified-manifest"),
    rows,
  };
}
