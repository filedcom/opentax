import { expect, test } from "bun:test";
import * as sys from "../../../../../scripts/support/sys.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { buildMefBundle } from "../builder.ts";
import {
  buildMefSubmissionArchive,
  buildMefTransmissionPackage,
} from "./submission-archive.ts";
import {
  mefSubmissionId,
  MefTestCd,
  randomSubmissionSequence,
  submissionManifestFindings,
} from "./submission-manifest.ts";
import { buildMefHeaderXml, mefMessageId } from "./a2a-header.ts";
import {
  readA2aArchivedSubmission,
  recordA2aSendPackage,
} from "./a2a-evidence.ts";
import { withSubmissionOriginator } from "../../../../../cli/commands/export.ts";

const filer: FilerIdentity = {
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  firstNameWithInitial: "Test",
  lastName: "Taxpayer",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};
const processingDate = new Date("2026-10-17T15:00:00Z");
const residencyReview = {
  tax_year: 2025 as const,
  taxpayer: {
    tin: "123456789",
    tax_status: "full_year_us_citizen" as const,
    status_source_reference: "reviewed-2025-citizenship-record",
    reviewer_reference: "reviewer-2026-10-01",
    reviewed_on: "2026-10-01",
  },
};

async function archive(ats: boolean, sequence = "abc0001") {
  const bundle = await buildMefBundle({
    f1040: {
      filing_status: "single",
      digital_assets: false,
      ...(ats ? { ats_test_submission: true } : {}),
    },
  }, { filer, attachments: [] });
  return await buildMefSubmissionArchive(bundle, {
    filer,
    submissionId: mefSubmissionId("123456", processingDate, sequence),
    processingDate,
    residencyReview,
  });
}

test("Submission ID is EFIN, UTC year, Julian day and a seven-character sequence", () => {
  expect(mefSubmissionId("123456", processingDate, "abc0001")).toBe(
    "1234562026290abc0001",
  );
  expect(mefSubmissionId("123456", new Date("2028-12-31T23:00:00Z"), "0000000"))
    .toBe("12345620283660000000");
  expect(randomSubmissionSequence()).toMatch(/^[a-z0-9]{7}$/);
  expect(() => mefSubmissionId("12345", processingDate, "abc0001")).toThrow();
  expect(() => mefSubmissionId("123456", processingDate, "ABC0001")).toThrow();
});

test("an ATS return carries test code T; a production return carries P", async () => {
  const ats = await archive(true);
  const production = await archive(false, "abc0002");
  expect(ats.testCd).toBe(MefTestCd.Test);
  expect(production.testCd).toBe(MefTestCd.Production);
  expect(buildMefTransmissionPackage([{ archive: ats }]).testCd).toBe(
    MefTestCd.Test,
  );
  expect(() =>
    buildMefTransmissionPackage([{ archive: ats }, { archive: production }])
  ).toThrow("cannot mix ATS test and production");
  expect(() =>
    buildMefTransmissionPackage([{
      archive: { ...ats, testCd: MefTestCd.Production },
    }])
  ).toThrow("manifest differs");
});

test("manifest rules compare the TIN with the Return Header Primary SSN and EFIN with OriginatorGrp", async () => {
  const { manifestXml, bundle } = await archive(true);
  expect(submissionManifestFindings(manifestXml, bundle.xml, processingDate))
    .toEqual([]);
  const rules = (manifest: string, xml = bundle.xml, date = processingDate) =>
    submissionManifestFindings(manifest, xml, date).map((f) => f.ruleNumber);
  expect(rules(manifestXml.replace("<TIN>123456789<", "<TIN>987654321<")))
    .toEqual(["IND-052"]);
  expect(
    rules(manifestXml, bundle.xml.replace("<EFIN>123456<", "<EFIN>654321<")),
  ).toEqual(["R0000-054-01"]);
  const online = (xml: string) => xml.replace("<EFIN>123456<", "<EFIN>103456<");
  expect(
    rules(
      online(manifestXml).replace(
        "<SubmissionId>123456",
        "<SubmissionId>103456",
      ),
      online(bundle.xml),
    ),
  ).toEqual(["R0000-118-01"]);
  expect(rules(manifestXml, bundle.xml, new Date("2027-01-02T00:00:00Z")))
    .toEqual(["X0000-027"]);
  expect(rules(manifestXml.replace("<TaxYr>2025<", "<TaxYr>2024<"))).toEqual([
    "R0000-052-01",
    "R0000-180",
    "R0000-228",
    "R0000-229",
  ]);
});

