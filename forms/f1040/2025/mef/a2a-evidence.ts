import { join } from "@std/path";
import { unzipSync } from "fflate";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { z } from "zod";
import {
  type MefTransmissionPackage,
  zipDirectoryEntryCount,
} from "./submission-archive.ts";
import {
  documentId,
  hasMismatchedSingleReferenceName,
} from "./document-identity.ts";
import { isValidMefPdfFilename } from "./pdf-attachment-filename.ts";
import { assertMefPdfEnvelope } from "./pdf-attachment-envelope.ts";
import { escapeXml } from "../../mef/xml.ts";
import { returnDataDocuments } from "./return-document-inventory.ts";

const requestRecordSchema = z.object({
  messageId: z.string().min(1),
  submissionIds: z.array(z.string().regex(/^[0-9]{13}[a-z0-9]{7}$/)).min(1)
    .max(100),
  recordedAt: z.string().datetime(),
  requestBodySha256: z.string().regex(/^[0-9a-f]{64}$/),
  containerSha256: z.string().regex(/^[0-9a-f]{64}$/),
});

const inboundKindSchema = z.enum([
  "send_response",
  "soap_fault",
  "acknowledgment_payload",
]);

const inboundRecordSchema = z.object({
  recordId: z.string().uuid(),
  kind: inboundKindSchema,
  sendMessageId: z.string().min(1),
  responseMessageId: z.string().min(1).optional(),
  relatesToMessageId: z.string().min(1).optional(),
  submissionIds: z.array(z.string().regex(/^[0-9]{13}[a-z0-9]{7}$/))
    .min(1),
  receiptOrDepositIds: z.array(z.string().min(1)),
  receivedAt: z.string().datetime(),
  payloadSha256: z.string().regex(/^[0-9a-f]{64}$/),
});

export type A2aRequestRecord = z.infer<typeof requestRecordSchema>;
export type A2aInboundRecord = z.infer<typeof inboundRecordSchema>;

export interface A2aArchivedSubmissionIdentity {
  readonly submissionId: string;
  readonly taxpayerSsn: string;
  readonly submissionXmlSha256: string;
}

export interface A2aArchivedSubmissionEvidence
  extends A2aArchivedSubmissionIdentity {
  readonly sendMessageId: string;
  readonly containerSha256: string;
  readonly submissionArchiveSha256: string;
  readonly manifestSha256: string;
}

export interface A2aSendEvidenceInput {
  readonly messageId: string;
  readonly submissionIds: ReadonlyArray<string>;
  readonly package: MefTransmissionPackage;
  readonly recordedAt: Date;
}

export interface A2aInboundEvidenceInput {
  readonly kind: z.infer<typeof inboundKindSchema>;
  readonly sendMessageId: string;
  readonly responseMessageId?: string;
  readonly relatesToMessageId?: string;
  readonly submissionIds: ReadonlyArray<string>;
  readonly receiptOrDepositIds?: ReadonlyArray<string>;
  readonly receivedAt: Date;
  readonly rawPayload: Uint8Array;
}

const encoder = new TextEncoder();
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
});

function requestSubmissionIds(requestBody: string): string[] {
  const invalid =
    "A2A Send package body must be a valid SendSubmissionsRequest";
  if (XMLValidator.validate(requestBody) !== true) throw new Error(invalid);
  const parsed = xmlParser.parse(requestBody) as Record<string, unknown>;
  const roots = Object.keys(parsed).filter((name) => name !== "?xml");
  if (roots.length !== 1 || roots[0] !== "SendSubmissionsRequest") {
    throw new Error(invalid);
  }
  const object = (value: unknown): Record<string, unknown> => {
    if (value === null || Array.isArray(value) || typeof value !== "object") {
      throw new Error(invalid);
    }
    return value as Record<string, unknown>;
  };
  const root = object(parsed.SendSubmissionsRequest);
  if (
    root["@_xmlns"] !==
      "http://www.irs.gov/a2a/mef/MeFTransmitterService.xsd" ||
    Object.keys(root).some((key) =>
      key !== "@_xmlns" && key !== "SubmissionDataList"
    )
  ) throw new Error(invalid);
  const list = object(root.SubmissionDataList);
  if (Object.keys(list).some((key) => key !== "SubmissionData")) {
    throw new Error(invalid);
  }
  const data = Array.isArray(list.SubmissionData)
    ? list.SubmissionData
    : [list.SubmissionData];
  if (data.length === 0) throw new Error(invalid);
  return data.map((entry) => {
    const fields = object(entry);
    if (
      typeof fields.SubmissionId !== "string" ||
      Object.keys(fields).some((key) =>
        key !== "SubmissionId" && key !== "ElectronicPostmarkTs"
      ) ||
      (fields.ElectronicPostmarkTs !== undefined &&
        (typeof fields.ElectronicPostmarkTs !== "string" ||
          Number.isNaN(Date.parse(fields.ElectronicPostmarkTs))))
    ) throw new Error(invalid);
    return fields.SubmissionId as string;
  });
}

