import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import {
  aggregationPhaseInCases,
  aggregationPhaseInFixture,
} from "./form8995a_aggregation_phasein_fixture.ts";
import {
  jointRpeCases,
  jointRpeFixture,
} from "./form8995a_joint_rpe_fixture.ts";
const statuses = [
  { status: "hoh", fixture: "hoh-w2-nonclaimed-custodial-release-child" },
  { status: "qss", fixture: "qss-w2-nonclaimed-joint-return-child" },
  { status: "mfs", fixture: "mfs-primary-form8995a-accounting-sstb-phasein" },
] as const;
export const aggregationStatusCases = statuses.flatMap((s) =>
  (["direct", "rpe"] as const).flatMap((kind) =>
    ([3, 4] as const).map((count) => ({
      ...s,
      kind,
      count,
      name: `${s.status}-${kind}-${count}`,
    }))
  )
);
export async function aggregationStatusFixture(
  c: typeof aggregationStatusCases[number],
) {
  const status = pdfReviewFixtures.find((f) => f.id === c.fixture)!;
  const input = c.kind === "direct"
    ? aggregationPhaseInFixture(
      aggregationPhaseInCases.find((f) => !f.joint && f.count === c.count)!,
    ).input
    : await jointRpeFixture(
      jointRpeCases.find((f) => f.count === c.count && f.owner === "T")!,
    );
  // Keep issuer identity untouched; only the return's actual filing facts change.
  const originalGeneral = structuredClone(input.general);
  input.general = {
    ...(status.inputs.general as Record<string, unknown>),
    taxpayer_first_name: originalGeneral.taxpayer_first_name,
    taxpayer_last_name: originalGeneral.taxpayer_last_name,
    taxpayer_ssn: originalGeneral.taxpayer_ssn,
    taxpayer_dob: originalGeneral.taxpayer_dob,
    digital_assets: false,
    qbi_no_prior_loss_or_suspended_loss_confirmed: true,
    qbi_not_patron_of_specified_cooperative_confirmed: true,
  };
  if (c.kind === "rpe") {
    input.w2[0].box1_wages = 90000;
    Object.assign(input.w2[0], {
      box3_ss_wages: 90000,
      box4_ss_withheld: 5580,
      box5_medicare_wages: 90000,
      box6_medicare_withheld: 1305,
    });
  }
  if (c.status === "mfs") {
    // The existing reviewed separate-property contract applies to the whole group.
    const review = (status.inputs.schedule_c as Record<string, any>[])[0]
      .qbi_sstb_filing_review.mfs_filing_review;
    input.qbi_aggregation.aggregation_mfs_review = {
      ...structuredClone(review),
      primary_separate_earnings_record_reference:
        `Synthetic ${c.name} separately owned business and wage records`,
      owner_ssn: originalGeneral.taxpayer_ssn.replaceAll("-", ""),
    };
  }
  return input;
}
