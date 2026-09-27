import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f3800 } from "../f3800/index.ts";
import { scheduleC } from "../schedule_c/index.ts";
import { schedule_f } from "../../intermediate/forms/schedule_f/index.ts";
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
    post_notice_wages_excluded_confirmed: z.literal(true),
  }).strict(),
]);

const wageDeductionLocationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("schedule_c"),
    business_reference: z.string().trim().min(1),
  }).strict(),
  z.object({
    kind: z.literal("schedule_f"),
    farm_id: z.string().trim().min(1),
  }).strict(),
  z.object({ kind: z.literal("entity_return") }).strict(),
]);

function wageLocationKey(
  location: z.infer<typeof wageDeductionLocationSchema>,
): string {
  return location.kind === "schedule_c"
    ? `schedule_c:${location.business_reference}`
    : location.kind === "schedule_f"
    ? `schedule_f:${location.farm_id}`
    : "entity_return";
}

const wageRecordSchema = z.object({
  payroll_record_reference: z.string().trim().min(1),
  deduction_location: wageDeductionLocationSchema,
  service_period_start_on: z.string().date(),
  service_period_end_on: z.string().date(),
  paid_or_incurred_on: z.string().date().refine(
    (date) => date.startsWith("2025-"),
    {
      message: "Only wages paid or incurred in tax year 2025 are claimable",
    },
  ),
  qualified_wages: z.number().positive(),
  credited_wages: z.number().nonnegative().optional(),
}).superRefine((record, ctx) => {
  if (
    record.credited_wages !== undefined &&
    record.credited_wages > record.qualified_wages
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["credited_wages"],
      message:
        "Credited wages cannot exceed this payroll row's qualified wages",
    });
  }
});