test("the A2A evidence join reads PrimarySSN from a generated Return Header (item 41)", async () => {
  const submission = await archive(true);
  expect(submission.bundle.xml).not.toMatch(
    /<IRS1040\b[^>]*>[\s\S]*<PrimarySSN>/,
  );
  const root = await sys.makeTempDir();
  try {
    await recordA2aSendPackage(root, {
      messageId: "12345202629000000001",
      submissionIds: [submission.submissionId],
      package: buildMefTransmissionPackage([{ archive: submission }]),
      recordedAt: processingDate,
    });
    const evidence = await readA2aArchivedSubmission(
      root,
      "12345202629000000001",
      {
        submissionId: submission.submissionId,
        taxpayerSsn: "123456789",
        submissionXmlSha256: await sha256(submission),
      },
    );
    expect(evidence.submissionId).toBe(submission.submissionId);
  } finally {
    await sys.remove(root, { recursive: true });
  }
});

async function sha256(
  submission: Awaited<ReturnType<typeof archive>>,
): Promise<string> {
  const xml = new TextEncoder().encode(
    '<?xml version="1.0" encoding="UTF-8"?>\n' + submission.bundle.xml,
  );
  const digest = await crypto.subtle.digest("SHA-256", xml);
  return Array.from(
    new Uint8Array(digest),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}

test("MeFHeader carries the ETIN Message ID and the ATS test code", () => {
  expect(mefMessageId("12345", processingDate, "abcd0001")).toBe(
    "123452026290abcd0001",
  );
  expect(() => mefMessageId("1234", processingDate, "abcd0001")).toThrow();
  expect(buildMefHeaderXml({
    etin: "12345",
    appSysId: "EXAMPLESYSID",
    messageTs: processingDate,
    messageSequence: "abcd0001",
    testCd: MefTestCd.Test,
    action: "SendSubmissions",
  })).toBe(
    '<MeFHeader xmlns="http://www.irs.gov/a2a/mef/MeFHeader.xsd"><MessageID>123452026290abcd0001</MessageID><Action>SendSubmissions</Action><MessageTs>2026-10-17T15:00:00.000Z</MessageTs><ETIN>12345</ETIN><TestCd>T</TestCd><AppSysID>EXAMPLESYSID</AppSysID><WSDLVersionNum>10.9</WSDLVersionNum></MeFHeader>',
  );
});

test("the submission originator comes from the return or --efin, never both disagreeing", () => {
  const { originator: _, ...unoriginated } = filer;
  expect(
    withSubmissionOriginator(unoriginated, "123456", "12345678").originator,
  )
    .toEqual({ efin: "123456", originatorType: "ERO" });
  expect(
    withSubmissionOriginator(unoriginated, "213456", "12345678").originator,
  )
    .toEqual({ efin: "213456", originatorType: "OnlineFiler" });
  expect(withSubmissionOriginator(filer, undefined, "12345678").originator)
    .toEqual({ efin: "123456", originatorType: "ERO" });
  expect(() => withSubmissionOriginator(filer, "654321", "12345678")).toThrow(
    "differs from the return's preparer EFIN",
  );
  expect(() => withSubmissionOriginator(unoriginated, undefined, "12345678"))
    .toThrow("--efin");
  expect(() => withSubmissionOriginator(filer, undefined, undefined)).toThrow(
    "--software-id",
  );
});
