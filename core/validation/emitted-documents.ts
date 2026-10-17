/** One emitted MeF document: its rule prefix and every leaf element value. */
export interface EmittedDocument {
  readonly prefix: string;
  readonly values: ReadonlyMap<string, readonly string[]>;
}

/** The return header and each ReturnData document of an emitted MeF return. */
export interface EmittedReturn {
  readonly header: EmittedDocument;
  readonly documents: readonly EmittedDocument[];
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

/** Index leaf element values per emitted document, in document order. */
export function parseEmittedReturn(xml: string): EmittedReturn {
  const header = new Map<string, string[]>();
  const documents: { prefix: string; values: Map<string, string[]> }[] = [];
  const record = (target: Map<string, string[]>, key: string, value: string) => {
    const list = target.get(key) ?? [];
    list.push(value);
    target.set(key, list);
  };
  let current: Map<string, string[]> | undefined;
  let documentDepth = -1;
  const stack: string[] = [];
  let textStart = -1;
  let lastOpen: string | undefined;

  for (const match of xml.matchAll(TAG)) {
    const [raw, closing, name, attributes, selfClosing] = match;
    const index = match.index!;
    if (closing) {
      const target = current ?? (stack.includes("ReturnHeader")
        ? header
        : undefined);
      const top = current ? documentDepth : stack.indexOf("ReturnHeader");
      if (lastOpen !== name && target && stack.length - 1 > documentDepth) {
        // A filled group such as RegInvstCoOrReInvstTrustName has a value.
        record(target, name, "present");
        for (const group of new Set(stack.slice(top, -1))) {
          record(target, `${group}/${name}`, "present");
        }
      }
      if (lastOpen === name && textStart >= 0) {
        const value = decode(xml.slice(textStart, index).trim());
        if (target && value !== "") {
          record(target, name, value);
          // Rules also name a leaf by an enclosing group: "Grp/Leaf".
          for (const group of new Set(stack.slice(top, -1))) {
            record(target, `${group}/${name}`, value);
          }
        }
      }
      stack.pop();
      if (stack.length === documentDepth) {
        current = undefined;
        documentDepth = -1;
      }
      lastOpen = undefined;
      textStart = -1;
      continue;
    }
    if (selfClosing) continue;
    const prefix = current === undefined && stack.at(-1) === "ReturnData" &&
        /\bdocumentId="/.test(attributes)
      // Supporting statements keep their own tag as their prefix.
      ? rulePrefixForDocumentTag(name) ?? name
      : undefined;
    stack.push(name);
    if (prefix) {
      current = new Map();
      documents.push({ prefix, values: current });
      documentDepth = stack.length - 1;
    }
    lastOpen = name;
    textStart = index + raw.length;
  }
  return { header: { prefix: "ReturnHeader", values: header }, documents };
}
