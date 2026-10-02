export interface MefDocumentFragment {
  readonly pendingKey: string;
  readonly tag: string;
  readonly xml: string;
}

export function documentId(tag: string, index: number): string {
  const suffix = String(index);
  return `${tag.slice(0, 30 - suffix.length)}${suffix}`;
}

// TY2025 MeF statement reference names can differ from shortened XML roots.
const IRS_REFERENCE_NAME_BY_ROOT: Readonly<Record<string, string>> = {
  ChildTaxableInterestStmt: "ChildTaxableInterestStatement",
  CCCLoanDetailCashMethodStmt: "CCCLoanDetailCashMethodStatement",
  CCCLoanDetailAccrualMethodStmt: "CCCLoanDetailAccrualMethodStatement",
  PostponementCropInsDsstrStmt:
    "PostponementOfCropInsuranceAndDisasterPaymentsStatement",
};

/** Match the declared schema names exactly to the referenced document types. */
export function hasMismatchedSingleReferenceName(
  xml: string,
  tagsById: ReadonlyMap<string, string>,
): boolean {
  for (const tag of xml.matchAll(/<[A-Za-z0-9]+\b[^>]*>/g)) {
    const ids = /\breferenceDocumentId="([^"]+)"/.exec(tag[0])?.[1]
      ?.trim().split(/\s+/);
    const names = /\breferenceDocumentName="([^"]+)"/.exec(tag[0])?.[1]
      ?.trim().split(/\s+/);
    if (ids?.length && names?.length) {
      const expected = new Set(ids.map((id) => {
        const root = tagsById.get(id);
        return root === undefined
          ? undefined
          : IRS_REFERENCE_NAME_BY_ROOT[root] ?? root;
      }));
      if (
        expected.has(undefined) || names.length !== new Set(names).size ||
        names.length !== expected.size ||
        names.some((name) => !expected.has(name))
      ) return true;
    }
  }
  return false;
}

/** Validate the exact IDs and references before serializing ReturnData. */
export function validateDocumentReferences(
  fragments: ReadonlyArray<MefDocumentFragment>,
): void {
  const ids = fragments.map((fragment, index) =>
    documentId(fragment.tag, index)
  );
  const knownIds = new Set(ids);
  const tagsById = new Map(
    ids.map((id, index) => [id, fragments[index].tag]),
  );
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
  if (
    fragments.some((fragment) =>
      hasMismatchedSingleReferenceName(fragment.xml, tagsById)
    )
  ) {
    throw new Error("MeF referenceDocumentName differs from its document IDs");
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
