import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { unzipSync, Zip, ZipPassThrough, zipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import { type FilerIdentity, FilingStatus } from "./types.ts";
import type { MefFormsPending } from "./types.ts";
import { buildMefBundle } from "./builder.ts";
import { preparedSourceSha256, sha256Hex } from "../prepared-source.ts";
import type { MefPdfAttachment } from "./form-descriptor.ts";
import { f1040_2025 } from "../index.ts";
import { pdfReviewFixtures } from "../pdf/review-fixtures.ts";
import {
  buildMefSubmissionArchive,
  buildMefTransmissionPackage,
  zipDirectoryEntryCount,
} from "./submission-archive.ts";

Deno.test("ZIP entry check accepts a valid data descriptor with placeholder local CRC", async () => {
  const bytes = await new Promise<Uint8Array>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    const archive = new Zip((error, chunk, final) => {
      if (error) return reject(error);
      chunks.push(chunk);
      if (final) {
        const total = chunks.reduce((sum, item) => sum + item.length, 0);
        const result = new Uint8Array(total);
        let offset = 0;
        for (const item of chunks) {
          result.set(item, offset);
          offset += item.length;
        }
        resolve(result);
      }
    });
    const entry = new ZipPassThrough("fixture.txt");
    archive.add(entry);
    entry.push(new TextEncoder().encode("descriptor payload"), true);
    archive.end();
  });
  assertEquals(new DataView(bytes.buffer).getUint16(6, true) & 0x0008, 0x0008);
  assertEquals(zipDirectoryEntryCount(bytes), 1);
  assertEquals(
    new TextDecoder().decode(unzipSync(bytes)["fixture.txt"]),
    "descriptor payload",
  );
});

const processingDate = new Date("2026-09-26T10:00:00Z");
const submissionId = "1234562026269abcdefg";
const residencyReview = {
  tax_year: 2025 as const,
  taxpayer: {
    tin: "123456789",
    tax_status: "full_year_us_citizen" as const,
    status_source_reference: "reviewed-2025-citizenship-record",
    reviewer_reference: "reviewer-2026-04-01",
    reviewed_on: "2026-04-01",
  },
};

