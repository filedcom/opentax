/**
 * A small namespace-aware XML reader and Exclusive XML Canonicalization 1.0
 * (https://www.w3.org/TR/xml-exc-c14n/, without comments or an inclusive
 * prefix list), enough for SOAP envelopes, WS-Security and MeF attachments.
 * DTDs are refused rather than expanded.
 */

export enum XmlNodeKind {
  Element = "element",
  Text = "text",
}

export type XmlAttribute = { readonly name: string; readonly value: string };

export type XmlText = {
  readonly kind: XmlNodeKind.Text;
  readonly value: string;
};

export type XmlElement = {
  readonly kind: XmlNodeKind.Element;
  readonly name: string;
  readonly attributes: readonly XmlAttribute[];
  readonly children: readonly XmlNode[];
  readonly parent: XmlElement | undefined;
  /** Source offsets of the whole element, start tag through end tag. */
  readonly start: number;
  readonly end: number;
};

export type XmlNode = XmlElement | XmlText;

export type XmlDocument = {
  readonly root: XmlElement;
  readonly source: string;
};

export class XmlParseError extends Error {}

type MutableElement = {
  kind: XmlNodeKind.Element;
  name: string;
  attributes: XmlAttribute[];
  children: XmlNode[];
  parent: XmlElement | undefined;
  start: number;
  end: number;
};

const NAME = /[A-Za-z_][\w.-]*(?::[A-Za-z_][\w.-]*)?/y;
const ENTITIES: Readonly<Record<string, string>> = {
  lt: "<",
  gt: ">",
  amp: "&",
  quot: '"',
  apos: "'",
};

function decodeEntities(raw: string): string {
  return raw.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-z]+);|&/g, (match, ref) => {
    if (ref === undefined) throw new XmlParseError("Bare & in XML text");
    if (ref.startsWith("#x")) {
      return String.fromCodePoint(parseInt(ref.slice(2), 16));
    }
    if (ref.startsWith("#")) return String.fromCodePoint(Number(ref.slice(1)));
    const value = ENTITIES[ref];
    if (value === undefined) {
      throw new XmlParseError(`Unknown XML entity ${match}`);
    }
    return value;
  });
}

function readName(source: string, at: number): string {
  NAME.lastIndex = at;
  const match = NAME.exec(source);
  if (!match) throw new XmlParseError(`Expected an XML name at ${at}`);
  return match[0];
}

function skipSpace(source: string, at: number): number {
  let position = at;
  while (/\s/.test(source[position] ?? "")) position++;
  return position;
}

/** Parse an XML document; line endings are normalized to LF as XML 1.0 requires. */
export function parseXml(text: string): XmlDocument {
  const source = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const stack: MutableElement[] = [];
  let root: MutableElement | undefined;
  let position = 0;
  const appendText = (value: string) => {
    const top = stack.at(-1);
    if (top) {
      top.children.push({ kind: XmlNodeKind.Text, value });
    } else if (value.trim() !== "") {
      throw new XmlParseError("Text outside the document element");
    }
  };
  while (position < source.length) {
    const open = source.indexOf("<", position);
    if (open < 0) {
      appendText(decodeEntities(source.slice(position)));
      break;
    }
    if (open > position) {
      appendText(decodeEntities(source.slice(position, open)));
    }
    if (source.startsWith("<?", open)) {
      const close = source.indexOf("?>", open);
      if (close < 0) throw new XmlParseError("Unclosed processing instruction");
      position = close + 2;
    } else if (source.startsWith("<!--", open)) {
      const close = source.indexOf("-->", open);
      if (close < 0) throw new XmlParseError("Unclosed comment");
      position = close + 3;
    } else if (source.startsWith("<![CDATA[", open)) {
      const close = source.indexOf("]]>", open);
      if (close < 0) throw new XmlParseError("Unclosed CDATA section");
      appendText(source.slice(open + 9, close));
      position = close + 3;
    } else if (source.startsWith("<!", open)) {
      throw new XmlParseError("Document type declarations are not accepted");
    } else if (source[open + 1] === "/") {
      const name = readName(source, open + 2);
      const close = skipSpace(source, open + 2 + name.length);
      if (source[close] !== ">") throw new XmlParseError(`Bad end tag ${name}`);
      const top = stack.pop();
      if (!top || top.name !== name) {
        throw new XmlParseError(`Mismatched end tag ${name}`);
      }
      top.end = close + 1;
      position = close + 1;
    } else {
      const name = readName(source, open + 1);
      let at = open + 1 + name.length;
      const attributes: XmlAttribute[] = [];
      for (;;) {
        at = skipSpace(source, at);
        if (source[at] === ">" || source.startsWith("/>", at)) break;
        const attribute = readName(source, at);
        at = skipSpace(source, at + attribute.length);
        if (source[at] !== "=") {
          throw new XmlParseError(`Attribute ${attribute} has no value`);
        }
        at = skipSpace(source, at + 1);
        const quote = source[at];
        if (quote !== '"' && quote !== "'") {
          throw new XmlParseError(`Attribute ${attribute} is not quoted`);
        }
        const closeQuote = source.indexOf(quote, at + 1);
        if (closeQuote < 0) throw new XmlParseError("Unclosed attribute value");
        const raw = source.slice(at + 1, closeQuote);
        if (raw.includes("<")) throw new XmlParseError("< in attribute value");
        if (attributes.some((a) => a.name === attribute)) {
          throw new XmlParseError(`Duplicate attribute ${attribute}`);
        }
        attributes.push({
          name: attribute,
          value: decodeEntities(raw.replace(/[\t\n]/g, " ")),
        });
        at = closeQuote + 1;
      }
      const selfClosing = source.startsWith("/>", at);
      const element: MutableElement = {
        kind: XmlNodeKind.Element,
        name,
        attributes,
        children: [],
        parent: stack.at(-1),
        start: open,
        end: selfClosing ? at + 2 : -1,
      };
      const top = stack.at(-1);
      if (top) top.children.push(element);
      else if (root) throw new XmlParseError("More than one document element");
      else root = element;
      if (!selfClosing) stack.push(element);
      position = at + (selfClosing ? 2 : 1);
    }
  }
  if (stack.length > 0) {
    throw new XmlParseError(`Unclosed element ${stack.at(-1)!.name}`);
  }
  if (!root) throw new XmlParseError("No document element");
  return { root, source };
}

