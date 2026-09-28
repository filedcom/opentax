import { z } from "zod";
import {
  allocateOtherPassivePrior4797,
  allocatePartIXLosses,
  allocatePassiveActivityLosses,
  assertPriorYear8582Evidence,
  form8582,
  inputSchema,
  passiveLossLimit,
} from "./index.ts";
import { FilingStatus } from "../../../types.ts";

const reportingFormSchema = z.enum([
  "schedule_e",
  "form4835",
  "form4797_part1",
  "form4797_part2",
]);

const lineSchema = z.object({
  reporting_form: reportingFormSchema,
  opening_unallowed_loss: z.number().int().nonnegative(),
  current_year_loss: z.number().int().nonnegative(),
  current_same_part_income: z.number().int().nonnegative(),
  allowed_loss: z.number().int().nonnegative(),
  ending_unallowed_loss: z.number().int().nonnegative(),
}).strict().superRefine((line, context) => {
  if (
    line.opening_unallowed_loss + line.current_year_loss !==
      line.allowed_loss + line.ending_unallowed_loss
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Form 8582 ledger line must reconcile opening plus current to allowed plus ending",
    });
  }
});

const activitySchema = z.object({
  activity_id: z.string().trim().min(1).max(64),
  activity_name: z.string().trim().min(1),
  previous_filed_form_8582_reference: z.string().trim().min(1).optional(),
  reporting_part: z.enum(["viii", "ix"]),
  lines: z.array(lineSchema).min(1).max(4),
  ending_unallowed_loss: z.number().int().nonnegative(),
}).strict().superRefine((activity, context) => {
  if (
    new Set(activity.lines.map((line) => line.reporting_form)).size !==
      activity.lines.length ||
    activity.lines.reduce(
        (sum, line) => sum + line.ending_unallowed_loss,
        0,
      ) !==
      activity.ending_unallowed_loss ||
    (activity.lines.some((line) => line.opening_unallowed_loss > 0) &&
      !activity.previous_filed_form_8582_reference) ||
    (activity.reporting_part === "viii") !== (activity.lines.length === 1)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Form 8582 ledger activity character or total does not reconcile",
    });
  }
});

export const form8582LedgerSchema = z.object({
  schema_version: z.literal(1),
  tax_year: z.literal(2025),
  accepted_return_reference: z.string().trim().min(1),
  activities: z.array(activitySchema).min(1),
  ending_unallowed_loss: z.number().int().nonnegative(),
}).strict().superRefine((ledger, context) => {
  if (
    new Set(ledger.activities.map((activity) => activity.activity_id)).size !==
      ledger.activities.length ||
    ledger.activities.reduce(
        (sum, activity) => sum + activity.ending_unallowed_loss,
        0,
      ) !== ledger.ending_unallowed_loss
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Form 8582 filed ledger activity totals do not reconcile",
    });
  }
});

export type Form8582Ledger = z.infer<typeof form8582LedgerSchema>;

const labelToForm: Readonly<
  Record<string, z.infer<typeof reportingFormSchema>>
> = {
  "Sch E, line 22": "schedule_e",
  "4835, line 34c": "form4835",
  "Form 4797, Part I": "form4797_part1",
  "Form 4797, Part II": "form4797_part2",
};

