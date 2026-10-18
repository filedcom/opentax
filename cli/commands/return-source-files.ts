import {
  lstat,
  mkdir,
  readdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, join } from "node:path";
import { z } from "zod";
import type { MefPdfAttachment } from "../../forms/f1040/2025/mef/form-descriptor.ts";
import { isValidMefPdfFilename } from "../../forms/f1040/2025/mef/attachments/pdf-attachment-filename.ts";
import { inputSchema as f8835InputSchema } from "../../forms/f1040/nodes/inputs/credits/business/f8835/index.ts";
import { FORM8835_PURCHASE_STATEMENT_DESCRIPTION } from "../../forms/f1040/nodes/inputs/credits/business/f8835/purchase-source.ts";

export const ATTACHMENTS_FOLDER = "attachments";
export const RETAINED_FOLDER = "retained";
export const SOURCE_FILES_MANIFEST = "source-files.json";
const MAX_FILE_BYTES = 60_000_000;

const descriptionSchema = z.string().trim().min(1).max(128);

const manifestSchema = z.object({
  /** PDF file name in attachments/ → its MeF BinaryAttachment description. */
  attachments: z.record(z.object({ description: descriptionSchema.optional() }))
    .default({}),
  /** Retained document reference → its file name in retained/. */
  retained: z.record(z.string().min(1)).default({}),
});

type Manifest = z.infer<typeof manifestSchema>;

export type RetainedSourceDocument = {
  readonly document_reference: string;
  readonly bytes: Uint8Array;
};

/** Files the return's inputs name: attachment PDFs and retained references. */
export type NamedSourceFiles = {
  readonly attachments: ReadonlyMap<string, string | undefined>;
  readonly retained: ReadonlySet<string>;
};

export type ReturnSourceFiles = {
  readonly attachments: readonly MefPdfAttachment[];
  readonly retained: readonly RetainedSourceDocument[];
  /** Paths of named files that are absent from the return's folders. */
  readonly missing: readonly string[];
};

function isSafeFileName(name: string): boolean {
  return name.length > 0 && name.length <= 255 && !name.startsWith(".") &&
    !/[\\/\0]/.test(name) && !name.includes("..");
}

function hasOwnDigest(
  record: Readonly<Record<string, unknown>>,
  key: string,
): boolean {
  const prefix = key.slice(0, -"reference".length);
  return typeof record[`${prefix}sha256`] === "string" ||
    (key === "document_reference" && typeof record.sha256 === "string");
}

function collectNames(
  value: unknown,
  attachments: Map<string, string | undefined>,
  retained: Set<string>,
): void {
  if (Array.isArray(value)) {
    for (const item of value) collectNames(item, attachments, retained);
    return;
  }
  if (value === null || typeof value !== "object") return;
  const record = value as Readonly<Record<string, unknown>>;
  const namesFile = Object.keys(record).some((key) =>
    key.endsWith("file_name")
  );
  for (const [key, item] of Object.entries(record)) {
    if (
      key.endsWith("file_name") && typeof item === "string" &&
      isValidMefPdfFilename(item)
    ) {
      const description = typeof record.description === "string"
        ? record.description
        : undefined;
      attachments.set(item, description ?? attachments.get(item));
    } else if (
      key.endsWith("reference") && typeof item === "string" && !namesFile &&
      hasOwnDigest(record, key)
    ) {
      // A reference with its own digest and no file name is a retained copy.
      retained.add(item);
    }
    collectNames(item, attachments, retained);
  }
}

function form8835PurchaseDescriptions(
  pending: Readonly<Record<string, unknown>>,
): ReadonlyMap<string, string> {
  if (!pending.f8835) return new Map();
  return new Map(
    f8835InputSchema.parse(pending.f8835).f8835s.flatMap((item) =>
      item.purchase_source
        ? [
          [
            item.purchase_source.statement_file_name,
            FORM8835_PURCHASE_STATEMENT_DESCRIPTION,
          ] as const,
        ]
        : []
    ),
  );
}

