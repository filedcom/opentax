import { z } from "zod";
import { contributionInputs } from "./form8815_contributions.fixture.ts";
import { royaltyDebtInputs } from "../../../deductions/investments/form4952/form4952_royalty_debt.fixture.ts";
import { inputSchema as interestSchema } from "../../../../../nodes/inputs/income/investments/f1099int/index.ts";
import { inputSchema as bondSchema } from "../../../../../nodes/intermediate/forms/income/investments/form8815/index.ts";

// Independently worked IRS 8815 line 9 step 6: royalty 3,000; bond interest 2,000.
export const royaltyBondCases = [
  {
    id: "positive-royalty",
    wages: 70000,
    paid: 500,
    bank: 0,
    mixed: false,
    dummy: 500,
    magi: 74500,
    exclusion: 2000,
    actual: 500,
    agi: 72500,
    tax: 7405,
  },
  {
    id: "fully-excluded-limited",
    wages: 70000,
    paid: 6000,
    bank: 0,
    mixed: false,
    dummy: 5000,
    magi: 70000,
    exclusion: 2000,
    actual: 3000,
    agi: 70000,
    tax: 6855,
  },
  {
    id: "qtp-phaseout-limited",
    wages: 100000,
    paid: 6000,
    bank: 0,
    mixed: false,
    dummy: 5000,
    magi: 100000,
    exclusion: 1934,
    actual: 3066,
    agi: 100000,
    tax: 13455,
  },
  {
    id: "coverdell-mixed-interest",
    wages: 100000,
    paid: 7000,
    bank: 1000,
    mixed: true,
    dummy: 6000,
    magi: 100000,
    exclusion: 967,
    actual: 5033,
    agi: 100000,
    tax: 13455,
  },
];
export function royaltyBondInputs(entry: typeof royaltyBondCases[number]) {
  const base = contributionInputs(
    entry.mixed ? "mixed-single-phaseout" : "qtp-self",
  );
  const debt = royaltyDebtInputs(entry.paid, entry.bank ? [400, 600] : []);
  const bondInterest =
    z.object({ f1099int: interestSchema.shape.f1099ints }).parse(base).f1099int;
  const trace = debt.form4952.royalty_debt_trace;
  const bond = bondSchema.parse({
    ...base.form8815,
    bond_interest_source_references: ["bond-copy"],
    education_contributions: {
      ...base.form8815.education_contributions,
      coverdell_beneficiaries: base.form8815.education_contributions!
        .coverdell_beneficiaries.map((row) => ({
          ...row,
          other_2025_contributions_all_sources: 0,
        })),
    },
    line9_worksheet: {
      ...base.form8815.line9_worksheet,
      schedule_b_line2_interest: 2000 + entry.bank,
      other_1040_and_schedule1_income: entry.wages + 3000 - entry.dummy,
      no_royalty_interest_special_computation: false,
      royalty_debt_special_computation: {
        debt_trace: trace,
        other_income_before_royalty_interest: entry.wages + 3000,
      },
    },
  });
  return {
    ...base,
    w2: base.w2.map((row) => ({
      ...row,
      box1_wages: entry.wages,
      box2_fed_withheld: 20000,
      box3_ss_wages: entry.wages,
      box4_ss_withheld: entry.wages * .062,
      box5_medicare_wages: entry.wages,
      box6_medicare_withheld: entry.wages * .0145,
    })),
    f1099int: [
      ...bondInterest.map((row) => ({
        ...row,
        recipient_tin: "111223333",
        source_document_reference: "bond-copy",
        investment_property_for_form4952: true,
      })),
      ...(debt.f1099int ?? []),
    ],
    f1099m: debt.f1099m,
    form4952: debt.form4952,
    form8815: bond,
  };
}
