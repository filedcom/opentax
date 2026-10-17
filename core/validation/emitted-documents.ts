/** One emitted MeF document: its rule prefix and every leaf element value. */
export interface EmittedDocument {
  readonly prefix: string;
  readonly values: ReadonlyMap<string, readonly string[]>;
  /** Each instance of every group element inside the document, by group tag. */
  readonly groups: ReadonlyMap<string, readonly EmittedDocument[]>;
}

/** The return header and each ReturnData document of an emitted MeF return. */
export interface EmittedReturn {
  readonly header: EmittedDocument;
  readonly documents: readonly EmittedDocument[];
  /** The ReturnData 'documentCnt' attribute. */
  readonly declaredDocumentCnt?: number;
}

/** Map an MeF document tag to the business-rule prefix that governs it. */
export function rulePrefixForDocumentTag(tag: string): string | undefined {
  if (tag === "IRS1040") return "F1040";
  if (tag === "IRSW2") return "FW2";
  const schedule = /^IRS1040Schedule(.+)$/.exec(tag)?.[1];
  if (schedule) return `S${schedule}`;
  const form = /^IRS(.+)$/.exec(tag)?.[1];
  return form ? `F${form}` : undefined;
}

function decode(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

const TAG = /<(\/?)([A-Za-z][\w.-]*)((?:\s+[^\s=>]+="[^"]*")*)\s*(\/?)>/g;

type Values = Map<string, string[]>;
type Scope = {
  readonly values: Values;
  readonly groups: Map<string, EmittedDocument[]>;
  depth: number;
};

const ATTRIBUTE = /\s+([^\s=>]+)="([^"]*)"/g;
const BOOKKEEPING_ATTRIBUTE =
  /^(?:xmlns(?::.*)?|xsi:.*|documentId|documentName|referenceDocument(?:Id|Name)|software(?:Id|VersionNum)|returnVersion|binaryAttachmentCnt|uuid)$/;

function record(target: Values, key: string, value: string) {
  const list = target.get(key) ?? [];
  list.push(value);
  target.set(key, list);
}

/** Index leaf element values per emitted document, in document order. */
export function parseEmittedReturn(xml: string): EmittedReturn {
  const header: Scope = { values: new Map(), groups: new Map(), depth: -1 };
  const documents: EmittedDocument[] = [];
  let declaredDocumentCnt: number | undefined;
  let current: Scope | undefined;
  const stack: string[] = [];
  // One value map per open element inside a document, for group instances.
  const instances: (Values | undefined)[] = [];
  let textStart = -1;
  let lastOpen: string | undefined;

  const scope = () => current ?? (header.depth >= 0 ? header : undefined);
  // Rules also name a leaf by an enclosing group: "Grp/Leaf".
  const recordLeaf = (target: Scope, name: string, value: string) => {
    const groups = new Set(stack.slice(target.depth, -1));
    const keys = [name, ...[...groups].map((group) => `${group}/${name}`)];
    const maps = [
      target.values,
      ...instances.slice(target.depth + 1, -1).filter((m) => m !== undefined),
    ];
    for (const map of maps) for (const key of keys) record(map, key, value);
  };

  for (const match of xml.matchAll(TAG)) {
    const [raw, closing, name, attributes, selfClosing] = match;
    const index = match.index!;
    if (closing) {
      const target = scope();
      if (target && stack.length - 1 > target.depth) {
        if (lastOpen !== name) {
          // A filled group such as RegInvstCoOrReInvstTrustName has a value.
          recordLeaf(target, name, "present");
          const values = instances.at(-1);
          if (values) {
            const list = target.groups.get(name) ?? [];
            list.push({ prefix: name, values, groups: new Map() });
            target.groups.set(name, list);
          }
        } else if (textStart >= 0) {
          const value = decode(xml.slice(textStart, index).trim());
          if (value !== "") recordLeaf(target, name, value);
        }
      }
      stack.pop();
      instances.pop();
      if (current && stack.length === current.depth) current = undefined;
      if (name === "ReturnHeader") header.depth = -1;
      lastOpen = undefined;
      textStart = -1;
      continue;
    }
    if (name === "ReturnData") {
      const count = /\bdocumentCnt="(\d+)"/.exec(attributes)?.[1];
      if (count) declaredDocumentCnt = Number(count);
    }
    const isDocument = current === undefined &&
      stack.at(-1) === "ReturnData" && /\bdocumentId="/.test(attributes);
    const outer = scope();
    if (outer) {
      const maps = [
        outer.values,
        ...instances.slice(outer.depth + 1).filter((m) => m !== undefined),
      ];
      // "Element@attribute" names any attribute; a few rule amounts, such as
      // Form8814Ind's childInterestAndDividendTaxAmt, are named bare.
      for (const [, attribute, value] of attributes.matchAll(ATTRIBUTE)) {
        const keys = [`${name}@${attribute}`];
        if (!BOOKKEEPING_ATTRIBUTE.test(attribute)) keys.push(attribute);
        for (const map of maps) {
          for (const key of keys) record(map, key, decode(value));
        }
      }
    }
    if (selfClosing) continue;
    stack.push(name);
    const enclosing = scope();
    instances.push(
      enclosing && stack.length - 1 > enclosing.depth ? new Map() : undefined,
    );
    if (name === "ReturnHeader") header.depth = stack.length - 1;
    if (isDocument) {
      // Supporting statements keep their own tag as their prefix.
      const prefix = rulePrefixForDocumentTag(name) ?? name;
      current = { values: new Map(), groups: new Map(), depth: stack.length - 1 };
      instances[instances.length - 1] = undefined;
      documents.push({
        prefix,
        values: current.values,
        groups: current.groups,
      });
    }
    lastOpen = name;
    textStart = index + raw.length;
  }
  return {
    header: { prefix: "ReturnHeader", values: header.values, groups: header.groups },
    documents,
    declaredDocumentCnt,
  };
}
