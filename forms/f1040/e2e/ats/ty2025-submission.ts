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
  {
    field: "residency review (Scenario 2 spouse)",
    value: "full_year_resident_by_joint_election",
    why:
      "Scenario 2 page 2 says Judy Jones is treated as a U.S. resident by the joint section 6013(g) choice statement; the statement reference stands in for the signed election.",
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
  // A section 6013(g) election (Scenario 2) makes the elected spouse resident.
  const election = general.eic_tax_residency_review as
    | { status?: string; elected_person?: string; status_record_reference?: string }
    | undefined;
  const person = (tin: string, role: "taxpayer" | "spouse") => ({
    tin,
    status_source_reference: "ats-packet-form-1040-page-1",
    reviewer_reference: "ats-submission-assumption",
    reviewed_on: "2026-10-01",
    ...(election?.status === "joint_new_election" &&
        election.elected_person === role
      ? {
        tax_status: "full_year_resident_by_joint_election" as const,
        signed_joint_election_reference: election.status_record_reference ??
          "ats-packet-joint-election",
      }
      : { tax_status: "full_year_us_citizen" as const }),
  });
  return {
    tax_year: 2025,
    taxpayer: person(digits(general.taxpayer_ssn), "taxpayer"),
    ...(general.filing_status === FilingStatus.MFJ
      ? { spouse: person(digits(general.spouse_ssn), "spouse") }
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
