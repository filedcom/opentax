import { assertEquals, assertRejects } from "@std/assert";
import { unzipSync, zipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import {
  readA2aArchivedSubmission,
  readA2aInboundPayload,
  readA2aSendRecord,
  recordA2aInboundPayload,
  recordA2aSendPackage,
} from "./a2a-evidence.ts";

const submissionId = "1234562026269abcdefg";
const messageId = "00123202626900000001";
const encoder = new TextEncoder();

async function digest(bytes: Uint8Array): Promise<string> {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        Uint8Array.from(bytes),
      ),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

function packageFor(id = submissionId) {
  const archive = zipSync({
    "manifest/manifest.xml": encoder.encode(
      `<IRSSubmissionManifest><SubmissionId>${id}</SubmissionId><EFIN>123456</EFIN><TaxYr>2025</TaxYr><GovernmentCd>IRS</GovernmentCd><FederalSubmissionTypeCd>1040</FederalSubmissionTypeCd><TIN>111223333</TIN></IRSSubmissionManifest>`,
    ),
    "xml/submission.xml": encoder.encode(
      `<Return><ReturnHeader binaryAttachmentCnt="0"></ReturnHeader><ReturnData documentCnt="1"><IRS1040 documentId="IRS10400"><PrimarySSN>111223333</PrimarySSN></IRS1040></ReturnData></Return>`,
    ),
  });
  return {
    sendSubmissionsRequestXml:
      `<SendSubmissionsRequest><SubmissionData><SubmissionId>${id}</SubmissionId></SubmissionData></SendSubmissionsRequest>`,
    containerZipBytes: zipSync({ [`${id}.zip`]: archive }),
  };
}

Deno.test("A2A Send record and reopen reject a changed local ZIP CRC", async () => {
  const root = await Deno.makeTempDir();
  try {
    const source = packageFor();
    const validInner =
      unzipSync(source.containerZipBytes)[`${submissionId}.zip`];
    const changedInner = Uint8Array.from(validInner);
    // Local file header CRC byte; central directory and payload stay intact.
    changedInner[14] ^= 0xff;
    assertEquals(Object.keys(unzipSync(changedInner)), [
      "manifest/manifest.xml",
      "xml/submission.xml",
    ]);
    const changedContainer = zipSync({ [`${submissionId}.zip`]: changedInner });
    await assertRejects(
      () =>
        recordA2aSendPackage(root, {
          messageId: `${messageId}-changed-local-crc`,
          submissionIds: [submissionId],
          package: { ...source, containerZipBytes: changedContainer },
          recordedAt: new Date("2026-09-26T10:00:00Z"),
        }),
      Error,
      "physical ZIP entries",
    );
    const changedOuter = Uint8Array.from(source.containerZipBytes);
    changedOuter[14] ^= 0xff;
    await assertRejects(
      () =>
        recordA2aSendPackage(root, {
          messageId: `${messageId}-changed-outer-crc`,
          submissionIds: [submissionId],
          package: { ...source, containerZipBytes: changedOuter },
          recordedAt: new Date("2026-09-26T10:00:00Z"),
        }),
      Error,
      "container physical ZIP entries",
    );

    const recorded = await recordA2aSendPackage(root, {
      messageId,
      submissionIds: [submissionId],
      package: source,
      recordedAt: new Date("2026-09-26T10:00:00Z"),
    });
    const key = await digest(encoder.encode(messageId));
    await Deno.writeFile(
      `${root}/requests/${key}/container.zip`,
      changedContainer,
    );
    await Deno.writeTextFile(
      `${root}/requests/${key}/record.json`,
      JSON.stringify({
        ...recorded,
        containerSha256: await digest(changedContainer),
      }),
    );
    await assertRejects(
      () => readA2aSendRecord(root, messageId),
      Error,
      "physical ZIP entries",
    );
    await Deno.writeFile(`${root}/requests/${key}/container.zip`, changedOuter);
    await Deno.writeTextFile(
      `${root}/requests/${key}/record.json`,
      JSON.stringify({
        ...recorded,
        containerSha256: await digest(changedOuter),
      }),
    );
    await assertRejects(
      () => readA2aSendRecord(root, messageId),
      Error,
      "container physical ZIP entries",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("A2A Send evidence preserves request and container submission order", async () => {
  const root = await Deno.makeTempDir();
  try {
    const secondId = "1234562026269abcdefh";
    const first = packageFor(submissionId);
    const second = packageFor(secondId);
    const containerZipBytes = zipSync({
      [`${submissionId}.zip`]:
        unzipSync(first.containerZipBytes)[`${submissionId}.zip`],
      [`${secondId}.zip`]:
        unzipSync(second.containerZipBytes)[`${secondId}.zip`],
    });
    const orderedBody =
      `<SendSubmissionsRequest><SubmissionData><SubmissionId>${submissionId}</SubmissionId></SubmissionData>` +
      `<SubmissionData><SubmissionId>${secondId}</SubmissionId></SubmissionData></SendSubmissionsRequest>`;
    const swappedBody =
      `<SendSubmissionsRequest><SubmissionData><SubmissionId>${secondId}</SubmissionId></SubmissionData>` +
      `<SubmissionData><SubmissionId>${submissionId}</SubmissionId></SubmissionData></SendSubmissionsRequest>`;
    const recorded = await recordA2aSendPackage(root, {
      messageId,
      submissionIds: [submissionId, secondId],
      package: { sendSubmissionsRequestXml: orderedBody, containerZipBytes },
      recordedAt: new Date("2026-09-26T10:00:00Z"),
    });
    await assertRejects(
      () =>
        recordA2aSendPackage(root, {
          messageId: `${messageId}-swapped`,
          submissionIds: [submissionId, secondId],
          package: {
            sendSubmissionsRequestXml: swappedBody,
            containerZipBytes,
          },
          recordedAt: new Date("2026-09-26T10:00:00Z"),
        }),
      Error,
      "body and container Submission IDs differ",
    );
    const key = await digest(encoder.encode(messageId));
    await Deno.writeTextFile(
      `${root}/requests/${key}/request.xml`,
      swappedBody,
    );
    await Deno.writeTextFile(
      `${root}/requests/${key}/record.json`,
      JSON.stringify({
        ...recorded,
        requestBodySha256: await digest(encoder.encode(swappedBody)),
      }),
    );
    await assertRejects(
      () => readA2aSendRecord(root, messageId),
      Error,
      "body and container Submission IDs differ",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("A2A Send evidence rejects a false request root or commented Submission ID", async () => {
  const root = await Deno.makeTempDir();
  try {
    const source = packageFor();
    for (
      const [index, body, reason] of [
        [
          0,
          `<OtherRequest><SubmissionId>${submissionId}</SubmissionId></OtherRequest>`,
          "valid SendSubmissionsRequest",
        ],
        [
          1,
          `<SendSubmissionsRequest><!-- <SubmissionId>${submissionId}</SubmissionId> --></SendSubmissionsRequest>`,
          "body and container Submission IDs differ",
        ],
        [
          2,
          `<SendSubmissionsRequest><SubmissionId>${submissionId}</SendSubmissionsRequest>`,
          "valid SendSubmissionsRequest",
        ],
      ] as const
    ) {
      await assertRejects(
        () =>
          recordA2aSendPackage(root, {
            messageId: `${messageId}-invalid-body-${index}`,
            submissionIds: [submissionId],
            package: { ...source, sendSubmissionsRequestXml: body },
            recordedAt: new Date("2026-09-26T10:00:00Z"),
          }),
        Error,
        reason,
      );
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("A2A Send rejects absent or mismatched EFIN and impossible Submission ID day", async () => {
  const root = await Deno.makeTempDir();
  try {
    const impossibleDayId = "1234562026999abcdefg";
    for (
      const [index, id, replacement] of [
        [0, submissionId, ""],
        [1, submissionId, "<EFIN>654321</EFIN>"],
        [2, impossibleDayId, "<EFIN>123456</EFIN>"],
      ] as const
    ) {
      const source = packageFor(id);
      const inner = unzipSync(
        unzipSync(source.containerZipBytes)[`${id}.zip`],
      );
      inner["manifest/manifest.xml"] = encoder.encode(
        new TextDecoder().decode(inner["manifest/manifest.xml"]).replace(
          "<EFIN>123456</EFIN>",
          replacement,
        ),
      );
      await assertRejects(
        () =>
          recordA2aSendPackage(root, {
            messageId: `${messageId}-identity-${index}`,
            submissionIds: [id],
            package: {
              ...source,
              containerZipBytes: zipSync({ [`${id}.zip`]: zipSync(inner) }),
            },
            recordedAt: new Date("2026-09-26T10:00:00Z"),
          }),
        Error,
        "manifest or taxpayer differs",
      );
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("A2A Send evidence requires manifest identity in direct IRS manifest fields", async () => {
  const root = await Deno.makeTempDir();
  try {
    const source = packageFor();
    const archive = unzipSync(
      unzipSync(source.containerZipBytes)[`${submissionId}.zip`],
    );
    const original = new TextDecoder().decode(archive["manifest/manifest.xml"]);
    const mutations = [
      original.replaceAll("IRSSubmissionManifest", "OtherManifest"),
      original.replace(
        "<TIN>111223333</TIN>",
        "<!-- <TIN>111223333</TIN> -->",
      ),
    ];
    for (const [index, manifest] of mutations.entries()) {
      const changedArchive = zipSync({
        ...archive,
        "manifest/manifest.xml": encoder.encode(manifest),
      });
      await assertRejects(
        () =>
          recordA2aSendPackage(root, {
            messageId: `${messageId}-manifest-${index}`,
            submissionIds: [submissionId],
            package: {
              ...source,
              containerZipBytes: zipSync({
                [`${submissionId}.zip`]: changedArchive,
              }),
            },
            recordedAt: new Date("2026-09-26T10:00:00Z"),
          }),
        Error,
        "manifest or taxpayer differs",
      );
    }
    const recorded = await recordA2aSendPackage(root, {
      messageId,
      submissionIds: [submissionId],
      package: source,
      recordedAt: new Date("2026-09-26T10:00:00Z"),
    });
    const changedContainer = zipSync({
      [`${submissionId}.zip`]: zipSync({
        ...archive,
        "manifest/manifest.xml": encoder.encode(mutations[0]),
      }),
    });
    const key = await digest(encoder.encode(messageId));
    await Deno.writeFile(
      `${root}/requests/${key}/container.zip`,
      changedContainer,
    );
    await Deno.writeTextFile(
      `${root}/requests/${key}/record.json`,
      JSON.stringify({
        ...recorded,
        containerSha256: await digest(changedContainer),
      }),
    );
    await assertRejects(
      () => readA2aSendRecord(root, messageId),
      Error,
      "manifest or taxpayer differs",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("A2A Send evidence requires PrimarySSN on the archived Form 1040", async () => {
  const root = await Deno.makeTempDir();
  try {
    const source = packageFor();
    const archive = unzipSync(
      unzipSync(source.containerZipBytes)[`${submissionId}.zip`],
    );
    const xml = new TextDecoder().decode(archive["xml/submission.xml"]);
    const changedXml = xml.replace(
      "<PrimarySSN>111223333</PrimarySSN>",
      "<!-- <PrimarySSN>111223333</PrimarySSN> -->",
    );
    const changedContainer = zipSync({
      [`${submissionId}.zip`]: zipSync({
        ...archive,
        "xml/submission.xml": encoder.encode(changedXml),
      }),
    });
    await assertRejects(
      () =>
        recordA2aSendPackage(root, {
          messageId: `${messageId}-commented-primary`,
          submissionIds: [submissionId],
          package: { ...source, containerZipBytes: changedContainer },
          recordedAt: new Date("2026-09-26T10:00:00Z"),
        }),
      Error,
      "manifest or taxpayer differs",
    );
    const recorded = await recordA2aSendPackage(root, {
      messageId,
      submissionIds: [submissionId],
      package: source,
      recordedAt: new Date("2026-09-26T10:00:00Z"),
    });
    const key = await digest(encoder.encode(messageId));
    await Deno.writeFile(
      `${root}/requests/${key}/container.zip`,
      changedContainer,
    );
    await Deno.writeTextFile(
      `${root}/requests/${key}/record.json`,
      JSON.stringify({
        ...recorded,
        containerSha256: await digest(changedContainer),
      }),
    );
    await assertRejects(
      () => readA2aSendRecord(root, messageId),
      Error,
      "manifest or taxpayer differs",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("A2A outbound evidence binds one archived Submission ID to exact XML and taxpayer", async () => {
  const root = await Deno.makeTempDir();
  try {
    const manifest = encoder.encode(
      `<IRSSubmissionManifest><SubmissionId>${submissionId}</SubmissionId><EFIN>123456</EFIN><TaxYr>2025</TaxYr><GovernmentCd>IRS</GovernmentCd><FederalSubmissionTypeCd>1040</FederalSubmissionTypeCd><TIN>111223333</TIN></IRSSubmissionManifest>`,
    );
    const xml = encoder.encode(
      `<Return><ReturnHeader binaryAttachmentCnt="0"></ReturnHeader><ReturnData documentCnt="2"><IRS1040 documentId="IRS10400"><PrimarySSN>111223333</PrimarySSN></IRS1040><IRS8990 documentId="IRS89901"><DisallowedBusInterestExpnsAmt>250</DisallowedBusInterestExpnsAmt></IRS8990></ReturnData></Return>`,
    );
    const archive = zipSync({
      "manifest/manifest.xml": manifest,
      "xml/submission.xml": xml,
    });
    await recordA2aSendPackage(root, {
      messageId,
      submissionIds: [submissionId],
      package: {
        sendSubmissionsRequestXml:
          `<SendSubmissionsRequest><SubmissionId>${submissionId}</SubmissionId></SendSubmissionsRequest>`,
        containerZipBytes: zipSync({ [`${submissionId}.zip`]: archive }),
      },
      recordedAt: new Date("2026-09-26T10:00:00Z"),
    });
    const expected = {
      submissionId,
      taxpayerSsn: "111223333",
      submissionXmlSha256: await digest(xml),
    };
    const evidence = await readA2aArchivedSubmission(root, messageId, expected);
    assertEquals(evidence.submissionArchiveSha256, await digest(archive));
    assertEquals(evidence.manifestSha256, await digest(manifest));
    await assertRejects(
      () =>
        readA2aArchivedSubmission(root, messageId, {
          ...expected,
          submissionXmlSha256: "0".repeat(64),
        }),
      Error,
      "XML digest differs from expected return",
    );
    await assertRejects(
      () =>
        readA2aArchivedSubmission(root, messageId, {
          ...expected,
          taxpayerSsn: "999887777",
        }),
      Error,
      "taxpayer, or XML digest differs",
    );
    const key = await digest(encoder.encode(messageId));
    await Deno.writeFile(
      `${root}/requests/${key}/container.zip`,
      zipSync({
        [`${submissionId}.zip`]: encoder.encode("substituted archive"),
      }),
    );
    await assertRejects(
      () => readA2aArchivedSubmission(root, messageId, expected),
      Error,
      "Send evidence integrity",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("A2A archived outbound evidence rejects broken document and PDF ZIP parity", async () => {
  const root = await Deno.makeTempDir();
  try {
    const manifest = encoder.encode(
      `<IRSSubmissionManifest><SubmissionId>${submissionId}</SubmissionId><EFIN>123456</EFIN><TaxYr>2025</TaxYr><GovernmentCd>IRS</GovernmentCd><FederalSubmissionTypeCd>1040</FederalSubmissionTypeCd><TIN>111223333</TIN></IRSSubmissionManifest>`,
    );
    const variants: Array<{
      xml: string;
      attachments: Record<string, Uint8Array>;
    }> = [
      {
        xml:
          `<Return><ReturnHeader binaryAttachmentCnt="0"></ReturnHeader><ReturnData documentCnt="1"><IRS1040 documentId="IRS10400"><PrimarySSN>111223333</PrimarySSN><Statement referenceDocumentId="missing"/></IRS1040></ReturnData></Return>`,
        attachments: {},
      },
      {
        xml:
          `<Return><ReturnHeader binaryAttachmentCnt="0"></ReturnHeader><ReturnData documentCnt="2"><IRS1040 documentId="IRS10400"><PrimarySSN>111223333</PrimarySSN></IRS1040><IRS8990 documentId="IRS8990WRONG"><DisallowedBusInterestExpnsAmt>250</DisallowedBusInterestExpnsAmt></IRS8990></ReturnData></Return>`,
        attachments: {},
      },
      {
        xml:
          `<Return><ReturnHeader binaryAttachmentCnt="0"></ReturnHeader><ReturnData documentCnt="2"><IRS1040 documentId="IRS10400"><PrimarySSN>111223333</PrimarySSN><Decoy documentId="Decoy1"/></IRS1040></ReturnData></Return>`,
        attachments: {},
      },
      {
        xml:
          `<Return><ReturnHeader binaryAttachmentCnt="0"></ReturnHeader><ReturnData documentCnt="3"><IRS1040 documentId="IRS10400"><PrimarySSN>111223333</PrimarySSN><Statement referenceDocumentId="IRS24391 IRS24392" referenceDocumentName="IRS1099G"/></IRS1040><IRS2439 documentId="IRS24391"/><IRS2439 documentId="IRS24392"/></ReturnData></Return>`,
        attachments: {},
      },
      {
        xml:
          `<Return><ReturnHeader binaryAttachmentCnt="1"></ReturnHeader><ReturnData documentCnt="2"><IRS1040 documentId="IRS10400"><PrimarySSN>111223333</PrimarySSN></IRS1040><BinaryAttachment documentId="BinaryAttachment1"><DocumentTypeCd>PDF</DocumentTypeCd><Desc>Evidence</Desc><AttachmentLocationTxt>evidence.pdf</AttachmentLocationTxt></BinaryAttachment></ReturnData></Return>`,
        attachments: {},
      },
      {
        xml:
          `<Return><ReturnHeader binaryAttachmentCnt="0"></ReturnHeader><ReturnData documentCnt="1"><IRS1040 documentId="IRS10400"><PrimarySSN>111223333</PrimarySSN></IRS1040></ReturnData></Return>`,
        attachments: {
          "attachment/unlisted.pdf": encoder.encode("%PDF-unlisted"),
        },
      },
      {
        xml:
          `<Return><ReturnHeader binaryAttachmentCnt="1"></ReturnHeader><ReturnData documentCnt="2"><IRS1040 documentId="IRS10400"><PrimarySSN>111223333</PrimarySSN><Statement referenceDocumentId="BinaryAttachment1"/></IRS1040><BinaryAttachment documentId="BinaryAttachment1"><DocumentTypeCd>PDF</DocumentTypeCd><Desc>Evidence</Desc><AttachmentLocationTxt>bad..pdf</AttachmentLocationTxt></BinaryAttachment></ReturnData></Return>`,
        attachments: {
          "attachment/bad..pdf": encoder.encode("%PDF-invalid-name"),
        },
      },
      {
        xml:
          `<Return><ReturnHeader binaryAttachmentCnt="2"></ReturnHeader><ReturnData documentCnt="3"><IRS1040 documentId="IRS10400"><PrimarySSN>111223333</PrimarySSN><Statement referenceDocumentId="BinaryAttachment1 BinaryAttachment2"/></IRS1040><BinaryAttachment documentId="BinaryAttachment1"><DocumentTypeCd>PDF</DocumentTypeCd><Desc>Same description</Desc><AttachmentLocationTxt>first.pdf</AttachmentLocationTxt></BinaryAttachment><BinaryAttachment documentId="BinaryAttachment2"><DocumentTypeCd>PDF</DocumentTypeCd><Desc>Same description</Desc><AttachmentLocationTxt>second.pdf</AttachmentLocationTxt></BinaryAttachment></ReturnData></Return>`,
        attachments: {
          "attachment/first.pdf": encoder.encode("%PDF-first"),
          "attachment/second.pdf": encoder.encode("%PDF-second"),
        },
      },
      {
        xml:
          `<Return><ReturnHeader binaryAttachmentCnt="1"></ReturnHeader><ReturnData documentCnt="2"><IRS1040 documentId="IRS10400"><PrimarySSN>111223333</PrimarySSN><Statement referenceDocumentId="BinaryAttachment1 BinaryAttachment1"/></IRS1040><BinaryAttachment documentId="BinaryAttachment1"><DocumentTypeCd>PDF</DocumentTypeCd><Desc>Evidence</Desc><AttachmentLocationTxt>evidence.pdf</AttachmentLocationTxt></BinaryAttachment></ReturnData></Return>`,
        attachments: {
          "attachment/evidence.pdf": encoder.encode("%PDF-duplicate-ref"),
        },
      },
      {
        xml:
          `<Return><ReturnHeader binaryAttachmentCnt="1"></ReturnHeader><ReturnData documentCnt="2"><IRS1040 documentId="IRS10400"><PrimarySSN>111223333</PrimarySSN><Statement referenceDocumentId="BinaryAttachment1"/></IRS1040><BinaryAttachment documentId="BinaryAttachment1"><DocumentTypeCd>PDF</DocumentTypeCd><Desc>Evidence</Desc><Extra>unprepared metadata</Extra><AttachmentLocationTxt>evidence.pdf</AttachmentLocationTxt></BinaryAttachment></ReturnData></Return>`,
        attachments: {
          "attachment/evidence.pdf": encoder.encode("%PDF-extra-metadata"),
        },
      },
    ];
    for (const [index, variant] of variants.entries()) {
      const xml = encoder.encode(variant.xml);
      const archived = zipSync({
        "manifest/manifest.xml": manifest,
        "xml/submission.xml": xml,
        ...variant.attachments,
      });
      const sendId = `${messageId}-${index}`;
      await assertRejects(
        () =>
          recordA2aSendPackage(root, {
            messageId: sendId,
            submissionIds: [submissionId],
            package: {
              sendSubmissionsRequestXml:
                `<SendSubmissionsRequest><SubmissionId>${submissionId}</SubmissionId></SendSubmissionsRequest>`,
              containerZipBytes: zipSync({ [`${submissionId}.zip`]: archived }),
            },
            recordedAt: new Date("2026-09-26T10:00:00Z"),
          }),
        Error,
        "document inventory, references, or PDF attachments",
      );
    }
    const validXml = encoder.encode(
      `<Return><ReturnHeader binaryAttachmentCnt="1"></ReturnHeader><ReturnData documentCnt="2"><IRS1040 documentId="IRS10400"><PrimarySSN>111223333</PrimarySSN><Statement referenceDocumentId="BinaryAttachment1"/></IRS1040><BinaryAttachment documentId="BinaryAttachment1"><DocumentTypeCd>PDF</DocumentTypeCd><Desc>Evidence &amp; copy</Desc><AttachmentLocationTxt>evidence.pdf</AttachmentLocationTxt></BinaryAttachment></ReturnData></Return>`,
    );
    await assertRejects(
      () =>
        recordA2aSendPackage(root, {
          messageId: `${messageId}-non-pdf`,
          submissionIds: [submissionId],
          package: {
            sendSubmissionsRequestXml:
              `<SendSubmissionsRequest><SubmissionId>${submissionId}</SubmissionId></SendSubmissionsRequest>`,
            containerZipBytes: zipSync({
              [`${submissionId}.zip`]: zipSync({
                "manifest/manifest.xml": manifest,
                "xml/submission.xml": validXml,
                "attachment/evidence.pdf": encoder.encode("not a PDF"),
              }),
            }),
          },
          recordedAt: new Date("2026-09-26T10:00:00Z"),
        }),
      Error,
      "not a complete PDF",
    );
    const pdf = await PDFDocument.create();
    pdf.addPage();
    const validPdfBytes = await pdf.save();
    const duplicateName = "attachment/evidence.pdF";
    const fileName = "attachment/evidence.pdf";
    const duplicateZip = Uint8Array.from(zipSync({
      "manifest/manifest.xml": manifest,
      "xml/submission.xml": validXml,
      [fileName]: validPdfBytes,
      [duplicateName]: validPdfBytes,
    }));
    const oldName = encoder.encode(duplicateName);
    const newName = encoder.encode(fileName);
    let replacements = 0;
    for (
      let index = 0;
      index <= duplicateZip.length - oldName.length;
      index++
    ) {
      if (
        oldName.every((byte, offset) => duplicateZip[index + offset] === byte)
      ) {
        duplicateZip.set(newName, index);
        replacements++;
      }
    }
    assertEquals(replacements, 2);
    assertEquals(Object.keys(unzipSync(duplicateZip)), [
      "manifest/manifest.xml",
      "xml/submission.xml",
      fileName,
    ]);
    await assertRejects(
      () =>
        recordA2aSendPackage(root, {
          messageId: `${messageId}-duplicate-physical-pdf`,
          submissionIds: [submissionId],
          package: {
            sendSubmissionsRequestXml:
              `<SendSubmissionsRequest><SubmissionId>${submissionId}</SubmissionId></SendSubmissionsRequest>`,
            containerZipBytes: zipSync({
              [`${submissionId}.zip`]: duplicateZip,
            }),
          },
          recordedAt: new Date("2026-09-26T10:00:00Z"),
        }),
      Error,
      "physical ZIP entries",
    );
    const validSendId = `${messageId}-valid`;
    const validRecord = await recordA2aSendPackage(root, {
      messageId: validSendId,
      submissionIds: [submissionId],
      package: {
        sendSubmissionsRequestXml:
          `<SendSubmissionsRequest><SubmissionId>${submissionId}</SubmissionId></SendSubmissionsRequest>`,
        containerZipBytes: zipSync({
          [`${submissionId}.zip`]: zipSync({
            "manifest/manifest.xml": manifest,
            "xml/submission.xml": validXml,
            "attachment/evidence.pdf": validPdfBytes,
          }),
        }),
      },
      recordedAt: new Date("2026-09-26T10:00:00Z"),
    });
    const valid = await readA2aArchivedSubmission(root, validSendId, {
      submissionId,
      taxpayerSsn: "111223333",
      submissionXmlSha256: await digest(validXml),
    });
    assertEquals(valid.submissionId, submissionId);
    const changedContainer = zipSync({
      [`${submissionId}.zip`]: zipSync({
        "manifest/manifest.xml": manifest,
        "xml/submission.xml": validXml,
        "attachment/evidence.pdf": encoder.encode("not a PDF"),
      }),
    });
    const key = await digest(encoder.encode(validSendId));
    await Deno.writeFile(
      `${root}/requests/${key}/container.zip`,
      changedContainer,
    );
    await Deno.writeTextFile(
      `${root}/requests/${key}/record.json`,
      JSON.stringify({
        ...validRecord,
        containerSha256: await digest(changedContainer),
      }),
    );
    await assertRejects(
      () => readA2aSendRecord(root, validSendId),
      Error,
      "not a complete PDF",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("A2A Send record and reopen reject reordered inner ZIP entries", async () => {
  const root = await Deno.makeTempDir();
  try {
    const packageData = packageFor();
    const original = await recordA2aSendPackage(root, {
      messageId,
      submissionIds: [submissionId],
      package: packageData,
      recordedAt: new Date("2026-09-26T10:00:00Z"),
    });
    const inner = unzipSync(
      unzipSync(packageData.containerZipBytes)[`${submissionId}.zip`],
    );
    const reordered = zipSync({
      "xml/submission.xml": inner["xml/submission.xml"],
      "manifest/manifest.xml": inner["manifest/manifest.xml"],
    });
    const changedContainer = zipSync({ [`${submissionId}.zip`]: reordered });
    await assertRejects(
      () =>
        recordA2aSendPackage(root, {
          messageId: `${messageId}-reordered`,
          submissionIds: [submissionId],
          package: {
            ...packageData,
            containerZipBytes: changedContainer,
          },
          recordedAt: new Date("2026-09-26T10:00:00Z"),
        }),
      Error,
      "document inventory, references, or PDF attachments",
    );
    const key = await digest(encoder.encode(messageId));
    await Deno.writeFile(
      `${root}/requests/${key}/container.zip`,
      changedContainer,
    );
    await Deno.writeTextFile(
      `${root}/requests/${key}/record.json`,
      JSON.stringify({
        ...original,
        containerSha256: await digest(changedContainer),
      }),
    );
    await assertRejects(
      () => readA2aSendRecord(root, messageId),
      Error,
      "document inventory, references, or PDF attachments",
    );
    const originalXmlDigest = await digest(inner["xml/submission.xml"]);
    await assertRejects(
      () =>
        readA2aArchivedSubmission(root, messageId, {
          submissionId,
          taxpayerSsn: "111223333",
          submissionXmlSha256: originalXmlDigest,
        }),
      Error,
      "document inventory, references, or PDF attachments",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("A2A Send reopen rejects a duplicate attachment reference in stored XML", async () => {
  const root = await Deno.makeTempDir();
  try {
    const request = packageFor();
    const send = await recordA2aSendPackage(root, {
      messageId,
      submissionIds: [submissionId],
      package: request,
      recordedAt: new Date("2026-09-26T10:00:00Z"),
    });
    const inner = unzipSync(
      unzipSync(request.containerZipBytes)[`${submissionId}.zip`],
    );
    inner["xml/submission.xml"] = encoder.encode(
      `<Return><ReturnHeader binaryAttachmentCnt="1"></ReturnHeader><ReturnData documentCnt="2"><IRS1040 documentId="IRS10400"><PrimarySSN>111223333</PrimarySSN><Statement referenceDocumentId="BinaryAttachment1 BinaryAttachment1"/></IRS1040><BinaryAttachment documentId="BinaryAttachment1"><DocumentTypeCd>PDF</DocumentTypeCd><Desc>Evidence</Desc><AttachmentLocationTxt>evidence.pdf</AttachmentLocationTxt></BinaryAttachment></ReturnData></Return>`,
    );
    inner["attachment/evidence.pdf"] = encoder.encode("%PDF-test");
    const changedContainer = zipSync({
      [`${submissionId}.zip`]: zipSync(inner),
    });
    const key = await digest(encoder.encode(messageId));
    await Deno.writeFile(
      `${root}/requests/${key}/container.zip`,
      changedContainer,
    );
    await Deno.writeTextFile(
      `${root}/requests/${key}/record.json`,
      JSON.stringify({
        ...send,
        containerSha256: await digest(changedContainer),
      }),
    );
    await assertRejects(
      () => readA2aSendRecord(root, messageId),
      Error,
      "document inventory, references, or PDF attachments",
    );
    const changedXmlDigest = await digest(inner["xml/submission.xml"]);
    await assertRejects(
      () =>
        readA2aArchivedSubmission(root, messageId, {
          submissionId,
          taxpayerSsn: "111223333",
          submissionXmlSha256: changedXmlDigest,
        }),
      Error,
      "document inventory, references, or PDF attachments",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("A2A Send read and inbound evidence reject a changed inner document inventory", async () => {
  const root = await Deno.makeTempDir();
  try {
    const request = packageFor();
    const send = await recordA2aSendPackage(root, {
      messageId,
      submissionIds: [submissionId],
      package: request,
      recordedAt: new Date("2026-09-26T10:00:00Z"),
    });
    const originalContainer = unzipSync(request.containerZipBytes);
    const inner = unzipSync(originalContainer[`${submissionId}.zip`]);
    inner["xml/submission.xml"] = encoder.encode(
      `<Return><ReturnHeader binaryAttachmentCnt="0"></ReturnHeader><ReturnData documentCnt="1"><IRS1040 documentId="IRS10400"><PrimarySSN>111223333</PrimarySSN><Statement referenceDocumentId="missing"/></IRS1040></ReturnData></Return>`,
    );
    const changedContainer = zipSync({
      [`${submissionId}.zip`]: zipSync(inner),
    });
    const key = await digest(encoder.encode(messageId));
    await Deno.writeFile(
      `${root}/requests/${key}/container.zip`,
      changedContainer,
    );
    await Deno.writeTextFile(
      `${root}/requests/${key}/record.json`,
      JSON.stringify({
        ...send,
        containerSha256: await digest(changedContainer),
      }),
    );

    await assertRejects(
      () => readA2aSendRecord(root, messageId),
      Error,
      "document inventory, references, or PDF attachments",
    );
    await assertRejects(
      () =>
        recordA2aInboundPayload(root, {
          kind: "acknowledgment_payload",
          sendMessageId: messageId,
          submissionIds: [submissionId],
          receivedAt: new Date("2026-09-26T11:00:00Z"),
          rawPayload: encoder.encode("acknowledgment"),
        }),
      Error,
      "document inventory, references, or PDF attachments",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

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

Deno.test("A2A Send evidence refuses corrupt or misidentified inner submission ZIPs", async () => {
  const root = await Deno.makeTempDir();
  try {
    const request = packageFor();
    for (
      const [index, inner] of [
        encoder.encode("not a ZIP"),
        zipSync({ "xml/submission.xml": encoder.encode("<Return/>") }),
        zipSync({
          "manifest/manifest.xml": encoder.encode(
            `<IRSSubmissionManifest><SubmissionId>1234562026269xxxxxxx</SubmissionId><TaxYr>2025</TaxYr><GovernmentCd>IRS</GovernmentCd><FederalSubmissionTypeCd>1040</FederalSubmissionTypeCd><TIN>111223333</TIN></IRSSubmissionManifest>`,
          ),
          "xml/submission.xml": encoder.encode(
            `<Return><PrimarySSN>111223333</PrimarySSN></Return>`,
          ),
        }),
      ].entries()
    ) {
      await assertRejects(
        () =>
          recordA2aSendPackage(root, {
            messageId: `${messageId}-${index}`,
            submissionIds: [submissionId],
            package: {
              ...request,
              containerZipBytes: zipSync({ [`${submissionId}.zip`]: inner }),
            },
            recordedAt: new Date("2026-09-26T10:00:00Z"),
          }),
        Error,
        index === 0
          ? "submission ZIP is unreadable"
          : index === 1
          ? "lacks manifest or return XML"
          : "manifest or taxpayer differs",
      );
    }
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

Deno.test("A2A evidence replays Send and inbound correlation after stored metadata changes", async () => {
  const root = await Deno.makeTempDir();
  try {
    const send = await recordA2aSendPackage(root, {
      messageId,
      submissionIds: [submissionId],
      package: packageFor(),
      recordedAt: new Date("2026-09-26T10:00:00Z"),
    });
    const sendKey = await digest(encoder.encode(messageId));
    const sendPath = `${root}/requests/${sendKey}/record.json`;
    await Deno.writeTextFile(
      sendPath,
      JSON.stringify({
        ...send,
        submissionIds: ["1234562026269xxxxxxx"],
      }),
    );
    await assertRejects(
      () => readA2aSendRecord(root, messageId),
      Error,
      "body and container Submission IDs differ",
    );
    await Deno.writeTextFile(sendPath, JSON.stringify(send));

    const inbound = await recordA2aInboundPayload(root, {
      kind: "send_response",
      sendMessageId: messageId,
      relatesToMessageId: messageId,
      submissionIds: [submissionId],
      receivedAt: new Date("2026-09-26T11:00:00Z"),
      rawPayload: encoder.encode("response bytes"),
    });
    const inboundPath = `${root}/inbound/${inbound.recordId}/record.json`;
    await Deno.writeTextFile(
      inboundPath,
      JSON.stringify({
        ...inbound,
        relatesToMessageId: "different-message",
      }),
    );
    await assertRejects(
      () => readA2aInboundPayload(root, inbound.recordId),
      Error,
      "payload integrity or record ID mismatch",
    );
    await Deno.writeTextFile(
      inboundPath,
      JSON.stringify({
        ...inbound,
        submissionIds: [submissionId, submissionId],
      }),
    );
    await assertRejects(
      () => readA2aInboundPayload(root, inbound.recordId),
      Error,
      "payload integrity or record ID mismatch",
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
