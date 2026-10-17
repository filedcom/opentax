/** Offline ATS submission packages: each scenario as the CLI's MeF submission ZIP. */
import * as fs from "node:fs/promises";
import { join } from "node:path";
import {
  exportMefSubmissionCommand,
  type MefSubmissionExport,
} from "../../../../cli/commands/export.ts";
import type { FilingResidencyReview } from "../../2025/mef/submissions/residency-review.ts";
import type { MefPdfAttachment } from "../../2025/mef/form-descriptor.ts";
import { type RetainedDocument, withCliReturn } from "./ats-export.ts";
import type { AtsAssumption } from "./scenario_1040_05_input.ts";
import { FilingStatus } from "../../nodes/types.ts";

export const ATS_SUBMISSION_TRANSMITTER = {
  efin: "123456",
  softwareId: "25000000",
  processingDate: new Date("2026-10-17T15:00:00Z"),
} as const;

export const TY2025_ATS_SUBMISSION_ASSUMPTIONS: readonly AtsAssumption[] = [
  {
    field: "OriginatorGrp/EFIN, IRSSubmissionManifest/EFIN",
    value: ATS_SUBMISSION_TRANSMITTER.efin,
    why:
      "Packets give no EFIN; ATS uses the transmitter's own IRS-issued EFIN, which this repo does not hold.",
  },
  {
    field: "ReturnHeader/SoftwareId",
    value: ATS_SUBMISSION_TRANSMITTER.softwareId,
    why:
      "The IRS assigns the Software ID at ATS registration; none exists here.",
  },
  {
    field: "residency review (each filer)",
    value: "full_year_us_citizen",
    why:
      "Packets file Form 1040 with U.S. addresses and no dual-status or nonresident facts; the export guard needs a reviewed status.",
  },
];

function digits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

/** The reviewed full-year status the submission guard requires, per the assumptions above. */
export function atsResidencyReview(
  inputs: Record<string, unknown>,
): FilingResidencyReview {
  const general = (inputs.general ?? {}) as Record<string, unknown>;
  const person = (tin: string) => ({
    tin,
    tax_status: "full_year_us_citizen" as const,
    status_source_reference: "ats-packet-form-1040-page-1",
    reviewer_reference: "ats-submission-assumption",
    reviewed_on: "2026-10-01",
  });
  return {
    tax_year: 2025,
    taxpayer: person(digits(general.taxpayer_ssn)),
    ...(general.filing_status === FilingStatus.MFJ
      ? { spouse: person(digits(general.spouse_ssn)) }
      : {}),
  };
}

/** Save the scenario as a CLI return, export its submission ZIP, and return its bytes. */
export async function cliSubmission(
  inputs: Record<string, unknown>,
  attachments: readonly MefPdfAttachment[],
  retained: readonly RetainedDocument[],
  sequence: string,
): Promise<{ summary: MefSubmissionExport; bytes: Uint8Array }> {
  return await withCliReturn(
    inputs,
    attachments,
    retained,
    async (returnId, baseDir) => {
      const reviewPath = join(baseDir, returnId, "residency-review.json");
      await fs.writeFile(
        reviewPath,
        JSON.stringify(atsResidencyReview(inputs)),
      );
      const summary = await exportMefSubmissionCommand({
        returnId,
        baseDir,
        efin: ATS_SUBMISSION_TRANSMITTER.efin,
        softwareId: ATS_SUBMISSION_TRANSMITTER.softwareId,
        processingDate: ATS_SUBMISSION_TRANSMITTER.processingDate,
        sequence,
      });
      return {
        summary,
        bytes: new Uint8Array(await fs.readFile(summary.path)),
      };
    },
  );
}