function manifestValues(
  source: string,
): Readonly<Record<string, string>> | undefined {
  if (XMLValidator.validate(source) !== true) return undefined;
  const parsed = xmlParser.parse(source) as Record<string, unknown>;
  const roots = Object.keys(parsed).filter((name) => name !== "?xml");
  if (roots.length !== 1 || roots[0] !== "IRSSubmissionManifest") {
    return undefined;
  }
  const body = parsed.IRSSubmissionManifest;
  if (body === null || Array.isArray(body) || typeof body !== "object") {
    return undefined;
  }
  const fields = body as Record<string, unknown>;
  const names = [
    "SubmissionId",
    "EFIN",
    "TaxYr",
    "GovernmentCd",
    "FederalSubmissionTypeCd",
    "TaxPeriodBeginDt",
    "TaxPeriodEndDt",
    "TIN",
  ];
  if (names.some((name) => typeof fields[name] !== "string")) {
    return undefined;
  }
  return Object.fromEntries(
    names.map((name) => [name, fields[name] as string]),
  );
}

function returnPrimarySsn(source: string): string | undefined {
  if (XMLValidator.validate(source) !== true) return undefined;
  const parsed = xmlParser.parse(source) as Record<string, unknown>;
  const roots = Object.keys(parsed).filter((name) => name !== "?xml");
  if (roots.length !== 1 || roots[0] !== "Return") return undefined;
  const returnData = (parsed.Return as Record<string, unknown> | undefined)
    ?.ReturnData;
  if (
    returnData === null || Array.isArray(returnData) ||
    typeof returnData !== "object"
  ) return undefined;
  const form1040 = (returnData as Record<string, unknown>).IRS1040;
  if (
    form1040 === null || Array.isArray(form1040) ||
    typeof form1040 !== "object"
  ) return undefined;
  const primarySsn = (form1040 as Record<string, unknown>).PrimarySSN;
  return typeof primarySsn === "string" ? primarySsn : undefined;
}

function assertSendSubmissionArchive(
  submissionId: string,
  bytes: Uint8Array,
): void {
  let archive: Record<string, Uint8Array>;
  try {
    archive = unzipSync(bytes);
  } catch {
    throw new Error(`A2A Send submission ZIP is unreadable: ${submissionId}`);
  }
  if (zipDirectoryEntryCount(bytes, archive) !== Object.keys(archive).length) {
    throw new Error(
      `A2A Send submission physical ZIP entries differ from decoded archive: ${submissionId}`,
    );
  }
  const manifestBytes = archive["manifest/manifest.xml"];
  const xmlBytes = archive["xml/submission.xml"];
  if (!manifestBytes || !xmlBytes) {
    throw new Error(
      `A2A Send submission lacks manifest or return XML: ${submissionId}`,
    );
  }
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const manifest = decoder.decode(manifestBytes);
  const xml = decoder.decode(xmlBytes);
  const fields = manifestValues(manifest);
  const tin = fields?.TIN;
  const efin = fields?.EFIN;
  const year = Number(submissionId.slice(6, 10));
  const julianDay = Number(submissionId.slice(10, 13));
  const leapYear = year % 4 === 0 &&
    (year % 100 !== 0 || year % 400 === 0);
  if (
    fields?.SubmissionId !== submissionId ||
    efin !== submissionId.slice(0, 6) ||
    julianDay < 1 || julianDay > (leapYear ? 366 : 365) ||
    fields?.TaxYr !== "2025" ||
    fields?.GovernmentCd !== "IRS" ||
    fields?.FederalSubmissionTypeCd !== "1040" ||
    fields?.TaxPeriodBeginDt !== "2025-01-01" ||
    fields?.TaxPeriodEndDt !== "2025-12-31" ||
    !tin || !/^\d{9}$/.test(tin) ||
    returnPrimarySsn(xml) !== tin
  ) {
    throw new Error(
      `A2A Send submission manifest or taxpayer differs: ${submissionId}`,
    );
  }
  assertArchivedDocumentInventory(xml, archive);
}

