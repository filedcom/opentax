import {
  type Schedule2Input2026,
  schedule2Input2026Schema,
} from "../schedule2.ts";
import type { Schedule2PrintDetails2026 } from "./schedule2.ts";
/** Print-map fixture only: finalized line amounts do not establish source eligibility. */
export function syntheticSchedule2Print2026(): {
  amounts: Schedule2Input2026;
  details: Schedule2PrintDetails2026;
} {
  const amounts: Schedule2Input2026 = {};
  let amount = 100;
  for (
    const key of Object.keys(
      schedule2Input2026Schema.shape,
    ) as (keyof Schedule2Input2026)[]
  ) {
    amounts[key] = key === "line12_section965_installment" ? 0 : amount++;
  }
  return {
    amounts,
    details: {
      line1e_form4255_columns: ["1a", "1c", "1d", "2a"],
      line1f_form4255_columns: ["1a", "1c", "1d", "2a"],
      self_employment_exemptions: ["4361", "4029"],
      other_self_employment_exemption: "D-NOTICE",
      form5329_not_required: true,
      line1y_items: [{
        type: "Synthetic addition",
        amount: amounts.line1y_other_additions!,
      }],
      line13a_items: [{
        type: "Synthetic credit recapture",
        form_number: "4255",
        amount: amounts.line13a_other_credit_recapture!,
      }],
      line13z_items: [{
        type: "Synthetic other tax",
        amount: amounts.line13z_other_income_taxes!,
      }],
    },
  };
}
