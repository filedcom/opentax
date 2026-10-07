import { z } from "zod";
import {
  allocateOtherPassivePrior4797,
  allocatePartIXLosses,
  allocatePassiveActivityLosses,
  assertPriorYear8582Evidence,
  form8582,
  inputSchema,
  passiveActivity,
  passiveLossLimit,
} from "./index.ts";
import { FilingStatus } from "../../../types.ts";
import { allocateCurrentPassiveForms } from "./current-form-allocation.ts";

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
  if (input.current_loss_forms) {
    // Current-only original-form allocations have a separate gross loss
    // inventory; the legacy operating-only allocation cannot represent them.
    if (
      sourceActivities.length !== input.current_loss_forms.length ||
      new Set(sourceActivities.map((row) => row.activity_id)).size !==
        sourceActivities.length ||
      (input.prior_unallowed ?? 0) !== 0 ||
      input.has_current_4797_transaction === true ||
      (input.current_4797_sale_gains?.length ?? 0) > 0 ||
      input.current_loss_forms.some((row) => {
        const source = sourceActivities.find((activity) =>
          activity.activity_id === row.activity_id
        );
        const operatingForm = source?.reporting_form === "schedule_e"
          ? "Schedule E"
          : source?.reporting_form === "form4835"
          ? "Form 4835"
          : undefined;
        const operating = row.forms.find((f) =>
          f.reporting_form === operatingForm
        );
        return !source || source.activity_type !== "B" ||
          row.special_allowance_eligible || !operating ||
          row.forms.filter((f) =>
              f.reporting_form === "Schedule E" ||
              f.reporting_form === "Form 4835"
            ).length !== 1 ||
          source.current_net !==
            operating.current_income - operating.current_loss ||
          source.prior_unallowed_operating !== 0 ||
          source.prior_unallowed_4797_part1 !== 0 ||
          source.prior_unallowed_4797_part2 !== 0;
      })
    ) {
      throw new Error(
        "Current-loss ledger needs matching current-only other-passive activity and original-form sources",
      );
    }
    const result = form8582.compute(
      { taxYear: 2025, formType: "f1040" },
      input,
    );
    const allocated = allocateCurrentPassiveForms(
      input.current_loss_forms,
      Math.min(input.current_income ?? 0, input.current_loss ?? 0),
    );
    const formNames = {
      "Schedule E": "schedule_e",
      "Form 4835": "form4835",
      "Form 4797 Part I": "form4797_part1",
      "Form 4797 Part II": "form4797_part2",
    } as const;
    const activities = allocated.by_activity.filter((row) =>
      row.forms.some((form) => form.current_loss > 0)
    ).map((row) => {
      const source = sourceActivities.find((activity) =>
        activity.activity_id === row.activity_id
      )!;
      const lines = row.forms.filter((form) => form.current_loss > 0).map(
        (form) => ({
          reporting_form: formNames[form.reporting_form],
          opening_unallowed_loss: 0,
          current_year_loss: form.current_loss,
          current_same_part_income: form.current_income,
          allowed_loss: form.allowed_loss,
          ending_unallowed_loss: form.suspended_loss,
        }),
      );
      return {
        activity_id: row.activity_id,
        activity_name: source.name,
        reporting_part: lines.length === 1 ? "viii" as const : "ix" as const,
        lines,
        ending_unallowed_loss: row.suspended_loss,
      };
    });
    if (
      result.carryforwards?.suspended_pal_8582 !== allocated.suspended_loss ||
      activities.some((row) =>
        result.carryforwards?.[`suspended_pal_8582:${row.activity_id}`] !==
          row.ending_unallowed_loss
      )
    ) {
      throw new Error(
        "Current-loss ledger differs from calculator carryforwards",
      );
    }
    return form8582LedgerSchema.parse({
      schema_version: 1,
      tax_year: 2025,
      accepted_return_reference: acceptedReturnReference,
      activities,
      ending_unallowed_loss: allocated.suspended_loss,
    });
  }
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
      (activity.prior_unallowed_operating === 0 ||
        (sourceActivities.length <= 2 &&
          activity.prior_active_participation === true)) &&
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
  // Only the existing reviewed operating-PAL sale routes are admitted here.
  // The source validator and node below still review the activity, sale,
  // prior filed row, and active-rental allowance before a snapshot is built.
  const reviewedOperatingSale = hasCurrentSale &&
    sourceActivities.length === 1 &&
    sourceActivities[0].reporting_form === "schedule_e" &&
    sourceActivities[0].prior_unallowed_operating > 0 &&
    !hasPrior4797 &&
    input.current_4797_sale_gains?.length === 1 &&
    typeof input.current_4797_sale_gains[0]
        .entire_activity_interest_disposed ===
      "boolean";
  if (
    (!hasPrior4797 && !activeRentalActivities && !otherPassiveActivities &&
      !reviewedOperatingSale) ||
    (hasCurrentSale && !reviewedOperatingSale)
  ) {
    throw new Error(
      "Form 8582 operating ledger needs identified other-passive activities or sourced active rentals without a current sale, or a reviewed operating sale",
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
      sourceActivities.map((activity) => {
        const saleGain = (input.current_4797_sale_gains ?? []).filter((sale) =>
          sale.activity_id === activity.activity_id
        ).reduce((sum, sale) => sum + sale.gain, 0);
        return {
          currentNet: activity.current_net + saleGain,
          currentIncome: Math.max(0, activity.current_net) + saleGain,
          currentLoss: Math.max(0, -activity.current_net),
          priorUnallowed: activity.prior_unallowed_operating,
          specialEligible: activity.activity_type === "A",
          priorSpecialEligible:
            (activeRentalActivities || reviewedOperatingSale) &&
            activity.prior_active_participation === true,
        };
      }),
      passiveLossLimit(
        reviewedOperatingSale ? passiveActivity(input) : {
          currentIncome: input.current_income ?? 0,
          currentLoss: input.current_loss ?? 0,
          priorUnallowed: input.prior_unallowed ?? 0,
          rentalLoss: activeRentalActivities
            ? (input.rental_current_loss ?? 0) +
              (input.rental_prior_eligible_loss ?? 0)
            : 0,
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
        },
      ).allowed,
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
