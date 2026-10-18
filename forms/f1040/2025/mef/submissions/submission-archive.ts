import { createHash } from "node:crypto";
import type { FilerIdentity } from "../../../mef/header.ts";
import { element, elements } from "../../../mef/xml.ts";
import { assertPreparedBundleProjection, type MefBundle } from "../builder.ts";
import { assertMefPdfEnvelope } from "../attachments/pdf-attachment-envelope.ts";
import {
  preparedSourceBytes,
  preparedSourceSha256,
  sha256Hex,
} from "../../return-processing/prepared-source.ts";
import {
  assertPreparedAttachmentManifest,
  assertPreparedAttachmentMetadata,
  assertPreparedDocumentInventory,
} from "../attachments/prepared-attachment-manifest.ts";
import { assertF1040FinalHeader } from "../../domains/general/return-assembly/filer-source-reconciliation.ts";
import {
  assertFilingResidencyReview,
  type FilingResidencyReview,
} from "./residency-review.ts";
import {
  julianDay,
  MefTestCd,
  submissionManifestFindings,
} from "./submission-manifest.ts";
import { crc32, unzipEntries, zipEntries } from "./zip.ts";
import { EnvelopeFact } from "../../../../../core/validation/predicates.ts";
import {
  type EnvelopeFacts,
  processingDateFact,
  type RulePrefixTally,
  submissionEnvelopeReport,
} from "../../../validation/business-rule-report.ts";

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>\n';
const encoder = new TextEncoder();

export interface MefSubmissionArchiveOptions {
  readonly filer: FilerIdentity;
  readonly submissionId: string;
  readonly processingDate: Date;
  readonly residencyReview: FilingResidencyReview;
}

interface MefSubmissionArchiveContents {
  readonly submissionId: string;
  readonly fileName: string;
  readonly processingDate: Date;
  readonly bytes: Uint8Array;
  readonly manifestXml: string;
  readonly bundle: MefBundle;
  readonly filer: FilerIdentity;
  readonly residencyReview: FilingResidencyReview;
  /** ATS returns (`general.ats_test_submission`) go to the IRS test environment. */
  readonly testCd: MefTestCd;
}

export interface MefSubmissionArchive extends MefSubmissionArchiveContents {
  /** The R0000, X0000, T0000 and STATE rules run on these bytes, by prefix. */
  readonly envelopeRules: RulePrefixTally;
}

/** The transmitter's A2A identity for the T0000 Message ID rules. */
export interface MefTransmitter {
  readonly etin: string;
  readonly messageId: string;
}

/** Reject the archive when MeF's submission, XML or transmission rules would. */
function assertEnvelopeRules(
  archive: MefSubmissionArchiveContents,
  facts: EnvelopeFacts,
): RulePrefixTally {
  // The envelope rules read the emitted XML; pending supplies only the
  // Form 1040 filing status and ATS flag.
  const { report, byPrefix } = submissionEnvelopeReport(
    { f1040: archive.bundle.pending.f1040 ?? {} },
    archive.filer,
    archive.bundle.xml,
    {
      [EnvelopeFact.SubmissionZip]: archive.bytes,
      [EnvelopeFact.ProcessingDate]: processingDateFact(
        archive.processingDate,
      ),
      ...facts,
    },
  );
  const rejects = report.entries.filter((entry) =>
    entry.severity === "reject" || entry.severity === "reject_and_stop"
  );
  if (rejects.length > 0) {
    throw new Error(
      `MeF submission fails ${
        rejects.map((entry) => entry.ruleNumber).join(", ")
      }: ${rejects[0].message}`,
    );
  }
  return byPrefix;
}

export interface MefTransmissionSubmission {
  readonly archive: MefSubmissionArchive;
  readonly electronicPostmark?: Date;
}

export interface MefTransmissionPackage {
  readonly sendSubmissionsRequestXml: string;
  readonly containerZipBytes: Uint8Array;
  readonly testCd: MefTestCd;
}

function sameBytes(
  actual: Uint8Array | undefined,
  expected: Uint8Array,
): boolean {
  return actual !== undefined && actual.length === expected.length &&
    actual.every((byte, index) => byte === expected[index]);
}

