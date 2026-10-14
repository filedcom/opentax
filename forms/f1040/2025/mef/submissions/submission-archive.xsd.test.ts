import { assertEquals } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { buildMefBundle } from "../builder.ts";
import { buildMefSubmissionArchive } from "./submission-archive.ts";

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/Common/efileAttachments.xsd",
  import.meta.url,
).pathname;
const filer: FilerIdentity = {
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  firstNameWithInitial: "Test",
  lastName: "Taxpayer",
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

let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // IRS schema bundle is local-only.
}

Deno.test({
  name: "XSD: TY2025 IRS submission manifest validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const bundle = await buildMefBundle({
    f1040: { filing_status: "single", digital_assets: false },
  }, { filer, attachments: [] });
  const submission = await buildMefSubmissionArchive(bundle, {
    filer,
    submissionId: "1234562026269abcdefg",
    processingDate: new Date("2026-09-26T10:00:00Z"),
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
  const tmpPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(tmpPath, submission.manifestXml);
    const command = new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, tmpPath],
      stdout: "piped",
      stderr: "piped",
    });
    const output = await command.output();
    assertEquals(output.code, 0, new TextDecoder().decode(output.stderr));
  } finally {
    await Deno.remove(tmpPath);
  }
});