function filer(): FilerIdentity {
  return {
    primarySSN: "123456789",
    nameLine1: "TAXPAYER TEST",
    nameControl: "TAXP",
    firstNameWithInitial: "Test",
    lastName: "Taxpayer",
    fullName: "Test Taxpayer",
    address: {
      line1: "1 Test Way",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    filingStatus: FilingStatus.Single,
    softwareId: "12345678",
    originator: { efin: "123456", originatorType: "ERO" },
  };
}

async function makeSubmissionArchive(
  pending: MefFormsPending,
  options: {
    filer: FilerIdentity;
    submissionId: string;
    processingDate: Date;
    attachments: ReadonlyArray<MefPdfAttachment>;
  },
) {
  const bundle = await buildMefBundle(pending, {
    filer: options.filer,
    attachments: options.attachments,
  });
  return buildMefSubmissionArchive(bundle, {
    ...options,
    residencyReview,
  });
}

Deno.test("MeF submission refuses an unanswered digital-asset question", async () => {
  await assertRejects(
    () =>
      makeSubmissionArchive({}, {
        filer: filer(),
        submissionId,
        processingDate,
        attachments: [],
      }),
    Error,
    "explicit Form 1040 digital-asset Yes or No answer",
  );
});

Deno.test("MeF submission refuses a missing Form 1040 filing status", async () => {
  await assertRejects(
    () =>
      makeSubmissionArchive({ f1040: { digital_assets: false } }, {
        filer: filer(),
        submissionId,
        processingDate,
        attachments: [],
      }),
    Error,
    "filing status must match the identified filer",
  );
});

Deno.test("MeF submission requires reviewed full-year residency for the final filer", async () => {
  const identity = filer();
  const bundle = await buildMefBundle({
    f1040: { filing_status: "single", digital_assets: false },
  }, { filer: identity, attachments: [] });
  const options = { filer: identity, submissionId, processingDate };
  await assertRejects(() =>
    buildMefSubmissionArchive(bundle, {
      ...options,
      residencyReview: undefined as unknown as typeof residencyReview,
    })
  );
  await assertRejects(
    () =>
      buildMefSubmissionArchive(bundle, {
        ...options,
        residencyReview: {
          ...residencyReview,
          taxpayer: { ...residencyReview.taxpayer, tin: "987654321" },
        },
      }),
    Error,
    "must identify every joint filer and the final return",
  );
  await assertRejects(
    () =>
      buildMefSubmissionArchive(bundle, {
        ...options,
        residencyReview: {
          ...residencyReview,
          taxpayer: {
            ...residencyReview.taxpayer,
            tax_status: "dual_status" as const,
          },
        },
      }),
    Error,
    "dual-status or nonresident filer cannot enter",
  );
  const submitted = await buildMefSubmissionArchive(bundle, {
    ...options,
    residencyReview,
  });
  assertThrows(
    () =>
      buildMefTransmissionPackage([{
        archive: {
          ...submitted,
          residencyReview: {
            ...residencyReview,
            taxpayer: {
              ...residencyReview.taxpayer,
              tax_status: "nonresident" as const,
            },
          },
        },
        electronicPostmark: processingDate,
      }]),
    Error,
    "dual-status or nonresident filer cannot enter",
  );
});

Deno.test("joint MeF submission requires a separately reviewed spouse classification", async () => {
  const identity: FilerIdentity = {
    ...filer(),
    filingStatus: FilingStatus.MarriedFilingJointly,
    spouse: {
      ssn: "987654321",
      firstName: "Jane",
      lastName: "Smith",
      nameControl: "SMIT",
    },
  };
  const bundle = await buildMefBundle({
    f1040: {
      filing_status: "mfj",
      taxpayer_ssn: "123456789",
      spouse_ssn: "987654321",
      digital_assets: false,
    },
  }, { filer: identity, attachments: [] });
  const options = { filer: identity, submissionId, processingDate };
  await assertRejects(
    () =>
      buildMefSubmissionArchive(bundle, {
        ...options,
        residencyReview,
      }),
    Error,
    "must identify every joint filer",
  );
  const jointReview = {
    ...residencyReview,
    spouse: {
      tin: "987654321",
      tax_status: "full_year_resident_alien" as const,
      status_source_reference: "reviewed-2025-resident-record",
      reviewer_reference: "reviewer-2026-04-01",
      reviewed_on: "2026-04-01",
    },
  };
  const submission = await buildMefSubmissionArchive(bundle, {
    ...options,
    residencyReview: jointReview,
  });
  assertEquals(submission.residencyReview.spouse?.tin, "987654321");
  await assertRejects(
    () =>
      buildMefSubmissionArchive(bundle, {
        ...options,
        residencyReview: {
          ...jointReview,
          spouse: { ...jointReview.spouse, tax_status: "dual_status" as const },
        },
      }),
    Error,
    "dual-status or nonresident filer cannot enter",
  );
});

Deno.test("MeF submission preserves a digital-asset Yes answer", async () => {
  const submission = await makeSubmissionArchive({
    f1040: { filing_status: "single", digital_assets: true },
  }, {
    filer: filer(),
    submissionId,
    processingDate,
    attachments: [],
  });
  const xml = new TextDecoder().decode(
    unzipSync(submission.bytes)["xml/submission.xml"],
  );
  assertEquals(
    xml.includes(
      "<VirtualCurAcquiredDurTYInd>true</VirtualCurAcquiredDurTYInd>",
    ),
    true,
  );
});

Deno.test("MeF submission ZIP contains manifest, declared return XML, and matching PDF", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  const pdfBytes = await pdf.save();
  const submission = await makeSubmissionArchive({
    f1040: { filing_status: "single", digital_assets: false },
  }, {
    filer: filer(),
    submissionId,
    processingDate,
    attachments: [{
      fileName: "AdditionalQMIDStatement.pdf",
      description: "Additional QMID Statement",
      bytes: pdfBytes,
    }],
  });
  assertEquals(submission.fileName, `${submissionId}.zip`);
  assertEquals(
    new DataView(submission.bytes.buffer, submission.bytes.byteOffset)
      .getUint16(
        8,
        true,
      ),
    8,
  );
  const files = unzipSync(submission.bytes);
  assertEquals(Object.keys(files).sort(), [
    "attachment/AdditionalQMIDStatement.pdf",
    "manifest/manifest.xml",
    "xml/submission.xml",
  ]);
  assertEquals(
    new TextDecoder().decode(files["manifest/manifest.xml"]),
    submission.manifestXml,
  );
  assertEquals(
    submission.manifestXml.startsWith(
      '<?xml version="1.0" encoding="UTF-8"?>\n',
    ),
    true,
  );
  assertEquals(
    submission.manifestXml.includes(
      `<SubmissionId>${submissionId}</SubmissionId>`,
    ),
    true,
  );
  assertEquals(
    submission.manifestXml.includes("<TIN>123456789</TIN>"),
    true,
  );
  const returnXml = new TextDecoder().decode(files["xml/submission.xml"]);
  assertEquals(
    returnXml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<Return '),
    true,
  );
  assertEquals(returnXml.includes('binaryAttachmentCnt="1"'), true);
  assertEquals(files["attachment/AdditionalQMIDStatement.pdf"], pdfBytes);

  const transmission = buildMefTransmissionPackage([{
    archive: submission,
    electronicPostmark: new Date("2026-09-26T09:00:00.123Z"),
  }]);
  assertEquals(
    transmission.sendSubmissionsRequestXml,
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<SendSubmissionsRequest xmlns="http://www.irs.gov/a2a/mef/MeFTransmitterService.xsd">' +
      "<SubmissionDataList><SubmissionData>" +
      `<SubmissionId>${submissionId}</SubmissionId>` +
      "<ElectronicPostmarkTs>2026-09-26T09:00:00.123Z</ElectronicPostmarkTs>" +
      "</SubmissionData></SubmissionDataList></SendSubmissionsRequest>",
  );
  const container = transmission.containerZipBytes;
  const entries = unzipSync(container);
  assertEquals(Object.keys(entries), [`${submissionId}.zip`]);
  assertEquals(entries[submission.fileName], submission.bytes);
  assertEquals(
    Object.keys(unzipSync(entries[submission.fileName])).sort(),
    Object.keys(files).sort(),
  );
  // The A2A outer ZIP stores its submission entries without compression.
  assertEquals(
    new DataView(container.buffer, container.byteOffset).getUint16(8, true),
    0,
  );
});

