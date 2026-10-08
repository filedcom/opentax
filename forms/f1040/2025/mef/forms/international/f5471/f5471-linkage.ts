import type { F5471Item } from "../../../../../nodes/inputs/f5471/index.ts";
import { owned5471Categories } from "../../../../domains/international/form5471/form5471-owned-source.ts";
import type { MefBuildContext } from "../../../form-descriptor.ts";
import type { MefDocumentFragment } from "../../../identity/document-identity.ts";

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

const categoryScheduleTags: ReadonlySet<string> = new Set([
  "IRS5471ScheduleE",
  "IRS5471ScheduleJ",
  "IRS5471ScheduleP",
  "IRS5471ScheduleQ",
]);
export function requiredScheduleReferences(
  context: MefBuildContext,
  cfc?: F5471Item,
) {
  // Discovery and standalone source projection do not yet own document IDs.
  if (
    context.phase !== "final" && !context.documentIdsByTag &&
    !context.documentIdsByPendingKey
  ) return undefined;
  if (!context.documentIdsByTag || !context.documentIdsByPendingKey) {
    throw new Error("Form 5471 final linkage needs both document inventories");
  }
  const ids = form5471RequiredScheduleKeys.flatMap(([key, tag]) => {
    const count = cfc?.owned_worksheet_source && categoryScheduleTags.has(tag)
      ? owned5471Categories(cfc).length
      : 1;
    const byKey = context.documentIdsByPendingKey![key] ?? [];
    const byTag = context.documentIdsByTag![tag] ?? [];
    if (
      byKey.length !== count || byTag.length !== count ||
      byKey.some((id, i) => id !== byTag[i] || !id.trim())
    ) {
      throw new Error(
        `Form 5471 needs exactly ${count} owned ${tag} documents`,
      );
    }
    return byKey;
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
    const categories = Number(text(parent.xml, "SubpartFPHCIncomeAmt")) > 0
      ? ["GEN", "PAS", "TOTAL"]
      : ["GEN"];
    const requiredCount = form5471RequiredScheduleKeys.reduce(
      (n, [, tag]) =>
        n + (categoryScheduleTags.has(tag) ? categories.length : 1),
      0,
    );
    if (
      refs.length !== requiredCount ||
      names !== form5471ReferenceNames
    ) {
      throw new Error(
        "Form 5471 Category4/5a needs all required source-category schedule references",
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
      const count = categoryScheduleTags.has(tag) ? categories.length : 1;
      if (
        matches.length !== count ||
        matches.some(({ index }) => !refs.includes(documentIds[index]))
      ) {
        throw new Error(
          `Form 5471 must reference exactly ${count} owned ${tag} documents`,
        );
      }
      if (
        categoryScheduleTags.has(tag) &&
        (new Set(matches.map(({ f }) => text(f.xml, "SeparateCategoryCd")))
              .size !== count ||
          matches.some(({ f }) =>
            !categories.includes(text(f.xml, "SeparateCategoryCd") ?? "")
          ))
      ) throw new Error(`Form 5471 ${tag} category inventory conflicts`);
      for (const { f } of matches) {
        const child = f.xml;
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
}