/** Every attachment file name and retained reference the return's inputs name. */
export function namedSourceFiles(
  pending: Readonly<Record<string, unknown>>,
): NamedSourceFiles {
  const attachments = new Map<string, string | undefined>();
  const retained = new Set<string>();
  collectNames(pending, attachments, retained);
  for (const [name, description] of form8835PurchaseDescriptions(pending)) {
    attachments.set(name, attachments.get(name) ?? description);
  }
  return { attachments, retained };
}

async function readManifest(returnPath: string): Promise<Manifest> {
  const path = join(returnPath, SOURCE_FILES_MANIFEST);
  const text = await readFile(path, "utf8").catch((error) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  });
  return manifestSchema.parse(text === undefined ? {} : JSON.parse(text));
}

async function writeManifest(
  returnPath: string,
  manifest: Manifest,
): Promise<void> {
  const staged = join(
    returnPath,
    `.${SOURCE_FILES_MANIFEST}-${crypto.randomUUID()}`,
  );
  await writeFile(staged, `${JSON.stringify(manifest, null, 2)}\n`, {
    flag: "wx",
    mode: 0o600,
  });
  await rename(staged, join(returnPath, SOURCE_FILES_MANIFEST));
}

async function ownedFolder(directory: string): Promise<boolean> {
  const folder = await lstat(directory).catch(() => undefined);
  if (!folder) return false;
  if (!folder.isDirectory() || folder.isSymbolicLink()) {
    throw new Error(`Return source folder must be return-owned: ${directory}`);
  }
  return true;
}

/** The file's bytes, or undefined when it is absent. */
async function readOwnedFile(
  directory: string,
  name: string,
): Promise<Uint8Array | undefined> {
  if (!await ownedFolder(directory)) return undefined;
  const path = join(directory, name);
  const file = await lstat(path).catch(() => undefined);
  if (!file) return undefined;
  if (!file.isFile() || file.isSymbolicLink() || file.size > MAX_FILE_BYTES) {
    throw new Error(`Return source file must be a regular file: ${path}`);
  }
  return new Uint8Array(await readFile(path));
}

function defaultDescription(fileName: string): string {
  return fileName.slice(0, -".pdf".length);
}

/**
 * Files offered to MeF preparation: each attachment the inputs name or
 * `return attach` recorded, from attachments/, and each retained copy the
 * inputs name, from retained/ (by the file `return attach` recorded for that
 * reference, or the reference itself). Absent files are reported rather than thrown;
 * the builders decide which ones the return needs.
 */
export async function loadReturnSourceFiles(
  returnPath: string,
  pending: Readonly<Record<string, unknown>>,
): Promise<ReturnSourceFiles> {
  const named = namedSourceFiles(pending);
  const manifest = await readManifest(returnPath);
  const missing: string[] = [];
  const attachments: MefPdfAttachment[] = [];
  const attachmentFolder = join(returnPath, ATTACHMENTS_FOLDER);
  for (
    const fileName of new Set([
      ...named.attachments.keys(),
      ...Object.keys(manifest.attachments),
    ])
  ) {
    if (!isValidMefPdfFilename(fileName)) {
      throw new Error(`Return attachment file name is unsafe: ${fileName}`);
    }
    const bytes = await readOwnedFile(attachmentFolder, fileName);
    if (!bytes) {
      missing.push(join(attachmentFolder, fileName));
      continue;
    }
    attachments.push({
      fileName,
      description: manifest.attachments[fileName]?.description ??
        named.attachments.get(fileName) ?? defaultDescription(fileName),
      bytes,
    });
  }
  const retained: RetainedSourceDocument[] = [];
  const retainedFolder = join(returnPath, RETAINED_FOLDER);
  for (const reference of named.retained) {
    const fileName = manifest.retained[reference] ??
      await retainedFileName(reference);
    if (!isSafeFileName(fileName)) {
      throw new Error(`Return retained file name is unsafe: ${fileName}`);
    }
    const bytes = await readOwnedFile(retainedFolder, fileName);
    if (!bytes) {
      missing.push(join(retainedFolder, fileName));
      continue;
    }
    retained.push({ document_reference: reference, bytes });
  }
  return { attachments, retained, missing };
}

