import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f3800 } from "../f3800/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// ─── TY2025 Constants (IRC §51) ───────────────────────────────────────────────

// Target group codes per IRS Form 5884 instructions
export enum TargetGroup {
  // Group 1: IV-A recipients (TANF)
  TanfRecipient = "1",
  // Group 2: Veterans (food stamp recipient)
  VeteranFoodStamp = "2",
  // Group 3: Ex-felons
  ExFelon = "3",
  // Group 4: Designated community residents (SNAP recipient, 18-39)
  DesignatedCommunityResident = "4",
  // Group 5: Vocational rehabilitation referral
  VocationalRehabilitation = "5",
  // Group 6: Summer youth employee (16-17, in empowerment zone)
  SummerYouth = "6",
  // Group 7: SNAP recipients (food stamps, 18-39)
  SnapRecipient = "7",
  // Group 8: SSI recipients
  SsiRecipient = "8",
  // Group 9: Long-term family assistance recipient (LTFA)
  LongTermFamilyAssistance = "9",
  // Group 10: Qualified long-term unemployment recipient
  LongTermUnemployment = "10",
}

export enum VeteranCategory {
  SnapOrShortTermUnemployed = "snap_or_short_term_unemployed",
  DisabledRecentlyDischarged = "disabled_recently_discharged",
  LongTermUnemployed = "long_term_unemployed",
  DisabledLongTermUnemployed = "disabled_long_term_unemployed",
}

// Credit rates per IRC §51(a) and §51(d)(8)
const RATE_LOW_HOURS = 0.25; // 120-399 hours worked
const RATE_HIGH_HOURS = 0.40; // 400+ hours worked
const RATE_LTFA_SECOND_YEAR = 0.50; // Long-term family assistance, year 2

// Wage caps per group (IRC §51(b)(3))
const WAGE_CAP_STANDARD = 6000; // most groups, first-year
const WAGE_CAP_SUMMER_YOUTH = 3000; // group 6 summer youth
const WAGE_CAP_LTFA_FIRST = 10000; // group 9 LTFA, first year
const WAGE_CAP_LTFA_SECOND = 10000; // group 9 LTFA, second year
const WAGE_CAP_VETERAN_DISABLED_1YR = 12000; // disabled veteran 1-year
const WAGE_CAP_VETERAN_LONG_TERM_UNEMPLOYED = 14000;
const WAGE_CAP_VETERAN_DISABLED_LONG_TERM = 24000;

const revocationSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("no_notice_received") }),
  z.object({
    status: z.literal("revoked_for_false_employee_information"),
    notice_received_on: z.string().date(),
    first_year_claimed_wages_last_paid_or_incurred_on: z.string().date()
      .optional(),
    second_year_claimed_wages_last_paid_or_incurred_on: z.string().date()
      .optional(),
    post_notice_wages_excluded_confirmed: z.literal(true),
  }),
]);

const certificationSchema = z.discriminatedUnion("path", [
  z.object({
    path: z.literal("certified_by_start"),
    swa_certification_reference: z.string().trim().min(1),
    certification_received_on: z.string().date(),
    certification_received_before_claim_confirmed: z.literal(true),
    revocation: revocationSchema,
  }),
  z.object({
    path: z.literal("form8850_prescreen"),
    swa_certification_reference: z.string().trim().min(1),
    certification_received_on: z.string().date(),
    certification_received_before_claim_confirmed: z.literal(true),
    revocation: revocationSchema,
    job_offer_on: z.string().date(),
    prescreen_completed_on: z.string().date(),
    form8850_signed_by_applicant_on: z.string().date(),
    form8850_signed_by_employer_on: z.string().date(),
    form8850_submitted_to_swa_on: z.string().date(),
    eta_form: z.enum(["9061", "9062"]),
  }),
]);

