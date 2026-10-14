import { z } from "zod";
import {
  documentId,
  type MefDocumentFragment,
  validateDocumentReferences,
} from "../../../../mef/identity/document-identity.ts";
import type { prepareForm8886ReturnPackets } from "./return-packets.ts";
import {
  bindPreparedForm8886ReturnPackets,
  verifyPreparedForm8886ReturnPackets,
} from "./return-packets.ts";
import type { ExecuteResult } from "../../../../../../../core/runtime/executor.ts";
import type { FilerIdentity } from "../../../../../mef/header.ts";
import type { Form8886Source } from "./source.ts";

type PreparedPackets = Awaited<ReturnType<typeof prepareForm8886ReturnPackets>>;

export enum Form8886PendingKey {
  Form = "form8886",
  ExpectedBenefits = "form8886_expected_benefits",
  AdditionalDetails = "form8886_additional_details",
}

const documentIdSchema = z.string().regex(/^[A-Za-z0-9:.\-]{1,30}$/);
export const form8886AssignedIdsSchema = z.object({
  form8886: z.array(documentIdSchema),
  form8886_expected_benefits: z.array(documentIdSchema),
  form8886_additional_details: z.array(documentIdSchema),
}).strict().refine((ids) => {
  const all = Object.values(ids).flat();
  return new Set(all).size === all.length;
}, "Form 8886 assigned document IDs must be distinct");
type AssignedIds = z.infer<typeof form8886AssignedIdsSchema>;

/** Assembly entry point for prepared packets. The low-level serializer below
 * also supports synthetic layout tests; it does not establish authenticity. */
export async function verifiedForm8886NativeReturnFragments(
  prepared: PreparedPackets,
  source: Form8886Source,
  result: ExecuteResult,
  filer: FilerIdentity,
  assigned?: AssignedIds,
): Promise<readonly MefDocumentFragment[]> {
  await verifyPreparedForm8886ReturnPackets(prepared, source, result, filer);
  return form8886NativeReturnFragments(prepared, assigned);
}

/** Consume the ordered, linked whole-return fragments immediately before the
 * central builder injects document IDs. Bind every disclosure to those same
 * global IDs without rendering its PDF again. Whole-return XSD and business
 * rules remain the caller's responsibility. */
export async function finalizeForm8886NativeReturnPackets(
  prepared: PreparedPackets,
  source: Form8886Source,
  result: ExecuteResult,
  filer: FilerIdentity,
  fragmentsInput: readonly MefDocumentFragment[],
): Promise<PreparedPackets> {
  const fragments = structuredClone(fragmentsInput);
  await verifyPreparedForm8886ReturnPackets(prepared, source, result, filer);
  const keys = new Set<string>(Object.values(Form8886PendingKey));
  for (const fragment of fragments) {
    if (
      (fragment.tag === "IRS8886" &&
        fragment.pendingKey !== Form8886PendingKey.Form) ||
      (fragment.tag === "ContF8886ExpctTaxBnftExpln" &&
        fragment.pendingKey !== Form8886PendingKey.ExpectedBenefits)
    ) {
      throw new Error(
        "Form 8886 native root is outside its assigned return slot",
      );
    }
  }
  const assigned = (key: Form8886PendingKey) =>
    fragments.flatMap((row, index) =>
      row.pendingKey === key ? [documentId(row.tag, index)] : []
    );
  const expected = form8886NativeReturnFragments(prepared, {
    form8886: assigned(Form8886PendingKey.Form),
    form8886_expected_benefits: assigned(Form8886PendingKey.ExpectedBenefits),
    form8886_additional_details: assigned(Form8886PendingKey.AdditionalDetails),
  });
  const actual = fragments.filter((row) => keys.has(row.pendingKey));
  if (
    actual.length !== expected.length ||
    actual.some((row, index) =>
      row.pendingKey !== expected[index].pendingKey ||
      row.tag !== expected[index].tag || row.xml !== expected[index].xml
    )
  ) {
    throw new Error(
      "Form 8886 linked return documents differ from the prepared disclosures",
    );
  }
  validateDocumentReferences(fragments);
  const allocated = fragments.map((row, index) => ({
    ...row,
    id: documentId(row.tag, index),
    xml: row.xml.replace(
      /^<([A-Za-z0-9]+)(?=[\s>])/,
      `<${row.tag} documentId="${documentId(row.tag, index)}"`,
    ),
  }));
  const forms = allocated.filter((row) =>
    row.pendingKey === Form8886PendingKey.Form
  );
  const continuations = allocated.filter((row) =>
    row.pendingKey === Form8886PendingKey.ExpectedBenefits
  );
  const general = allocated.filter((row) =>
    row.pendingKey === Form8886PendingKey.AdditionalDetails
  );
  const documents = prepared.packets.map(({ packet }, index) => {
    const preceding = prepared.packets.slice(0, index);
    const continuationIndex = preceding.filter((row) =>
      row.packet.documents.continuationXml
    ).length;
    const generalIndex = preceding.reduce(
      (sum, row) => sum + row.packet.documents.generalContinuations.length,
      0,
    );
    const continuation = packet.documents.continuationXml
      ? continuations[continuationIndex]
      : undefined;
    return {
      formXml: forms[index].xml,
      continuationXml: continuation?.xml,
      continuationId: continuation?.id,
      generalContinuations: general.slice(
        generalIndex,
        generalIndex + packet.documents.generalContinuations.length,
      )
        .map((row) => ({ documentId: row.id, xml: row.xml })),
    };
  });
  return await bindPreparedForm8886ReturnPackets(
    prepared,
    source,
    result,
    filer,
    documents,
  );
}

