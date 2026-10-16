import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";

export const patronStatusCases = (["hoh", "qss", "mfs"] as const).flatMap((
  status,
) =>
  ([
    "farm",
    "c-health",
    "income-cap",
    "phase-farm",
    "phase-c-health",
    "phase-income-cap",
    "phase-unbound",
  ] as const)
    .map((kind) => ({ status, kind, name: `${status}-${kind}` }))
);

export function patronStatusFixture(c: typeof patronStatusCases[number]) {
  const input: Record<string, any> = structuredClone(
    pdfReviewFixtures.find((f) => f.id === `single-form8995a-patron-${c.kind}`)!
      .inputs,
  );
  const household = structuredClone(
    pdfReviewFixtures.find((f) =>
      f.id === (
        c.status === "hoh"
          ? "hoh-w2-nonclaimed-custodial-release-child"
          : c.status === "qss"
          ? "qss-w2-nonclaimed-joint-return-child"
          : "mfs-primary-form8995a-accounting-sstb-phasein"
      )
    )!.inputs,
  );
  input.general = {
    ...household.general as Record<string, unknown>,
    taxpayer_first_name: input.general.taxpayer_first_name,
    taxpayer_last_name: input.general.taxpayer_last_name,
    taxpayer_ssn: input.general.taxpayer_ssn,
    taxpayer_dob: input.general.taxpayer_dob,
    digital_assets: false,
    qbi_no_prior_loss_or_suspended_loss_confirmed: true,
  };
  delete input.general.qbi_not_patron_of_specified_cooperative_confirmed;
  if (c.status === "mfs") {
    // The existing domicile review establishes separate property independently
    // of mailing address; bind its earnings reference to these patron records.
    const business = (household.schedule_c as any[])[0];
    input.qbi_patron.mfs_filing_review = structuredClone(
      business.qbi_sstb_filing_review.mfs_filing_review,
    );
    input.qbi_patron.mfs_filing_review
      .primary_separate_earnings_record_reference =
        `Synthetic ${c.kind} business books and cooperative separate-income records`;
  }
  if (input.form7206) {
    for (const month of input.form7206.single_schedule_c_plan.premium_months) {
      month.employer_plan_review_reference =
        "Synthetic review: taxpayer and spouse, if applicable, have no subsidized employer plan eligibility";
    }
  }
  return input;
}
