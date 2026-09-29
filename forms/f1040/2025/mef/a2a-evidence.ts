import { join } from "@std/path";
import { unzipSync } from "fflate";
import { z } from "zod";
import type { MefTransmissionPackage } from "./submission-archive.ts";

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
  const bodyIds = [...input.package.sendSubmissionsRequestXml.matchAll(
    /<SubmissionId>([^<]+)<\/SubmissionId>/g,
  )].map((match) => match[1]);
  const archiveNames = Object.keys(unzipSync(input.package.containerZipBytes));
  if (
    bodyIds.length !== record.submissionIds.length ||
    archiveNames.length !== record.submissionIds.length ||
    record.submissionIds.some((id) =>
      !bodyIds.includes(id) || !archiveNames.includes(`${id}.zip`)
    )
  ) {
    throw new Error(
      "A2A Send package body and container Submission IDs differ",
    );
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
  if (
    record.messageId !== messageId ||
    record.requestBodySha256 !==
      await sha256(await Deno.readFile(join(path, "request.xml"))) ||
    record.containerSha256 !==
      await sha256(await Deno.readFile(join(path, "container.zip")))
  ) {
    throw new Error("A2A Send evidence integrity or MessageID mismatch");
  }
  return record;
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
    record.submissionIds.some((id) => !send.submissionIds.includes(id))
  ) {
    throw new Error("A2A inbound payload integrity or record ID mismatch");
  }
  return { record, rawPayload };
}