export function prefixOf(qualifiedName: string): string {
  const colon = qualifiedName.indexOf(":");
  return colon < 0 ? "" : qualifiedName.slice(0, colon);
}

export function localName(qualifiedName: string): string {
  return qualifiedName.slice(qualifiedName.indexOf(":") + 1);
}

function declaredPrefix(attribute: XmlAttribute): string | undefined {
  if (attribute.name === "xmlns") return "";
  return attribute.name.startsWith("xmlns:")
    ? attribute.name.slice(6)
    : undefined;
}

/** Prefix to namespace URI for every binding in scope at `element` ("" is the default namespace). */
export function namespacesInScope(element: XmlElement): Map<string, string> {
  const chain: XmlElement[] = [];
  for (let at: XmlElement | undefined = element; at; at = at.parent) {
    chain.unshift(at);
  }
  const scope = new Map<string, string>([[
    "xml",
    "http://www.w3.org/XML/1998/namespace",
  ]]);
  for (const ancestor of chain) {
    for (const attribute of ancestor.attributes) {
      const prefix = declaredPrefix(attribute);
      if (prefix !== undefined) scope.set(prefix, attribute.value);
    }
  }
  return scope;
}

export function namespaceOf(element: XmlElement): string {
  return namespacesInScope(element).get(prefixOf(element.name)) ?? "";
}

export function childElements(element: XmlElement): XmlElement[] {
  return element.children.filter((c): c is XmlElement =>
    c.kind === XmlNodeKind.Element
  );
}

function matches(element: XmlElement, namespace: string, name: string) {
  return localName(element.name) === name && namespaceOf(element) === namespace;
}

export function child(
  element: XmlElement,
  namespace: string,
  name: string,
): XmlElement | undefined {
  return childElements(element).find((c) => matches(c, namespace, name));
}

/** Every descendant (and the element itself) with this namespace and local name, in document order. */
export function descendants(
  element: XmlElement,
  namespace: string,
  name: string,
): XmlElement[] {
  const found = matches(element, namespace, name) ? [element] : [];
  return [
    ...found,
    ...childElements(element).flatMap((c) => descendants(c, namespace, name)),
  ];
}

export function textContent(node: XmlNode): string {
  return node.kind === XmlNodeKind.Text
    ? node.value
    : node.children.map(textContent).join("");
}

/** The trimmed text of the named child, if present. */
export function childText(
  element: XmlElement,
  namespace: string,
  name: string,
): string | undefined {
  const found = child(element, namespace, name);
  return found === undefined ? undefined : textContent(found).trim();
}