const successorEmployerSchema = z.object({
  predecessor_ein: z.string().regex(/^\d{9}$/),
  predecessor_first_workday_on: z.string().date(),
  acquisition_on: z.string().date(),
  substantially_all_business_assets_acquired_confirmed: z.literal(true),
  employee_continued_immediately_confirmed: z.literal(true),
  predecessor_certification_remains_valid_confirmed: z.literal(true),
  predecessor_hours_worked: z.number().nonnegative(),
  predecessor_first_year_qualified_wages: z.number().nonnegative(),
  predecessor_second_year_qualified_wages: z.number().nonnegative().optional(),
  wage_periods_start_at_predecessor_confirmed: z.literal(true),
});

// Per-item schema — one entry per employee
export const itemSchema = z.object({
  employee_reference: z.string().trim().min(1),
  employer_ein: z.string().regex(/^\d{9}$/).optional(),
  target_group: z.nativeEnum(TargetGroup),
  hired_on: z.string().date().refine((date) => date < "2026-01-01", {
    message:
      "Work opportunity credit requires employment beginning before 2026",
  }),
  certification: certificationSchema,
  successor_employer: successorEmployerSchema.optional(),
  qualified_wages_confirmed: z.literal(true),
  not_prior_employee_confirmed: z.literal(true),
  not_related_or_dependent_confirmed: z.literal(true),
  more_than_half_wages_for_trade_or_business_confirmed: z.literal(true),
  excluded_wages_removed_confirmed: z.literal(true),
  // First-year qualified wages (line 1a or 1b, depending on hours)
  first_year_wages: z.number().nonnegative(),
  // Second-year wages (line 1c, only for LTFA)
  second_year_wages: z.number().nonnegative().optional(),
  // Hours worked determine first-year rate and the 120-hour minimum.
  hours_worked: z.number().nonnegative(),
  veteran_category: z.nativeEnum(VeteranCategory).optional(),
  summer_youth_zone_and_service_period_confirmed: z.literal(true).optional(),
  designated_community_resident_location_confirmed: z.literal(true).optional(),
}).superRefine((item, ctx) => {
  const certification = item.certification;
  const revocation = certification.revocation;
  if (revocation.status === "revoked_for_false_employee_information") {
    if (
      revocation.notice_received_on < certification.certification_received_on
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["certification", "revocation", "notice_received_on"],
        message: "Revocation notice cannot precede certification receipt",
      });
    }
    for (
      const [wages, field] of [
        [
          item.first_year_wages,
          "first_year_claimed_wages_last_paid_or_incurred_on",
        ],
        [
          item.second_year_wages ?? 0,
          "second_year_claimed_wages_last_paid_or_incurred_on",
        ],
      ] as const
    ) {
      const lastWageOn = revocation[field];
      if (
        wages > 0 && (!lastWageOn || lastWageOn > revocation.notice_received_on)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["certification", "revocation", field],
          message:
            "Claimed wages must be paid or incurred on or before revocation notice",
        });
      }
      if (
        lastWageOn &&
        (lastWageOn < item.hired_on || !lastWageOn.startsWith("2025-"))
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["certification", "revocation", field],
          message:
            "Claimed wages must be dated in 2025 on or after this employer's hire",
        });
      }
      if (wages === 0 && lastWageOn) {
        ctx.addIssue({
          code: "custom",
          path: ["certification", "revocation", field],
          message: "Do not date wages that are not claimed",
        });
      }
    }
  }
  const firstWorkday = item.successor_employer?.predecessor_first_workday_on ??
    item.hired_on;
  if (
    certification.path === "certified_by_start" &&
    certification.certification_received_on > firstWorkday
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["certification", "certification_received_on"],
      message: "Certification must be received by the first workday",
    });
  }
  if (certification.path === "form8850_prescreen") {
    const deadline = new Date(
      Date.parse(`${firstWorkday}T00:00:00Z`) + 28 * 86_400_000,
    ).toISOString().slice(0, 10);
    for (
      const [field, latest] of [
        ["job_offer_on", firstWorkday],
        ["prescreen_completed_on", certification.job_offer_on],
        [
          "form8850_signed_by_applicant_on",
          certification.form8850_submitted_to_swa_on,
        ],
        [
          "form8850_signed_by_employer_on",
          certification.form8850_submitted_to_swa_on,
        ],
        ["form8850_submitted_to_swa_on", deadline],
      ] as const
    ) {
      if (certification[field] > latest) {
        ctx.addIssue({
          code: "custom",
          path: ["certification", field],
          message: `${field} is later than the permitted date`,
        });
      }
    }
    if (
      certification.certification_received_on <
        certification.form8850_submitted_to_swa_on
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["certification", "certification_received_on"],
        message: "Certification cannot precede the prescreening submission",
      });
    }
  }
  if (item.successor_employer) {
    const successor = item.successor_employer;
    if (
      successor.predecessor_first_workday_on > successor.acquisition_on ||
      successor.acquisition_on > item.hired_on
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["successor_employer", "acquisition_on"],
        message:
          "Successor acquisition must follow the predecessor start and precede successor employment",
      });
    }
    if (
      item.target_group !== TargetGroup.LongTermFamilyAssistance &&
      successor.predecessor_second_year_qualified_wages !== undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["successor_employer", "predecessor_second_year_qualified_wages"],
        message: "Only long-term family assistance has second-year wages",
      });
    }
    const firstStart = new Date(
      `${successor.predecessor_first_workday_on}T00:00:00Z`,
    );
    const anniversary = (years: number) =>
      new Date(Date.UTC(
        firstStart.getUTCFullYear() + years,
        firstStart.getUTCMonth(),
        firstStart.getUTCDate(),
      )).toISOString().slice(0, 10);
    if (item.first_year_wages > 0 && item.hired_on >= anniversary(1)) {
      ctx.addIssue({
        code: "custom",
        path: ["first_year_wages"],
        message:
          "Successor first-year wages cannot begin after the predecessor's first year",
      });
    }
    if ((item.second_year_wages ?? 0) > 0 && item.hired_on >= anniversary(2)) {
      ctx.addIssue({
        code: "custom",
        path: ["second_year_wages"],
        message:
          "Successor second-year wages cannot begin after the predecessor's second year",
      });
    }
  }
  if (
    (item.target_group === TargetGroup.VeteranFoodStamp) !==
      (item.veteran_category !== undefined)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["veteran_category"],
      message: "Veteran credit needs its certified veteran category only",
    });
  }
  if (
    item.target_group === TargetGroup.SummerYouth &&
    item.summer_youth_zone_and_service_period_confirmed !== true
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["summer_youth_zone_and_service_period_confirmed"],
      message: "Summer youth wages need the qualifying zone and service period",
    });
  }
  if (
    item.target_group === TargetGroup.DesignatedCommunityResident &&
    item.designated_community_resident_location_confirmed !== true
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["designated_community_resident_location_confirmed"],
      message: "Community resident wages need the qualifying work location",
    });
  }
  if (
    item.target_group !== TargetGroup.LongTermFamilyAssistance &&
    item.second_year_wages !== undefined
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["second_year_wages"],
      message: "Second-year wages are limited to long-term family assistance",
    });
  }
});