function sha256HexSync(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Check physical ZIP entries and decoded payloads before filing. */
export function zipDirectoryEntryCount(
  bytes: Uint8Array,
  decoded: Readonly<Record<string, Uint8Array>>,
): number | undefined {
  if (bytes.length < 22) return undefined;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const firstCandidate = Math.max(0, bytes.length - 22 - 0xffff);
  for (let end = bytes.length - 22; end >= firstCandidate; end--) {
    if (
      view.getUint32(end, true) !== 0x06054b50 ||
      end + 22 + view.getUint16(end + 20, true) !== bytes.length
    ) continue;
    const count = view.getUint16(end + 10, true);
    const size = view.getUint32(end + 12, true);
    const offset = view.getUint32(end + 16, true);
    if (
      view.getUint16(end + 4, true) !== 0 ||
      view.getUint16(end + 6, true) !== 0 ||
      view.getUint16(end + 8, true) !== count ||
      count === 0xffff || size === 0xffffffff || offset === 0xffffffff ||
      offset + size !== end
    ) return undefined;
    let position = offset;
    let seen = 0;
    const localRanges: Array<readonly [number, number]> = [];
    while (position < end) {
      if (
        position + 46 > end ||
        view.getUint32(position, true) !== 0x02014b50
      ) return undefined;
      const nameLength = view.getUint16(position + 28, true);
      const extraLength = view.getUint16(position + 30, true);
      const commentLength = view.getUint16(position + 32, true);
      const localOffset = view.getUint32(position + 42, true);
      const compressedSize = view.getUint32(position + 20, true);
      const uncompressedSize = view.getUint32(position + 24, true);
      if (
        compressedSize === 0xffffffff || uncompressedSize === 0xffffffff ||
        localOffset === 0xffffffff ||
        localOffset + 30 > offset ||
        view.getUint32(localOffset, true) !== 0x04034b50 ||
        view.getUint16(localOffset + 6, true) !==
          view.getUint16(position + 8, true) ||
        view.getUint16(localOffset + 8, true) !==
          view.getUint16(position + 10, true) ||
        view.getUint16(localOffset + 26, true) !== nameLength ||
        position + 46 + nameLength > end ||
        localOffset + 30 + nameLength +
              view.getUint16(localOffset + 28, true) > offset
      ) return undefined;
      let name: string;
      try {
        name = new TextDecoder("utf-8", { fatal: true }).decode(
          bytes.subarray(position + 46, position + 46 + nameLength),
        );
      } catch {
        return undefined;
      }
      const payload = decoded[name];
      if (
        !Object.hasOwn(decoded, name) ||
        payload.length !== uncompressedSize ||
        crc32(payload) !== view.getUint32(position + 16, true)
      ) return undefined;
      // When bit 3 is set, the local CRC and sizes are placeholders followed
      // by a data descriptor. Validate that descriptor as well as any
      // nonzero local values so the three ZIP records cannot disagree.
      const localCrc = view.getUint32(localOffset + 14, true);
      const localCompressed = view.getUint32(localOffset + 18, true);
      const localUncompressed = view.getUint32(localOffset + 22, true);
      const centralCrc = view.getUint32(position + 16, true);
      const dataStart = localOffset + 30 + nameLength +
        view.getUint16(localOffset + 28, true);
      const dataEnd = dataStart + compressedSize;
      if (dataEnd > offset) return undefined;
      let localEnd = dataEnd;
      if ((view.getUint16(position + 8, true) & 0x0008) !== 0) {
        if (
          (localCrc !== 0 && localCrc !== centralCrc) ||
          (localCompressed !== 0 && localCompressed !== compressedSize) ||
          (localUncompressed !== 0 && localUncompressed !== uncompressedSize)
        ) return undefined;
        const descriptorStart = dataEnd;
        if (descriptorStart + 12 > offset) return undefined;
        const descriptorMatches = (start: number): boolean =>
          start + 12 <= offset &&
          view.getUint32(start, true) === centralCrc &&
          view.getUint32(start + 4, true) === compressedSize &&
          view.getUint32(start + 8, true) === uncompressedSize;
        const signed = view.getUint32(descriptorStart, true) === 0x08074b50 &&
          descriptorMatches(descriptorStart + 4);
        const unsigned = descriptorMatches(descriptorStart);
        if (!signed && !unsigned) return undefined;
        localEnd = descriptorStart + (signed ? 16 : 12);
      } else if (
        localCrc !== centralCrc ||
        localCompressed !== compressedSize ||
        localUncompressed !== uncompressedSize
      ) return undefined;
      localRanges.push([localOffset, localEnd]);
      for (let index = 0; index < nameLength; index++) {
        if (
          bytes[position + 46 + index] !==
            bytes[localOffset + 30 + index]
        ) return undefined;
      }
      position += 46 + nameLength + extraLength + commentLength;
      if (position > end) return undefined;
      seen++;
    }
    localRanges.sort((left, right) => left[0] - right[0]);
    let coveredThrough = 0;
    for (const [start, finish] of localRanges) {
      if (start !== coveredThrough || finish <= start) return undefined;
      coveredThrough = finish;
    }
    return coveredThrough === offset && seen === count &&
        seen === Object.keys(decoded).length
      ? seen
      : undefined;
  }
  return undefined;
}

function assertPreparedBundleDigests(archive: MefSubmissionArchiveContents): void {
  const { bundle } = archive;
  const attachmentNames = bundle.attachments.map((item) => item.fileName);
  const digestNames = Object.keys(bundle.attachmentSha256ByFileName);
  if (
    sha256HexSync(encoder.encode(bundle.xml)) !== bundle.xmlSha256 ||
    sha256HexSync(preparedSourceBytes(bundle.pending, archive.filer)) !==
      bundle.sourceSha256 ||
    attachmentNames.length !== digestNames.length ||
    new Set(attachmentNames).size !== attachmentNames.length ||
    attachmentNames.some((name) =>
      !Object.hasOwn(bundle.attachmentSha256ByFileName, name)
    ) ||
    bundle.attachments.some((attachment) =>
      sha256HexSync(attachment.bytes) !==
        bundle.attachmentSha256ByFileName[attachment.fileName]
    )
  ) {
    throw new Error(
      "MeF transmission bundle differs from its prepared source, XML, or PDF digests",
    );
  }
}

function assertPreparedArchiveContents(
  archive: MefSubmissionArchiveContents,
): void {
  validateSubmissionIdentity(archive);
  assertPreparedBundleDigests(archive);
  archive.bundle.attachments.forEach(assertMefPdfEnvelope);
  assertPreparedDocumentInventory(archive.bundle);
  assertPreparedAttachmentMetadata(archive.bundle);
  assertPreparedBundleProjection(archive.bundle, archive.filer);
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipEntries(archive.bytes);
  } catch {
    throw new Error("MeF transmission submission ZIP is unreadable");
  }
  const expectedFiles = [
    "manifest/manifest.xml",
    "xml/submission.xml",
    ...archive.bundle.attachments.map((attachment) =>
      `attachment/${attachment.fileName}`
    ),
  ];
  if (
    zipDirectoryEntryCount(archive.bytes, entries) !== expectedFiles.length ||
    expectedFiles.length !== new Set(expectedFiles).size ||
    Object.keys(entries).join("\n") !== expectedFiles.join("\n") ||
    !sameBytes(
      entries["manifest/manifest.xml"],
      encoder.encode(archive.manifestXml),
    ) ||
    !sameBytes(
      entries["xml/submission.xml"],
      encoder.encode(XML_DECLARATION + archive.bundle.xml),
    ) ||
    archive.bundle.attachments.some((attachment) =>
      !sameBytes(entries[`attachment/${attachment.fileName}`], attachment.bytes)
    )
  ) {
    throw new Error(
      "MeF transmission submission ZIP differs from its prepared return",
    );
  }
  const efin = /<EFIN>(\d{6})<\/EFIN>/.exec(archive.manifestXml)?.[1];
  const tin = /<TIN>(\d{9})<\/TIN>/.exec(archive.manifestXml)?.[1];
  const returnEfin = /<EFIN>(\d{6})<\/EFIN>/.exec(archive.bundle.xml)?.[1];
  const returnTin = /<PrimarySSN>(\d{9})<\/PrimarySSN>/.exec(archive.bundle.xml)
    ?.[1];
  if (
    !efin || !tin || efin !== returnEfin || tin !== returnTin ||
    archive.manifestXml !==
      buildManifestXml(archive.submissionId, efin, tin) ||
    archive.testCd !== submissionTestCd(archive.bundle)
  ) {
    throw new Error(
      "MeF transmission submission manifest differs from its ID or prepared return",
    );
  }
  const spouseTin = /<SpouseSSN>(\d{9})<\/SpouseSSN>/.exec(archive.bundle.xml)
    ?.[1];
  const statusCode =
    /<IndividualReturnFilingStatusCd>([1-5])<\/IndividualReturnFilingStatusCd>/
      .exec(archive.bundle.xml)?.[1];
  assertFilingResidencyReview(
    archive.residencyReview,
    tin,
    spouseTin,
    Number(statusCode),
    archive.processingDate,
    archive.bundle.xml.includes("<NRASpouseTreatedAsResidentGrp>"),
  );
}

