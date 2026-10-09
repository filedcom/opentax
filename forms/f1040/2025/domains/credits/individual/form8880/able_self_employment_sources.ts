import { z } from "zod";
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { ableContributionReviewSchema } from "../../../../../nodes/intermediate/forms/credits/individual/form8880/able_contribution_review.ts";
import { AbleBusinessKind } from "../../../../../nodes/intermediate/forms/credits/individual/form8880/able_employment_review.ts";
import {
  computeNetProfit as cProfit,
  itemSchema as cSchema,
} from "../../../../../nodes/inputs/income/business/schedule_c/model.ts";
import {
  computeNetProfit as fProfit,
  inputSchema as fSchema,
} from "../../../../../nodes/intermediate/forms/income/business/schedule_f/model.ts";
import { w2ItemSchema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import {
  filedOwnedScheduleC,
  filedOwnedScheduleF,
} from "../../../../../nodes/owned-business-filing.ts";
import { scheduleSELines } from "../../../../../nodes/intermediate/forms/taxes/self-employment/schedule_se/calculation.ts";
import { CONFIG_BY_YEAR } from "../../../../../nodes/config/index.ts";
import { TS } from "../../../../../nodes/types.ts";

/** Match reviewed section219 compensation to each proprietor's complete C/F source inventory. */
export function assertAbleSelfEmploymentSources(
  review: z.infer<typeof ableContributionReviewSchema>,
  rawGeneral: unknown,
  rawWages: unknown,
  rawBusinesses: unknown,
  rawFarms: unknown,
): void {
  if (
    !review.accounts.some((a) => a.employed_beneficiary_review?.self_employment)
  ) return;
  const general = generalSchema.pick({ taxpayer_ssn: true, spouse_ssn: true })
    .parse(rawGeneral);
  const wages = z.array(w2ItemSchema).parse(rawWages ?? []);
  const businesses = z.array(cSchema).parse(rawBusinesses ?? []);
  const farms = fSchema.parse(rawFarms ?? { schedule_fs: [] });
  for (const account of review.accounts) {
    const employment = account.employed_beneficiary_review;
    const source = employment?.self_employment;
    if (!source) continue;
    const ssn = account.form5498qa.beneficiary_ssn;
    const owner = ssn === general.taxpayer_ssn?.replaceAll("-", "")
      ? TS.T
      : TS.S;
    const ownedC = businesses.filter((b) =>
      (b.proprietor_recipient ?? TS.T) === owner
    );
    const ownedF = farms.schedule_fs.filter((b) =>
      (b.proprietor_recipient ?? TS.T) === owner
    );
    const rows = [
      ...ownedC.map((b) => {
        const filed = filedOwnedScheduleC(b);
        if (
          !filed || b.exempt_notary || b.paper_route || b.clergy_schedule_c ||
          b.qbi_wotc_filing_review ||
          b.amt_mining_cost_workpaper || b.amt_long_term_contract_workpaper
        ) {
          throw new Error(
            "ABLE self-employment compensation needs reconciled ordinary proprietor income",
          );
        }
        return {
          kind: AbleBusinessKind.ScheduleC,
          reference: b.business_reference,
          profit: cProfit(b),
          filed: filed.profit,
        };
      }),
      ...ownedF.map((b) => {
        const filed = filedOwnedScheduleF(b);
        if (!filed || farms.farm_optional_method_elected) {
          throw new Error(
            "ABLE self-employment compensation needs reconciled ordinary farm income",
          );
        }
        return {
          kind: AbleBusinessKind.ScheduleF,
          reference: b.farm_id,
          profit: fProfit(b),
          filed: filed.profit,
        };
      }),
    ];
    if (
      rows.length !== source.businesses.length ||
      new Set(rows.map((r) => r.reference)).size !== rows.length
    ) {
      throw new Error("ABLE self-employment business inventory differs");
    }
    for (const row of rows) {
      const matches = source.businesses.filter((b) =>
        b.business_reference === row.reference && b.kind === row.kind
      );
      if (
        matches.length !== 1 || matches[0].owner_ssn !== ssn ||
        Math.round(matches[0].net_profit * 100) !== Math.round(row.profit * 100)
      ) {
        throw new Error(
          "ABLE self-employment owner or net earnings differ from the business source",
        );
      }
    }
    if (
      wages.some((w) =>
        w.employee_ssn?.replaceAll("-", "") === ssn &&
        w.box3_ss_wages === undefined
      )
    ) {
      throw new Error(
        "ABLE self-employment compensation needs sourced W-2 Social Security wages",
      );
    }
    const lines = scheduleSELines({
      net_profit_schedule_c: rows.filter((r) =>
        r.kind === AbleBusinessKind.ScheduleC
      ).reduce((s, r) => s + r.filed, 0),
      net_profit_schedule_f: rows.filter((r) =>
        r.kind === AbleBusinessKind.ScheduleF
      ).reduce((s, r) => s + r.filed, 0),
      w2_ss_wages: wages.filter((w) =>
        w.employee_ssn?.replaceAll("-", "") === ssn
      ).reduce(
        (s, w) => s + ((w.box3_ss_wages ?? 0) + (w.box7_ss_tips ?? 0)),
        0,
      ),
    }, CONFIG_BY_YEAR[2025].ssWageBase);
    if (source.deductible_se_tax !== (lines?.line13 ?? 0)) {
      throw new Error(
        "ABLE compensation deductible SE tax differs from the owned business and wage sources",
      );
    }
  }
}

export function assertAbleSelfEmploymentReturn(
  pending: Readonly<Record<string, unknown>>,
): void {
  const general = generalSchema.pick({
    form8880_able_contribution_review: true,
  }).parse(pending.general ?? {});
  const review = general.form8880_able_contribution_review;
  if (
    !review?.accounts.some((a) =>
      a.employed_beneficiary_review?.self_employment
    )
  ) return;
  // Other SE sources and retirement deductions need their own reviewed compensation allocation.
  if (
    [
      "k1_partnership",
      "f4835",
      "sep_retirement",
      "owned_sep_retirement",
      "form2555",
    ].some((key) => pending[key] !== undefined)
  ) {
    throw new Error(
      "ABLE self-employment compensation needs a complete ordinary C/F and wage inventory",
    );
  }
  const se = z.object({
    unreported_tips_4137: z.number().optional(),
    wages_8919: z.number().optional(),
  }).parse(pending.schedule_se ?? {});
  if ((se.unreported_tips_4137 ?? 0) !== 0 || (se.wages_8919 ?? 0) !== 0) {
    throw new Error(
      "ABLE compensation needs reviewed additional SE wage sources",
    );
  }
  const schedule = z.object({ line16_sep_simple: z.number().optional() }).parse(
    pending.schedule1 ?? {},
  );
  if ((schedule.line16_sep_simple ?? 0) !== 0) {
    throw new Error("ABLE compensation has an unreviewed retirement deduction");
  }
  const c = z.object({ schedule_cs: z.array(cSchema).optional() }).parse(
    pending.schedule_c ?? {},
  );
  const w = z.object({ w2s: z.array(w2ItemSchema).optional() }).parse(
    pending.w2 ?? {},
  );
  assertAbleSelfEmploymentSources(
    review,
    pending.general,
    w.w2s,
    c.schedule_cs,
    pending.schedule_f,
  );
}