function assertSendPackageIdentity(
  submissionIds: ReadonlyArray<string>,
  requestBody: string,
  containerBytes: Uint8Array,
  container: Readonly<Record<string, Uint8Array>>,
): void {
  const bodyIds = requestSubmissionIds(requestBody);
  const archiveNames = Object.keys(container);
  if (
    zipDirectoryEntryCount(containerBytes, container) !== archiveNames.length
  ) {
    throw new Error(
      "A2A Send container physical ZIP entries differ from decoded archive",
    );
  }
  if (
    bodyIds.length !== submissionIds.length ||
    archiveNames.length !== submissionIds.length ||
    new Set(bodyIds).size !== bodyIds.length ||
    new Set(submissionIds).size !== submissionIds.length ||
    submissionIds.some((id, index) =>
      bodyIds[index] !== id || archiveNames[index] !== `${id}.zip`
    )
  ) {
    throw new Error(
      "A2A Send package body and container Submission IDs differ",
    );
  }
}

function assertArchivedDocumentInventory(
  xml: string,
  archive: Readonly<Record<string, Uint8Array>>,
): void {
  const returnData = [...xml.matchAll(
    /<ReturnData documentCnt="(\d+)">([\s\S]*?)<\/ReturnData>/g,
  )];
  const headerCounts = [...xml.matchAll(
    /<ReturnHeader\b[^>]*\bbinaryAttachmentCnt="(\d+)"/g,
  )];
  const documents = returnDataDocuments(xml) ?? [];
  const ids = documents.map((document) => document.id);
  const tagsById = new Map(
    documents.map((document) => [document.id, document.tag]),
  );
  const referenceGroups = [...xml.matchAll(
    /\breferenceDocumentId="([^"]+)"/g,
  )].map((match) => match[1].trim().split(/\s+/));
  // The return builder emits double-quoted references. A valid XML attribute
  // using single quotes or whitespace around '=' must not disappear from the
  // inventory check and leave a dangling reference undetected.
  const referenceAttributeCount = [...xml.matchAll(
    /\breferenceDocumentId\s*=/g,
  )].length;
  const references = referenceGroups.flat();
  const binaries = [...xml.matchAll(
    /<BinaryAttachment\b[^>]*>([\s\S]*?)<\/BinaryAttachment>/g,
  )];
  const binaryMetadata = binaries.map((match) =>
    /^<DocumentTypeCd>PDF<\/DocumentTypeCd><Desc>([^<]*)<\/Desc><AttachmentLocationTxt>([^<]+)<\/AttachmentLocationTxt>$/
      .exec(match[1])
  );
  const descriptions = binaryMetadata.map((match) => match?.[1]);
  const fileNames = binaryMetadata.map((match) => match?.[2]);
  const archivedAttachments = Object.keys(archive).filter((name) =>
    name.startsWith("attachment/")
  );
  const expectedArchiveOrder = [
    "manifest/manifest.xml",
    "xml/submission.xml",
    ...fileNames.map((name) => `attachment/${name}`),
  ];
  if (
    returnData.length !== 1 || headerCounts.length !== 1 ||
    documents.length === 0 ||
    Number(returnData[0][1]) !== documents.length ||
    documents[0]?.tag !== "IRS1040" ||
    new Set(ids).size !== ids.length ||
    documents.some((document, index) =>
      document.id !== documentId(document.tag, index)
    ) ||
    referenceAttributeCount !== referenceGroups.length ||
    referenceGroups.some((group) => new Set(group).size !== group.length) ||
    references.some((id) => !ids.includes(id)) ||
    hasMismatchedSingleReferenceName(xml, tagsById) ||
    binaries.length !==
      documents.filter((document) => document.tag === "BinaryAttachment")
        .length ||
    Number(headerCounts[0][1]) !== binaries.length ||
    binaryMetadata.some((match) => !match) ||
    new Set(descriptions).size !== descriptions.length ||
    descriptions.some((description) => {
      if (!description) return true;
      const decoded = description.replace(
        /&(amp|lt|gt|quot|apos);/g,
        (_, entity: string) =>
          ({
            amp: "&",
            lt: "<",
            gt: ">",
            quot: '"',
            apos: "'",
          })[entity as "amp" | "lt" | "gt" | "quot" | "apos"],
      );
      return decoded.trim().length === 0 || decoded.length > 128 ||
        escapeXml(decoded) !== description;
    }) ||
    new Set(fileNames).size !== fileNames.length ||
    fileNames.some((name) =>
      !name || !isValidMefPdfFilename(name) ||
      !Object.hasOwn(archive, `attachment/${name}`)
    ) ||
    archivedAttachments.length !== fileNames.length ||
    Object.keys(archive).join("\n") !== expectedArchiveOrder.join("\n")
  ) {
    throw new Error(
      "A2A outbound document inventory, references, or PDF attachments differ from its archived return",
    );
  }
  for (const [index, name] of fileNames.entries()) {
    assertMefPdfEnvelope({
      fileName: name!,
      description: descriptions[index]!,
      bytes: archive[`attachment/${name}`],
    });
  }
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes));
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function writeSyncedFile(path: string, bytes: Uint8Array): Promise<void> {
  const file = await Deno.open(path, {
    write: true,
    createNew: true,
    mode: 0o600,
  });
  try {
    let offset = 0;
    while (offset < bytes.length) {
      offset += await file.write(bytes.subarray(offset));
    }
    await file.sync();
  } finally {
    file.close();
  }
}

