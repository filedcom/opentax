import { assertEquals, assertRejects } from "@std/assert";
import { zipSync } from "fflate";
import {
  readA2aInboundPayload,
  readA2aSendRecord,
  recordA2aInboundPayload,
  recordA2aSendPackage,
} from "./a2a-evidence.ts";

const submissionId = "1234562026269abcdefg";
const messageId = "00123202626900000001";
const encoder = new TextEncoder();

function packageFor(id = submissionId) {
  return {
    sendSubmissionsRequestXml:
      `<SendSubmissionsRequest><SubmissionData><SubmissionId>${id}</SubmissionId></SubmissionData></SendSubmissionsRequest>`,
    containerZipBytes: zipSync({ [`${id}.zip`]: encoder.encode("archive") }),
  };
}

Deno.test("A2A evidence stores exact Send and raw acknowledgment bytes with stable correlation", async () => {
  const root = await Deno.makeTempDir();
  try {
    const request = await recordA2aSendPackage(root, {
      messageId,
      submissionIds: [submissionId],
      package: packageFor(),
      recordedAt: new Date("2026-09-26T10:00:00Z"),
    });
    assertEquals(await readA2aSendRecord(root, messageId), request);
    const rawPayload = encoder.encode("signed IRS acknowledgment bytes");
    const inbound = await recordA2aInboundPayload(root, {
      kind: "acknowledgment_payload",
      sendMessageId: messageId,
      submissionIds: [submissionId],
      receiptOrDepositIds: ["deposit-123"],
      receivedAt: new Date("2026-09-26T11:00:00Z"),
      rawPayload,
    });
    const stored = await readA2aInboundPayload(root, inbound.recordId);
    assertEquals(stored.record, inbound);
    assertEquals(stored.rawPayload, rawPayload);
    assertEquals("status" in stored.record, false);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("A2A evidence rejects mismatched package, RelatesTo, and Submission ID", async () => {
  const root = await Deno.makeTempDir();
  try {
    await assertRejects(
      () =>
        recordA2aSendPackage(root, {
          messageId,
          submissionIds: [submissionId],
          package: packageFor("1234562026269xxxxxxx"),
          recordedAt: new Date("2026-09-26T10:00:00Z"),
        }),
      Error,
      "body and container Submission IDs differ",
    );
    await recordA2aSendPackage(root, {
      messageId,
      submissionIds: [submissionId],
      package: packageFor(),
      recordedAt: new Date("2026-09-26T10:00:00Z"),
    });
    await assertRejects(
      () =>
        recordA2aInboundPayload(root, {
          kind: "send_response",
          sendMessageId: messageId,
          relatesToMessageId: "wrong",
          submissionIds: [submissionId],
          receivedAt: new Date("2026-09-26T11:00:00Z"),
          rawPayload: encoder.encode("response"),
        }),
      Error,
      "RelatesTo must match",
    );
    await assertRejects(
      () =>
        recordA2aInboundPayload(root, {
          kind: "acknowledgment_payload",
          sendMessageId: messageId,
          submissionIds: ["1234562026269xxxxxxx"],
          receivedAt: new Date("2026-09-26T11:00:00Z"),
          rawPayload: encoder.encode("ack"),
        }),
      Error,
      "Submission ID is not unique in the Send package",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("A2A evidence detects altered stored acknowledgment bytes", async () => {
  const root = await Deno.makeTempDir();
  try {
    await recordA2aSendPackage(root, {
      messageId,
      submissionIds: [submissionId],
      package: packageFor(),
      recordedAt: new Date("2026-09-26T10:00:00Z"),
    });
    const inbound = await recordA2aInboundPayload(root, {
      kind: "acknowledgment_payload",
      sendMessageId: messageId,
      submissionIds: [submissionId],
      receivedAt: new Date("2026-09-26T11:00:00Z"),
      rawPayload: encoder.encode("original"),
    });
    await Deno.writeFile(
      `${root}/inbound/${inbound.recordId}/payload.bin`,
      encoder.encode("altered"),
    );
    await assertRejects(
      () => readA2aInboundPayload(root, inbound.recordId),
      Error,
      "integrity or record ID mismatch",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("A2A evidence rejects an inbound record ID before path construction", async () => {
  await assertRejects(
    () => readA2aInboundPayload("/unused", "../requests"),
    Error,
  );
});
