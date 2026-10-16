import { eicGraphFixture2026 } from "./nodes/eitc.fixture.ts";
export function excessWithholdingFixture2026(wages = 300000, children = 0) {
  const base = eicGraphFixture2026(wages, children);
  return {
    ...base,
    w2s: [
      {
        ...base.w2s![0],
        tax_year: 2026 as const,
        box1_wages: wages / 2,
        box3_ss_wages: 150000,
        box4_ss_withheld: 9300,
        box5_medicare_wages: 150000,
        box6_medicare_withheld: 2175,
        box2_fed_withheld: 30000,
      },
      {
        ...base.w2s![0],
        tax_year: 2026 as const,
        employer_ein: "120000004",
        source_document_reference: "synthetic-second-w2",
        box1_wages: wages / 2,
        box3_ss_wages: 150000,
        box4_ss_withheld: 9300,
        box5_medicare_wages: 150000,
        box6_medicare_withheld: 2175,
        box2_fed_withheld: 0,
      },
    ],
  };
}