Deno.test("A2A packaging rejects reordered inner submission ZIP entries", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  const submission = await makeSubmissionArchive({
    f1040: { filing_status: "single", digital_assets: false },
  }, {
    filer: filer(),
    submissionId,
    processingDate,
    attachments: [{
      fileName: "AdditionalQMIDStatement.pdf",
      description: "Additional QMID Statement",
      bytes: await pdf.save(),
    }],
  });
  const entries = unzipSync(submission.bytes);
  assertEquals(Object.keys(entries), [
    "manifest/manifest.xml",
    "xml/submission.xml",
    "attachment/AdditionalQMIDStatement.pdf",
  ]);
  const reordered = zipSync({
    "attachment/AdditionalQMIDStatement.pdf":
      entries["attachment/AdditionalQMIDStatement.pdf"],
    "xml/submission.xml": entries["xml/submission.xml"],
    "manifest/manifest.xml": entries["manifest/manifest.xml"],
  });
  assertThrows(
    () =>
      buildMefTransmissionPackage([{
        archive: { ...submission, bytes: reordered },
        electronicPostmark: processingDate,
      }]),
    Error,
    "submission ZIP differs from its prepared return",
  );
});

Deno.test("A2A packaging rejects duplicate physical ZIP entries hidden by unzipSync", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const submission = await makeSubmissionArchive({
    f1040: { filing_status: "single", digital_assets: false },
  }, {
    filer: filer(),
    submissionId,
    processingDate,
    attachments: [{
      fileName: "Evidence.pdf",
      description: "Evidence copy",
      bytes: await pdf.save(),
    }],
  });
  const entries = unzipSync(submission.bytes);
  const duplicateName = "attachment/Evidence.pdF";
  const originalName = "attachment/Evidence.pdf";
  const distinctZip = zipSync({
    "manifest/manifest.xml": entries["manifest/manifest.xml"],
    "xml/submission.xml": entries["xml/submission.xml"],
    [originalName]: entries[originalName],
    [duplicateName]: entries[originalName],
  });
  const duplicated = Uint8Array.from(distinctZip);
  const oldName = new TextEncoder().encode(duplicateName);
  const newName = new TextEncoder().encode(originalName);
  let replacements = 0;
  for (let index = 0; index <= duplicated.length - oldName.length; index++) {
    if (oldName.every((byte, offset) => duplicated[index + offset] === byte)) {
      duplicated.set(newName, index);
      replacements++;
    }
  }
  assertEquals(replacements, 2); // local and central directory names
  assertEquals(Object.keys(unzipSync(duplicated)), Object.keys(entries));
  assertThrows(
    () =>
      buildMefTransmissionPackage([{
        archive: { ...submission, bytes: duplicated },
        electronicPostmark: processingDate,
      }]),
    Error,
    "submission ZIP differs from its prepared return",
  );
});

