/** Keep bounded review batches explicit without claiming full fixture coverage. */
export interface ReviewScope {
  kind: "full" | "selected";
  includedFixtureIds: string[];
  excludedFixtureIds: string[];
}

export function reviewScope(
  allIds: readonly string[],
  selectedIds?: readonly string[],
): ReviewScope {
  if (new Set(allIds).size !== allIds.length) {
    throw new Error("Checked-in review fixture IDs are not unique");
  }
  if (selectedIds === undefined) {
    return {
      kind: "full",
      includedFixtureIds: [...allIds],
      excludedFixtureIds: [],
    };
  }
  if (
    selectedIds.length === 0 || new Set(selectedIds).size !== selectedIds.length
  ) {
    throw new Error("Selected review fixture IDs must be nonempty and unique");
  }
  const selected = new Set(selectedIds);
  for (const id of selected) {
    if (!allIds.includes(id)) {
      throw new Error(`Unknown selected review fixture: ${id}`);
    }
  }
  const includedFixtureIds = allIds.filter((id) => selected.has(id));
  const excludedFixtureIds = allIds.filter((id) => !selected.has(id));
  if (excludedFixtureIds.length === 0) {
    throw new Error("Use the full review scope when every fixture is selected");
  }
  return { kind: "selected", includedFixtureIds, excludedFixtureIds };
}

export function assertReviewScope(
  value: unknown,
  allIds: readonly string[],
): ReviewScope {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Review scope must be an object");
  }
  const actual = value as Record<string, unknown>;
  if (actual.kind !== "full" && actual.kind !== "selected") {
    throw new Error("Review scope kind must be full or selected");
  }
  if (
    !Array.isArray(actual.includedFixtureIds) ||
    !actual.includedFixtureIds.every((id) => typeof id === "string")
  ) {
    throw new Error("Review scope included fixture IDs must be strings");
  }
  const expected = reviewScope(
    allIds,
    actual.kind === "full" ? undefined : actual.includedFixtureIds,
  );
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      "Review scope differs from checked-in fixture order or exclusions",
    );
  }
  return expected;
}
