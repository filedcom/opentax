import {
  currentPropertyAmounts,
  currentPropertyPassiveAmounts,
  currentPropertySourceSchema,
} from "./current-property-source.ts";
import {
  currentFarmRentalNet,
  currentFarmRentalQbiSourceSchema,
} from "../f4835/qbi-source.ts";
import { allocateCurrentPassiveForms } from "../../intermediate/forms/form8582/current-form-allocation.ts";

/** Staged source-to-form calculation for current property/farm sources.
 * Full-return ownership, inventory and export reconciliation remain required.
 * Does not admit a loss sale through the existing public filing guards. */
export function currentPropertyLossAllocation(
  rawProperties: readonly unknown[],
  rawFarms: readonly unknown[],
) {
  const properties = rawProperties.map((s) =>
    currentPropertySourceSchema.parse(s)
  );
  const farms = rawFarms.map((s) => currentFarmRentalQbiSourceSchema.parse(s));
  const propertyOrigins = properties.map((s) => {
    const amount = currentPropertyAmounts(s);
    const passive = currentPropertyPassiveAmounts(s);
    return {
      activity_id: s.activity_id,
      recipient_tin: s.recipient_tin,
      passive: passive.net <= 0,
      // Positive net land income is recharacterized, so its losses are not
      // financed by unrelated passive activities on Form 8582.
      forms: [
        {
          reporting_form: "Schedule E" as const,
          current_income: Math.max(0, passive.operating),
          current_loss: Math.max(0, -passive.operating),
        },
        {
          reporting_form: "Form 4797 Part II" as const,
          current_income: Math.max(0, amount.gain),
          current_loss: Math.max(0, -amount.gain),
        },
      ],
    };
  });
  const farmOrigins = farms.map((s) => {
    const net = currentFarmRentalNet(s);
    return {
      activity_id: s.activity_id,
      recipient_tin: s.recipient_tin,
      passive: true,
      forms: [{
        reporting_form: "Form 4835" as const,
        current_income: Math.max(0, net),
        current_loss: Math.max(0, -net),
      }],
    };
  });
  const origins = [...propertyOrigins, ...farmOrigins];
  if (
    !origins.length ||
    new Set(origins.map((s) => s.activity_id)).size !== origins.length
  ) {
    throw new Error(
      "Current property loss allocation needs a nonempty distinct source activity inventory",
    );
  }
  const passive = origins.filter((s) => s.passive);
  const total = (key: "current_income" | "current_loss") =>
    passive.reduce(
      (n, s) => n + s.forms.reduce((sum, f) => sum + f[key], 0),
      0,
    );
  const allocated = passive.length
    ? allocateCurrentPassiveForms(
      passive.map((s) => ({
        activity_id: s.activity_id,
        special_allowance_eligible: false,
        forms: s.forms,
      })),
      Math.min(total("current_income"), total("current_loss")),
    )
    : undefined;
  return {
    origins,
    passive_allocation: allocated,
    nonpassive_forms: propertyOrigins.filter((s) => !s.passive).map((s) => ({
      activity_id: s.activity_id,
      recipient_tin: s.recipient_tin,
      forms: s.forms.map((f) => ({
        ...f,
        allowed_loss: f.current_loss,
        suspended_loss: 0,
        filed_net: f.current_income - f.current_loss,
      })),
    })),
  };
}
