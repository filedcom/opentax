import type { MefBuildContext } from "../form-descriptor.ts";
import type { MefDocumentFragment } from "../document-identity.ts";

// IRS5471.xsd fixes this attribute to the full permitted document-name list,
// even when this bounded source requires only the eight schedules below.
export const form5471ReferenceNames =
  "IRS3115 IRS5452 IRS5471ScheduleE IRS5471ScheduleH IRS5471ScheduleI1 IRS5471ScheduleJ IRS5471ScheduleM IRS5471ScheduleO IRS5471ScheduleP IRS5471ScheduleQ IRS5471ScheduleR IRS8594 IRS8833 IRS8883 BinaryAttachment GeneralDependencySmall";

export const form5471RequiredScheduleKeys = [
  ["f5471_schedule_e", "IRS5471ScheduleE"],
  ["f5471_schedule_h", "IRS5471ScheduleH"],
  ["f5471_schedule_i1", "IRS5471ScheduleI1"],
  ["f5471_schedule_j", "IRS5471ScheduleJ"],
  ["f5471_schedule_m", "IRS5471ScheduleM"],
  ["f5471_schedule_p", "IRS5471ScheduleP"],
  ["f5471_schedule_q", "IRS5471ScheduleQ"],
  ["f5471_schedule_r", "IRS5471ScheduleR"],
] as const;

export function requiredScheduleReferences(context: MefBuildContext) {
  // Discovery and standalone source projection do not yet own document IDs.
  if (
    context.phase !== "final" && !context.documentIdsByTag &&
    !context.documentIdsByPendingKey
  ) return undefined;
  if (!context.documentIdsByTag || !context.documentIdsByPendingKey) {
    throw new Error("Form 5471 final linkage needs both document inventories");
  }
  const ids = form5471RequiredScheduleKeys.map(([key, tag]) => {
    const byKey = context.documentIdsByPendingKey![key] ?? [];
    const byTag = context.documentIdsByTag![tag] ?? [];
    if (
      byKey.length !== 1 || byTag.length !== 1 ||
      byKey[0] !== byTag[0] || !byKey[0].trim()
    ) {
      throw new Error(`Form 5471 needs exactly one owned ${tag} document`);
    }
    return byKey[0];
  });
  if (new Set(ids).size !== ids.length) {
    throw new Error("Form 5471 required schedules cannot share a document ID");
  }
  return {
    referenceDocumentId: ids.join(" "),
    referenceDocumentName: form5471ReferenceNames,
  };
}

/** Local integrity checks for the implemented sole-owner Category4/5a packet.
 * These enforce reference/identity obligations, not IRS acceptance or the
 * unresolved current no-distribution ScheduleR representation. */
export function validateForm5471ScheduleReferences(
  fragments: ReadonlyArray<MefDocumentFragment>,
  documentIds: readonly string[],
): void {
  const text = (xml: string, tag: string) =>
    new RegExp(`<${tag}>([^<]*)</${tag}>`).exec(xml)?.[1];
  for (const parent of fragments.filter((f) => f.tag === "IRS5471")) {
    if (
      !parent.xml.includes("<CategoryOfFiler4Ind>X</CategoryOfFiler4Ind>") ||
      !parent.xml.includes("<CategoryOfFiler5aInd>X</CategoryOfFiler5aInd>")
    ) {
      continue;
    }
    const root = /^<IRS5471\b[^>]*>/.exec(parent.xml)?.[0] ?? "";
    const refs = /\breferenceDocumentId="([^"]+)"/.exec(root)?.[1]
      .trim().split(/\s+/) ?? [];
    const names = /\breferenceDocumentName="([^"]+)"/.exec(root)?.[1];
    if (
      refs.length !== form5471RequiredScheduleKeys.length ||
      names !== form5471ReferenceNames
    ) {
      throw new Error(
        "Form 5471 Category4/5a needs all eight required schedule references",
      );
    }
    const parentSSN = text(parent.xml, "SSN");
    const parentEIN = text(parent.xml, "EmployerEIN");
    const parentRef = text(parent.xml, "ForeignEntityReferenceIdNum");
    if (!parentSSN || (!parentEIN && !parentRef)) {
      throw new Error(
        "Form 5471 linked parent needs source owner and corporation identity",
      );
    }
    for (const [, tag] of form5471RequiredScheduleKeys) {
      const matches = fragments.map((f, index) => ({ f, index }))
        .filter(({ f }) => f.tag === tag);
      if (
        matches.length !== 1 ||
        !refs.includes(documentIds[matches[0].index])
      ) {
        throw new Error(`Form 5471 must reference exactly one owned ${tag}`);
      }
      const child = matches[0].f.xml;
      if (
        text(child, "SSN") !== parentSSN ||
        text(child, "ForeignCorporationEIN") !== parentEIN ||
        text(child, "ForeignEntityReferenceIdNum") !== parentRef
      ) {
        throw new Error(
          `Form 5471 ${tag} differs from source owner/corporation`,
        );
      }
    }
  }
}