const passThroughCreditSchema = z.object({
  source_type: z.enum([
    "partnership",
    "s_corporation",
    "cooperative",
    "estate",
    "trust",
  ]),
  entity_ein: z.string().regex(/^\d{9}$/),
  source_document_reference: z.string().trim().min(1),
  credit_amount: z.number().int().nonnegative(),
  subject_to_passive_activity_limit: z.boolean(),
});

const controlledGroupSchema = z.object({
  kind: z.enum(["controlled_corporations", "businesses_under_common_control"]),
  group_classification_document_reference: z.string().trim().min(1).max(80),
  taxpayer_member_ein: z.string().regex(/^\d{9}$/),
  members: z.array(z.object({
    ein: z.string().regex(/^\d{9}$/),
    business_name: z.string().trim().min(1).max(75).regex(
      /^([A-Za-z0-9#\-()&'] ?)*[A-Za-z0-9#\-()&']$/,
    ),
  })).min(2),
});

export const inputSchema = z.object({
  f5884s: z.array(itemSchema),
  controlled_group: controlledGroupSchema.optional(),
  pass_through_credits: z.array(passThroughCreditSchema).optional(),
  subject_to_passive_activity_limit: z.boolean(),
}).superRefine((input, ctx) => {
  const group = input.controlled_group;
  const memberEins = new Set(group?.members.map((member) => member.ein));
  if (group) {
    if (memberEins.size !== group.members.length) {
      ctx.addIssue({
        code: "custom",
        path: ["controlled_group", "members"],
        message: "Controlled group member EINs must be distinct",
      });
    }
    if (!memberEins.has(group.taxpayer_member_ein)) {
      ctx.addIssue({
        code: "custom",
        path: ["controlled_group", "taxpayer_member_ein"],
        message: "Taxpayer must be a listed controlled group member",
      });
    }
  }
  if (
    input.f5884s.length === 0 &&
    (input.pass_through_credits?.length ?? 0) === 0
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["f5884s"],
      message: "Form 5884 needs an employer wage or pass-through credit source",
    });
  }
  const references = new Set<string>();
  input.f5884s.forEach((item, index) => {
    if (group && (!item.employer_ein || !memberEins.has(item.employer_ein))) {
      ctx.addIssue({
        code: "custom",
        path: ["f5884s", index, "employer_ein"],
        message: "Controlled group employee needs a listed employer EIN",
      });
    }
    if (!group && item.employer_ein) {
      ctx.addIssue({
        code: "custom",
        path: ["f5884s", index, "employer_ein"],
        message: "Employer EIN is for a controlled group claim only",
      });
    }
    if (references.has(item.employee_reference)) {
      ctx.addIssue({
        code: "custom",
        path: ["f5884s", index, "employee_reference"],
        message: "Work opportunity credit employee is duplicated",
      });
    }
    references.add(item.employee_reference);
  });
  const entities = new Set<string>();
  input.pass_through_credits?.forEach((entry, index) => {
    const id = `${entry.source_type}:${entry.entity_ein}`;
    if (entities.has(id)) {
      ctx.addIssue({
        code: "custom",
        path: ["pass_through_credits", index, "entity_ein"],
        message: "Work opportunity pass-through source is duplicated",
      });
    }
    entities.add(id);
  });
});

