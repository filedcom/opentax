import { z } from "zod";
import type { PreparedForm8886Packet } from "./handoff.ts";

const idSchema = z.string().regex(/^[A-Za-z0-9:.\-]{1,30}$/);
export const form8886FinalDocumentsSchema = z.object({
  formXml: z.string().min(1),
  continuationXml: z.string().min(1).optional(),
  continuationId: idSchema.optional(),
  generalContinuations: z.array(
    z.object({
      documentId: idSchema,
      xml: z.string().min(1),
    }).strict(),
  ).readonly(),
}).strict();
type FinalDocuments = z.infer<typeof form8886FinalDocumentsSchema>;

function rootId(xml: string, tag: string): string {
  const root = /^<([A-Za-z0-9]+)([^>]*)>/.exec(xml);
  const ids = root && [...root[2].matchAll(/\bdocumentId="([^"]+)"/g)];
  if (!root || root[1] !== tag || ids?.length !== 1) {
    throw new Error(
      "Form 8886 final native root needs exactly one document ID",
    );
  }
  return idSchema.parse(ids[0][1]);
}

function withFinalIds(
  xml: string,
  id: string,
  replacements: ReadonlyMap<string, string>,
): string {
  return xml.replace(
    /^<([A-Za-z0-9]+)([^>]*)>/,
    (_root, tag: string, attributes: string) =>
      `<${tag} documentId="${id}"${
        attributes.replace(/\sdocumentId="[^"]*"/, "")
      }>`,
  ).replace(/\breferenceDocumentId="([^"]+)"/g, (_attribute, value: string) => {
    const linked = value.trim().split(/\s+/).map((localId) => {
      const finalId = replacements.get(localId);
      if (!finalId) {
        throw new Error("Form 8886 prepared native reference is unresolved");
      }
      return finalId;
    });
    return `referenceDocumentId="${linked.join(" ")}"`;
  });
}

/** Only root allocation and corresponding continuation references may change.
 * Narratives, amounts, owners, document association and continuation order must
 * match the source-bound prepared packet exactly. This checks disclosure bytes;
 * the outer return must still validate global IDs, ordering and business rules. */
export function validateForm8886NativeBinding(
  original: PreparedForm8886Packet["documents"],
  input: FinalDocuments,
) {
  const final = form8886FinalDocumentsSchema.parse(input);
  if (
    Boolean(final.continuationXml) !== Boolean(original.continuationXml) ||
    Boolean(final.continuationId) !== Boolean(final.continuationXml) ||
    final.generalContinuations.length !== original.generalContinuations.length
  ) {
    throw new Error(
      "Form 8886 final native document set differs from preparation",
    );
  }
  const formId = rootId(final.formXml, "IRS8886");
  const expectedId = final.continuationXml
    ? rootId(final.continuationXml, "ContF8886ExpctTaxBnftExpln")
    : undefined;
  if (expectedId !== final.continuationId) {
    throw new Error("Form 8886 final expected-benefit continuation ID differs");
  }
  const generalIds = final.generalContinuations.map((row) => {
    const id = rootId(row.xml, "GeneralDependencySmall");
    if (id !== row.documentId) {
      throw new Error("Form 8886 final general continuation ID differs");
    }
    return id;
  });
  const ids = [formId, ...(expectedId ? [expectedId] : []), ...generalIds];
  if (new Set(ids).size !== ids.length) {
    throw new Error("Form 8886 final native document IDs collide");
  }
  const replacements = new Map([
    ...(original.continuationId && expectedId
      ? [[original.continuationId, expectedId] as const]
      : []),
    ...original.generalContinuations.map((row, index) =>
      [row.documentId, generalIds[index]] as const
    ),
  ]);
  const expected = [
    withFinalIds(original.formXml, formId, replacements),
    ...(original.continuationXml && expectedId
      ? [withFinalIds(original.continuationXml, expectedId, replacements)]
      : []),
    ...original.generalContinuations.map((row, index) =>
      withFinalIds(row.xml, generalIds[index], replacements)
    ),
  ];
  const actual = [
    final.formXml,
    ...(final.continuationXml ? [final.continuationXml] : []),
    ...final.generalContinuations.map((row) => row.xml),
  ];
  if (actual.some((xml, index) => xml !== expected[index])) {
    throw new Error(
      "Form 8886 final native disclosure differs from the prepared source",
    );
  }
  return Object.freeze({
    documents: Object.freeze({
      formXml: final.formXml,
      continuationXml: final.continuationXml,
      continuationId: final.continuationId,
      generalContinuations: Object.freeze(
        final.generalContinuations.map((row) => Object.freeze(row)),
      ),
    }),
    xml: actual.join(""),
    documentIds: Object.freeze(ids),
  });
}
