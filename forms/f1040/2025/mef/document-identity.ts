export interface MefDocumentFragment {
  readonly pendingKey: string;
  readonly tag: string;
  readonly xml: string;
}

export function documentId(tag: string, index: number): string {
  const suffix = String(index);
  return `${tag.slice(0, 30 - suffix.length)}${suffix}`;
}

/** Validate the exact IDs and references before serializing ReturnData. */
export function validateDocumentReferences(
  fragments: ReadonlyArray<MefDocumentFragment>,
): void {
  const ids = fragments.map((fragment, index) =>
    documentId(fragment.tag, index)
  );
  const knownIds = new Set(ids);
  if (knownIds.size !== ids.length) {
    throw new Error("MeF document IDs collide after root-name truncation");
  }
  const referencedIds = fragments.flatMap((fragment) =>
    [...fragment.xml.matchAll(/\breferenceDocumentId="([^"]+)"/g)]
      .flatMap((match) => match[1].trim().split(/\s+/))
  );
  for (const id of referencedIds) {
    if (!knownIds.has(id)) {
      throw new Error(`MeF referenceDocumentId ${id} has no document`);
    }
  }
  for (const [index, fragment] of fragments.entries()) {
    if (
      fragment.tag === "JointOccupancyStatement" &&
      !referencedIds.includes(ids[index])
    ) {
      throw new Error("MeF joint-occupancy statement is not referenced");
    }
    if (
      fragment.tag === "IRADistributionStatement" &&
      !referencedIds.includes(ids[index])
    ) {
      throw new Error("MeF IRA distribution statement is not referenced");
    }
  }
}