async function writeRecord(
  root: string,
  group: "requests" | "inbound",
  key: string,
  record: A2aRequestRecord | A2aInboundRecord,
  payloads: Readonly<Record<string, Uint8Array>>,
): Promise<void> {
  const groupPath = join(root, group);
  await Deno.mkdir(groupPath, { recursive: true, mode: 0o700 });
  const stagingPath = join(groupPath, `.staging-${crypto.randomUUID()}`);
  await Deno.mkdir(stagingPath, { mode: 0o700 });
  try {
    for (const [name, bytes] of Object.entries(payloads)) {
      await writeSyncedFile(join(stagingPath, name), bytes);
    }
    await writeSyncedFile(
      join(stagingPath, "record.json"),
      encoder.encode(JSON.stringify(record, null, 2)),
    );
    await Deno.rename(stagingPath, join(groupPath, key));
  } catch (error) {
    await Deno.remove(stagingPath, { recursive: true }).catch(() => {});
    throw error;
  }
}

/** Persist an offline Send package and its caller-assigned MeF MessageID. */
export async function recordA2aSendPackage(
  root: string,
  input: A2aSendEvidenceInput,
): Promise<A2aRequestRecord> {
  const requestBody = encoder.encode(input.package.sendSubmissionsRequestXml);
  const record = requestRecordSchema.parse({
    messageId: input.messageId,
    submissionIds: [...input.submissionIds],
    recordedAt: input.recordedAt.toISOString(),
    requestBodySha256: await sha256(requestBody),
    containerSha256: await sha256(input.package.containerZipBytes),
  });
  if (new Set(record.submissionIds).size !== record.submissionIds.length) {
    throw new Error("A2A evidence has duplicate Submission IDs");
  }
  const container = unzipSync(input.package.containerZipBytes);
  assertSendPackageIdentity(
    record.submissionIds,
    input.package.sendSubmissionsRequestXml,
    input.package.containerZipBytes,
    container,
  );
  for (const id of record.submissionIds) {
    assertSendSubmissionArchive(id, container[`${id}.zip`]);
  }
  const key = await sha256(encoder.encode(record.messageId));
  await writeRecord(root, "requests", key, record, {
    "request.xml": requestBody,
    "container.zip": input.package.containerZipBytes,
  });
  return record;
}