Deno.test("A2A packaging rejects a local ZIP name that differs from its central name", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const submission = await makeSubmissionArchive({
    f1040: { filing_status: "single", digital_assets: false },
  }, {
    filer: filer(),
    submissionId,
    processingDate,
    attachments: [{
      fileName: "Evidence.pdf",
      description: "Evidence copy",
      bytes: await pdf.save(),
    }],
  });
  const changedZip = Uint8Array.from(submission.bytes);
  const name = new TextEncoder().encode("attachment/Evidence.pdf");
  let firstName = -1;
  let occurrences = 0;
  for (let index = 0; index <= changedZip.length - name.length; index++) {
    if (name.every((byte, offset) => changedZip[index + offset] === byte)) {
      if (firstName < 0) firstName = index;
      occurrences++;
    }
  }
  assertEquals(occurrences, 2); // local header and central directory
  changedZip[firstName + name.length - 1] = "F".charCodeAt(0);
  assertEquals(
    Object.keys(unzipSync(changedZip)),
    Object.keys(unzipSync(submission.bytes)),
  );
  assertThrows(
    () =>
      buildMefTransmissionPackage([{
        archive: { ...submission, bytes: changedZip },
        electronicPostmark: processingDate,
      }]),
    Error,
    "submission ZIP differs from its prepared return",
  );
});

Deno.test("A2A package rechecks the archived Form 1040 document inventory", async () => {
  const submission = await makeSubmissionArchive({
    f1040: { filing_status: "single", digital_assets: false },
  }, {
    filer: filer(),
    submissionId,
    processingDate,
    attachments: [],
  });
  buildMefTransmissionPackage([{
    archive: submission,
    electronicPostmark: processingDate,
  }]);
  const changedXml = submission.bundle.xml.replace(
    'documentCnt="1"',
    'documentCnt="2"',
  );
  const entries = unzipSync(submission.bytes);
  entries["xml/submission.xml"] = new TextEncoder().encode(
    '<?xml version="1.0" encoding="UTF-8"?>\n' + changedXml,
  );
  assertThrows(
    () =>
      buildMefTransmissionPackage([{
        archive: {
          ...submission,
          bytes: zipSync(entries),
          bundle: { ...submission.bundle, xml: changedXml },
        },
        electronicPostmark: processingDate,
      }]),
    Error,
    "prepared source, XML, or PDF digests",
  );
});

Deno.test("A2A package rejects a processing date changed after archive preparation", async () => {
  const submission = await makeSubmissionArchive({
    f1040: { filing_status: "single", digital_assets: false },
  }, {
    filer: filer(),
    submissionId,
    processingDate,
    attachments: [],
  });
  assertThrows(
    () =>
      buildMefTransmissionPackage([{
        archive: {
          ...submission,
          processingDate: new Date("2026-09-27T10:00:00Z"),
        },
        electronicPostmark: processingDate,
      }]),
    Error,
    "Julian day",
  );
});