function anniversary(firstWorkday: string, years: number): string {
  const start = new Date(`${firstWorkday}T00:00:00Z`);
  return new Date(Date.UTC(
    start.getUTCFullYear() + years,
    start.getUTCMonth(),
    start.getUTCDate(),
  )).toISOString().slice(0, 10);
}

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
  // Payroll rows establish tax-year recognition and the year-one/year-two
  // service period before the Form 5884 wage caps are applied.
  wage_records: z.array(wageRecordSchema),
  // Hours worked determine first-year rate and the 120-hour minimum.
  hours_worked: z.number().nonnegative(),
  veteran_category: z.nativeEnum(VeteranCategory).optional(),
  summer_youth_zone_and_service_period_confirmed: z.literal(true).optional(),
  designated_community_resident_location_confirmed: z.literal(true).optional(),
}).strict().superRefine((item, ctx) => {
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
  }
  const firstWorkday = item.successor_employer?.predecessor_first_workday_on ??
    item.hired_on;
  const firstAnniversary = anniversary(firstWorkday, 1);
  const secondAnniversary = anniversary(firstWorkday, 2);
  const payrollReferences = new Set<string>();
  item.wage_records.forEach((record, index) => {
    if (payrollReferences.has(record.payroll_record_reference)) {
      ctx.addIssue({
        code: "custom",
        path: ["wage_records", index, "payroll_record_reference"],
        message: "Payroll record is duplicated for this employee",
      });
    }
    payrollReferences.add(record.payroll_record_reference);
    if (
      record.service_period_start_on > record.service_period_end_on ||
      record.service_period_start_on < item.hired_on
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["wage_records", index, "service_period_start_on"],
        message:
          "Wage service must follow this employer's hire and precede its end date",
      });
    }
    if (
      record.service_period_start_on < firstAnniversary &&
      record.service_period_end_on >= firstAnniversary
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["wage_records", index, "service_period_end_on"],
        message: "Split payroll records at the first-year anniversary",
      });
    }
    if (
      record.service_period_start_on >= secondAnniversary ||
      record.service_period_end_on >= secondAnniversary ||
      (item.target_group !== TargetGroup.LongTermFamilyAssistance &&
        record.service_period_start_on >= firstAnniversary)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["wage_records", index, "service_period_end_on"],
        message: "Wage service is outside the qualifying first or second year",
      });
    }
    if (
      revocation.status === "revoked_for_false_employee_information" &&
      record.paid_or_incurred_on > revocation.notice_received_on
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["wage_records", index, "paid_or_incurred_on"],
        message:
          "Claimed wages cannot be paid or incurred after revocation notice",
      });
    }
  });
  const combinedHours = item.hours_worked +
    (item.successor_employer?.predecessor_hours_worked ?? 0);
  for (
    const [records, cap] of [
      [
        item.wage_records.filter((record) =>
          record.service_period_start_on < firstAnniversary
        ),
        Math.max(
          0,
          wageCap(item) -
            (item.successor_employer
              ?.predecessor_first_year_qualified_wages ?? 0),
        ),
      ],
      [
        item.wage_records.filter((record) =>
          record.service_period_start_on >= firstAnniversary
        ),
        Math.max(
          0,
          WAGE_CAP_LTFA_SECOND -
            (item.successor_employer
              ?.predecessor_second_year_qualified_wages ?? 0),
        ),
      ],
    ] as const
  ) {
    const qualified = records.reduce(
      (sum, record) => sum + record.qualified_wages,
      0,
    );
    const credited = records.filter((record) =>
      record.credited_wages !== undefined
    );
    const mixedLocations = new Set(
      records.map((record) => wageLocationKey(record.deduction_location)),
    ).size > 1;
    if (
      (combinedHours >= 120 && cap > 0 && qualified > cap &&
        mixedLocations && credited.length !== records.length) ||
      (credited.length > 0 && credited.length !== records.length)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["wage_records"],
        message:
          "Every payroll row in a capped wage period needs explicit credited wages when destinations differ",
      });
    }
    if (credited.length > 0 && credited.length === records.length) {
      const expected = combinedHours >= 120 ? Math.min(qualified, cap) : 0;
      const actual = credited.reduce(
        (sum, record) => sum + record.credited_wages!,
        0,
      );
      if (Math.abs(actual - expected) >= 0.005) {
        ctx.addIssue({
          code: "custom",
          path: ["wage_records"],
          message:
            "Credited payroll wages must reconcile to the eligible wage cap",
        });
      }
    }
  }
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
    item.wage_records.forEach((record, recordIndex) => {
      if (
        record.deduction_location.kind === "entity_return" &&
        (!group || item.employer_ein === group.taxpayer_member_ein)
      ) {
        ctx.addIssue({
          code: "custom",
          path: [
            "f5884s",
            index,
            "wage_records",
            recordIndex,
            "deduction_location",
          ],
          message:
            "The Form 1040 employer needs a Schedule C or F wage deduction",
        });
      }
    });
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

