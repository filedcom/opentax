import { element, elements } from "../../../mef/xml.ts";
import {
  allocatePassiveActivityLosses,
  inputSchema,
  passiveLossLimit,
} from "../../../nodes/intermediate/forms/form8582/index.ts";
import {
  computePropertyNet,
  inputSchema as scheduleEInputSchema,
} from "../../../nodes/inputs/schedule_e/index.ts";
import {
  calculateForm4835AtRiskNet,
  inputSchema as form4835InputSchema,
} from "../../../nodes/inputs/f4835/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Input = Record<string, unknown>;

// Form 8582 separates active-participation rental activities from all other
// passive activities, then allocates disallowed losses per activity. Never
// infer the Part I split or the worksheets from aggregate totals alone.
const ACTIVITY_AMOUNT_KEYS = [
  "passive_schedule_c",
  "passive_schedule_f",
  "current_income",
  "rental_current_income",
  "current_loss",
  "rental_current_loss",
  "rental_prior_eligible_loss",
  "prior_unallowed",
] as const;

function linkedActivities(context: MefBuildContext): Array<{
  name: string;
  activity_type: "A" | "B";
  property_type: number;
  current_net: number;
  prior_unallowed_operating: number;
  prior_active_participation?: boolean;
  reporting_form: string;
}> {
  const scheduleE = scheduleEInputSchema.parse(
    context.pending?.schedule_e ?? {},
  );
  const properties = scheduleE.schedule_es.filter((item) =>
    (item.activity_type === "A" || item.activity_type === "B") &&
    (computePropertyNet(item) !== 0 ||
      (item.prior_unallowed_passive_operating ?? 0) > 0)
  ).map((item) => ({
    name: item.property_description,
    activity_type: item.activity_type as "A" | "B",
    property_type: item.property_type,
    current_net: computePropertyNet(item),
    prior_unallowed_operating: item.prior_unallowed_passive_operating ?? 0,
    prior_active_participation: item.prior_passive_losses_active_when_incurred,
    reporting_form: "Sch E, line 22",
  }));
  const source = context.pending?.f4835;
  const farms = source === undefined
    ? []
    : form4835InputSchema.parse(source).f4835s
      .map((item) => ({
        item,
        net: calculateForm4835AtRiskNet(item).atRiskNet,
      }))
      .filter(({ item, net }) =>
        net !== 0 || (item.prior_unallowed_passive_operating ?? 0) > 0
      )
      .map(({ item, net }) => ({
        name: item.activity_name,
        activity_type: item.actively_participated === true
          ? "A" as const
          : "B" as const,
        property_type: 5,
        current_net: net,
        prior_unallowed_operating: item.prior_unallowed_passive_operating ?? 0,
        prior_active_participation:
          item.prior_passive_losses_active_when_incurred,
        reporting_form: "4835, line 34c",
      }));
  return [...properties, ...farms];
}

function assertLinkedActivities(
  activities: NonNullable<ReturnType<typeof inputSchema.parse>["activities"]>,
  context: MefBuildContext | undefined,
): void {
  if (!context?.pending) return;
  const expected = linkedActivities(context);
  if (
    expected.length !== activities.length ||
    expected.some((item, index) =>
      item.name !== activities[index].name ||
      item.activity_type !== activities[index].activity_type ||
      item.property_type !== activities[index].property_type ||
      item.current_net !== activities[index].current_net ||
      item.prior_unallowed_operating !==
        activities[index].prior_unallowed_operating ||
      item.prior_active_participation !==
        activities[index].prior_active_participation
    )
  ) {
    throw new Error(
      "Form 8582 activities do not match their Schedule E and Form 4835 sources",
    );
  }
}

function reportingForm(
  context: MefBuildContext | undefined,
  index: number,
): string {
  return context?.pending
    ? linkedActivities(context)[index]?.reporting_form ?? "Sch E, line 22"
    : "Sch E, line 22";
}

function worksheetRatios(amounts: readonly number[]): string[] {
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  if (total <= 0) return [];
  let allocatedUnits = 0;
  return amounts.map((amount, index) => {
    const units = index === amounts.length - 1
      ? 100_000 - allocatedUnits
      : Math.round((amount / total) * 100_000);
    if (units <= 0 || units > 100_000) {
      throw new Error(
        "Form 8582 activity loss ratios cannot be represented at five decimals",
      );
    }
    allocatedUnits += units;
    return (units / 100_000).toFixed(5);
  });
}

