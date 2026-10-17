import {
  passiveK1IncomeCases,
  passiveK1IncomeFixture,
} from "./form8582cr_k1_income.fixture.ts";

export const separateIncomeCases = [
  {
    id: "partnership-income-corporate-credit",
    base: 2,
    incomeOnly: "partnership",
  },
  {
    id: "corporate-income-partnership-credit",
    base: 2,
    incomeOnly: "s_corporation",
  },
  { id: "four-income-two-credit", base: 0, incomeOnly: "partnership" },
  { id: "separate-income-full-credit", base: 1, incomeOnly: "partnership" },
] as const;

export function separateIncomeFixture(c: typeof separateIncomeCases[number]) {
  const base = passiveK1IncomeFixture(passiveK1IncomeCases[c.base]);
  const input = base.input;
  const key = c.incomeOnly === "partnership" ? "k1_partnership" : "k1_s_corp";
  const creditKey = c.incomeOnly === "partnership"
    ? "box15_code_ad_new_markets_credit"
    : "box13_code_ad_new_markets_credit";
  for (const item of input[key]) {
    delete item[creditKey];
    delete item.new_markets_credit_subject_to_passive_activity_limit;
  }
  input.form8582cr.credit_sources = input.form8582cr.credit_sources.filter(
    (s: any) => s.source_origin.kind !== c.incomeOnly,
  );
  const total = input.form8582cr.credit_sources.reduce(
    (sum: number, s: any) => sum + s.current_year_credit,
    0,
  );
  const allowed = Math.min(total, 4412);
  return {
    id: `separate-k1-income-${c.id}`,
    input,
    expected: { total, allowed, unused: total - allowed, tax: 17867 - allowed },
  };
}