Deno.test("A2A package replays source, XML, and PDF digests after joint archive changes", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const submission = await makeSubmissionArchive({
    f1040: { filing_status: "single", digital_assets: false },
  }, {
    filer: filer(),
    submissionId,
    processingDate,
    attachments: [{
      fileName: "Evidence.pdf",
      description: "Evidence copy",
      bytes: await pdf.save(),
    }],
  });
  const packaged = (archive: typeof submission) =>
    buildMefTransmissionPackage([{
      archive,
      electronicPostmark: processingDate,
    }]);
  packaged(submission);

  const changedXml = submission.bundle.xml.replace(
    "<PrimarySSN>123456789</PrimarySSN>",
    "<PrimarySSN>123456780</PrimarySSN>",
  );
  const xmlEntries = unzipSync(submission.bytes);
  xmlEntries["xml/submission.xml"] = new TextEncoder().encode(
    '<?xml version="1.0" encoding="UTF-8"?>\n' + changedXml,
  );
  assertThrows(
    () =>
      packaged({
        ...submission,
        bytes: zipSync(xmlEntries),
        bundle: { ...submission.bundle, xml: changedXml },
      }),
    Error,
    "prepared source, XML, or PDF digests",
  );

  assertThrows(
    () =>
      packaged({
        ...submission,
        bundle: {
          ...submission.bundle,
          pending: {
            ...submission.bundle.pending,
            f1040: {
              ...submission.bundle.pending.f1040,
              digital_assets: true,
            },
          },
        },
      }),
    Error,
    "prepared source, XML, or PDF digests",
  );

  const changedPdf = Uint8Array.from(submission.bundle.attachments[0].bytes);
  changedPdf[changedPdf.length - 1] ^= 1;
  const pdfEntries = unzipSync(submission.bytes);
  pdfEntries["attachment/Evidence.pdf"] = changedPdf;
  assertThrows(
    () =>
      packaged({
        ...submission,
        bytes: zipSync(pdfEntries),
        bundle: {
          ...submission.bundle,
          attachments: [{
            ...submission.bundle.attachments[0],
            bytes: changedPdf,
          }],
        },
      }),
    Error,
    "prepared source, XML, or PDF digests",
  );
});

Deno.test("MeF archive and A2A package reject non-PDF attachment bytes even when rehashed", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const identity = filer();
  const submission = await makeSubmissionArchive({
    f1040: { filing_status: "single", digital_assets: false },
  }, {
    filer: identity,
    submissionId,
    processingDate,
    attachments: [{
      fileName: "Evidence.pdf",
      description: "Evidence copy",
      bytes: await pdf.save(),
    }],
  });
  const invalidBytes = new TextEncoder().encode("not a PDF");
  const changedBundle = {
    ...submission.bundle,
    attachments: [{ ...submission.bundle.attachments[0], bytes: invalidBytes }],
    attachmentSha256ByFileName: {
      "Evidence.pdf": await sha256Hex(invalidBytes),
    },
  };
  const entries = unzipSync(submission.bytes);
  entries["attachment/Evidence.pdf"] = invalidBytes;
  await assertRejects(
    () =>
      buildMefSubmissionArchive(changedBundle, {
        filer: identity,
        submissionId,
        processingDate,
        residencyReview,
      }),
    Error,
    "not a complete PDF",
  );
  assertThrows(
    () =>
      buildMefTransmissionPackage([{
        archive: {
          ...submission,
          bundle: changedBundle,
          bytes: zipSync(entries),
        },
        electronicPostmark: processingDate,
      }]),
    Error,
    "not a complete PDF",
  );
});

Deno.test("A2A package replays retained PDF descriptions against the native manifest", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const submission = await makeSubmissionArchive({
    f1040: { filing_status: "single", digital_assets: false },
  }, {
    filer: filer(),
    submissionId,
    processingDate,
    attachments: [{
      fileName: "Evidence.pdf",
      description: "Evidence copy",
      bytes: await pdf.save(),
    }],
  });
  buildMefTransmissionPackage([{
    archive: submission,
    electronicPostmark: processingDate,
  }]);
  assertThrows(
    () =>
      buildMefTransmissionPackage([{
        archive: {
          ...submission,
          bundle: {
            ...submission.bundle,
            attachments: [{
              ...submission.bundle.attachments[0],
              description: "Changed after preparation",
            }],
          },
        },
        electronicPostmark: processingDate,
      }]),
    Error,
    "binary manifest differs from PDF attachment",
  );
});