function buildOtherPassive(
  input: ReturnType<typeof inputSchema.parse>,
  context: MefBuildContext | undefined,
): string {
  const activities = input.activities ?? [];
  const currentIncome = activities.reduce(
    (sum, activity) => sum + Math.max(0, activity.current_net),
    0,
  );
  const currentLoss = activities.reduce(
    (sum, activity) => sum + Math.max(0, -activity.current_net),
    0,
  );
  const priorLoss = activities.reduce(
    (sum, activity) => sum + activity.prior_unallowed_operating,
    0,
  );
  const totalLoss = currentLoss + priorLoss;
  if (
    activities.length === 0 ||
    new Set(activities.map((activity) => activity.name)).size !==
      activities.length ||
    activities.some((activity) =>
      activity.activity_type !== "B" ||
      activity.property_type === 6 ||
      activity.name.length > 30 ||
      !Number.isSafeInteger(activity.current_net) ||
      !Number.isSafeInteger(activity.prior_unallowed_operating) ||
      (activity.current_net === 0 &&
        activity.prior_unallowed_operating === 0) ||
      activity.prior_unallowed_4797_part1 !== 0 ||
      activity.prior_unallowed_4797_part2 !== 0
    ) ||
    !Number.isSafeInteger(currentIncome) ||
    !Number.isSafeInteger(totalLoss) || totalLoss <= 0 ||
    (input.current_income ?? 0) !== currentIncome ||
    (input.current_loss ?? 0) !== currentLoss ||
    (input.prior_unallowed ?? 0) !== priorLoss ||
    (input.rental_current_income ?? 0) !== 0 ||
    (input.rental_current_loss ?? 0) !== 0 ||
    (input.rental_prior_eligible_loss ?? 0) !== 0 ||
    (input.passive_schedule_c ?? 0) !== 0 ||
    (input.passive_schedule_f ?? 0) !== 0 ||
    input.has_other_passive !== true ||
    input.has_active_rental === true ||
    input.active_participation === true
  ) {
    throw new Error(
      "Form 8582 MeF requires per-activity allocation for this passive-loss pattern",
    );
  }
  assertLinkedActivities(activities, context);
  const limit = passiveLossLimit({
    currentIncome,
    currentLoss,
    priorUnallowed: priorLoss,
    rentalLoss: 0,
    rentalIncome: 0,
    activeParticipation: false,
    filingStatus: input.filing_status,
  });
  const losses = activities.map((activity) =>
    Math.max(0, -activity.current_net) + activity.prior_unallowed_operating
  );
  const allocation = allocatePassiveActivityLosses(
    activities.map((activity) => ({
      currentNet: activity.current_net,
      priorUnallowed: activity.prior_unallowed_operating,
      specialEligible: false,
      priorSpecialEligible: false,
    })),
    limit.allowed,
  );
  const lossRows = activities.flatMap((activity, index) =>
    allocation.overallLosses[index] > 0 && limit.suspended > 0
      ? [{ activity, index }]
      : []
  );
  const ratios = worksheetRatios(
    lossRows.map(({ index }) => allocation.overallLosses[index]),
  );
  const overallNet = currentIncome - totalLoss;
  return elements("IRS8582", [
    currentIncome > 0 ? element("OtherActivityIncomeAmt", currentIncome) : "",
    currentLoss > 0 ? element("OtherActivityLossAmt", currentLoss) : "",
    priorLoss > 0 ? element("PriorYearUnallowedOtherLossAmt", priorLoss) : "",
    element("NetOtherActivityAmt", overallNet),
    element("TotalPassiveActivityAmt", overallNet),
    overallNet < 0 ? element("TotalIncomeAmt", currentIncome) : "",
    overallNet < 0 ? element("TotalLossesAllowedAmt", limit.allowed) : "",
    elements("ParentWrkshtPassiveGrp", [
      ...activities.map((activity) =>
        elements("WrkshtPassiveGrp", [
          element("NonParticipateActivityNm", activity.name),
          activity.current_net > 0
            ? element("CurrentYearNetIncomeAmt", activity.current_net)
            : "",
          activity.current_net < 0
            ? element("CurrentYearNetLossAmt", -activity.current_net)
            : "",
          activity.prior_unallowed_operating > 0
            ? element(
              "PriorYearUnallowedLossesAmt",
              activity.prior_unallowed_operating,
            )
            : "",
          activity.current_net > activity.prior_unallowed_operating
            ? element(
              "OverallGainAmt",
              activity.current_net - activity.prior_unallowed_operating,
            )
            : "",
          activity.current_net < activity.prior_unallowed_operating
            ? element(
              "OverallLossAmt",
              activity.prior_unallowed_operating - activity.current_net,
            )
            : "",
        ])
      ),
      currentIncome > 0
        ? element("TotalOtherCurrentYearIncomeAmt", currentIncome)
        : "",
      currentLoss > 0
        ? element("TotalOtherCurrentYearLossAmt", currentLoss)
        : "",
      priorLoss > 0 ? element("TotalOtherPYUnallowedAmt", priorLoss) : "",
    ]),
    limit.suspended > 0
      ? elements("ParentWrkshtLossGrp", [
        ...lossRows.map(({ activity, index }, position) =>
          elements("WrkshtLossGrp", [
            element("UnallowedLossActivityNm", activity.name),
            element("ReportingFormOrScheduleNm", reportingForm(context, index)),
            element("F8582WrkshtLossesAmt", allocation.overallLosses[index]),
            element("LossesPct", ratios[position]),
            element("PriorYearUnallowedLossesAmt", allocation.suspended[index]),
          ])
        ),
        element(
          "TotalAllocationLossAmt",
          allocation.overallLosses.reduce((sum, amount) => sum + amount, 0),
        ),
        element("TotalLossAmt", limit.suspended),
      ])
      : "",
    limit.suspended > 0
      ? elements("ParentWrkshtListActivityGrp", [
        ...lossRows.map(({ activity, index }) =>
          elements("WrkshtListActivityGrp", [
            element("AllowedLossActivityNm", activity.name),
            element("ReportingFormOrScheduleNm", reportingForm(context, index)),
            element("F8582WrkshtLossesAmt", losses[index]),
            element("PriorYearUnallowedLossesAmt", allocation.suspended[index]),
            element("F8582WrkshtAllowedLossesAmt", allocation.allowed[index]),
          ])
        ),
        element(
          "TotalLossAmt",
          lossRows.reduce((sum, row) => sum + losses[row.index], 0),
        ),
        element("TotalUnallowedLossAmt", limit.suspended),
        element(
          "TotalAllowedLossAmt",
          lossRows.reduce((sum, row) => sum + allocation.allowed[row.index], 0),
        ),
      ])
      : "",
  ]);
}

