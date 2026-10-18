import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { createReturnContext } from "../../../../../../core/validation/context.ts";
import { parseEmittedReturn } from "../../../../../../core/validation/emitted-documents.ts";
import { EnvelopeFact } from "../../../../../../core/validation/predicates.ts";
import type { RuleDef } from "../../../../../../core/validation/types.ts";
import { buildMefBundle } from "../../../../2025/mef/builder.ts";
import {
  buildMefSubmissionArchive,
  buildMefTransmissionPackage,
  type MefSubmissionArchive,
} from "../../../../2025/mef/submissions/submission-archive.ts";
import { mefMessageId } from "../../../../2025/mef/submissions/a2a-header.ts";
import { zipEntries } from "../../../../2025/mef/submissions/zip.ts";
import { type FilerIdentity, FilingStatus } from "../../../../2025/mef/types.ts";
import { R0000_RULES } from "./r0000.ts";
import { STATE_RULES } from "./state.ts";
import { T0000_RULES } from "./t0000.ts";
import { X0000_RULES } from "./x0000.ts";

const processingDate = new Date("2026-09-26T10:00:00Z");
const submissionId = "1234562026269abcdefg";
const encoder = new TextEncoder();

function filer(): FilerIdentity {
  return {
    primarySSN: "123456789",
    nameLine1: "TEST TAXPAYER",
    firstName: "Test",
    nameControl: "TAXP",
    firstNameWithInitial: "Test",
    lastName: "Taxpayer",
    fullName: "Test Taxpayer",
    address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
    filingStatus: FilingStatus.Single,
    softwareId: "12345678",
    originator: { efin: "123456", originatorType: "ERO" },
  };
}

async function archive(): Promise<MefSubmissionArchive> {
  const identity = filer();
  const bundle = await buildMefBundle({
    f1040: { filing_status: "single", digital_assets: false },
  }, { filer: identity, attachments: [] });
  return buildMefSubmissionArchive(bundle, {
    filer: identity,
    submissionId,
    processingDate,
    residencyReview: {
      tax_year: 2025,
      taxpayer: {
        tin: "123456789",
        tax_status: "full_year_us_citizen",
        status_source_reference: "reviewed-2025-citizenship-record",
        reviewer_reference: "reviewer-2026-04-01",
        reviewed_on: "2026-04-01",
      },
    },
  });
}

type Facts = Partial<Record<EnvelopeFact, unknown>>;

function context(xml: string, facts: Facts) {
  return createReturnContext(
    {},
    {
      primarySSN: "123456789",
      filingStatus: 1,
      returnVersion: "2025v5.4",
      ...facts,
    },
    new Map(),
    new Map(),
    parseEmittedReturn(xml),
  );
}

const rules: readonly RuleDef[] = [
  ...R0000_RULES,
  ...X0000_RULES,
  ...T0000_RULES,
  ...STATE_RULES,
];

function failing(xml: string, facts: Facts): string[] {
  const ctx = context(xml, facts);
  return rules.filter((r) => !r.check(ctx))
    .map((r) => r.ruleNumber);
}

const stateManifest = (fields: Record<string, string>) =>
  `<StateSubmissionManifest>${
    Object.entries(fields).map(([k, v]) => `<${k}>${v}</${k}>`).join("")
  }</StateSubmissionManifest>`;

test("a built submission and its transmission pass every envelope rule", async () => {
  const submitted = await archive();
  const transmission = buildMefTransmissionPackage([{ archive: submitted }]);
  const facts: Facts = {
    [EnvelopeFact.SubmissionZip]: submitted.bytes,
    [EnvelopeFact.TransmissionZip]: transmission.containerZipBytes,
    [EnvelopeFact.TransmissionSubmissionIds]: [submissionId],
    [EnvelopeFact.ProcessingDate]: "2026-09-26",
    [EnvelopeFact.MessageId]: mefMessageId("54321", processingDate, "abcdefgh"),
    [EnvelopeFact.TransmitterEtin]: "54321",
    [EnvelopeFact.StateManifests]: [stateManifest({
      SubmissionCategoryCd: "IND",
      GovernmentCd: "TXST",
      IRSSubmissionId: submissionId,
      TaxYr: "2025",
      PrimarySSN: "123456789",
      PrimaryNameControlTxt: "TAXP",
      EFIN: "123456",
    })],
  };
  assertEquals(failing(submitted.bundle.xml, facts), []);
  assertEquals(failing(submitted.bundle.xml, {}), []);
});