type F5884Item = z.infer<typeof itemSchema>;

// Wage cap for an employee entry
function wageCap(item: F5884Item): number {
  if (item.target_group === TargetGroup.SummerYouth) {
    return WAGE_CAP_SUMMER_YOUTH;
  }
  if (item.target_group === TargetGroup.LongTermFamilyAssistance) {
    return WAGE_CAP_LTFA_FIRST;
  }
  if (item.veteran_category === VeteranCategory.DisabledLongTermUnemployed) {
    return WAGE_CAP_VETERAN_DISABLED_LONG_TERM;
  }
  if (item.veteran_category === VeteranCategory.LongTermUnemployed) {
    return WAGE_CAP_VETERAN_LONG_TERM_UNEMPLOYED;
  }
  if (item.veteran_category === VeteranCategory.DisabledRecentlyDischarged) {
    return WAGE_CAP_VETERAN_DISABLED_1YR;
  }
  return WAGE_CAP_STANDARD;
}

// IRC 52(a)-(b): divide the group credit by each member's proportionate
// qualified wages, then distribute whole-dollar rounding remainder once.
function allocateControlledGroupCredit(
  group: z.infer<typeof controlledGroupSchema>,
  rows: readonly {
    item: F5884Item;
    firstYearWages: number;
    secondYearWages: number;
  }[],
  groupCredit: number,
) {
  const wages = group.members.map((member) => ({
    ...member,
    qualified_wages: rows.filter((row) => row.item.employer_ein === member.ein)
      .reduce((sum, row) => sum + row.firstYearWages + row.secondYearWages, 0),
  }));
  const totalWages = wages.reduce(
    (sum, member) => sum + member.qualified_wages,
    0,
  );
  const base = wages.map((member) =>
    totalWages > 0
      ? Math.floor(groupCredit * member.qualified_wages / totalWages)
      : 0
  );
  const residual = groupCredit - base.reduce((sum, value) => sum + value, 0);
  const rank = wages.map((member, index) => ({
    index,
    fraction: totalWages > 0
      ? groupCredit * member.qualified_wages / totalWages - base[index]
      : 0,
    ein: member.ein,
  })).sort((a, b) => b.fraction - a.fraction || a.ein.localeCompare(b.ein));
  const extra = new Set(rank.slice(0, residual).map(({ index }) => index));
  return wages.map((member, index) => ({
    ...member,
    credit_share: base[index] + Number(extra.has(index)),
  }));
}