function submissionTestCd(bundle: MefBundle): MefTestCd {
  return bundle.pending.f1040?.ats_test_submission === true
    ? MefTestCd.Test
    : MefTestCd.Production;
}

function validateSubmissionIdentity(options: MefSubmissionArchiveOptions): {
  efin: string;
  tin: string;
} {
  const { filer, submissionId, processingDate } = options;
  const efin = filer.originator?.efin;
  const softwareId = filer.softwareId;
  const tin = filer.primarySSN.replace(/-/g, "");
  if (!efin || !/^[0-9]{6}$/.test(efin)) {
    throw new Error(
      "MeF submission ZIP needs the filer originator's six-digit EFIN",
    );
  }
  if (!softwareId || !/^[0-9]{8}$/.test(softwareId)) {
    throw new Error(
      "MeF submission ZIP needs an explicit eight-digit Software ID",
    );
  }
  if (!/^[0-9]{9}$/.test(tin)) {
    throw new Error("MeF submission ZIP needs the filer's nine-digit TIN");
  }
  if (Number.isNaN(processingDate.getTime())) {
    throw new Error("MeF submission ZIP needs a valid processing date");
  }
  const expectedPrefix = efin + String(processingDate.getUTCFullYear()) +
    String(julianDay(processingDate)).padStart(3, "0");
  if (
    !/^[0-9]{13}[a-z0-9]{7}$/.test(submissionId) ||
    !submissionId.startsWith(expectedPrefix)
  ) {
    throw new Error(
      "MeF Submission ID must contain the EFIN, UTC processing year, Julian day, and seven-character sequence",
    );
  }
  return { efin, tin };
}

