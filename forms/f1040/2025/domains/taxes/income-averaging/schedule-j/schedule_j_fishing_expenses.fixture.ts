import { createHash } from "node:crypto";
import { z } from "zod";
import { itemSchema } from "../../../../../nodes/inputs/income/business/schedule_c/model.ts";
import {
  FishingExpenseKind,
  fishingExpenseTotals,
  fishingLedgerSchema,
} from "./schedule_j_fishing_ledger.ts";
import { scheduleJFishingInputs } from "./schedule_j_fishing_source.fixture.ts";
import { scheduleJJointFishingInputs } from "./schedule_j_joint_fishing.fixture.ts";

type Ledger = z.infer<typeof fishingLedgerSchema>;
export const fishingExpenseCases = [
  "fishing",
  "mixed-one-farm",
  "mixed-two-farm",
  "lower-profit",
  "joint-T",
  "joint-S",
] as const;

export function fishingExpenseInput(kind: typeof fishingExpenseCases[number]) {
  const base = kind === "joint-T" || kind === "joint-S"
    ? scheduleJJointFishingInputs(kind === "joint-T" ? "T" : "S")
    : scheduleJFishingInputs(kind === "lower-profit" ? "mixed-one-farm" : kind);
  const [business] = z.array(itemSchema).parse(base.schedule_c);
  const evidence = business.schedule_j_fishing_evidence;
  if (!evidence?.retained_catch_ledger) {
    throw new Error("Missing fixture ledger");
  }
  const original = fishingLedgerSchema.parse(
    JSON.parse(atob(evidence.retained_catch_ledger.bytes_base64)),
  );
  const common = {
    paid_on: "2025-08-15",
    supplier: "Synthetic Harbor Services",
    entirely_for_this_fishing_business: true as const,
    paid_for_2025_services: true as const,
  };
  const expenses: NonNullable<Ledger["expenses"]> = [{
    ...common,
    kind: FishingExpenseKind.Insurance,
    paid_receipt_reference: "INS-2025-1",
    description: "2025 vessel liability premium",
    amount: 3000,
    property_or_liability_policy: true,
    no_health_life_lost_earnings_or_self_insurance: true,
  }, {
    ...common,
    kind: FishingExpenseKind.Repairs,
    paid_receipt_reference: "REP-2025-1",
    description: "Incidental paid vessel maintenance",
    amount: kind === "lower-profit" ? 44000 : 4000,
    incidental_maintenance_not_capital_improvement: true,
    no_owner_labor_value: true,
  }, {
    ...common,
    kind: FishingExpenseKind.Repairs,
    paid_receipt_reference: "REP-2025-2",
    description: "Routine machinery servicing",
    amount: 3000,
    incidental_maintenance_not_capital_improvement: true,
    no_owner_labor_value: true,
  }, {
    ...common,
    kind: FishingExpenseKind.Utilities,
    paid_receipt_reference: "UTIL-2025-1",
    description: "Metered vessel shore power",
    amount: 5000,
    no_personal_home_office_or_residential_phone: true,
  }];
  const ledger = {
    ...original,
    supplies: [{ ...original.supplies[0], amount: 5000 }],
    expenses,
  };
  const bytes = new TextEncoder().encode(JSON.stringify(ledger));
  const input = {
    ...base,
    schedule_c: [{
      ...business,
      ...fishingExpenseTotals(ledger),
      line_22_supplies: 5000,
      schedule_j_fishing_evidence: {
        ...evidence,
        retained_catch_ledger: {
          ...evidence.retained_catch_ledger,
          bytes_base64: btoa(String.fromCharCode(...bytes)),
          sha256: createHash("sha256").update(bytes).digest("hex"),
        },
      },
    }],
  };
  return { input, ledger };
}
