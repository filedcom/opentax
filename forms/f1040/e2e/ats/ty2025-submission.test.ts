import { expect, test } from "bun:test";
import { unzipSync } from "fflate";
import { ATS_SCENARIO_INPUTS } from "./ty2025-check-replay.ts";
import {
  exportedReturn,
  SUBMISSION_MANIFEST_XSD,
  validateAgainstXsd,
  xsdAvailable,
} from "./ats-export.ts";
import {
  ATS_SUBMISSION_TRANSMITTER,
  cliSubmission,
} from "./ty2025-submission.ts";
import {
  scenarioFiles,
  scenarioModule,
} from "../../../../scripts/testing/ats.ts";
import { MefTestCd } from "../../2025/mef/submissions/submission-manifest.ts";

const schemas = await xsdAvailable() &&
  await xsdAvailable(SUBMISSION_MANIFEST_XSD);
const decoder = new TextDecoder("utf-8", { fatal: true });
// CLI inputs are JSON, so a source copy's raw bytes (Scenario 2's Form 1098
// issuer copy) cannot reach the stored return yet. When the CLI can attach
// those files, this case fails and must move to the full check below.
const CLI_BINARY_INPUT_GAP = new Set(["1040-02"]);

for (
  const [index, [id, factory]] of Object.entries(ATS_SCENARIO_INPUTS).entries()
) {
  test(
    `ATS ${id}: the CLI submission ZIP matches Pub 4164 and the v5.4 schemas`,
    async () => {
      const inputs = await factory() as Record<string, unknown>;
      const { attachments, retained } = await scenarioFiles(
        await scenarioModule(id),
      );
      const returnOnly = await exportedReturn(inputs, attachments, retained)
        .then(
          (built) => ({ built }),
          (error: Error) => ({ error }),
        );
      const sequence = `ats${String(index).padStart(4, "0")}`;
      const submission = cliSubmission(inputs, attachments, retained, sequence);
      if (CLI_BINARY_INPUT_GAP.has(id)) {
        await expect(submission).rejects.toThrow();
        return;
      }
      // Every TY2025 ATS scenario exports, so every one must also package.
      if ("error" in returnOnly) throw returnOnly.error;
      const { summary, bytes } = await submission;
      const submissionId =
        `${ATS_SUBMISSION_TRANSMITTER.efin}2026290${sequence}`;
      expect(summary.submissionId).toBe(submissionId);
      expect(summary.path.endsWith(`/${submissionId}.zip`)).toBe(true);
      expect(summary.testCd).toBe(MefTestCd.Test);
      const entries = unzipSync(bytes);
      expect(Object.keys(entries)).toEqual([...summary.entries]);
      expect(Object.keys(entries).slice(0, 2)).toEqual([
        "manifest/manifest.xml",
        "xml/submission.xml",
      ]);
      // The engine can add its own attachments (Scenario 1's QMID statement).
      for (const attachment of attachments) {
        expect(Object.keys(entries)).toContain(
          `attachment/${attachment.fileName}`,
        );
      }
      expect(
        Object.keys(entries).slice(2).every((name) =>
          name.startsWith("attachment/")
        ),
      ).toBe(true);
      const manifest = decoder.decode(entries["manifest/manifest.xml"]);
      const xml = decoder.decode(entries["xml/submission.xml"]);
      const primarySsn = /<Filer><PrimarySSN>(\d{9})</.exec(xml)?.[1];
      expect(manifest).toContain(
        `<SubmissionId>${submissionId}</SubmissionId>`,
      );
      expect(manifest).toContain(`<TIN>${primarySsn}</TIN>`);
      expect(manifest).toContain(
        "<FederalSubmissionTypeCd>1040</FederalSubmissionTypeCd>",
      );
      expect(xml).toContain(
        `<OriginatorGrp><EFIN>${ATS_SUBMISSION_TRANSMITTER.efin}</EFIN><OriginatorTypeCd>ERO</OriginatorTypeCd>`,
      );
      expect(xml).toContain(
        `<SoftwareId>${ATS_SUBMISSION_TRANSMITTER.softwareId}</SoftwareId>`,
      );
      if (!schemas) return;
      await validateAgainstXsd(
        entries["manifest/manifest.xml"],
        SUBMISSION_MANIFEST_XSD,
      );
      await validateAgainstXsd(entries["xml/submission.xml"]);
    },
    180_000,
  );
}