export async function readA2aSendRecord(
  root: string,
  messageId: string,
): Promise<A2aRequestRecord> {
  const key = await sha256(encoder.encode(messageId));
  const path = join(root, "requests", key);
  const record = requestRecordSchema.parse(
    JSON.parse(await Deno.readTextFile(join(path, "record.json"))),
  );
  const requestBytes = await Deno.readFile(join(path, "request.xml"));
  const containerBytes = await Deno.readFile(join(path, "container.zip"));
  if (
    record.messageId !== messageId ||
    record.requestBodySha256 !== await sha256(requestBytes) ||
    record.containerSha256 !== await sha256(containerBytes)
  ) {
    throw new Error("A2A Send evidence integrity or MessageID mismatch");
  }
  const container = unzipSync(containerBytes);
  assertSendPackageIdentity(
    record.submissionIds,
    new TextDecoder("utf-8", { fatal: true }).decode(requestBytes),
    containerBytes,
    container,
  );
  for (const id of record.submissionIds) {
    assertSendSubmissionArchive(id, container[`${id}.zip`]);
  }
  return record;
}

/** Reopen the exact outbound bytes for one submission. This is no IRS status proof. */
export async function readA2aArchivedSubmission(
  root: string,
  sendMessageId: string,
  expected: A2aArchivedSubmissionIdentity,
): Promise<A2aArchivedSubmissionEvidence> {
  const identity = z.object({
    submissionId: z.string().regex(/^[0-9]{13}[a-z0-9]{7}$/),
    taxpayerSsn: z.string().regex(/^\d{9}$/),
    submissionXmlSha256: z.string().regex(/^[0-9a-f]{64}$/),
  }).strict().parse(expected);
  const send = await readA2aSendRecord(root, sendMessageId);
  if (
    send.submissionIds.filter((id) => id === identity.submissionId).length !== 1
  ) {
    throw new Error(
      "A2A outbound Submission ID is not unique in its Send record",
    );
  }
  const key = await sha256(encoder.encode(sendMessageId));
  const requestBytes = await Deno.readFile(
    join(root, "requests", key, "request.xml"),
  );
  const containerBytes = await Deno.readFile(
    join(root, "requests", key, "container.zip"),
  );
  if (
    await sha256(requestBytes) !== send.requestBodySha256 ||
    await sha256(containerBytes) !== send.containerSha256
  ) {
    throw new Error("A2A outbound Send bytes changed during evidence read");
  }
  const requestBody = new TextDecoder("utf-8", { fatal: true }).decode(
    requestBytes,
  );
  const bodyIds = requestSubmissionIds(requestBody);
  if (
    bodyIds.length !== send.submissionIds.length ||
    new Set(bodyIds).size !== bodyIds.length ||
    send.submissionIds.some((id, index) => bodyIds[index] !== id)
  ) {
    throw new Error("A2A outbound Send body differs from its Submission IDs");
  }
  let container: Record<string, Uint8Array>;
  let archive: Record<string, Uint8Array>;
  try {
    container = unzipSync(containerBytes);
    if (
      Object.keys(container).length !== send.submissionIds.length ||
      send.submissionIds.some((id) => !container[`${id}.zip`])
    ) {
      throw new Error("A2A outbound container differs from its Submission IDs");
    }
    archive = unzipSync(container[`${identity.submissionId}.zip`]);
  } catch (error) {
    throw new Error("A2A outbound Submission ZIP is unreadable or mismatched", {
      cause: error,
    });
  }
  const manifestBytes = archive["manifest/manifest.xml"];
  const xmlBytes = archive["xml/submission.xml"];
  if (
    !manifestBytes || !xmlBytes ||
    Object.keys(archive).some((name) =>
      name !== "manifest/manifest.xml" &&
      name !== "xml/submission.xml" &&
      !name.startsWith("attachment/")
    )
  ) {
    throw new Error(
      "A2A outbound archive lacks its exact manifest or return XML",
    );
  }
  const manifest = new TextDecoder("utf-8", { fatal: true }).decode(
    manifestBytes,
  );
  const xml = new TextDecoder("utf-8", { fatal: true }).decode(xmlBytes);
  const fields = manifestValues(manifest);
  assertArchivedDocumentInventory(xml, archive);
  const xmlSha256 = await sha256(xmlBytes);
  if (
    fields?.SubmissionId !== identity.submissionId ||
    fields?.TIN !== identity.taxpayerSsn ||
    fields?.TaxYr !== "2025" ||
    fields?.GovernmentCd !== "IRS" ||
    fields?.FederalSubmissionTypeCd !== "1040" ||
    returnPrimarySsn(xml) !== identity.taxpayerSsn ||
    xmlSha256 !== identity.submissionXmlSha256
  ) {
    throw new Error(
      "A2A outbound manifest, taxpayer, or XML digest differs from expected return",
    );
  }
  return {
    ...identity,
    sendMessageId,
    containerSha256: send.containerSha256,
    submissionArchiveSha256: await sha256(
      container[`${identity.submissionId}.zip`],
    ),
    manifestSha256: await sha256(manifestBytes),
  };
}

