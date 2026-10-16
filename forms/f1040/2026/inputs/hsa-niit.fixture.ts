import { hsaGraph2026, jointHsaGraph2026 } from "./hsa-graph.fixture.ts";
import { syntheticInvestmentClaim2026 } from "./investment.fixture.ts";
export function hsaNiitGraph2026(
  wages = 300000,
  joint = false,
  funding = false,
) {
  const g = joint ? jointHsaGraph2026() : hsaGraph2026(funding);
  const w = g.w2s[0];
  w.box1_wages = w.box5_medicare_wages = wages;
  w.box3_ss_wages = Math.min(wages, 184500);
  w.box6_medicare_withheld = Math.round(wages * .0145 * 100) / 100;
  const investment_income = syntheticInvestmentClaim2026();
  investment_income.f1099divs = [];
  investment_income.f1099ints[0].recipient_tin = g.general.taxpayer_ssn;
  investment_income.f1099ints[0].box1 = 20000;
  return { ...g, investment_income };
}
