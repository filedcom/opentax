import type { PdfReviewFixture } from "./review-fixtures.ts";
export function ownedScheduleSeInputs(
  single: PdfReviewFixture,
  joint: PdfReviewFixture,
  profits: number[],
  wageOwners: ("T" | "S")[],
) {
  const base = (single.inputs.schedule_c as Record<string, unknown>[])[0];
  const businesses = profits.map((profit, index) => {
    const row = structuredClone(base);
    for (const key of Object.keys(row)) {
      if (key.startsWith("line_") && typeof row[key] === "number") row[key] = 0;
    }
    return {
      ...row,
      proprietor_recipient: index === 0 ? "T" : "S",
      business_reference: `Owned-${index}`,
      line_c_business_name: `Owner business ${index + 1}`,
      line_d_ein: String(123456789 + index),
      line_1_gross_receipts: Math.max(0, profit),
      line_8_advertising: Math.max(0, -profit),
      line_32_at_risk: "a",
      qbi_no_other_adjustments_confirmed: true,
    };
  });
  const wageBase = (joint.inputs.w2 as Record<string, unknown>[])[0];
  return {
    general: {
      ...structuredClone(joint.inputs.general as Record<string, unknown>),
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    schedule_c: businesses,
    ...(wageOwners.length
      ? {
        w2: wageOwners.map((owner, index) => ({
          ...wageBase,
          employee_ssn: owner === "T" ? "111223333" : "444556666",
          source_document_reference: `Owned-W2-${index}`,
          box1_wages: 176100,
          box3_ss_wages: 176100,
          box4_ss_withheld: 10918.20,
          box5_medicare_wages: 176100,
          box6_medicare_withheld: 2553.45,
          box2_fed_withheld: 30000,
        })),
      }
      : {}),
  };
}

export function ownedScheduleSeReviewFixture(
  single: PdfReviewFixture,
  joint: PdfReviewFixture,
): PdfReviewFixture {
  return {
    id: "joint-owned-se-two-businesses-spouse-wage-cap",
    inputs: ownedScheduleSeInputs(single, joint, [60000, 40000], ["S"]),
    filer: joint.filer,
    reviewFocus: [
      "Separate owner Social Security wage caps and two ScheduleSE copies",
      "Owner-attributable half-SE deductions and ordinary Form8995 rows",
      "Full source/native/PDF and1040 totals",
    ],
    expectedPdfForms: [
      "f1040",
      "schedule1",
      "schedule2",
      "schedule_c",
      "schedule_c",
      "schedule_se",
      "schedule_se",
      "form8995",
      "form8959",
      "form8960",
    ],
  };
}
