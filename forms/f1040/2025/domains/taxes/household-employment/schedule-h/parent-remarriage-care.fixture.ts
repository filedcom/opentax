import { inputSchema } from "../../../../../nodes/intermediate/forms/taxes/household-employment/schedule_h/index.ts";
import {
  parentRemarriageCases,
  parentRemarriageInput,
} from "./parent-remarriage.fixture.ts";

// Constructed medical/residence records. Pub.926's 28-day condition is
// quarter-specific; these references do not authenticate a physician's record.
export const parentRemarriageCareCases = [
  { id: "new-spouse-28-days", base: 2, quarters: [2], wages: 4000, tax: 1340 },
  {
    id: "new-spouse-continues",
    base: 2,
    quarters: [2, 3],
    wages: 6000,
    tax: 1646,
  },
  {
    id: "capable-spouse-later-incapacity",
    base: 2,
    quarters: [3],
    wages: 4000,
    tax: 1340,
  },
  {
    id: "new-spouse-full-remainder",
    base: 2,
    quarters: [2, 3, 4],
    wages: 8000,
    tax: 1952,
  },
  {
    id: "new-spouse-irregular-periods",
    base: 4,
    quarters: [2],
    wages: 4000,
    tax: 1340,
  },
  {
    id: "medical-starts-before-marriage",
    base: 2,
    quarters: [2],
    wages: 4000,
    tax: 1340,
  },
] as const;

export function parentRemarriageCareInput(
  c: typeof parentRemarriageCareCases[number],
) {
  const input = parentRemarriageInput(parentRemarriageCases[c.base]);
  const h = input.schedule_h, payroll = h.fica_only_payroll!;
  const employee_wages = payroll.employee_wages.map((worker) => {
    if (worker.relationship !== "parent") return worker;
    const review = worker.parent_fica_review;
    if (review.classification !== "dated_service_periods" || !worker.w2) {
      throw new Error("Expected dated payroll");
    }
    const quarterly_circumstances = review.quarterly_circumstances.map(
      (row) => {
        if (!c.quarters.some((q) => q === row.quarter)) return row;
        const status = row.employer_circumstances;
        const incapable_care_period = {
          from: row.quarter === 2
            ? c.id === "medical-starts-before-marriage"
              ? "2025-05-01"
              : "2025-05-15"
            : row.quarter === 3
            ? "2025-07-01"
            : "2025-10-01",
          to: row.quarter === 2
            ? "2025-06-11"
            : row.quarter === 3
            ? "2025-07-28"
            : "2025-10-28",
          medical_source_reference:
            `${c.id}-q${row.quarter}-physician-care-period`,
        };
        if (status.kind === "remarried_capable_spouse") {
          return {
            ...row,
            employer_circumstances: {
              kind: "remarried_spouse_incapable" as const,
              prior_status: status.prior_status,
              prior_marriage_end_date: status.prior_marriage_end_date,
              prior_marriage_end_source_reference:
                status.prior_marriage_end_source_reference,
              no_remarriage_before_event_source_reference:
                status.no_remarriage_before_event_source_reference,
              remarriage_date: status.remarriage_date,
              marriage_source_reference: status.marriage_source_reference,
              spouse_ssn: status.spouse_ssn,
              spouse_residence_source_reference:
                status.spouse_residence_source_reference,
              living_with_spouse_from_marriage_through_quarter_verified:
                true as const,
              incapable_care_period,
            },
          };
        }
        if (status.kind !== "married_capable_spouse") {
          throw new Error("Expected capable-spouse control");
        }
        return {
          ...row,
          employer_circumstances: {
            kind: "spouse_incapable" as const,
            spouse_ssn: status.spouse_ssn,
            spouse_relationship_source_reference:
              status.spouse_relationship_source_reference,
            spouse_residence_source_reference:
              status.spouse_residence_source_reference,
            living_with_spouse_throughout_quarter_verified: true as const,
            incapable_care_period,
          },
        };
      },
    );
    return {
      ...worker,
      w2: {
        ...worker.w2,
        box3_social_security_wages: c.wages,
        box5_medicare_wages: c.wages,
      },
      parent_fica_review: { ...review, quarterly_circumstances },
    };
  });
  return {
    ...input,
    schedule_h: inputSchema.parse({
      ...h,
      ss_wages: 2800 + c.wages,
      medicare_wages: 2800 + c.wages,
      fica_only_payroll: { ...payroll, employee_wages },
    }),
  };
}
