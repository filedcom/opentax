import {
  patronWageCases,
  patronWageFixture,
} from "./form8995a_patron_wages.fixture.ts";
import { groupDividendFixture } from "./form8995a_group_dividend.fixture.ts";
import { groupLossCases } from "./form8995a_group_loss.fixture.ts";

export const patronInvestmentCases = patronWageCases;
export function patronInvestmentFixture(
  c: typeof patronInvestmentCases[number],
) {
  const input = patronWageFixture(c);
  const portfolio = groupDividendFixture(groupLossCases[0]).input;
  const joint = input.general.filing_status === "mfj";
  for (const key of ["f1099int", "f1099div"] as const) {
    input[key] = structuredClone(portfolio[key]);
    for (const [i, row] of input[key].entries()) {
      row.recipient_tin = (joint && i === 1
        ? input.general.spouse_ssn
        : input.general.taxpayer_ssn).replaceAll("-", "");
      row.source_document_reference =
        `Synthetic patron ${c.name} ${row.source_document_reference}`;
    }
  }
  input.schedule_b_part_iii = structuredClone(portfolio.schedule_b_part_iii);
  return input;
}
