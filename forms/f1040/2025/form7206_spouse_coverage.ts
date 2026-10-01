import type { FilerIdentity } from "../mef/header.ts";
import { FilingStatus as MefFilingStatus } from "../mef/header.ts";
import type { SingleScheduleCPlan } from "../nodes/intermediate/forms/form7206/index.ts";
import { FilingStatus } from "../nodes/types.ts";

const normalizedSsn = (ssn: string) => ssn.replaceAll("-", "");
const normalizedName = (name: string) =>
  name.trim().replace(/\s+/g, " ").toUpperCase();

export function assertForm7206SpouseCoverage(
  plan: SingleScheduleCPlan,
  pending: Record<string, Record<string, unknown>> | undefined,
  filer?: FilerIdentity,
): void {
  if (!plan.premium_months.some((month) => month.covered_person === "spouse")) {
    return;
  }
  const spouse = plan.spouse_identity;
  const general = pending?.general;
  const return1040 = pending?.f1040;
  const expectedName = spouse && normalizedName(spouse.name);
  const expectedSsn = spouse && normalizedSsn(spouse.ssn);
  if (
    !spouse || !general || !return1040 ||
    general.filing_status !== FilingStatus.MFJ ||
    return1040.filing_status !== FilingStatus.MFJ ||
    typeof general.spouse_first_name !== "string" ||
    typeof general.spouse_last_name !== "string" ||
    typeof general.spouse_ssn !== "string" ||
    typeof return1040.spouse_first_name !== "string" ||
    typeof return1040.spouse_last_name !== "string" ||
    typeof return1040.spouse_ssn !== "string" ||
    normalizedName(
        `${general.spouse_first_name} ${general.spouse_last_name}`,
      ) !== expectedName ||
    normalizedName(
        `${return1040.spouse_first_name} ${return1040.spouse_last_name}`,
      ) !== expectedName ||
    normalizedSsn(general.spouse_ssn) !== expectedSsn ||
    normalizedSsn(return1040.spouse_ssn) !== expectedSsn ||
    (filer !== undefined && (
      filer.filingStatus !== MefFilingStatus.MarriedFilingJointly ||
      !filer.spouse ||
      normalizedName(`${filer.spouse.firstName} ${filer.spouse.lastName}`) !==
        expectedName ||
      normalizedSsn(filer.spouse.ssn) !== expectedSsn
    ))
  ) {
    throw new Error(
      "Form 7206 spouse coverage must match the joint return spouse",
    );
  }
}