Deno.test("MeF submission rejects changes after bundle preparation", async () => {
  const identity = filer();
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const bundle = await buildMefBundle({
    f1040: { filing_status: "single", digital_assets: false },
  }, {
    filer: identity,
    attachments: [{
      fileName: "Evidence.pdf",
      description: "Evidence copy",
      bytes: await pdf.save(),
    }],
  });
  const options = {
    filer: identity,
    submissionId,
    processingDate,
    residencyReview,
  };
  await assertRejects(
    () =>
      buildMefSubmissionArchive({
        ...bundle,
        pending: {
          ...bundle.pending,
          f1040: { filing_status: "single", digital_assets: true },
        },
      }, options),
    Error,
    "differs from its prepared return",
  );
  await assertRejects(
    () =>
      buildMefSubmissionArchive({ ...bundle, xml: bundle.xml + " " }, options),
    Error,
    "differs from its prepared return",
  );
  await assertRejects(
    () =>
      buildMefSubmissionArchive(bundle, {
        ...options,
        filer: { ...identity, nameLine1: "DIFFERENT TAXPAYER" },
      }),
    Error,
    "differs from its prepared return",
  );
  const changedBytes = Uint8Array.from(bundle.attachments[0].bytes);
  changedBytes[changedBytes.length - 1] ^= 1;
  await assertRejects(
    () =>
      buildMefSubmissionArchive({
        ...bundle,
        attachments: [{ ...bundle.attachments[0], bytes: changedBytes }],
      }, options),
    Error,
    "PDF bytes differ from digest",
  );
});

Deno.test("MeF archive and A2A package reject a rehashed source that differs from native XML", async () => {
  const identity = filer();
  const original = await makeSubmissionArchive({
    f1040: { filing_status: "single", digital_assets: false },
  }, {
    filer: identity,
    submissionId,
    processingDate,
    attachments: [],
  });
  const pending = {
    ...original.bundle.pending,
    f1040: { ...original.bundle.pending.f1040, digital_assets: true },
  };
  const changedBundle = {
    ...original.bundle,
    pending,
    sourceSha256: await preparedSourceSha256(pending, identity),
  };
  const archiveOptions = {
    filer: identity,
    submissionId,
    processingDate,
    residencyReview,
  };
  await assertRejects(
    () => buildMefSubmissionArchive(changedBundle, archiveOptions),
    Error,
    "retained source projection",
  );
  assertThrows(
    () =>
      buildMefTransmissionPackage([{
        archive: { ...original, bundle: changedBundle },
        electronicPostmark: processingDate,
      }]),
    Error,
    "retained source projection",
  );
});

Deno.test("MeF submission archive rejects a digest-consistent XML EFIN that differs from its manifest", async () => {
  const identity = filer();
  const bundle = await buildMefBundle({
    f1040: { filing_status: "single", digital_assets: false },
  }, { filer: identity, attachments: [] });
  const alteredXml = bundle.xml.replace(
    "<EFIN>123456</EFIN>",
    "<EFIN>654321</EFIN>",
  );
  assertEquals(alteredXml === bundle.xml, false);
  const xmlSha256 = await sha256Hex(new TextEncoder().encode(alteredXml));
  await assertRejects(
    () =>
      buildMefSubmissionArchive({
        ...bundle,
        xml: alteredXml,
        xmlSha256,
      }, {
        filer: identity,
        submissionId,
        processingDate,
        residencyReview,
      }),
    Error,
    "retained source projection",
  );
});

Deno.test("Form 3800 PDF and submission ZIP consume one prepared native return", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-geothermal-general-business-credit"
  )!;
  const result = f1040_2025.executeReturn({ ...fixture.inputs });
  assertEquals(result.diagnostics, []);
  const identity = {
    ...fixture.filer,
    softwareId: "12345678",
    originator: { efin: "123456", originatorType: "ERO" as const },
  };
  const prepared = await f1040_2025.prepareReturn(result.pending, identity);
  const submission = await buildMefSubmissionArchive(prepared.bundle, {
    filer: identity,
    submissionId,
    processingDate,
    residencyReview: {
      ...residencyReview,
      taxpayer: { ...residencyReview.taxpayer, tin: identity.primarySSN },
    },
  });
  const xml = new TextDecoder().decode(
    unzipSync(submission.bytes)["xml/submission.xml"],
  );
  assertEquals(
    xml,
    '<?xml version="1.0" encoding="UTF-8"?>\n' + prepared.bundle.xml,
  );
  assertEquals(submission.bundle, prepared.bundle);
  assertEquals(prepared.bundle.form3800Parts?.lines.line38, 600);
  assertEquals(xml.includes("<IRS3800 "), true);
  assertEquals(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount(),
    17,
  );
});

