import {
  calculateScheduleCAtRiskNet,
  inputSchema as scheduleCInputSchema,
  projectForm8829ScheduleCItems,
  wotcReductionsByBusiness,
} from "../../../inputs/schedule_c/model.ts";

export interface ScheduleCInterestStage {
  readonly businessReference: string;
  readonly line16aMortgageInterest: number;
  readonly line16bOtherInterest: number;
  readonly currentYearBusinessInterestExpense: number;
  // Schedule C lines 12 and 13 are source candidates, not Form 8990 line 11:
  // only amounts actually deducted in tentative taxable income belong there.
  readonly line13DepreciationCandidate: number;
  readonly line12DepletionCandidate: number;
  // Uses the same Schedule C home-office, wage-credit, and at-risk rules as
  // the filed route, assuming all current-year interest is otherwise allowed.
  // This is not return-wide Form 8990 line 6 or a final deductible amount.
  readonly tentativeScheduleCAtRiskNetWithFullInterest: number;
}

/** Source facts available before Schedule C profit, SE tax, and QBI are computed. */
export function stageScheduleCInterest(
  raw: unknown,
): ScheduleCInterestStage {
  const scheduleC = scheduleCInputSchema.parse(raw);
  if (scheduleC.schedule_cs.length !== 1) {
    throw new Error(
      "Form 8990 source stage needs exactly one Schedule C business",
    );
  }
  if ((scheduleC.line16a_interest_mortgage ?? 0) > 0) {
    throw new Error(
      "Form 8990 source stage needs interest linked to the identified Schedule C business",
    );
  }
  const business = projectForm8829ScheduleCItems(scheduleC)[0];
  const businessReference = business.business_reference?.trim();
  if (!businessReference) {
    throw new Error(
      "Form 8990 source stage needs an identified Schedule C business",
    );
  }
  const line16aMortgageInterest = business.line_16a_interest_mortgage ?? 0;
  const line16bOtherInterest = business.line_16b_interest_other ?? 0;
  const currentYearBusinessInterestExpense = line16aMortgageInterest +
    line16bOtherInterest;
  if (currentYearBusinessInterestExpense <= 0) {
    throw new Error(
      "Form 8990 source stage needs positive Schedule C interest",
    );
  }
  const wotcReduction = wotcReductionsByBusiness({
    schedule_cs: [business],
    wotc_wage_reductions: scheduleC.wotc_wage_reductions,
  }).get(businessReference) ?? 0;
  const tentative = calculateScheduleCAtRiskNet(business, wotcReduction);
  return {
    businessReference,
    line16aMortgageInterest,
    line16bOtherInterest,
    currentYearBusinessInterestExpense,
    line13DepreciationCandidate: business.line_13_depreciation ?? 0,
    line12DepletionCandidate: business.line_12_depletion ?? 0,
    tentativeScheduleCAtRiskNetWithFullInterest: tentative.atRiskNet,
  };
}