/** The central return builder assigns root IDs after discovery. Remove only
 * the generated root attribute; nested source/party identifiers are untouched. */
function withoutRootId(xml: string, tag: string): string {
  if (!xml.startsWith(`<${tag}>`) && !xml.startsWith(`<${tag} `)) {
    throw new Error("Form 8886 packet has an unexpected native document root");
  }
  return xml.replace(
    /^<[^>]+>/,
    (root) => root.replace(/\sdocumentId="[^"]*"/, ""),
  );
}

/** Split packet documents into their separate ReturnData slots. The expected-
 * benefit continuation occurs much later than IRS8886 in ReturnData1040.xsd;
 * GeneralDependencySmall occurs later still. They cannot follow each parent
 * as a concatenated packet. Other return documents belong between these slots.
 * Discovery retains temporary references; final linking requires IDs allocated
 * by the whole-return discovery pass, grouped by these three pending keys. */
export function form8886NativeReturnFragments(
  prepared: PreparedPackets,
  assignedInput?: AssignedIds,
): readonly MefDocumentFragment[] {
  const groups = prepared.packets.map(({ packet }) => packet.documents);
  const forms = groups.map((row) => ({
    pendingKey: Form8886PendingKey.Form,
    tag: "IRS8886",
    xml: row.formXml,
  }));
  const expected = groups.flatMap((row) =>
    row.continuationXml
      ? [{
        pendingKey: Form8886PendingKey.ExpectedBenefits,
        tag: "ContF8886ExpctTaxBnftExpln",
        xml: row.continuationXml,
        localId: row.continuationId!,
      }]
      : []
  );
  const general = groups.flatMap((row) =>
    row.generalContinuations.map((item) => ({
      pendingKey: Form8886PendingKey.AdditionalDetails,
      tag: "GeneralDependencySmall",
      xml: item.xml,
      localId: item.documentId,
    }))
  );
  const fragments = [...forms, ...expected, ...general];
  const localIds = [...expected, ...general].map((row) => row.localId);
  if (new Set(localIds).size !== localIds.length) {
    throw new Error("Form 8886 packet continuation IDs collide across copies");
  }
  const assigned = assignedInput &&
    form8886AssignedIdsSchema.parse(assignedInput);
  if (
    assigned && (
      assigned.form8886.length !== forms.length ||
      assigned.form8886_expected_benefits.length !== expected.length ||
      assigned.form8886_additional_details.length !== general.length
    )
  ) {
    throw new Error(
      "Form 8886 native document set changed after ID allocation",
    );
  }
  const assignedContinuationIds = assigned
    ? [
      ...assigned.form8886_expected_benefits,
      ...assigned.form8886_additional_details,
    ]
    : localIds;
  const replacements = new Map(localIds.map((id, index) => [
    id,
    assignedContinuationIds[index],
  ]));
  return Object.freeze(fragments.map((fragment) =>
    Object.freeze({
      pendingKey: fragment.pendingKey,
      tag: fragment.tag,
      xml: withoutRootId(fragment.xml, fragment.tag).replace(
        /\breferenceDocumentId="([^"]+)"/g,
        (_attribute, values: string) => {
          const linked = values.trim().split(/\s+/).map((id) => {
            const replacement = replacements.get(id);
            if (!replacement) {
              throw new Error(
                "Form 8886 packet refers to an unknown continuation",
              );
            }
            return replacement;
          });
          return `referenceDocumentId="${linked.join(" ")}"`;
        },
      ),
    })
  ));
}
