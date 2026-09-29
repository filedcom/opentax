import { buildReturnHeader } from "../../mef/header.ts";
import { element, elements } from "../../mef/xml.ts";
import { PDFDocument } from "pdf-lib";
import { ALL_MEF_FORMS } from "./forms/index.ts";
import type { MefBuildContext, MefPdfAttachment } from "./form-descriptor.ts";
import type { FilerIdentity, MefFormsPending } from "./types.ts";
import { assertAttachmentCoverage } from "../attachment-coverage.ts";
import type { Form3800DocumentParts } from "./forms/f3800_document.ts";
import { preparedSourceSha256, sha256Hex } from "../prepared-source.ts";

export interface MefBundle {
  readonly xml: string;
  readonly attachments: ReadonlyArray<MefPdfAttachment>;
  readonly pending: MefFormsPending;
  readonly sourceSha256: string;
  readonly xmlSha256: string;
  readonly attachmentSha256ByFileName: Readonly<Record<string, string>>;
  readonly form3800Parts?: Form3800DocumentParts;
  readonly form3800PartsSha256?: string;
}

export interface MefBundleOptions {
  readonly filer?: FilerIdentity;
  readonly attachments: ReadonlyArray<MefPdfAttachment>;
  readonly schemaVersion?: string;
  readonly year?: number;
  readonly returnType?: string;
}

function binaryFragments(
  attachments: ReadonlyArray<MefPdfAttachment>,
): ReadonlyArray<{ pendingKey: string; tag: string; xml: string }> {
  return attachments.map((attachment) => ({
    pendingKey: "binaryAttachment",
    tag: "BinaryAttachment",
    xml: elements("BinaryAttachment", [
      element("DocumentTypeCd", "PDF"),
      element("Desc", attachment.description),
      element("AttachmentLocationTxt", attachment.fileName),
    ]),
  }));
}

async function validatePdfAttachments(
  attachments: ReadonlyArray<MefPdfAttachment>,
): Promise<ReadonlyArray<MefPdfAttachment>> {
  const names = new Set<string>();
  const descriptions = new Set<string>();
  const validated: MefPdfAttachment[] = [];
  for (const attachment of attachments) {
    const { fileName, description } = attachment;
    const forbiddenNameCharacters = [
      "/",
      "\\",
      ";",
      "|",
      "[",
      "]",
      "<",
      ">",
      "^",
      "`",
      "&",
      '"',
      "'",
      ":",
      "?",
      "*",
    ];
    if (
      fileName.length > 64 ||
      fileName !== fileName.trim() ||
      !/^[\x20-\x7E]+\.pdf$/.test(fileName) ||
      forbiddenNameCharacters.some((character) =>
        fileName.includes(character)
      ) ||
      fileName.includes("..") ||
      names.has(fileName)
    ) {
      throw new Error(`Invalid or duplicate MeF PDF filename: ${fileName}`);
    }
    if (
      description.length === 0 || description.length > 128 ||
      descriptions.has(description)
    ) {
      throw new Error(
        `Invalid or duplicate MeF PDF description: ${description}`,
      );
    }
    if (
      attachment.bytes.length === 0 ||
      attachment.bytes.length > 60_000_000
    ) {
      throw new Error(`MeF PDF size is invalid: ${fileName}`);
    }
    const bytes = new Uint8Array(attachment.bytes);
    const start = new TextDecoder().decode(bytes.subarray(0, 5));
    const end = new TextDecoder().decode(
      bytes.subarray(Math.max(0, bytes.length - 32)),
    );
    if (start !== "%PDF-" || !/%%EOF\s*$/.test(end)) {
      throw new Error(`MeF attachment is not a complete PDF: ${fileName}`);
    }
    try {
      const pdf = await PDFDocument.load(bytes);
      if (pdf.getPageCount() === 0) throw new Error("PDF has no pages");
    } catch {
      throw new Error(
        `MeF attachment is not a readable, unencrypted PDF: ${fileName}`,
      );
    }
    names.add(fileName);
    descriptions.add(description);
    validated.push({ fileName, description, bytes });
  }
  return validated;
}