export function calculateForm5884(input: z.infer<typeof inputSchema>) {
  const rows = input.f5884s.map((item) => {
    const successor = item.successor_employer;
    const totalHours = item.hours_worked +
      (successor?.predecessor_hours_worked ?? 0);
    return {
      item,
      totalHours,
      firstYearWages: totalHours < 120 ? 0 : Math.min(
        item.first_year_wages,
        Math.max(
          0,
          wageCap(item) -
            (successor?.predecessor_first_year_qualified_wages ?? 0),
        ),
      ),
      secondYearWages:
        item.target_group === TargetGroup.LongTermFamilyAssistance &&
          totalHours >= 120
          ? Math.min(
            item.second_year_wages ?? 0,
            Math.max(
              0,
              WAGE_CAP_LTFA_SECOND -
                (successor?.predecessor_second_year_qualified_wages ?? 0),
            ),
          )
          : 0,
    };
  });
  const line1aWages = Math.round(
    rows.filter((row) => row.totalHours >= 120 && row.totalHours < 400).reduce(
      (sum, row) => sum + row.firstYearWages,
      0,
    ),
  );
  const line1bWages = Math.round(
    rows.filter((row) => row.totalHours >= 400)
      .reduce((sum, row) => sum + row.firstYearWages, 0),
  );
  const line1cWages = Math.round(rows.reduce(
    (sum, row) => sum + row.secondYearWages,
    0,
  ));
  const line1aCredit = Math.round(line1aWages * RATE_LOW_HOURS);
  const line1bCredit = Math.round(line1bWages * RATE_HIGH_HOURS);
  const line1cCredit = Math.round(line1cWages * RATE_LTFA_SECOND_YEAR);
  const groupCredit = line1aCredit + line1bCredit + line1cCredit;
  const group = input.controlled_group;
  const controlledGroupShares = group
    ? allocateControlledGroupCredit(group, rows, groupCredit)
    : [];
  const line2 = group
    ? controlledGroupShares.find((member) =>
      member.ein === group.taxpayer_member_ein
    )?.credit_share ?? 0
    : groupCredit;
  const line3 = (input.pass_through_credits ?? []).reduce(
    (sum, entry) => sum + entry.credit_amount,
    0,
  );
  return {
    line1aWages,
    line1aCredit,
    line1bWages,
    line1bCredit,
    line1cWages,
    line1cCredit,
    groupCredit,
    controlledGroupShares,
    line2,
    line3,
    line4: line2 + line3,
  };
}

class F5884Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f5884";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f3800]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    const input = inputSchema.parse(rawInput);
    const lines = calculateForm5884(input);
    const credit = lines.line4;
    if (credit <= 0) return { outputs: [] };
    return {
      outputs: [output(f3800, {
        f5884_credit: {
          credit_amount: credit,
          subject_to_passive_activity_limit:
            (lines.line2 > 0 && input.subject_to_passive_activity_limit) ||
            (input.pass_through_credits ?? []).some((entry) =>
              entry.credit_amount > 0 && entry.subject_to_passive_activity_limit
            ),
        },
      })],
    };
  }
}

export const f5884 = new F5884Node();
