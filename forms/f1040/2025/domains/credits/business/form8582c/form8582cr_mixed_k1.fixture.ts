import {
  passiveK1IncomeCases,
  passiveK1IncomeFixture,
} from "./form8582cr_k1_income.fixture.ts";

export const mixedCreditCases = [
  { id: "fully-allowed", base: 1, nonpassiveCount: 2, nonpassiveCredit: 100 },
  {
    id: "limited-passive",
    base: 2,
    nonpassiveCount: 2,
    nonpassiveCredit: 1000,
  },
  {
    id: "four-income-issuers",
    base: 0,
    nonpassiveCount: 4,
    nonpassiveCredit: 500,
  },
  {
    id: "credit-continuation",
    base: 2,
    nonpassiveCount: 16,
    nonpassiveCredit: 100,
  },
] as const;

export function mixedCreditFixture(c: typeof mixedCreditCases[number]) {
  const base = passiveK1IncomeFixture(passiveK1IncomeCases[c.base]);
  const input = base.input;
  for (let i = 0; i < c.nonpassiveCount; i++) {
    const shared = {
      recipient_tin: "111223333",
      source_document_reference: `2025 nonpassive community K-1 ${i + 1}`,
      new_markets_credit_subject_to_passive_activity_limit: false,
    };
    const ein = String(600000001 + i);
    if (i % 2 === 0) {
      input.k1_partnership.push({
        ...shared,
        partnership_name: `Nonpassive partnership ${i + 1}`,
        partnership_ein: ein,
        box15_code_ad_new_markets_credit: c.nonpassiveCredit + i,
      });
    } else {input.k1_s_corp.push({
        ...shared,
        corporation_name: `Nonpassive corporation ${i + 1}`,
        corporation_ein: ein,
        box13_code_ad_new_markets_credit: c.nonpassiveCredit + i,
      });}
  }
  const nonpassive = c.nonpassiveCount * c.nonpassiveCredit +
    c.nonpassiveCount * (c.nonpassiveCount - 1) / 2;
  return {
    id: `mixed-k1-credit-${c.id}`,
    input,
    expected: {
      ...base.expected,
      nonpassive,
      totalAllowed: base.expected.allowed + nonpassive,
      tax: 17867 - base.expected.allowed - nonpassive,
    },
  };
}
