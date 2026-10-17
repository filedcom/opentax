import { XMLParser, XMLValidator } from "fast-xml-parser";

const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseAttributeValue: false,
});

export interface ReturnDocument {
  readonly tag: string;
  readonly id: string;
}

function childrenOf(
  entries: unknown,
  tag: string,
): ReadonlyArray<Record<string, unknown>> | undefined {
  if (!Array.isArray(entries)) return undefined;
  const matches = entries.filter((entry) =>
    entry !== null && typeof entry === "object" &&
    Array.isArray((entry as Record<string, unknown>)[tag])
  );
  return matches.length === 1
    ? (matches[0] as Record<string, unknown>)[tag] as Array<
      Record<string, unknown>
    >
    : undefined;
}

/** Read only direct ReturnData children, never nested elements with IDs. */
export function returnDataDocuments(
  xml: string,
): readonly ReturnDocument[] | undefined {
  if (XMLValidator.validate(xml) !== true) return undefined;
  const root = childrenOf(parser.parse(xml), "Return");
  const entries = childrenOf(root, "ReturnData");
  if (!entries) return undefined;
  const documents: ReturnDocument[] = [];
  for (const entry of entries) {
    if (typeof entry["#text"] === "string") {
      if (entry["#text"].trim() === "") continue;
      return undefined;
    }
    const tags = Object.keys(entry).filter((key) => key !== ":@");
    if (tags.length !== 1 || !Array.isArray(entry[tags[0]])) {
      return undefined;
    }
    const id = (entry[":@"] as Record<string, unknown> | undefined)
      ?.documentId;
    if (typeof id !== "string" || !id) return undefined;
    documents.push({ tag: tags[0], id });
  }
  return documents;
}
