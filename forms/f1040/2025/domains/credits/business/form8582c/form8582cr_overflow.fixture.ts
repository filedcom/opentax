import { form8582crMixedK1SourceInputs } from "./form8582cr_k1.fixture.ts";

export const passiveInventoryCases = [
  { count: 15, credit: 100 },
  { count: 16, credit: 100 },
  { count: 30, credit: 500 },
  { count: 31, credit: 500 },
  { count: 46, credit: 100 },
] as const;

export function passiveInventoryFixture(c: { count: number; credit: number }) {
  const partnerships = Math.ceil(c.count / 2);
  const corporations = c.count - partnerships;
  const input = structuredClone(form8582crMixedK1SourceInputs(
    Array(partnerships - 1).fill(c.credit),
    Array(corporations - 1).fill(c.credit),
  ));
  input.k1_partnership.forEach((k, i) => {
    k.box15_code_ad_new_markets_credit = c.credit + i;
  });
  input.k1_s_corp.forEach((k, i) => {
    k.box13_code_ad_new_markets_credit = c.credit + partnerships + i;
  });
  input.form8582cr.credit_sources.forEach((s, i) => {
    s.current_year_credit = c.credit + i;
  });
  // Deliberately different ordering: source identity must determine reconciliation.
  input.form8582cr.credit_sources.reverse();
  const total = c.count * c.credit + c.count * (c.count - 1) / 2;
  const allowed = Math.min(total, 4412);
  return {
    id: `passive-inventory-${c.count}-${c.credit}`,
    input,
    expected: { total, allowed, unused: total - allowed, tax: 17867 - allowed },
  };
}