function buildFragments(
  pending: MefFormsPending,
  context: MefBuildContext,
): ReadonlyArray<{ pendingKey: string; tag: string; xml: string }> {
  return ALL_MEF_FORMS.flatMap((form) => {
    const source = pending[form.pendingKey as keyof MefFormsPending];
    const sourceKeys = form.sourcePendingKeys ?? [form.pendingKey];
    if (
      form.pendingKey !== "f1040" &&
      !sourceKeys.some((key) =>
        pending[key as keyof MefFormsPending] !== undefined
      )
    ) return [];
    const built = form.build(
      (source ?? []) as never,
      context,
    );
    const fragments = typeof built === "string" ? [built] : built;
    return fragments.filter((xml) => xml !== "").map((xml) => {
      const tag = /^<([A-Za-z0-9]+)(?:\s[^>]*)?>/.exec(xml)?.[1];
      if (!tag) throw new Error(`Invalid MeF document from ${form.pendingKey}`);
      return { pendingKey: form.pendingKey, tag, xml };
    });
  });
}

function documentId(tag: string, index: number): string {
  const suffix = String(index);
  return `${tag.slice(0, 30 - suffix.length)}${suffix}`;
}

function validateDocumentReferences(
  fragments: ReadonlyArray<{ pendingKey: string; tag: string; xml: string }>,
): void {
  const ids = fragments.map((fragment, index) =>
    documentId(fragment.tag, index)
  );
  const knownIds = new Set(ids);
  const referencedIds = fragments.flatMap((fragment) =>
    [...fragment.xml.matchAll(/\breferenceDocumentId="([^"]+)"/g)]
      .flatMap((match) => match[1].trim().split(/\s+/))
  );
  for (const id of referencedIds) {
    if (!knownIds.has(id)) {
      throw new Error(`MeF referenceDocumentId ${id} has no document`);
    }
  }
  for (const [index, fragment] of fragments.entries()) {
    if (
      fragment.tag === "JointOccupancyStatement" &&
      !referencedIds.includes(ids[index])
    ) {
      throw new Error("MeF joint-occupancy statement is not referenced");
    }
  }
}

