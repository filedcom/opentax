/**
 * MTOM/XOP (W3C SOAP MTOM, XOP 1.0) multipart/related encoding as the STP
 * guide §1.3.2–1.3.3 shows it: an application/xop+xml root part whose
 * xop:Include href names the binary part's Content-ID. Attachments go as
 * application/octet-stream, not application/zip (§1.5.2; Pub 4164 §4.1.6).
 */
import { randomBytes } from "node:crypto";
import { XOP_NAMESPACE } from "./protocol.ts";
import { attributeValue, child, textContent, type XmlElement } from "./xml.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export type MimePart = {
  readonly headers: ReadonlyMap<string, string>;
  readonly contentId: string | undefined;
  readonly bytes: Uint8Array;
};

export type MtomAttachment = {
  readonly contentId: string;
  readonly bytes: Uint8Array;
};

export type EncodedMtom = {
  readonly body: Uint8Array<ArrayBuffer>;
  readonly contentType: string;
};

export class MimeError extends Error {}

function concat(parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function newContentId(index: number): string {
  return `${index}.urn:uuid:${randomBytes(16).toString("hex")}@opentax`;
}

/** A multipart/related MTOM message: the SOAP envelope root, then each attachment. */
export function encodeMtom(
  envelopeXml: string,
  attachments: readonly MtomAttachment[],
  rootContentId = newContentId(0),
): EncodedMtom {
  const boundary = `MIMEBoundary_${randomBytes(24).toString("hex")}`;
  const part = (headers: readonly string[], bytes: Uint8Array) => [
    encoder.encode(`--${boundary}\r\n${headers.join("\r\n")}\r\n\r\n`),
    bytes,
    encoder.encode("\r\n"),
  ];
  const body = concat([
    ...part([
      'Content-Type: application/xop+xml; charset=UTF-8; type="text/xml"',
      "Content-Transfer-Encoding: binary",
      `Content-ID: <${rootContentId}>`,
    ], encoder.encode(envelopeXml)),
    ...attachments.flatMap((attachment) =>
      part([
        "Content-Type: application/octet-stream",
        "Content-Transfer-Encoding: binary",
        `Content-ID: <${attachment.contentId}>`,
      ], attachment.bytes)
    ),
    encoder.encode(`--${boundary}--\r\n`),
  ]);
  return {
    body,
    contentType:
      `multipart/related; boundary="${boundary}"; type="application/xop+xml"; start="<${rootContentId}>"; start-info="text/xml"`,
  };
}

/** Media type and parameters of a Content-Type header value. */
export function parseContentType(
  value: string,
): { type: string; params: Map<string, string> } {
  const [type, ...rest] = value.split(";");
  const params = new Map<string, string>();
  const pattern = /\s*([^=\s;]+)\s*=\s*("(?:[^"\\]|\\.)*"|[^;]*)/g;
  for (const match of rest.join(";").matchAll(pattern)) {
    const raw = match[2].trim();
    params.set(
      match[1].toLowerCase(),
      raw.startsWith('"') ? raw.slice(1, -1).replace(/\\(.)/g, "$1") : raw,
    );
  }
  return { type: type.trim().toLowerCase(), params };
}

function indexOf(
  haystack: Uint8Array,
  needle: Uint8Array,
  from: number,
): number {
  outer: for (let i = from; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function stripAngles(id: string): string {
  return id.trim().replace(/^</, "").replace(/>$/, "");
}

/** Split a multipart/related body into its parts (binary safe). */
export function decodeMultipart(
  body: Uint8Array,
  contentType: string,
): { readonly root: MimePart; readonly parts: readonly MimePart[] } {
  const { type, params } = parseContentType(contentType);
  const boundary = params.get("boundary");
  if (type !== "multipart/related" || !boundary) {
    throw new MimeError(`Expected multipart/related, got ${contentType}`);
  }
  const delimiter = encoder.encode(`--${boundary}`);
  const parts: MimePart[] = [];
  let at = indexOf(body, delimiter, 0);
  if (at < 0) throw new MimeError("Multipart body has no boundary");
  for (;;) {
    const afterDelimiter = at + delimiter.length;
    if (body[afterDelimiter] === 0x2d && body[afterDelimiter + 1] === 0x2d) {
      break;
    }
    const headerStart = indexOf(body, encoder.encode("\r\n"), afterDelimiter) +
      2;
    const headerEnd = indexOf(body, encoder.encode("\r\n\r\n"), headerStart);
    if (headerStart < 2 || headerEnd < 0) {
      throw new MimeError("Multipart part has no header block");
    }
    const next = indexOf(
      body,
      encoder.encode(`\r\n--${boundary}`),
      headerEnd + 4,
    );
    if (next < 0) throw new MimeError("Multipart body is not terminated");
    const headers = new Map<string, string>();
    for (
      const line of decoder.decode(body.subarray(headerStart, headerEnd)).split(
        "\r\n",
      )
    ) {
      const colon = line.indexOf(":");
      if (colon > 0) {
        headers.set(
          line.slice(0, colon).trim().toLowerCase(),
          line.slice(colon + 1).trim(),
        );
      }
    }
    const contentId = headers.get("content-id");
    parts.push({
      headers,
      contentId: contentId === undefined ? undefined : stripAngles(contentId),
      bytes: body.slice(headerEnd + 4, next),
    });
    at = next + 2;
  }
  if (parts.length === 0) throw new MimeError("Multipart body has no parts");
  const start = params.get("start");
  const root = start === undefined
    ? parts[0]
    : parts.find((p) => p.contentId === stripAngles(start));
  if (root === undefined) throw new MimeError(`No root part ${start}`);
  return { root, parts };
}

/** An xsd:base64Binary element's bytes: its XOP part, or its inline base64 text. */
export function binaryContent(
  element: XmlElement,
  parts: readonly MimePart[],
): Uint8Array {
  const include = child(element, XOP_NAMESPACE, "Include");
  if (include === undefined) {
    return new Uint8Array(
      Buffer.from(textContent(element).replace(/\s+/g, ""), "base64"),
    );
  }
  const href = attributeValue(include, "", "href") ?? "";
  if (!href.startsWith("cid:")) {
    throw new MimeError(`xop:Include href ${href} is not a cid: URL`);
  }
  const id = decodeURIComponent(href.slice(4));
  const part = parts.find((p) => p.contentId === id);
  if (part === undefined) throw new MimeError(`No MIME part for ${href}`);
  return part.bytes;
}
