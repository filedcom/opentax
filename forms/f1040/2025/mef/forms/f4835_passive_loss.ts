import {
  calculateForm4835AtRiskNet,
  inputSchema as form4835InputSchema,
} from "../../../nodes/inputs/f4835/index.ts";
import {
  allocatePassiveActivityLosses,
  inputSchema as form8582InputSchema,
  passiveLossLimit,
} from "../../../nodes/intermediate/forms/form8582/index.ts";
import type { MefBuildContext } from "../form-descriptor.ts";
import { form8582 } from "./f8582.ts";

/** Form 4835 line 34c amounts proved by the same Form 8582 activity allocation. */
export function farmAllowedLosses(
  context: MefBuildContext | undefined,
): number[] {
  const source = context?.pending?.f4835;
  if (source === undefined) return [];
  const farms = form4835InputSchema.parse(source).f4835s;
  const atRiskNets = farms.map((farm) =>
    calculateForm4835AtRiskNet(farm).atRiskNet
  );
  if (
    atRiskNets.every((net, index) =>
      net >= 0 && (farms[index].prior_unallowed_passive_operating ?? 0) === 0
    )
  ) return farms.map(() => 0);
  const linked = context?.pending?.form8582;
  if (!linked || typeof linked !== "object" || Array.isArray(linked)) {
    throw new Error(
      "Form 4835 loss requires its computed Form 8582 activity allocation",
    );
  }
  const input = form8582InputSchema.parse(linked);
  const activities = input.activities ?? [];
  form8582.build(linked as Record<string, unknown>, context);
  const limit = passiveLossLimit({
    currentIncome: input.current_income ?? 0,
    currentLoss: input.current_loss ?? 0,
    priorUnallowed: input.prior_unallowed ?? 0,
    rentalLoss: (input.rental_current_loss ?? 0) +
      (input.rental_prior_eligible_loss ?? 0),
    rentalIncome: input.rental_current_income ?? 0,
    activeParticipation: input.has_active_rental === true &&
      input.active_participation === true,
    modifiedAgi: input.modified_agi,
    filingStatus: input.filing_status,
  });
  const allocation = allocatePassiveActivityLosses(
    activities.map((activity) => ({
      currentNet: activity.current_net,
      priorUnallowed: activity.prior_unallowed_operating,
      specialEligible: activity.activity_type === "A",
      priorSpecialEligible: activity.prior_active_participation === true,
    })),
    limit.allowed,
  );
  const allowed = farms.map((farm, index) => {
    if (
      atRiskNets[index] >= 0 &&
      (farm.prior_unallowed_passive_operating ?? 0) === 0
    ) return 0;
    const activityIndex = activities.findIndex((activity) =>
      activity.activity_id === farm.activity_id &&
      activity.name === farm.activity_name
    );
    if (
      activityIndex < 0 ||
      activities[activityIndex].current_net !== atRiskNets[index]
    ) {
      throw new Error("Form 4835 farm loss does not match Form 8582 activity");
    }
    const amount = allocation.allowed[activityIndex];
    return amount;
  });
  return allowed;
}