/** Archive opaque response/fault/ack bytes; this does not interpret IRS status. */
export async function recordA2aInboundPayload(
  root: string,
  input: A2aInboundEvidenceInput,
): Promise<A2aInboundRecord> {
  const send = await readA2aSendRecord(root, input.sendMessageId);
  const record = inboundRecordSchema.parse({
    recordId: crypto.randomUUID(),
    kind: input.kind,
    sendMessageId: input.sendMessageId,
    ...(input.responseMessageId !== undefined
      ? { responseMessageId: input.responseMessageId }
      : {}),
    ...(input.relatesToMessageId !== undefined
      ? { relatesToMessageId: input.relatesToMessageId }
      : {}),
    submissionIds: [...input.submissionIds],
    receiptOrDepositIds: [...(input.receiptOrDepositIds ?? [])],
    receivedAt: input.receivedAt.toISOString(),
    payloadSha256: await sha256(input.rawPayload),
  });
  if (
    record.submissionIds.some((id) => !send.submissionIds.includes(id)) ||
    new Set(record.submissionIds).size !== record.submissionIds.length
  ) {
    throw new Error(
      "A2A inbound Submission ID is not unique in the Send package",
    );
  }
  if (
    record.kind !== "acknowledgment_payload" &&
    record.relatesToMessageId !== record.sendMessageId
  ) {
    throw new Error("A2A Send response RelatesTo must match its MessageID");
  }
  if (input.rawPayload.length === 0) {
    throw new Error("A2A inbound payload must not be empty");
  }
  await writeRecord(root, "inbound", record.recordId, record, {
    "payload.bin": input.rawPayload,
  });
  return record;
}

export async function readA2aInboundPayload(
  root: string,
  recordId: string,
): Promise<{ record: A2aInboundRecord; rawPayload: Uint8Array }> {
  const safeRecordId = z.string().uuid().parse(recordId);
  const path = join(root, "inbound", safeRecordId);
  const record = inboundRecordSchema.parse(
    JSON.parse(await Deno.readTextFile(join(path, "record.json"))),
  );
  const rawPayload = await Deno.readFile(join(path, "payload.bin"));
  const send = await readA2aSendRecord(root, record.sendMessageId);
  if (
    record.recordId !== recordId ||
    record.payloadSha256 !== await sha256(rawPayload) ||
    record.submissionIds.some((id) => !send.submissionIds.includes(id)) ||
    new Set(record.submissionIds).size !== record.submissionIds.length ||
    (record.kind !== "acknowledgment_payload" &&
      record.relatesToMessageId !== record.sendMessageId) ||
    rawPayload.length === 0
  ) {
    throw new Error("A2A inbound payload integrity or record ID mismatch");
  }
  return { record, rawPayload };
}