function buildReturnXml(
  pending: MefFormsPending,
  filer: FilerIdentity | undefined,
  schemaVersion: string,
  year: number,
  returnType: string,
  attachments: ReadonlyArray<MefPdfAttachment>,
  attachmentSha256ByFileName?: Readonly<Record<string, string>>,
): { readonly xml: string; readonly form3800Parts?: Form3800DocumentParts } {
  if (!filer) {
    throw new Error("MeF export requires a real filer identity");
  }
  assertAttachmentCoverage(pending, "mef");
  const binaryAttachmentFileNames = attachments.map((item) => item.fileName);
  const attachmentDescriptionsByFileName = Object.fromEntries(
    attachments.map((item) => [item.fileName, item.description]),
  );
  const initial = buildFragments(pending, {
    filer,
    binaryAttachmentFileNames,
    attachmentDescriptionsByFileName,
    attachmentSha256ByFileName,
    pending,
  });
  const documentIdsByPendingKey = Object.fromEntries(
    ALL_MEF_FORMS.map((form) => [
      form.pendingKey,
      initial.flatMap((fragment, index) =>
        fragment.pendingKey === form.pendingKey
          ? [documentId(fragment.tag, index)]
          : []
      ),
    ]),
  );
  const documentIdsByTag = Object.fromEntries(
    [...new Set(initial.map((fragment) => fragment.tag))].map((tag) => [
      tag,
      initial.flatMap((fragment, index) =>
        fragment.tag === tag ? [documentId(fragment.tag, index)] : []
      ),
    ]),
  );
  const documentIdsByAttachmentFileName = Object.fromEntries(
    attachments.map((attachment, index) => [
      attachment.fileName,
      `BinaryAttachment${initial.length + index}`,
    ]),
  );
  let form3800Parts: Form3800DocumentParts | undefined;
  const linked = buildFragments(pending, {
    filer,
    binaryAttachmentFileNames,
    attachmentDescriptionsByFileName,
    attachmentSha256ByFileName,
    documentIdsByPendingKey,
    documentIdsByTag,
    documentIdsByAttachmentFileName,
    pending,
    onPreparedForm3800(parts) {
      if (form3800Parts) {
        throw new Error("Form 3800 prepared more than once in one return");
      }
      form3800Parts = parts;
    },
  });
  if (
    linked.length !== initial.length ||
    linked.some((fragment, index) =>
      fragment.pendingKey !== initial[index].pendingKey ||
      fragment.tag !== initial[index].tag
    )
  ) {
    throw new Error("MeF document set changed while linking references");
  }
  const documents = [...linked, ...binaryFragments(attachments)];
  validateDocumentReferences(documents);
  const forms = documents.map((fragment, index) =>
    fragment.xml.replace(
      /^<([A-Za-z0-9]+)(?=[\s>])/,
      `<${fragment.tag} documentId="${documentId(fragment.tag, index)}"`,
    )
  );
  const documentCnt = forms.length;

  const innerForms = forms.join("");
  const returnData =
    `<ReturnData documentCnt="${documentCnt}">${innerForms}</ReturnData>`;

  const returnHeader = buildReturnHeader(
    filer,
    year,
    returnType,
    attachments.length,
  );

  return {
    xml:
      `<Return returnVersion="${schemaVersion}" xmlns="http://www.irs.gov/efile" xmlns:efile="http://www.irs.gov/efile">${returnHeader}${returnData}</Return>`,
    form3800Parts,
  };
}

export function buildMefXml(
  pending: MefFormsPending,
  filer?: FilerIdentity,
  schemaVersion = "2025v5.4",
  year = 2025,
  returnType = "1040",
): string {
  return buildReturnXml(pending, filer, schemaVersion, year, returnType, [])
    .xml;
}

/** XML and PDF files that must later be placed in a MeF submission ZIP. */
export async function buildMefBundle(
  pending: MefFormsPending,
  options: MefBundleOptions,
): Promise<MefBundle> {
  const generated = await Promise.all(
    ALL_MEF_FORMS.map((form) =>
      "buildBinaryAttachments" in form && form.buildBinaryAttachments
        ? form.buildBinaryAttachments(
          (pending[form.pendingKey as keyof MefFormsPending] ?? {}) as never,
          { filer: options.filer },
        )
        : Promise.resolve([] as ReadonlyArray<MefPdfAttachment>)
    ),
  );
  const attachments = await validatePdfAttachments([
    ...options.attachments,
    ...generated.flat(),
  ]);
  const attachmentSha256ByFileName = Object.fromEntries(
    await Promise.all(attachments.map(async ({ fileName, bytes }) => {
      return [fileName, await sha256Hex(bytes)] as const;
    })),
  );
  const prepared = buildReturnXml(
    pending,
    options.filer,
    options.schemaVersion ?? "2025v5.4",
    options.year ?? 2025,
    options.returnType ?? "1040",
    attachments,
    attachmentSha256ByFileName,
  );
  return {
    ...prepared,
    attachments,
    pending,
    sourceSha256: await preparedSourceSha256(pending, options.filer),
    xmlSha256: await sha256Hex(new TextEncoder().encode(prepared.xml)),
    attachmentSha256ByFileName,
    form3800PartsSha256: prepared.form3800Parts
      ? await sha256Hex(
        new TextEncoder().encode(JSON.stringify(prepared.form3800Parts)),
      )
      : undefined,
  };
}
