import { unzipSync, zipSync } from "fflate";
import { createHash } from "node:crypto";
import type { FilerIdentity } from "../../mef/header.ts";
import { element, elements } from "../../mef/xml.ts";
import { assertPreparedBundleProjection, type MefBundle } from "./builder.ts";
import { assertMefPdfEnvelope } from "./pdf-attachment-envelope.ts";
import {
  preparedSourceBytes,
  preparedSourceSha256,
  sha256Hex,
} from "../prepared-source.ts";
import {
  assertPreparedAttachmentManifest,
  assertPreparedAttachmentMetadata,
  assertPreparedDocumentInventory,
} from "./prepared-attachment-manifest.ts";
import { assertF1040FinalHeader } from "../filer-source-reconciliation.ts";
import {
  assertFilingResidencyReview,
  type FilingResidencyReview,
} from "./residency-review.ts";

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>\n';
const encoder = new TextEncoder();

export interface MefSubmissionArchiveOptions {
  readonly filer: FilerIdentity;
  readonly submissionId: string;
  readonly processingDate: Date;
  readonly residencyReview: FilingResidencyReview;
}

export interface MefSubmissionArchive {
  readonly submissionId: string;
  readonly fileName: string;
  readonly processingDate: Date;
  readonly bytes: Uint8Array;
  readonly manifestXml: string;
  readonly bundle: MefBundle;
  readonly filer: FilerIdentity;
  readonly residencyReview: FilingResidencyReview;
}

export interface MefTransmissionSubmission {
  readonly archive: MefSubmissionArchive;
  readonly electronicPostmark: Date;
}

export interface MefTransmissionPackage {
  readonly sendSubmissionsRequestXml: string;
  readonly containerZipBytes: Uint8Array;
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

const CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value = CRC32_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
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
    while (position < end) {
      if (
        position + 46 > end ||
        view.getUint32(position, true) !== 0x02014b50
      ) return undefined;
      const nameLength = view.getUint16(position + 28, true);
      const extraLength = view.getUint16(position + 30, true);
      const commentLength = view.getUint16(position + 32, true);
      const localOffset = view.getUint32(position + 42, true);
      if (
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
        payload.length !== view.getUint32(position + 24, true) ||
        crc32(payload) !== view.getUint32(position + 16, true)
      ) return undefined;
      // When bit 3 is set, the local CRC and sizes are placeholders followed
      // by a data descriptor. Otherwise they must agree with the directory.
      if (
        (view.getUint16(position + 8, true) & 0x0008) === 0 &&
        (view.getUint32(localOffset + 14, true) !==
            view.getUint32(position + 16, true) ||
          view.getUint32(localOffset + 18, true) !==
            view.getUint32(position + 20, true) ||
          view.getUint32(localOffset + 22, true) !==
            view.getUint32(position + 24, true))
      ) return undefined;
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
    return seen === count && seen === Object.keys(decoded).length
      ? seen
      : undefined;
  }
  return undefined;
}

function assertPreparedBundleDigests(archive: MefSubmissionArchive): void {
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

function assertPreparedArchiveContents(archive: MefSubmissionArchive): void {
  validateSubmissionIdentity(archive);
  assertPreparedBundleDigests(archive);
  archive.bundle.attachments.forEach(assertMefPdfEnvelope);
  assertPreparedDocumentInventory(archive.bundle);
  assertPreparedAttachmentMetadata(archive.bundle);
  assertPreparedBundleProjection(archive.bundle, archive.filer);
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(archive.bytes);
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
    archive.manifestXml !== buildManifestXml(archive.submissionId, efin, tin)
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

function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.floor((date.getTime() - start) / 86_400_000) + 1;
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
    String(dayOfYear(processingDate)).padStart(3, "0");
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
  const files: Record<string, Uint8Array> = {
    "manifest/manifest.xml": encoder.encode(manifestXml),
    "xml/submission.xml": encoder.encode(XML_DECLARATION + bundle.xml),
  };
  for (const attachment of bundle.attachments) {
    files[`attachment/${attachment.fileName}`] = attachment.bytes;
  }
  const archive: MefSubmissionArchive = {
    submissionId: options.submissionId,
    fileName: `${options.submissionId}.zip`,
    processingDate: options.processingDate,
    bytes: zipSync(files, { level: 6 }),
    manifestXml,
    bundle,
    filer: options.filer,
    residencyReview,
  };
  assertPreparedArchiveContents(archive);
  return archive;
}

/** Build the A2A SOAP body element and its uncompressed ZIP attachment. */
export function buildMefTransmissionPackage(
  submissions: ReadonlyArray<MefTransmissionSubmission>,
): MefTransmissionPackage {
  if (submissions.length < 1 || submissions.length > 100) {
    throw new Error("MeF transmission needs 1 to 100 submissions");
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
    if (Number.isNaN(electronicPostmark.getTime())) {
      throw new Error("MeF transmission needs a valid electronic postmark");
    }
    assertPreparedArchiveContents(submission);
    files[submission.fileName] = submission.bytes;
    requestEntries.push(elements("SubmissionData", [
      element("SubmissionId", submission.submissionId),
      element("ElectronicPostmarkTs", electronicPostmark.toISOString()),
    ]));
  }
  const list = elements("SubmissionDataList", requestEntries);
  const sendSubmissionsRequestXml = XML_DECLARATION +
    `<SendSubmissionsRequest xmlns="http://www.irs.gov/a2a/mef/MeFTransmitterService.xsd">${list}</SendSubmissionsRequest>`;
  return {
    sendSubmissionsRequestXml,
    containerZipBytes: zipSync(files, { level: 0 }),
  };
}