export const form8582: MefFormDescriptor<"form8582", Input> = {
  pendingKey: "form8582",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8582.pdf",
  build(fields, context) {
    const hasActivity =
      (Array.isArray(fields.activities) && fields.activities.length > 0) ||
      ACTIVITY_AMOUNT_KEYS.some((key) =>
        fields[key] !== undefined && fields[key] !== null && fields[key] !== 0
      );
    if (!hasActivity) return "";

    const input = inputSchema.parse(fields);
    const activities = input.activities ?? [];
    if (
      activities.length > 0 &&
      activities.every((activity) => activity.activity_type === "B")
    ) {
      return buildOtherPassive(input, context);
    }
    const currentIncome = activities.reduce(
      (sum, activity) => sum + Math.max(0, activity.current_net),
      0,
    );
    const currentLoss = activities.reduce(
      (sum, activity) => sum + Math.max(0, -activity.current_net),
      0,
    );
    const priorLoss = activities.reduce(
      (sum, activity) => sum + activity.prior_unallowed_operating,
      0,
    );
    const loss = currentLoss + priorLoss;
    const rentalActivities = activities.filter((activity) =>
      activity.activity_type === "A" &&
      (activity.current_net !== 0 ||
        (activity.prior_unallowed_operating > 0 &&
          activity.prior_active_participation === true))
    );
    const otherActivities = [
      ...activities.filter((activity) => activity.activity_type === "B"),
      ...activities.filter((activity) =>
        activity.activity_type === "A" &&
        activity.prior_unallowed_operating > 0 &&
        activity.prior_active_participation === false
      ).map((activity) => ({
        ...activity,
        current_net: 0,
      })),
    ];
    const rentalIncome = rentalActivities.reduce(
      (sum, activity) => sum + Math.max(0, activity.current_net),
      0,
    );
    const rentalCurrentLoss = rentalActivities.reduce(
      (sum, activity) => sum + Math.max(0, -activity.current_net),
      0,
    );
    const rentalPriorLoss = rentalActivities.reduce(
      (sum, activity) =>
        sum +
        (activity.prior_active_participation === true
          ? activity.prior_unallowed_operating
          : 0),
      0,
    );
    const otherIncome = currentIncome - rentalIncome;
    const otherCurrentLoss = currentLoss - rentalCurrentLoss;
    const otherPriorLoss = priorLoss - rentalPriorLoss;
    const rentalNet = rentalIncome - rentalCurrentLoss - rentalPriorLoss;
    const otherNet = otherIncome - otherCurrentLoss - otherPriorLoss;
    const magi = input.modified_agi;
    if (
      activities.length === 0 ||
      new Set(activities.map((activity) => activity.name)).size !==
        activities.length ||
      activities.some((activity) =>
        (activity.activity_type !== "A" && activity.activity_type !== "B") ||
        activity.property_type === 6 ||
        activity.name.length > 30 ||
        !Number.isSafeInteger(activity.current_net) ||
        (activity.current_net === 0 &&
          activity.prior_unallowed_operating === 0) ||
        (activity.activity_type === "A" &&
          activity.prior_unallowed_operating > 0 &&
          activity.prior_active_participation === undefined) ||
        activity.prior_unallowed_4797_part1 !== 0 ||
        activity.prior_unallowed_4797_part2 !== 0
      ) ||
      !Number.isSafeInteger(loss) || loss <= 0 ||
      !Number.isSafeInteger(currentIncome) ||
      (input.current_loss ?? 0) !== currentLoss ||
      (input.rental_current_loss ?? 0) !== rentalCurrentLoss ||
      (input.current_income ?? 0) !== currentIncome ||
      (input.rental_current_income ?? 0) !== rentalIncome ||
      (input.prior_unallowed ?? 0) !== priorLoss ||
      (input.rental_prior_eligible_loss ?? 0) !== rentalPriorLoss ||
      (input.passive_schedule_c ?? 0) !== 0 ||
      (input.passive_schedule_f ?? 0) !== 0 ||
      (input.has_other_passive === true) !== (otherActivities.length > 0) ||
      input.has_active_rental !== true ||
      input.active_participation !== true ||
      input.filing_status === "mfs" ||
      magi === undefined || !Number.isInteger(magi)
    ) {
      throw new Error(
        "Form 8582 MeF requires per-activity allocation for this passive-loss pattern",
      );
    }

    const limit = passiveLossLimit({
      currentIncome,
      currentLoss,
      priorUnallowed: priorLoss,
      rentalLoss: rentalCurrentLoss + rentalPriorLoss,
      rentalIncome,
      activeParticipation: true,
      modifiedAgi: magi,
      filingStatus: input.filing_status,
    });
    const losses = activities.map((activity) =>
      Math.max(0, -activity.current_net) + activity.prior_unallowed_operating
    );
    const allocation = allocatePassiveActivityLosses(
      activities.map((activity) => ({
        currentNet: activity.current_net,
        priorUnallowed: activity.prior_unallowed_operating,
        specialEligible: activity.activity_type === "A",
        priorSpecialEligible: activity.prior_active_participation === true,
      })),
      limit.allowed,
    );
    const {
      allowed: allowedByActivity,
      suspended: suspendedByActivity,
      overallLosses,
      specialEligibleLosses,
      specialByActivity,
      postSpecialLosses,
    } = allocation;

    assertLinkedActivities(activities, context);

    const overallNet = currentIncome - loss;
    const difference = Math.max(0, 150_000 - magi);
    const phasedMaximum = Math.min(25_000, difference * 0.5);
    const specialAllowance = overallNet < 0
      ? Math.max(0, limit.allowed - currentIncome)
      : 0;
    if (
      !Number.isInteger(phasedMaximum) || !Number.isInteger(specialAllowance)
    ) {
      throw new Error(
        "Form 8582 special allowance must reconcile to whole dollars",
      );
    }
    if (
      specialByActivity.reduce((sum, amount) => sum + amount, 0) !==
        specialAllowance
    ) {
      throw new Error(
        "Form 8582 special allowance does not reconcile by activity",
      );
    }
    const allowanceRows = activities.flatMap((activity, index) =>
      activity.activity_type === "A" && specialEligibleLosses[index] > 0
        ? [{ activity, index }]
        : []
    );
    const allowanceRatios = worksheetRatios(
      allowanceRows.map(({ index }) => specialEligibleLosses[index]),
    );
    const suspendedRows = activities.flatMap((activity, index) =>
      postSpecialLosses[index] > 0 && limit.suspended > 0
        ? [{ activity, index }]
        : []
    );
    const suspendedRatios = worksheetRatios(
      suspendedRows.map(({ index }) => postSpecialLosses[index]),
    );
    return elements("IRS8582", [
      rentalIncome > 0 ? element("RentalRealtyIncomeAmt", rentalIncome) : "",
      rentalCurrentLoss > 0
        ? element("RentalRealtyLossAmt", rentalCurrentLoss)
        : "",
      rentalPriorLoss > 0
        ? element("PYUnallowedRentalLossAmt", rentalPriorLoss)
        : "",
      element("NetRentalRealtyAmt", rentalNet),
      otherIncome > 0 ? element("OtherActivityIncomeAmt", otherIncome) : "",
      otherCurrentLoss > 0
        ? element("OtherActivityLossAmt", otherCurrentLoss)
        : "",
      otherPriorLoss > 0
        ? element("PriorYearUnallowedOtherLossAmt", otherPriorLoss)
        : "",
      otherActivities.length > 0
        ? element("NetOtherActivityAmt", otherNet)
        : "",
      element("TotalPassiveActivityAmt", overallNet),
      overallNet < 0 && rentalNet < 0
        ? element("RentalRealtyLossLimitAmt", Math.min(-rentalNet, -overallNet))
        : "",
      overallNet < 0 && rentalNet < 0
        ? element("MaximumAllowedIncomeAmt", 150_000)
        : "",
      overallNet < 0 && rentalNet < 0 ? element("ModifiedAGIAmt", magi) : "",
      overallNet < 0 && rentalNet < 0
        ? element("ModifiedAGIDifferenceAmt", difference)
        : "",
      overallNet < 0 && rentalNet < 0
        ? element("PercentNetSpecialAllowanceAmt", phasedMaximum)
        : "",
      overallNet < 0 && rentalNet < 0
        ? element("AllowedRentalRealtyLossAmt", specialAllowance)
        : "",
      overallNet < 0 ? element("TotalIncomeAmt", currentIncome) : "",
      overallNet < 0 ? element("TotalLossesAllowedAmt", limit.allowed) : "",
      elements("ParentWrkshtRentalActGrp", [
        ...rentalActivities.map((activity) =>
          elements("WrkshtRentalActGrp", [
            element("PassiveActivityNm", activity.name),
            activity.current_net > 0
              ? element("CurrentYearNetIncomeAmt", activity.current_net)
              : "",
            activity.current_net < 0
              ? element("CurrentYearNetLossAmt", -activity.current_net)
              : "",
            activity.prior_unallowed_operating > 0 &&
              activity.prior_active_participation === true
              ? element(
                "PriorYearRentalUnallowedAmt",
                activity.prior_unallowed_operating,
              )
              : "",
            activity.current_net >
                (activity.prior_active_participation === true
                  ? activity.prior_unallowed_operating
                  : 0)
              ? element(
                "OverallGainAmt",
                activity.current_net -
                  (activity.prior_active_participation === true
                    ? activity.prior_unallowed_operating
                    : 0),
              )
              : "",
            activity.current_net <
                (activity.prior_active_participation === true
                  ? activity.prior_unallowed_operating
                  : 0)
              ? element(
                "OverallLossAmt",
                (activity.prior_active_participation === true
                  ? activity.prior_unallowed_operating
                  : 0) - activity.current_net,
              )
              : "",
          ])
        ),
        rentalIncome > 0
          ? element("TotalCurrentYearNetIncomeAmt", rentalIncome)
          : "",
        rentalCurrentLoss > 0
          ? element("TotalCurrentYearNetLossAmt", rentalCurrentLoss)
          : "",
        rentalPriorLoss > 0
          ? element("TotalPriorYrRentalUnallowedAmt", rentalPriorLoss)
          : "",
      ]),
      otherActivities.length > 0
        ? elements("ParentWrkshtPassiveGrp", [
          ...otherActivities.map((activity) =>
            elements("WrkshtPassiveGrp", [
              element("NonParticipateActivityNm", activity.name),
              activity.current_net > 0
                ? element("CurrentYearNetIncomeAmt", activity.current_net)
                : "",
              activity.current_net < 0
                ? element("CurrentYearNetLossAmt", -activity.current_net)
                : "",
              activity.prior_unallowed_operating > 0
                ? element(
                  "PriorYearUnallowedLossesAmt",
                  activity.prior_unallowed_operating,
                )
                : "",
              activity.current_net > activity.prior_unallowed_operating
                ? element(
                  "OverallGainAmt",
                  activity.current_net - activity.prior_unallowed_operating,
                )
                : "",
              activity.current_net < activity.prior_unallowed_operating
                ? element(
                  "OverallLossAmt",
                  activity.prior_unallowed_operating - activity.current_net,
                )
                : "",
            ])
          ),
          otherIncome > 0
            ? element("TotalOtherCurrentYearIncomeAmt", otherIncome)
            : "",
          otherCurrentLoss > 0
            ? element("TotalOtherCurrentYearLossAmt", otherCurrentLoss)
            : "",
          otherPriorLoss > 0
            ? element("TotalOtherPYUnallowedAmt", otherPriorLoss)
            : "",
        ])
        : "",
      specialAllowance > 0
        ? elements("ParentWrkshtAllowanceGrp", [
          ...allowanceRows.map(({ activity, index }, position) =>
            elements("WrkshtAllowanceGrp", [
              element("SpecialAllowanceActivityNm", activity.name),
              element(
                "ReportingFormOrScheduleNm",
                reportingForm(context, index),
              ),
              element("F8582WrkshtLossesAmt", specialEligibleLosses[index]),
              element("LossesPct", allowanceRatios[position]),
              element("SpecialAllowanceAmt", specialByActivity[index]),
              element(
                "NetSpecialAllowanceAmt",
                specialEligibleLosses[index] - specialByActivity[index],
              ),
            ])
          ),
          element(
            "TotalLossAmt",
            allowanceRows.reduce(
              (sum, row) => sum + specialEligibleLosses[row.index],
              0,
            ),
          ),
          element("TotalSpecialAllowanceAmt", specialAllowance),
          element(
            "TotalNetSpecialAllowanceAmt",
            allowanceRows.reduce(
              (sum, row) =>
                sum + specialEligibleLosses[row.index] -
                specialByActivity[row.index],
              0,
            ),
          ),
        ])
        : "",
      limit.suspended > 0
        ? elements("ParentWrkshtLossGrp", [
          ...suspendedRows.map(({ activity, index }, position) =>
            elements("WrkshtLossGrp", [
              element("UnallowedLossActivityNm", activity.name),
              element(
                "ReportingFormOrScheduleNm",
                reportingForm(context, index),
              ),
              element("F8582WrkshtLossesAmt", postSpecialLosses[index]),
              element("LossesPct", suspendedRatios[position]),
              element(
                "PriorYearUnallowedLossesAmt",
                suspendedByActivity[index],
              ),
            ])
          ),
          element(
            "TotalAllocationLossAmt",
            postSpecialLosses.reduce((sum, amount) => sum + amount, 0),
          ),
          element("TotalLossAmt", limit.suspended),
        ])
        : "",
      limit.suspended > 0
        ? elements("ParentWrkshtListActivityGrp", [
          ...suspendedRows.map(({ activity, index }) =>
            elements("WrkshtListActivityGrp", [
              element("AllowedLossActivityNm", activity.name),
              element(
                "ReportingFormOrScheduleNm",
                reportingForm(context, index),
              ),
              element("F8582WrkshtLossesAmt", losses[index]),
              element(
                "PriorYearUnallowedLossesAmt",
                suspendedByActivity[index],
              ),
              element("F8582WrkshtAllowedLossesAmt", allowedByActivity[index]),
            ])
          ),
          element(
            "TotalLossAmt",
            suspendedRows.reduce((sum, row) => sum + losses[row.index], 0),
          ),
          element("TotalUnallowedLossAmt", limit.suspended),
          element(
            "TotalAllowedLossAmt",
            suspendedRows.reduce(
              (sum, row) => sum + allowedByActivity[row.index],
              0,
            ),
          ),
        ])
        : "",
    ]);
  },
};
