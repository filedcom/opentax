import { pdfReviewFixtures } from "../../../review-fixtures.ts";
import { singleTipInputs } from "../business/form8995-qualified-tips.fixture.ts";

/** Retained issued-copy facts, not external authentication of customer/insurer/farm issuers. */
export function mixedCfTipInputs(
  mode = "full",
  tips = 12000,
  health = true,
  primaryPremium?: number,
): any {
  const fixture = pdfReviewFixtures.find((f) =>
    f.id === `owned-mixed-cf-health-${mode}`
  )!;
  if (!fixture) throw new Error(`Missing actual C/F health base ${mode}`);
  const input: any = structuredClone(fixture.inputs);
  const c = input.schedule_c[0];
  Object.assign(c, {
    line_a_principal_business: "Event food service and catering",
    line_b_business_code: "722320",
    line_c_business_name: "Primary Event Food Service",
  });
  const group = input.f5884?.controlled_group;
  if (group) {
    group.members.find((m: any) => m.ein === c.line_d_ein.replace(/\D/g, ""))
      .business_name = c.line_c_business_name;
  }
  const payer = input.f1099nec.find((n: any) => n.for_routing === "schedule_c");
  payer.payer_name = "Issued event catering customer";
  payer.source_document_reference =
    `2025-issued-event-food-service-NEC-${mode}`;
  if (c.qbi_wotc_filing_review) {
    c.qbi_wotc_filing_review.issued_nec_source_references = [
      payer.source_document_reference,
    ];
  }
  payer.qualified_tips_review = {
    ...singleTipInputs().f1099nec[0].qualified_tips_review,
    amount: tips,
    occupation_review_reference:
      "2025-owned-event-food-service-server-duties-and-eligible-occupation-review",
    tip_records_reference:
      `2025-event-POS-voluntary-customer-tip-ledger-${mode}`,
    no_other_allocable_deductions_review_reference:
      "2025-owned-expense-halfSE-and-established-health-plan-review-no-other-allocable-deductions",
    ...(health
      ? {
        allocable_health_plan_identifiers: input.form7206
          .independent_schedule_c_plans.plans.filter((p: any) =>
            p.business_reference === c.business_reference
          ).map((p: any) => p.plan_identifier),
      }
      : {}),
  };
  input.schedule1a = structuredClone(singleTipInputs().schedule1a);
  for (const prefix of ["taxpayer", "spouse"]) {
    Object.assign(input.general, {
      [`${prefix}_ssn_valid_for_employment`]: true,
      [`${prefix}_ssn_issued_before_due_date`]: true,
      [`${prefix}_tin_issued_by_due_date`]: true,
    });
  }
  if (health && primaryPremium !== undefined) {
    const plan = input.form7206.independent_schedule_c_plans.plans.find((
      p: any,
    ) => p.recipient === "T");
    for (const month of plan.premium_months) {
      month.paid_premium = primaryPremium;
    }
    for (const record of plan.issued_premium_records) {
      record.paid_premium = primaryPremium;
    }
  }
  if (!health) delete input.form7206;
  return input;
}
export const mixedCfTipCases = [
  { id: "mixed-cf-tip-owned-health", inputs: () => mixedCfTipInputs() },
  {
    id: "mixed-cf-tip-health-netincome-limited",
    inputs: () => mixedCfTipInputs("full", 40000, true, 1000),
  },
  {
    id: "mixed-cf-tip-no-health",
    inputs: () => mixedCfTipInputs("full", 40000, false),
  },
  {
    id: "mixed-cf-tip-health-income-limited",
    inputs: () => mixedCfTipInputs("income-limited", 40000),
  },
  {
    id: "mixed-cf-tip-phase-wotc",
    inputs: () => mixedCfTipInputs("phase", 40000),
  },
  {
    id: "mixed-cf-tip-above-zero-wotc",
    inputs: () => mixedCfTipInputs("above-limited-credit", 40000),
  },
  {
    id: "mixed-cf-tip-ordinary-no-credit",
    inputs: () => mixedCfTipInputs("ordinary-no-credit-election"),
  },
];