function buildManifestXml(
  submissionId: string,
  efin: string,
  tin: string,
): string {
  const children = [
    element("SubmissionId", submissionId),
    element("EFIN", efin),
    element("TaxYr", "2025"),
    element("GovernmentCd", "IRS"),
    element("FederalSubmissionTypeCd", "1040"),
    element("TaxPeriodBeginDt", "2025-01-01"),
    element("TaxPeriodEndDt", "2025-12-31"),
    element("TIN", tin),
  ];
  return XML_DECLARATION +
    `<IRSSubmissionManifest xmlns="http://www.irs.gov/efile">${
      children.join("")
    }</IRSSubmissionManifest>`;
}

/** Build one compressed federal TY2025 Form 1040 submission ZIP. No network calls. */
export async function buildMefSubmissionArchive(
  bundle: MefBundle,
  options: MefSubmissionArchiveOptions,
): Promise<MefSubmissionArchive> {
  const { efin, tin } = validateSubmissionIdentity(options);
  if (typeof bundle.pending.f1040?.digital_assets !== "boolean") {
    throw new Error(
      "MeF submission needs an explicit Form 1040 digital-asset Yes or No answer",
    );
  }
  if (
    await preparedSourceSha256(bundle.pending, options.filer) !==
      bundle.sourceSha256 ||
    await sha256Hex(encoder.encode(bundle.xml)) !== bundle.xmlSha256
  ) {
    throw new Error("MeF submission differs from its prepared return");
  }
  assertPreparedBundleProjection(bundle, options.filer);
  assertF1040FinalHeader(bundle.pending.f1040 ?? {}, options.filer);
  const residencyReview = assertFilingResidencyReview(
    options.residencyReview,
    tin,
    options.filer.spouse?.ssn.replaceAll("-", ""),
    options.filer.filingStatus,
    options.processingDate,
    bundle.xml.includes("<NRASpouseTreatedAsResidentGrp>"),
  );
  await assertPreparedAttachmentManifest(bundle);
  const manifestXml = buildManifestXml(options.submissionId, efin, tin);
  const findings = submissionManifestFindings(
    manifestXml,
    bundle.xml,
    options.processingDate,
  );
  if (findings.length > 0) {
    throw new Error(
      `MeF submission manifest fails ${
        findings.map((finding) => finding.ruleNumber).join(", ")
      }: ${findings[0].message}`,
    );
  }
  const files: Record<string, Uint8Array> = {
    "manifest/manifest.xml": encoder.encode(manifestXml),
    "xml/submission.xml": encoder.encode(XML_DECLARATION + bundle.xml),
  };
  for (const attachment of bundle.attachments) {
    files[`attachment/${attachment.fileName}`] = attachment.bytes;
  }
  const archive: MefSubmissionArchiveContents = {
    submissionId: options.submissionId,
    fileName: `${options.submissionId}.zip`,
    processingDate: options.processingDate,
    bytes: zipEntries(files, true),
    manifestXml,
    bundle,
    filer: options.filer,
    residencyReview,
    testCd: submissionTestCd(bundle),
  };
  assertPreparedArchiveContents(archive);
  return { ...archive, envelopeRules: assertEnvelopeRules(archive, {}) };
}