Deno.test("MeF submission ZIP includes Form 5695's generated QMID statement", async () => {
  const identity = filer();
  const submission = await makeSubmissionArchive({
    f1040: { filing_status: "single", digital_assets: false },
    form5695: {
      part_ii_section_a: {
        main_home_in_us: true,
        original_user: true,
        five_year_use: true,
        home_address: identity.address,
        related_to_new_home: false,
        exterior_doors: [
          { cost: 1_000, qmid: "A1B2" },
          { cost: 900, qmid: "C3D4" },
          { cost: 800, qmid: "E5F6" },
          { cost: 700, qmid: "G7H8" },
        ],
      },
      part_ii_tax_limit: 1_000,
    },
  }, {
    filer: identity,
    submissionId,
    processingDate,
    attachments: [],
  });
  const files = unzipSync(submission.bytes);
  assertEquals(files["attachment/AdditionalQMIDStatement.pdf"]?.[0], 0x25);
  const xml = new TextDecoder().decode(files["xml/submission.xml"]);
  assertEquals(xml.includes('binaryAttachmentCnt="1"'), true);
  assertEquals(
    xml.includes(
      "<AttachmentLocationTxt>AdditionalQMIDStatement.pdf</AttachmentLocationTxt>",
    ),
    true,
  );
});

Deno.test("MeF submission ZIP includes Form 8824 gain statement linked from the form", async () => {
  const submission = await makeSubmissionArchive({
    f1040: { filing_status: "single", digital_assets: false },
    form8824: {
      relinquished_description: "Business land in Austin Texas",
      received_description: "Business land in Dallas Texas",
      date_acquired: "2020-01-15",
      date_transferred: "2025-04-01",
      date_identified: "2025-04-20",
      date_received: "2025-06-01",
      return_due_date_including_extensions: "2026-04-15",
      related_party: false,
      recapture_applies: false,
      multiple_like_kind_properties: false,
      installment_method_applies: false,
      property_used_as_home: false,
      replacement_property_category: "nondepreciable_land",
      relinquished_basis: 100_000,
      received_fmv: 150_000,
      cash_received: 50_000,
      gain_type: "section_1231",
    },
    form4797: {
      section_1231_gain: 50_000,
      gain_form8824: 50_000,
    },
  }, {
    filer: filer(),
    submissionId,
    processingDate,
    attachments: [],
  });
  const files = unzipSync(submission.bytes);
  const pdfName = "Form8824RealizedRecognizedGainStatement.pdf";
  assertEquals(files[`attachment/${pdfName}`]?.[0], 0x25);
  const xml = new TextDecoder().decode(files["xml/submission.xml"]);
  assertEquals(xml.includes('binaryAttachmentCnt="1"'), true);
  assertEquals(
    xml.includes(`<AttachmentLocationTxt>${pdfName}</AttachmentLocationTxt>`),
    true,
  );
  assertEquals(xml.includes('referenceDocumentId="BinaryAttachment'), true);
  assertEquals(
    xml.includes("<GainLossForm8824Amt>50000</GainLossForm8824Amt>"),
    true,
  );
});

Deno.test("A2A request entries match both ZIP attachments in order", async () => {
  const ids = ["1234562026269abcdefg", "1234562026269abcdefh"];
  const archives = await Promise.all(
    ids.map((id) =>
      makeSubmissionArchive({
        f1040: { filing_status: "single", digital_assets: false },
      }, {
        filer: filer(),
        submissionId: id,
        processingDate,
        attachments: [],
      })
    ),
  );
  const transmission = buildMefTransmissionPackage(archives.map((archive) => ({
    archive,
    electronicPostmark: new Date("2026-09-26T09:00:00.123Z"),
  })));
  const requestIds = [...transmission.sendSubmissionsRequestXml.matchAll(
    /<SubmissionId>([^<]+)<\/SubmissionId>/g,
  )].map((match) => match[1]);
  assertEquals(requestIds, ids);
  const container = unzipSync(transmission.containerZipBytes);
  assertEquals(Object.keys(container), ids.map((id) => `${id}.zip`));
  for (const archive of archives) {
    assertEquals(container[archive.fileName], archive.bytes);
  }
});

