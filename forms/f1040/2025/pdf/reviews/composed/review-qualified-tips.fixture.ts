import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { qualifiedTipCases } from "../business/form8995-qualified-tips.fixture.ts";
import type { PdfReviewFixture } from "../../review-fixtures.ts";

// Exact copy inventories from the nine byte-matched, reviewed PDF packets.
const baseForms = [
  "f1040",
  "schedule1",
  "schedule1a",
  "schedule2",
  "schedule_c",
  "schedule_se",
];
const jointForms = [
  "f1040",
  "schedule1",
  "schedule1a",
  "schedule2",
  "schedule_c",
  "schedule_c",
  "schedule_se",
  "schedule_se",
  "form8995",
];
const expectedForms: Record<string, readonly string[]> = {
  "wholly-excluded-qbi": baseForms,
  "positive-business-only": [...baseForms, "form8995"],
  "issued-w2-qbi-binding": [...baseForms, "form8995"],
  "business-tips-25000-cap": [...baseForms, "form8995"],
  "business-tips-magi-phaseout": [...baseForms, "form8995"],
  "mfj-independent-owner-tips": jointForms,
  "mfj-cap-phaseout-owner-allocation": [
    ...jointForms,
    "form8959",
    "form8960",
  ],
  "mfj-employee-business-tip-allocation": [
    ...jointForms,
    "form8959",
    "form8960",
  ],
  "advanced-event-wotc-tip-exclusion": [
    "f1040",
    "schedule1",
    "schedule1a",
    "schedule2",
    "schedule3",
    "schedule_c",
    "schedule_se",
    "f3800",
    "f5884",
    "form6251",
    "form8959",
    "form8960",
    "form8995a",
  ],
};

export function qualifiedTipReviewFixtures(): readonly PdfReviewFixture[] {
  return qualifiedTipCases.map((row) => {
    const inputs = row.inputs();
    const forms = expectedForms[row.id];
    if (!forms) throw new Error(`Unreviewed qualified-tip PDF case ${row.id}`);
    return {
      id: `qualified-tip-qbi-${row.id}`,
      inputs,
      filer: extractFilerIdentity(inputs.general)!,
      expectedPdfForms: forms,
      reviewFocus: [
        "Actual issued tip and trade records reconcile to Schedule 1-A qualified-tip deduction, business profit and self-employment tax",
        "Deducted business tips are excluded from the filed qualified business income source and Form 8995 or 8995-A when applicable",
        `Reviewed ${row.id} full native return and all filled PDF copies retain the sourced owner, tax and deduction amounts`,
      ],
    };
  });
}