/** An attribute by local name and namespace ("" for an unqualified attribute). */
export function attributeValue(
  element: XmlElement,
  namespace: string,
  name: string,
): string | undefined {
  const scope = namespacesInScope(element);
  return element.attributes.find((a) =>
    declaredPrefix(a) === undefined && localName(a.name) === name &&
    (prefixOf(a.name) === "" ? "" : scope.get(prefixOf(a.name))) === namespace
  )?.value;
}

/** Elements carrying an Id attribute (wsu:Id or unqualified Id) with this value. */
export function elementsById(root: XmlElement, id: string): XmlElement[] {
  const own =
    root.attributes.some((a) =>
        declaredPrefix(a) === undefined && localName(a.name) === "Id" &&
        a.value === id
      )
      ? [root]
      : [];
  return [...own, ...childElements(root).flatMap((c) => elementsById(c, id))];
}

function escapeC14nText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/\r/g, "&#xD;");
}

function escapeC14nAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/"/g, "&quot;").replace(/\t/g, "&#x9;").replace(/\n/g, "&#xA;")
    .replace(/\r/g, "&#xD;");
}

function compareCodeUnits(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function canonical(
  element: XmlElement,
  rendered: ReadonlyMap<string, string>,
): string {
  const scope = namespacesInScope(element);
  const attributes = element.attributes.filter((a) =>
    declaredPrefix(a) === undefined
  );
  const utilized = new Set([
    prefixOf(element.name),
    ...attributes.map((a) => prefixOf(a.name)).filter((p) =>
      p !== "" && p !== "xml"
    ),
  ]);
  const declarations = [...utilized].flatMap((prefix) => {
    const uri = scope.get(prefix) ?? "";
    if (prefix !== "" && uri === "") {
      throw new XmlParseError(`Undeclared namespace prefix ${prefix}`);
    }
    // An absent default namespace counts as rendered "", so xmlns="" appears
    // only to undo a default an output ancestor declared.
    return (rendered.get(prefix) ?? "") === uri ? [] : [[prefix, uri] as const];
  }).sort(([a], [b]) => compareCodeUnits(a, b));
  const sortedAttributes = attributes.map((a) => ({
    a,
    uri: prefixOf(a.name) === "" ? "" : scope.get(prefixOf(a.name)) ?? "",
    local: localName(a.name),
  })).sort((x, y) =>
    compareCodeUnits(x.uri, y.uri) || compareCodeUnits(x.local, y.local)
  );
  const next = new Map(rendered);
  for (const [prefix, uri] of declarations) next.set(prefix, uri);
  const open = [
    `<${element.name}`,
    ...declarations.map(([prefix, uri]) =>
      ` ${prefix === "" ? "xmlns" : `xmlns:${prefix}`}="${
        escapeC14nAttribute(uri)
      }"`
    ),
    ...sortedAttributes.map(({ a }) =>
      ` ${a.name}="${escapeC14nAttribute(a.value)}"`
    ),
    ">",
  ].join("");
  const content = element.children.map((c) =>
    c.kind === XmlNodeKind.Text ? escapeC14nText(c.value) : canonical(c, next)
  ).join("");
  return `${open}${content}</${element.name}>`;
}

/** Exclusive C14N of the element's subtree, evaluated in its document context. */
export function exclusiveCanonical(element: XmlElement): string {
  return canonical(element, new Map());
}

/**
 * The element's source text with any in-scope namespace declarations it
 * relies on from its ancestors copied onto its start tag, so it can be
 * embedded verbatim in another document (the Login response's wsse:Security).
 */
export function standaloneElementSource(
  document: XmlDocument,
  element: XmlElement,
): string {
  const raw = document.source.slice(element.start, element.end);
  const own = new Set(
    element.attributes.map(declaredPrefix).filter((p) => p !== undefined),
  );
  const inherited = [...namespacesInScope(element.parent ?? element)]
    .filter(([prefix]) => prefix !== "xml" && !own.has(prefix))
    .filter(([prefix, uri]) => prefix !== "" || uri !== "");
  if (inherited.length === 0 || element.parent === undefined) return raw;
  const insertAt = 1 + element.name.length;
  const declarations = inherited.map(([prefix, uri]) =>
    ` ${prefix === "" ? "xmlns" : `xmlns:${prefix}`}="${
      escapeC14nAttribute(uri)
    }"`
  ).join("");
  return raw.slice(0, insertAt) + declarations + raw.slice(insertAt);
}
