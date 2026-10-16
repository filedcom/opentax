import { ableGraph2026 } from "./able-graph.fixture.ts";
import { syntheticInvestmentClaim2026 } from "./investment.fixture.ts";
export function ableNiitGraph2026(wages = 300000) {
  const { form8880: _saver, f8812: _child, ...g } = ableGraph2026(true, wages);
  const investment_income = syntheticInvestmentClaim2026();
  investment_income.f1099divs = [];
  investment_income.f1099ints[0].recipient_tin = g.general.taxpayer_ssn;
  investment_income.f1099ints[0].box1 = 20000;
  return { ...g, investment_income };
}
