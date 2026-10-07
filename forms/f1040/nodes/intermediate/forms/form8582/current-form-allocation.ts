import {
  currentPassiveDollarsSchema as dollars,
  currentPassiveFormsSchema,
} from "./current-form-schema.ts";
export { currentPassiveFormsSchema } from "./current-form-schema.ts";
import {
  allocatePartIXLosses,
  allocatePassiveActivityLosses,
} from "./index.ts";

/** Current losses only. Caller must reconcile the complete source inventory,
 * prior-year balances, special allowance and finalized allowed total before
 * filing. This helper does not open any public/native/PDF filing route. */
export function allocateCurrentPassiveForms(
  raw: unknown,
  allowedTotal: number,
) {
  const activities = currentPassiveFormsSchema.parse(raw);
  dollars.parse(allowedTotal);
  if (
    new Set(activities.map((a) => a.activity_id)).size !== activities.length ||
    activities.some((a) =>
      new Set(a.forms.map((f) => f.reporting_form)).size !== a.forms.length
    )
  ) {
    throw new Error(
      "Current passive allocation needs distinct activities and one aggregate per reporting form",
    );
  }
  const sum = (values: readonly number[]) => {
    const result = values.reduce((total, value) => total + value, 0);
    if (!Number.isSafeInteger(result)) {
      throw new Error(
        "Current passive allocation total exceeds whole-dollar precision",
      );
    }
    return result;
  };
  const totals = activities.map((a) => ({
    income: sum(a.forms.map((f) => f.current_income)),
    loss: sum(a.forms.map((f) => f.current_loss)),
  }));
  const currentIncome = sum(totals.map((t) => t.income));
  const currentLoss = sum(totals.map((t) => t.loss));
  if (
    allowedTotal > currentLoss ||
    allowedTotal < Math.min(currentIncome, currentLoss)
  ) {
    throw new Error(
      "Current passive allowed total must include income offsets and cannot exceed source losses",
    );
  }
  const allocated = allocatePassiveActivityLosses(
    activities.map((a, i) => ({
      currentNet: totals[i].income - totals[i].loss,
      currentIncome: totals[i].income,
      currentLoss: totals[i].loss,
      priorUnallowed: 0,
      specialEligible: a.special_allowance_eligible,
      priorSpecialEligible: false,
    })),
    allowedTotal,
  );
  const byActivity = activities.map((a, i) => {
    const lossForms = a.forms.filter((f) => f.current_loss > 0);
    const parts = lossForms.length
      ? allocatePartIXLosses(
        lossForms.map((f) => ({
          reportingForm: f.reporting_form,
          lossIncludingPrior: f.current_loss,
          currentSamePartGain: f.current_income,
        })),
        allocated.suspended[i],
      )
      : [];
    const forms = a.forms.map((f) => {
      const part = parts.find((p) => p.reportingForm === f.reporting_form);
      return {
        ...f,
        allowed_loss: part?.allowed ?? 0,
        suspended_loss: part?.suspended ?? 0,
        filed_net: f.current_income - (part?.allowed ?? 0),
      };
    });
    if (
      sum(forms.map((f) => f.allowed_loss)) !== allocated.allowed[i] ||
      sum(forms.map((f) => f.suspended_loss)) !== allocated.suspended[i]
    ) {
      throw new Error(
        "Current passive reporting-form allocation differs from activity totals",
      );
    }
    return {
      activity_id: a.activity_id,
      forms,
      allowed_loss: allocated.allowed[i],
      suspended_loss: allocated.suspended[i],
    };
  });
  return {
    current_income: currentIncome,
    current_loss: currentLoss,
    allowed_loss: allowedTotal,
    suspended_loss: currentLoss - allowedTotal,
    by_activity: byActivity,
  };
}