/** Build a storage-ready snapshot only after the caller has an accepted return reference. */
export function buildForm8582Ledger(
  rawInput: unknown,
  acceptedReturnReference: string,
): Form8582Ledger {
  const input = inputSchema.parse(rawInput);
  const sourceActivities = input.activities ?? [];
  const hasPrior4797 = sourceActivities.some((activity) =>
    activity.prior_unallowed_4797_part1 > 0 ||
    activity.prior_unallowed_4797_part2 > 0
  );
  const activeRentalActivities = sourceActivities.length > 0 &&
    sourceActivities.every((activity) =>
      activity.activity_type === "A" &&
      activity.reporting_form === "schedule_e" &&
      activity.property_type === 1 &&
      activity.current_net < 0 &&
      activity.prior_unallowed_operating === 0 &&
      activity.prior_unallowed_4797_part1 === 0 &&
      activity.prior_unallowed_4797_part2 === 0
    ) &&
    input.active_participation === true &&
    input.has_active_rental === true &&
    input.has_other_passive === false &&
    input.filing_status !== undefined &&
    (input.filing_status !== FilingStatus.MFS ||
      input.mfs_lived_apart_all_year === true) &&
    input.modified_agi !== undefined &&
    Number.isSafeInteger(input.modified_agi);
  const otherPassiveActivities = sourceActivities.length > 0 &&
    sourceActivities.every((activity) =>
      activity.activity_type === "B" &&
      (activity.reporting_form === "schedule_e" ||
        activity.reporting_form === "form4835")
    );
  const hasCurrentSale = input.has_current_4797_transaction === true ||
    (input.current_4797_sale_gains?.length ?? 0) > 0;
  if (
    (!hasPrior4797 && !activeRentalActivities && !otherPassiveActivities) ||
    hasCurrentSale
  ) {
    throw new Error(
      "Form 8582 operating ledger needs identified other-passive activities or sourced active rentals without a current sale",
    );
  }
  assertPriorYear8582Evidence(input);
  // The node checks the source-to-total join, including unique activity IDs.
  form8582.compute({ taxYear: 2025, formType: "f1040" }, input);
  const prior4797Allocation = hasPrior4797
    ? allocateOtherPassivePrior4797(input)
    : undefined;
  const operatingAllocation = !hasPrior4797
    ? allocatePassiveActivityLosses(
      sourceActivities.map((activity) => ({
        currentNet: activity.current_net,
        priorUnallowed: activity.prior_unallowed_operating,
        specialEligible: activity.activity_type === "A",
        priorSpecialEligible: false,
      })),
      passiveLossLimit({
        currentIncome: input.current_income ?? 0,
        currentLoss: input.current_loss ?? 0,
        priorUnallowed: input.prior_unallowed ?? 0,
        rentalLoss: activeRentalActivities ? input.rental_current_loss ?? 0 : 0,
        rentalIncome: activeRentalActivities
          ? input.rental_current_income ?? 0
          : 0,
        activeParticipation: activeRentalActivities,
        ...(activeRentalActivities
          ? {
            modifiedAgi: input.modified_agi,
            filingStatus: input.filing_status,
            mfsLivedApartAllYear: input.mfs_lived_apart_all_year,
          }
          : {}),
      }).allowed,
    )
    : undefined;
  const allocatedActivities = prior4797Allocation?.byActivity ??
    sourceActivities.map((activity, index) => {
      const grossOperating = Math.max(0, -activity.current_net) +
        activity.prior_unallowed_operating;
      const partIX = grossOperating > 0
        ? allocatePartIXLosses([{
          reportingForm: activity.reporting_form === "form4835"
            ? "4835, line 34c"
            : "Sch E, line 22",
          lossIncludingPrior: grossOperating,
          currentSamePartGain: Math.max(0, activity.current_net),
        }], operatingAllocation!.suspended[index])
        : [];
      return {
        activityId: activity.activity_id,
        name: activity.name,
        suspended: operatingAllocation!.suspended[index],
        partIX,
      };
    });
  const activities = allocatedActivities.filter((activity) =>
    activity.partIX.length > 0
  ).map((allocated) => {
    const source = sourceActivities.find((activity) =>
      activity.activity_id === allocated.activityId
    );
    if (!source) {
      throw new Error("Form 8582 ledger needs the matching activity source");
    }
    const lines = allocated.partIX.map((line) => {
      const reportingForm = labelToForm[line.reportingForm];
      if (!reportingForm) {
        throw new Error("Form 8582 ledger has an unknown reporting form");
      }
      const opening = reportingForm === "schedule_e" ||
          reportingForm === "form4835"
        ? source.prior_unallowed_operating
        : reportingForm === "form4797_part1"
        ? source.prior_unallowed_4797_part1
        : source.prior_unallowed_4797_part2;
      const current = reportingForm === "schedule_e" ||
          reportingForm === "form4835"
        ? Math.max(0, -source.current_net)
        : 0;
      if (opening + current !== line.lossIncludingPrior) {
        throw new Error("Form 8582 ledger line does not match source losses");
      }
      return {
        reporting_form: reportingForm,
        opening_unallowed_loss: opening,
        current_year_loss: current,
        current_same_part_income: line.currentSamePartGain,
        allowed_loss: line.allowed,
        ending_unallowed_loss: line.suspended,
      };
    });
    return {
      activity_id: allocated.activityId,
      activity_name: allocated.name,
      ...(source.prior_year_8582_source
        ? {
          previous_filed_form_8582_reference:
            source.prior_year_8582_source.source_document_reference,
        }
        : {}),
      reporting_part: lines.length === 1 ? "viii" as const : "ix" as const,
      lines,
      ending_unallowed_loss: allocated.suspended,
    };
  });
  return form8582LedgerSchema.parse({
    schema_version: 1,
    tax_year: 2025,
    accepted_return_reference: acceptedReturnReference,
    activities,
    ending_unallowed_loss: prior4797Allocation?.suspendedTotal ??
      operatingAllocation!.suspended.reduce((sum, amount) => sum + amount, 0),
  });
}

/** Reconcile a stored snapshot to the original 2025 source and known filing ID.
 * A self-consistent JSON ledger alone cannot establish its source amounts. */
export function readForm8582Ledger(
  raw: unknown,
  original2025Input: unknown,
  acceptedReturnReference: string,
): Form8582Ledger {
  const ledger = form8582LedgerSchema.parse(raw);
  const expected = buildForm8582Ledger(
    original2025Input,
    acceptedReturnReference,
  );
  if (JSON.stringify(ledger) !== JSON.stringify(expected)) {
    throw new Error(
      "Form 8582 stored ledger does not match the original 2025 activity source and accepted-return reference",
    );
  }
  return ledger;
}
