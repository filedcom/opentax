/**
 * The submission and transmission ZIPs a transmission-time rule context
 * carries (EnvelopeFact), read the way MeF reads them: the central directory
 * names each entry with its declared CRC-32 and size, and each entry is
 * decoded on its own so one unreadable entry does not hide the others.
 */
import { inflateRawSync } from "node:zlib";
import { crc32 } from "../../../../2025/mef/submissions/zip.ts";
import {
  EnvelopeFact,
  factBytes,
  xmlTexts,
} from "../../../../../../core/validation/predicates.ts";
import type { ReturnContext } from "../../../../../../core/validation/types.ts";

export interface ZipEntry {
  readonly name: string;
  /** Raw entry-name bytes, for byte-length limits. */
  readonly nameBytes: number;
  readonly crc: number;
  readonly size: number;
  /** Decoded data, or undefined when the entry cannot be read. */
  readonly bytes?: Uint8Array;
}

export interface SubmissionEnvelope {
  readonly entries: readonly ZipEntry[];
  readonly manifest?: string;
  /** The single xml/ entry, when there is exactly one. */
  readonly xml?: string;
  /** Attachment entries, by the file name after "attachment/". */
  readonly attachments: readonly (ZipEntry & { readonly fileName: string })[];
}

const utf8 = new TextDecoder("utf-8", { fatal: true });
const latin1 = new TextDecoder("latin1");

export const MANIFEST_ENTRY = /^\/?manifest\/manifest\.xml$/;
export const XML_ENTRY = /^\/?xml\/[^/]+$/;
export const ATTACHMENT_ENTRY = /^\/?attachment\/([^/]+)$/;

/** UTF-8 text, or undefined when the bytes are not valid UTF-8. */
export function utf8Text(bytes: Uint8Array | undefined): string | undefined {
  if (!bytes) return undefined;
  try {
    return utf8.decode(bytes);
  } catch {
    return undefined;
  }
}

function entryData(
  bytes: Uint8Array,
  view: DataView,
  local: number,
  method: number,
  compressedSize: number,
): Uint8Array | undefined {
  if (local + 30 > bytes.length || view.getUint32(local, true) !== 0x04034b50) {
    return undefined;
  }
  const start = local + 30 + view.getUint16(local + 26, true) +
    view.getUint16(local + 28, true);
  if (start + compressedSize > bytes.length) return undefined;
  const body = bytes.subarray(start, start + compressedSize);
  try {
    if (method === 0) return Uint8Array.from(body);
    if (method === 8) return new Uint8Array(inflateRawSync(body));
  } catch {
    return undefined;
  }
  return undefined;
}

/** The central-directory entries of a ZIP, or undefined when it has none. */
export function readZip(bytes: Uint8Array): readonly ZipEntry[] | undefined {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0) return undefined;
  const count = view.getUint16(end + 10, true);
  let position = view.getUint32(end + 16, true);
  const entries: ZipEntry[] = [];
  for (let index = 0; index < count; index++) {
    if (
      position + 46 > bytes.length ||
      view.getUint32(position, true) !== 0x02014b50
    ) return undefined;
    const nameLength = view.getUint16(position + 28, true);
    const raw = bytes.subarray(position + 46, position + 46 + nameLength);
    const data = entryData(
      bytes,
      view,
      view.getUint32(position + 42, true),
      view.getUint16(position + 10, true),
      view.getUint32(position + 20, true),
    );
    const crc = view.getUint32(position + 16, true);
    const size = view.getUint32(position + 24, true);
    entries.push({
      name: utf8Text(raw) ?? latin1.decode(raw),
      nameBytes: nameLength,
      crc,
      size,
      // A decoded entry whose CRC or size disagrees is not the file sent.
      bytes: data && data.length === size && crc32(data) === crc
        ? data
        : undefined,
    });
    position += 46 + nameLength + view.getUint16(position + 30, true) +
      view.getUint16(position + 32, true);
  }
  return entries;
}

const parsed = new WeakMap<Uint8Array, SubmissionEnvelope | null>();

function envelopeOf(bytes: Uint8Array): SubmissionEnvelope | undefined {
  const entries = readZip(bytes);
  if (!entries) return undefined;
  const xml = entries.filter((e) => XML_ENTRY.test(e.name));
  return {
    entries,
    manifest: utf8Text(entries.find((e) => MANIFEST_ENTRY.test(e.name))?.bytes),
    xml: xml.length === 1 ? utf8Text(xml[0].bytes) : undefined,
    attachments: entries.flatMap((e) => {
      const fileName = ATTACHMENT_ENTRY.exec(e.name)?.[1];
      return fileName === undefined ? [] : [{ ...e, fileName }];
    }),
  };
}

/** The submission ZIP fact, read once per context. */
export function submissionEnvelope(
  ctx: ReturnContext,
): SubmissionEnvelope | null | undefined {
  const bytes = factBytes(ctx, EnvelopeFact.SubmissionZip);
  if (!bytes) return undefined;
  if (!parsed.has(bytes)) parsed.set(bytes, envelopeOf(bytes) ?? null);
  // null: a ZIP fact that is not a readable archive.
  return parsed.get(bytes);
}

/** The first `<tag>` text in the submission manifest. */
export function manifestText(
  envelope: SubmissionEnvelope | null | undefined,
  tag: string,
): string | undefined {
  return envelope?.manifest ? xmlTexts(envelope.manifest, tag)[0] : undefined;
}

/** Every submission ZIP inside the transmission ZIP fact, with its entry name. */
export function transmissionEntries(
  ctx: ReturnContext,
): readonly ZipEntry[] | null | undefined {
  const bytes = factBytes(ctx, EnvelopeFact.TransmissionZip);
  if (!bytes) return undefined;
  return readZip(bytes) ?? null;
}

/** The submission manifest of each readable submission in the transmission. */
export function transmissionManifests(ctx: ReturnContext): readonly string[] {
  return (transmissionEntries(ctx) ?? []).flatMap((entry) => {
    if (!entry.bytes) return [];
    const inner = envelopeOf(entry.bytes);
    return inner?.manifest ? [inner.manifest] : [];
  });
}
