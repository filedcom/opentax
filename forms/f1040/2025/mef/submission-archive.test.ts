import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { unzipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import { type FilerIdentity, FilingStatus } from "./types.ts";
import type { MefFormsPending } from "./types.ts";
import { buildMefBundle } from "./builder.ts";
import type { MefPdfAttachment } from "./form-descriptor.ts";
import { f1040_2025 } from "../index.ts";
import { pdfReviewFixtures } from "../pdf/review-fixtures.ts";
import {
  buildMefSubmissionArchive,
  buildMefTransmissionPackage,
} from "./submission-archive.ts";

const processingDate = new Date("2026-09-26T10:00:00Z");
const submissionId = "1234562026269abcdefg";

function filer(): FilerIdentity {
  return {
    primarySSN: "123456789",
    nameLine1: "TAXPAYER TEST",
    nameControl: "TAXP",
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
  return buildMefSubmissionArchive(bundle, options);
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

Deno.test("MeF submission preserves a digital-asset Yes answer", async () => {
  const submission = await makeSubmissionArchive({
    f1040: { digital_assets: true },
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
    f1040: { digital_assets: false },
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

Deno.test("MeF submission rejects changes after bundle preparation", async () => {
  const identity = filer();
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const bundle = await buildMefBundle({
    f1040: { digital_assets: false },
  }, {
    filer: identity,
    attachments: [{
      fileName: "Evidence.pdf",
      description: "Evidence copy",
      bytes: await pdf.save(),
    }],
  });
  const options = { filer: identity, submissionId, processingDate };
  await assertRejects(
    () =>
      buildMefSubmissionArchive({
        ...bundle,
        pending: { ...bundle.pending, f1040: { digital_assets: true } },
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
    "attachment differs from preparation",
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
    f1040: { digital_assets: false },
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
    f1040: { digital_assets: false },
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
      makeSubmissionArchive({ f1040: { digital_assets: false } }, {
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
    f1040: { digital_assets: false },
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