/** Stored stand-in for inline source bytes: a retained file by name or digest. */
const storedBytesSchema = z.union([
  z.object({ retained: z.string().min(1) }).strict(),
  z.object({ sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
]);

type StoredBytes = z.infer<typeof storedBytesSchema>;

function storedBytes(value: unknown): StoredBytes | undefined {
  const parsed = storedBytesSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function hasStoredBytes(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasStoredBytes);
  if (value === null || typeof value !== "object") return false;
  return Object.entries(value).some(([key, item]) =>
    key === "bytes" ? storedBytes(item) !== undefined : hasStoredBytes(item)
  );
}

async function retainedFilesByDigest(
  folder: string,
): Promise<ReadonlyMap<string, Uint8Array>> {
  if (!await ownedFolder(folder)) return new Map();
  const files = new Map<string, Uint8Array>();
  for (const name of await readdir(folder)) {
    if (!isSafeFileName(name)) continue;
    const bytes = await readOwnedFile(folder, name);
    if (bytes) files.set(createHash("sha256").update(bytes).digest("hex"), bytes);
  }
  return files;
}

/**
 * JSON cannot hold a source copy's bytes, so a stored input names them as
 * `"bytes": {"retained": "<file in retained/>"}` or `{"sha256": "<digest>"}`;
 * the engine receives the file's bytes in their place.
 */
export async function resolveSourceBytes(
  returnPath: string,
  inputs: Readonly<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
  if (!hasStoredBytes(inputs)) return { ...inputs };
  const folder = join(returnPath, RETAINED_FOLDER);
  const byDigest = await retainedFilesByDigest(folder);
  const resolve = async (value: unknown): Promise<unknown> => {
    if (Array.isArray(value)) return Promise.all(value.map(resolve));
    if (value === null || typeof value !== "object") return value;
    if (value instanceof Uint8Array) return value;
    return Object.fromEntries(
      await Promise.all(
        Object.entries(value).map(async ([key, item]) => {
          const stored = key === "bytes" ? storedBytes(item) : undefined;
          if (!stored) return [key, await resolve(item)] as const;
          if ("sha256" in stored) {
            const bytes = byDigest.get(stored.sha256);
            if (!bytes) {
              throw new Error(
                `No file in ${folder} has SHA-256 ${stored.sha256}. Put the source copy there, or add it with \`opentax return attach --file <path> --reference <name>\``,
              );
            }
            return [key, bytes] as const;
          }
          if (!isSafeFileName(stored.retained)) {
            throw new Error(
              `Retained file name is unsafe: ${stored.retained}`,
            );
          }
          const bytes = await readOwnedFile(folder, stored.retained);
          if (!bytes) {
            throw new Error(
              `Missing source file ${
                join(folder, stored.retained)
              }. Put it there, or add it with \`opentax return attach --file <path> --reference ${stored.retained}\``,
            );
          }
          return [key, bytes] as const;
        }),
      ),
    );
  };
  return await resolve(inputs) as Record<string, unknown>;
}

/**
 * JSON cannot carry inline source bytes: each becomes `{"sha256": digest}`,
 * the stand-in `resolveSourceBytes` replaces with the matching retained file.
 */
export function detachInlineBytes<T>(
  value: T,
  files: Map<string, Uint8Array> = new Map(),
): { readonly value: T; readonly files: Map<string, Uint8Array> } {
  const walk = (item: unknown, key?: string): unknown => {
    if (item instanceof Uint8Array && key === "bytes") {
      const sha256 = createHash("sha256").update(item).digest("hex");
      files.set(sha256, item);
      return { sha256 };
    }
    if (Array.isArray(item)) return item.map((entry) => walk(entry));
    if (item === null || typeof item !== "object") return item;
    return Object.fromEntries(
      Object.entries(item).map(([k, v]) => [k, walk(v, k)]),
    );
  };
  // Only Uint8Array leaves change, into JSON stand-ins the schemas never see.
  return { value: walk(value) as T, files };
}

/** The preparation error, followed by the named files that were not found. */
export function withMissingSourceFiles(
  error: unknown,
  missing: readonly string[],
): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (missing.length === 0) {
    return error instanceof Error ? error : new Error(message);
  }
  return new Error(
    `${message}\n\nThe return names files that are not in its folders. Put each one at the path shown, or add it with \`opentax return attach\`:\n${
      missing.map((path) => `  ${path}`).join("\n")
    }`,
  );
}

export type AttachSourceFileArgs = {
  readonly returnId: string;
  readonly baseDir: string;
  readonly file: string;
  /** Stored attachment file name; defaults to the source file's name. */
  readonly name?: string;
  readonly description?: string;
  /** Retained document reference; the file goes to retained/, not attachments/. */
  readonly reference?: string;
};

export type AttachSourceFileResult = {
  readonly path: string;
  readonly description?: string;
  readonly reference?: string;
};

async function sourceBytes(path: string): Promise<Uint8Array> {
  const file = await lstat(path).catch(() => undefined);
  if (!file?.isFile() || file.size > MAX_FILE_BYTES) {
    throw new Error(`File to attach must be a regular file: ${path}`);
  }
  const bytes = new Uint8Array(await readFile(path));
  if (bytes.length === 0) throw new Error(`File to attach is empty: ${path}`);
  return bytes;
}

/** A reference is its own file name unless it cannot name a file. */
async function retainedFileName(reference: string): Promise<string> {
  if (isSafeFileName(reference)) return reference;
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(reference)),
  );
  return `retained-${
    Array.from(digest.slice(0, 8), (b) => b.toString(16).padStart(2, "0"))
      .join("")
  }`;
}