/** Build the A2A SOAP body element and its uncompressed ZIP attachment. */
export function buildMefTransmissionPackage(
  submissions: ReadonlyArray<MefTransmissionSubmission>,
  transmitter?: MefTransmitter,
): MefTransmissionPackage {
  if (submissions.length < 1 || submissions.length > 100) {
    throw new Error("MeF transmission needs 1 to 100 submissions");
  }
  const testCd = submissions[0].archive.testCd;
  if (submissions.some(({ archive }) => archive.testCd !== testCd)) {
    throw new Error(
      "MeF transmission cannot mix ATS test and production submissions",
    );
  }
  const files: Record<string, Uint8Array> = {};
  const requestEntries: string[] = [];
  for (const { archive: submission, electronicPostmark } of submissions) {
    if (
      !/^[0-9]{13}[a-z0-9]{7}$/.test(submission.submissionId) ||
      submission.fileName !== `${submission.submissionId}.zip` ||
      submission.bytes.length < 4 ||
      submission.bytes[0] !== 0x50 || submission.bytes[1] !== 0x4b
    ) {
      throw new Error("MeF container received an invalid submission ZIP");
    }
    if (files[submission.fileName]) {
      throw new Error(
        `Duplicate MeF Submission ID: ${submission.submissionId}`,
      );
    }
    if (
      electronicPostmark !== undefined &&
      (!(electronicPostmark instanceof Date) ||
        Number.isNaN(electronicPostmark.getTime()))
    ) {
      throw new Error("MeF transmission needs a valid electronic postmark");
    }
    assertPreparedArchiveContents(submission);
    files[submission.fileName] = submission.bytes;
    requestEntries.push(elements("SubmissionData", [
      element("SubmissionId", submission.submissionId),
      ...(electronicPostmark === undefined ? [] : [
        element("ElectronicPostmarkTs", electronicPostmark.toISOString()),
      ]),
    ]));
  }
  const list = elements("SubmissionDataList", requestEntries);
  const sendSubmissionsRequestXml = XML_DECLARATION +
    `<SendSubmissionsRequest xmlns="http://www.irs.gov/a2a/mef/MeFTransmitterService.xsd">${list}</SendSubmissionsRequest>`;
  const containerZipBytes = zipEntries(files, false);
  const transmissionFacts: EnvelopeFacts = {
    [EnvelopeFact.TransmissionZip]: containerZipBytes,
    [EnvelopeFact.TransmissionSubmissionIds]: submissions.map(({ archive }) =>
      archive.submissionId
    ),
    ...(transmitter
      ? {
        [EnvelopeFact.MessageId]: transmitter.messageId,
        [EnvelopeFact.TransmitterEtin]: transmitter.etin,
      }
      : {}),
  };
  for (const { archive } of submissions) {
    assertEnvelopeRules(archive, transmissionFacts);
  }
  return { sendSubmissionsRequestXml, containerZipBytes, testCd };
}