function allocateWholeDollars(
  total: number,
  weights: readonly number[],
): number[] {
  const sum = weights.reduce((value, weight) => value + weight, 0);
  if (total === 0 || sum === 0) return weights.map(() => 0);
  const exact = weights.map((weight) => total * weight / sum);
  const shares = exact.map(Math.floor);
  const residual = total - shares.reduce((value, share) => value + share, 0);
  const order = exact.map((value, index) => ({
    index,
    fraction: value - shares[index],
  })).sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const { index } of order.slice(0, residual)) shares[index]++;
  return shares;
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
    const firstAnniversary = anniversary(
      successor?.predecessor_first_workday_on ?? item.hired_on,
      1,
    );
    const firstYearPaid = item.wage_records.filter((record) =>
      record.service_period_start_on < firstAnniversary
    ).reduce((sum, record) => sum + record.qualified_wages, 0);
    const secondYearPaid = item.wage_records.filter((record) =>
      record.service_period_start_on >= firstAnniversary
    ).reduce((sum, record) => sum + record.qualified_wages, 0);
    return {
      item,
      totalHours,
      firstAnniversary,
      firstYearWages: totalHours < 120 ? 0 : Math.min(
        firstYearPaid,
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
            secondYearPaid,
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
  const firstYearDeductionShares = rows.map(() => 0);
  const secondYearDeductionShares = rows.map(() => 0);
  if (group) {
    const shares = allocateWholeDollars(
      line2,
      rows.map((row) =>
        row.item.employer_ein === group.taxpayer_member_ein
          ? row.firstYearWages + row.secondYearWages
          : 0
      ),
    );
    shares.forEach((share, index) => {
      const [first, second] = allocateWholeDollars(share, [
        rows[index].firstYearWages,
        rows[index].secondYearWages,
      ]);
      firstYearDeductionShares[index] = first;
      secondYearDeductionShares[index] = second;
    });
  } else {
    const low = allocateWholeDollars(
      line1aCredit,
      rows.map((row) =>
        row.totalHours >= 120 && row.totalHours < 400 ? row.firstYearWages : 0
      ),
    );
    const high = allocateWholeDollars(
      line1bCredit,
      rows.map((row) => row.totalHours >= 400 ? row.firstYearWages : 0),
    );
    const second = allocateWholeDollars(
      line1cCredit,
      rows.map((row) => row.secondYearWages),
    );
    rows.forEach((_, index) => {
      firstYearDeductionShares[index] = low[index] + high[index];
      secondYearDeductionShares[index] = second[index];
    });
  }
  const deductions = new Map<string, {
    location: F5884Item["wage_records"][number]["deduction_location"];
    credit_amount: number;
  }>();
  const addDeduction = (
    location: F5884Item["wage_records"][number]["deduction_location"],
    share: number,
  ) => {
    if (share === 0) return;
    const key = wageLocationKey(location);
    const existing = deductions.get(key);
    deductions.set(key, {
      location,
      credit_amount: (existing?.credit_amount ?? 0) + share,
    });
  };
  rows.forEach((row, index) => {
    for (
      const [isFirstYear, share] of [
        [true, firstYearDeductionShares[index]],
        [false, secondYearDeductionShares[index]],
      ] as const
    ) {
      const records = row.item.wage_records.filter((record) =>
        (record.service_period_start_on < row.firstAnniversary) === isFirstYear
      );
      allocateWholeDollars(
        share,
        records.map((record) =>
          record.credited_wages ?? record.qualified_wages
        ),
      ).forEach((allocated, recordIndex) =>
        addDeduction(records[recordIndex].deduction_location, allocated)
      );
    }
  });
  const wageDeductionAllocations = [...deductions.values()];
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
    wageDeductionAllocations,
  };
}

class F5884Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f5884";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f3800, scheduleC, schedule_f]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    const input = inputSchema.parse(rawInput);
    const lines = calculateForm5884(input);
    const credit = lines.line4;
    if (credit <= 0) return { outputs: [] };
    const outputs = [output(f3800, {
      f5884_credit: {
        credit_amount: credit,
        subject_to_passive_activity_limit:
          (lines.line2 > 0 && input.subject_to_passive_activity_limit) ||
          (input.pass_through_credits ?? []).some((entry) =>
            entry.credit_amount > 0 && entry.subject_to_passive_activity_limit
          ),
      },
    })];
    for (const allocation of lines.wageDeductionAllocations) {
      if (allocation.location.kind === "schedule_c") {
        outputs.push(output(scheduleC, {
          wotc_wage_reductions: [{
            business_reference: allocation.location.business_reference,
            credit_amount: allocation.credit_amount,
          }],
        }));
      } else if (allocation.location.kind === "schedule_f") {
        outputs.push(output(schedule_f, {
          wotc_wage_reductions: [{
            farm_id: allocation.location.farm_id,
            credit_amount: allocation.credit_amount,
          }],
        }));
      }
    }
    return { outputs };
  }
}

export const f5884 = new F5884Node();