Deno.test("A2A transmission rejects a submission ZIP changed after preparation", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const submission = await makeSubmissionArchive({
    f1040: { filing_status: "single", digital_assets: false },
  }, {
    filer: filer(),
    submissionId,
    processingDate,
    attachments: [{
      fileName: "Evidence.pdf",
      description: "Evidence copy",
      bytes: await pdf.save(),
    }],
  });
  const packaged = (archive: typeof submission) =>
    buildMefTransmissionPackage([{
      archive,
      electronicPostmark: processingDate,
    }]);
  const xmlChanged = unzipSync(submission.bytes);
  xmlChanged["xml/submission.xml"] = new TextEncoder().encode("<Return/>");
  assertThrows(
    () => packaged({ ...submission, bytes: zipSync(xmlChanged) }),
    Error,
    "differs from its prepared return",
  );
  const attachmentMissing = unzipSync(submission.bytes);
  delete attachmentMissing["attachment/Evidence.pdf"];
  assertThrows(
    () => packaged({ ...submission, bytes: zipSync(attachmentMissing) }),
    Error,
    "differs from its prepared return",
  );
  assertThrows(
    () =>
      packaged({ ...submission, manifestXml: submission.manifestXml + " " }),
    Error,
    "differs from its prepared return",
  );
  const manifestChanged = submission.manifestXml.replace(
    "<TIN>123456789</TIN>",
    "<TIN>987654321</TIN>",
  );
  const changedManifestZip = unzipSync(submission.bytes);
  changedManifestZip["manifest/manifest.xml"] = new TextEncoder().encode(
    manifestChanged,
  );
  assertThrows(
    () =>
      packaged({
        ...submission,
        manifestXml: manifestChanged,
        bytes: zipSync(changedManifestZip),
      }),
    Error,
    "manifest differs from its ID or prepared return",
  );
  assertThrows(
    () =>
      packaged({
        ...submission,
        submissionId: "1234562026269abcdefh",
        fileName: "1234562026269abcdefh.zip",
      }),
    Error,
    "manifest differs from its ID",
  );
});

Deno.test("MeF submission ZIP rejects missing filing credentials and malformed IDs", async () => {
  const valid = filer();
  await assertRejects(
    () =>
      makeSubmissionArchive({}, {
        filer: { ...valid, originator: undefined },
        submissionId,
        processingDate,
        attachments: [],
      }),
    Error,
    "six-digit EFIN",
  );
  await assertRejects(
    () =>
      makeSubmissionArchive({}, {
        filer: { ...valid, softwareId: undefined },
        submissionId,
        processingDate,
        attachments: [],
      }),
    Error,
    "explicit eight-digit Software ID",
  );
  await assertRejects(
    () =>
      makeSubmissionArchive({}, {
        filer: valid,
        submissionId: "1234562025269abcdefg",
        processingDate,
        attachments: [],
      }),
    Error,
    "UTC processing year",
  );
});

Deno.test("MeF A2A package rejects an empty or duplicate submission set", async () => {
  assertThrows(
    () => buildMefTransmissionPackage([]),
    Error,
    "1 to 100 submissions",
  );
  const submission = await makeSubmissionArchive({
    f1040: { filing_status: "single", digital_assets: false },
  }, {
    filer: filer(),
    submissionId,
    processingDate,
    attachments: [],
  });
  assertThrows(
    () =>
      buildMefTransmissionPackage([
        { archive: submission, electronicPostmark: processingDate },
        { archive: submission, electronicPostmark: processingDate },
      ]),
    Error,
    "Duplicate MeF Submission ID",
  );
  assertThrows(
    () =>
      buildMefTransmissionPackage([{
        archive: { ...submission, fileName: "../wrong.zip" },
        electronicPostmark: processingDate,
      }]),
    Error,
    "invalid submission ZIP",
  );
  assertThrows(
    () =>
      buildMefTransmissionPackage([{
        archive: submission,
        electronicPostmark: new Date("invalid"),
      }]),
    Error,
    "valid electronic postmark",
  );
});