test("submission ZIP structure rules reject misnamed, extra and unreadable entries", async () => {
  const submitted = await archive();
  const files = {
    "manifest/manifest.xml": encoder.encode(submitted.manifestXml),
    "xml/submission.xml": encoder.encode(submitted.bundle.xml),
  };
  const fails = (zip: Record<string, Uint8Array>) =>
    failing(submitted.bundle.xml, {
      [EnvelopeFact.SubmissionZip]: zipEntries(zip, true),
    });
  assertEquals(fails(files), []);
  const misnamed = fails({
    "Manifest/manifest.xml": files["manifest/manifest.xml"],
    "xml/submission.xml": files["xml/submission.xml"],
  });
  assertEquals(misnamed.includes("X0000-011"), true);
  assertEquals(misnamed.includes("X0000-018"), true);
  const extra = fails({ ...files, "xml/second.xml": files["xml/submission.xml"] });
  assertEquals(extra.includes("X0000-019"), true);
  const long = `${"a".repeat(61)}.pdf`;
  const attachment = fails({
    ...files,
    [`attachment/${long}`]: encoder.encode("not a pdf"),
  });
  for (const id of ["X0000-012", "X0000-029", "X0000-031", "R0000-057-01"]) {
    assertEquals(attachment.includes(id), true, id);
  }
  assertEquals(
    failing(submitted.bundle.xml, {
      [EnvelopeFact.SubmissionZip]: encoder.encode("PK not a zip"),
    }).includes("X0000-025"),
    true,
  );
});

test("Submission and Message IDs are checked against the manifest and processing day", async () => {
  const submitted = await archive();
  const facts = (overrides: Facts): string[] =>
    failing(submitted.bundle.xml, {
      [EnvelopeFact.SubmissionZip]: submitted.bytes,
      [EnvelopeFact.ProcessingDate]: "2026-09-26",
      ...overrides,
    });
  assertEquals(facts({}), []);
  const nextYear = facts({ [EnvelopeFact.ProcessingDate]: "2027-01-02" });
  assertEquals(nextYear.includes("X0000-027"), true);
  assertEquals(nextYear.includes("T0000-014"), true);
  const duplicate = facts({
    [EnvelopeFact.TransmissionSubmissionIds]: [submissionId, submissionId],
  });
  assertEquals(duplicate.includes("T0000-014"), true);
  const message = facts({
    [EnvelopeFact.MessageId]: "54321202626900000ABC",
    [EnvelopeFact.TransmitterEtin]: "12345",
  });
  for (const id of ["T0000-013", "T0000-015", "T0000-016"]) {
    assertEquals(message.includes(id), true, id);
  }
});

test("state manifests are checked against the linked federal submission", async () => {
  const submitted = await archive();
  const fails = (fields: Record<string, string>) =>
    failing(submitted.bundle.xml, {
      [EnvelopeFact.SubmissionZip]: submitted.bytes,
      [EnvelopeFact.ProcessingDate]: "2026-09-26",
      [EnvelopeFact.StateManifests]: [stateManifest(fields)],
    });
  const linked = {
    SubmissionCategoryCd: "IND",
    GovernmentCd: "TXST",
    IRSSubmissionId: submissionId,
    TaxYr: "2025",
    PrimarySSN: "123456789",
    PrimaryNameControlTxt: "TAXP",
    EFIN: "123456",
  };
  assertEquals(fails(linked), []);
  const wrong = fails({ ...linked, TaxYr: "2024", PrimarySSN: "987654321" });
  assertEquals(wrong.includes("STATE-010"), true);
  assertEquals(wrong.includes("STATE-011"), true);
  const payment = fails({
    ...linked,
    SubmissionCategoryCd: "INDEP",
    TaxYr: "2025",
  });
  assertEquals(payment.includes("STATE-016"), true);
  assertEquals(payment.includes("STATE-017"), true);
  const { IRSSubmissionId: _, ...unlinked } = linked;
  assertEquals(fails(unlinked).includes("STATE-006"), true);
});
