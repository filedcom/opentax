// A worker-free ZIP codec for the CLI binary (fflate loads worker_threads,
// which check:sandbox forbids). Entries carry size and CRC-32 in their local
// headers (X0000-030) and a fixed 1980-01-01 timestamp, so output is reproducible.
import { deflateRawSync, inflateRawSync } from "node:zlib";

const CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});
const DOS_DATE_1980_01_01 = 0x0021;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export function crc32(bytes: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value = CRC32_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function header(size: number, fill: (view: DataView) => void): Uint8Array {
  const bytes = new Uint8Array(size);
  fill(new DataView(bytes.buffer));
  return bytes;
}

/** Write entries in order; `deflate` false stores them (Pub 4164 container: compression "None"). */
export function zipEntries(
  files: Readonly<Record<string, Uint8Array>>,
  deflate: boolean,
): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const [name, data] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const body = deflate ? new Uint8Array(deflateRawSync(data)) : data;
    const method = deflate ? 8 : 0;
    const crc = crc32(data);
    // Bit 11: UTF-8 entry names.
    const flags = /^[\x20-\x7e]*$/.test(name) ? 0 : 0x0800;
    const common = (view: DataView, at: number) => {
      view.setUint16(at, 20, true);
      view.setUint16(at + 2, flags, true);
      view.setUint16(at + 4, method, true);
      view.setUint16(at + 6, 0, true);
      view.setUint16(at + 8, DOS_DATE_1980_01_01, true);
      view.setUint32(at + 10, crc, true);
      view.setUint32(at + 14, body.length, true);
      view.setUint32(at + 18, data.length, true);
      view.setUint16(at + 22, nameBytes.length, true);
    };
    const local = header(30, (view) => {
      view.setUint32(0, 0x04034b50, true);
      common(view, 4);
    });
    centrals.push(
      header(46, (view) => {
        view.setUint32(0, 0x02014b50, true);
        view.setUint16(4, 20, true);
        common(view, 6);
        view.setUint32(42, offset, true);
      }),
      nameBytes,
    );
    locals.push(local, nameBytes, body);
    offset += local.length + nameBytes.length + body.length;
  }
  const central = concat(centrals);
  const count = Object.keys(files).length;
  const end = header(22, (view) => {
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(8, count, true);
    view.setUint16(10, count, true);
    view.setUint32(12, central.length, true);
    view.setUint32(16, offset, true);
  });
  return concat([...locals, central, end]);
}

/** Read entries in central-directory order; throws on anything but stored or deflated data. */
export function unzipEntries(bytes: Uint8Array): Record<string, Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0) throw new Error("ZIP has no end of central directory");
  const count = view.getUint16(end + 10, true);
  let position = view.getUint32(end + 16, true);
  const entries: Record<string, Uint8Array> = {};
  for (let index = 0; index < count; index++) {
    if (view.getUint32(position, true) !== 0x02014b50) {
      throw new Error("ZIP central directory is malformed");
    }
    const method = view.getUint16(position + 10, true);
    const compressedSize = view.getUint32(position + 20, true);
    const nameLength = view.getUint16(position + 28, true);
    const local = view.getUint32(position + 42, true);
    const name = decoder.decode(
      bytes.subarray(position + 46, position + 46 + nameLength),
    );
    const start = local + 30 + view.getUint16(local + 26, true) +
      view.getUint16(local + 28, true);
    const body = bytes.subarray(start, start + compressedSize);
    if (method !== 0 && method !== 8) {
      throw new Error(`ZIP entry ${name} uses unsupported method ${method}`);
    }
    entries[name] = method === 8
      ? new Uint8Array(inflateRawSync(body))
      : Uint8Array.from(body);
    position += 46 + nameLength + view.getUint16(position + 30, true) +
      view.getUint16(position + 32, true);
  }
  return entries;
}
