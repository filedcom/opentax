import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import {
  sstbJointOwnerCases,
  sstbJointOwnerFixture,
} from "./form8995a_sstb_joint_owner_fixture.ts";
import {
  sstbStatusCases,
  sstbStatusFixture,
} from "./form8995a_sstb_status_fixture.ts";
import { groupDividendFixture } from "./form8995a_group_dividend_fixture.ts";
import { groupLossCases } from "./form8995a_group_loss_fixture.ts";

export const sstbInvestmentCases = [
  "single-payroll",
  "single-income-cap",
  "mfs-payroll",
  "hoh-owner-only",
  "qss-payroll",
  "primary-partial-payroll",
  "spouse-partial-owner-only",
  "primary-capped-owner-only",
  "spouse-capped-payroll",
] as const;
export function sstbInvestmentFixture(
  name: typeof sstbInvestmentCases[number],
) {
  let input: Record<string, any>;
  const joint = sstbJointOwnerCases.find((c) => c.name === name);
  const household = sstbStatusCases.find((c) => c.name === name);
  if (joint) input = sstbJointOwnerFixture(joint);
  else if (household) input = sstbStatusFixture(household);
  else {input = structuredClone(
      pdfReviewFixtures.find((f) =>
        f.id === (
          name === "mfs-payroll"
            ? "mfs-primary-form8995a-accounting-sstb-phasein"
            : "single-form8995a-accounting-sstb-phasein"
        )
      )!.inputs,
    );}
  const portfolio = groupDividendFixture(groupLossCases[0]).input;
  for (const key of ["f1099int", "f1099div"] as const) {
    input[key] = structuredClone(portfolio[key]);
    for (const [i, row] of input[key].entries()) {
      row.recipient_tin = (joint && i === 1
        ? input.general.spouse_ssn
        : input.general.taxpayer_ssn).replaceAll("-", "");
      row.source_document_reference =
        `Synthetic SSTB ${name} ${row.source_document_reference}`;
    }
  }
  if (name === "single-income-cap") {
    delete input.w2;
    for (const row of input.f1099div) {
      row.box1a = 100000;
      row.box1b = 100000;
    }
  }
  input.schedule_b_part_iii = structuredClone(portfolio.schedule_b_part_iii);
  input.schedule_c[0].qbi_sstb_filing_review
    .qualified_dividends_zero_confirmed = false;
  return input;
}
