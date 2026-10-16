import { syntheticForm4137_2026 } from "../inputs/form4137.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
export function syntheticForm4137Continuation2026() {
  const input = syntheticForm4137_2026();
  input.filing_status = FilingStatus.MFJ;
  input.spouse_ssn = "222334444";
  input.w2_tip_sources![0].ss_wages_and_tips = 184_000;
  const primary = input.forms![0];
  primary.below_20_tip_months = [{
    employer_index: 1,
    month: 2,
    tips_received: 19,
    tips_reported: 0,
  }];
  for (let index = 1; index <= 5; index++) {
    const employer = structuredClone(primary.employers[0]);
    employer.name = `Cafe ${index + 1}`;
    employer.ein = `98000000${index}`;
    employer.tip_records_reference = `tip-diary-${index}`;
    employer.tips_received = 22_000.49;
    employer.tips_reported = 19_999.51;
    const review = employer.qualification_review!;
    review.source_document_reference = `w2-${index}`;
    review.employer_ein = employer.ein;
    review.excluded_cash_tips = 2000.49;
    input.w2_tip_sources!.push({
      ...input.w2_tip_sources![0],
      employer_name: employer.name,
      employer_ein: employer.ein,
      source_document_reference: review.source_document_reference,
      ss_wages_and_tips: 0,
    });
    primary.employers.push(employer);
  }
  const spouse = structuredClone(primary);
  spouse.recipient = "spouse";
  spouse.employers = [spouse.employers[0]];
  spouse.below_20_tip_months = undefined;
  spouse.government_employee_review = {
    tips_not_covered_by_social_security: 2000,
    coverage_record_reference: "government-coverage",
  };
  spouse.employers[0].qualification_review!.employee_ssn = input.spouse_ssn;
  spouse.employers[0].qualification_review!.source_document_reference =
    "spouse-w2";
  input.w2_tip_sources!.push({
    ...input.w2_tip_sources![0],
    employee_ssn: input.spouse_ssn,
    source_document_reference: "spouse-w2",
    ss_wages_and_tips: 0,
  });
  input.forms!.push(spouse);
  return input;
}