async function writeIntoFolder(
  returnPath: string,
  folderName: string,
  fileName: string,
  bytes: Uint8Array,
): Promise<string> {
  const folder = join(returnPath, folderName);
  await mkdir(folder, { recursive: true });
  await ownedFolder(folder);
  const path = join(folder, fileName);
  const existing = await lstat(path).catch(() => undefined);
  if (existing && (!existing.isFile() || existing.isSymbolicLink())) {
    throw new Error(`Return source file must be a regular file: ${path}`);
  }
  await writeFile(path, bytes);
  return path;
}

/** Copy a file into the return's attachments/ or retained/ folder. */
export async function attachSourceFileCommand(
  args: AttachSourceFileArgs,
): Promise<AttachSourceFileResult> {
  const returnPath = join(args.baseDir, args.returnId);
  if (!await lstat(join(returnPath, "return.json")).catch(() => undefined)) {
    throw new Error(`Return not found: ${args.returnId}`);
  }
  const bytes = await sourceBytes(args.file);
  const manifest = await readManifest(returnPath);
  if (args.reference !== undefined) {
    if (args.description !== undefined || args.name !== undefined) {
      throw new Error(
        "--description and --name apply to attachments, not to --reference",
      );
    }
    const reference = args.reference;
    if (reference.trim().length === 0) {
      throw new Error("--reference must name the retained document");
    }
    const fileName = await retainedFileName(reference);
    const path = await writeIntoFolder(
      returnPath,
      RETAINED_FOLDER,
      fileName,
      bytes,
    );
    await writeManifest(returnPath, {
      ...manifest,
      retained: { ...manifest.retained, [reference]: fileName },
    });
    return { path, reference };
  }
  const fileName = args.name ?? basename(args.file);
  if (!isValidMefPdfFilename(fileName)) {
    throw new Error(
      `Attachment file name must be a MeF PDF name (at most 64 characters, ending .pdf, no quotes, slashes or ;|[]<>^&:?*): ${fileName}`,
    );
  }
  const description = args.description === undefined
    ? manifest.attachments[fileName]?.description
    : descriptionSchema.safeParse(args.description).data;
  if (args.description !== undefined && description === undefined) {
    throw new Error("--description must be 1 to 128 characters");
  }
  const path = await writeIntoFolder(
    returnPath,
    ATTACHMENTS_FOLDER,
    fileName,
    bytes,
  );
  await writeManifest(returnPath, {
    ...manifest,
    attachments: {
      ...manifest.attachments,
      [fileName]: description === undefined ? {} : { description },
    },
  });
  return { path, ...(description === undefined ? {} : { description }) };
}
