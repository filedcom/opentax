import { z } from "zod";

/** Custodian account classification is distinct from the Form1099-R checkbox. */
export const retirementAccountTypeSchema = z.enum([
  "non_ira",
  "traditional_ira",
  "sep_ira",
  "simple_ira",
  "roth_simple_ira",
  "roth_sep_ira",
  "ordinary_roth_ira",
]);
export type RetirementAccountType = z.infer<typeof retirementAccountTypeSchema>;

type Inventory = {
  inventory: {
    all_owned_accounts_are_ordinary_roth_not_sep_or_simple: boolean;
  };
};
type AccountSource = {
  form_type: string;
  distribution_code?: string;
  is_ira?: boolean;
  distribution_source?: { account_type?: RetirementAccountType };
  retirement_source?: {
    ira_recharacterization_review?: unknown;
    roth_activity_review?: Inventory;
    roth_owner_inventory_review?: Inventory;
  };
};

/** The existing retained ordinary-account inventory remains a real source. */
export function reviewedForm4852AccountType(
  item: AccountSource,
  required = false,
): RetirementAccountType | undefined {
  if (item.form_type !== "R_1099") return undefined;
  const declared = item.distribution_source?.account_type;
  const ordinary = ["J", "T", "Q"].includes(item.distribution_code ?? "") && [
    item.retirement_source?.roth_activity_review,
    item.retirement_source?.roth_owner_inventory_review,
  ].some((review) =>
    review?.inventory.all_owned_accounts_are_ordinary_roth_not_sep_or_simple ===
      true
  );
  if (
    ordinary && ["J", "T", "Q"].includes(item.distribution_code ?? "") &&
    declared && declared !== "ordinary_roth_ira"
  ) {
    throw new Error(
      "Form4852 custodian account type conflicts with retained ordinary Roth inventory",
    );
  }
  const type = declared ?? (ordinary ? "ordinary_roth_ira" : undefined);
  if (!type) {
    if (required) {
      throw new Error(
        "Form4852 retirement copy needs actual retained custodian account classification",
      );
    }
    return undefined;
  }
  const code = item.distribution_code;
  if (
    (["J", "T", "Q"].includes(code ?? "") &&
      type !== "ordinary_roth_ira" && type !== "roth_simple_ira" &&
      type !== "roth_sep_ira") ||
    (code === "S" && type !== "simple_ira") ||
    (["N", "R"].includes(code ?? "") && type === "non_ira")
  ) {
    throw new Error(
      "Form4852 distribution code conflicts with actual custodian account type",
    );
  }
  if (type === "roth_sep_ira" && ["2", "7"].includes(code ?? "")) {
    throw new Error(
      "Form4852 Roth SEP employer contribution needs its actual matching/nonelective source treatment",
    );
  }
  const recharacterization = code === "N" || code === "R";
  const marked = !recharacterization &&
    type !== "ordinary_roth_ira" && type !== "roth_sep_ira" &&
    type !== "non_ira";
  if ((item.is_ira ?? false) !== marked) {
    throw new Error(
      "Form4852 IRA/SEP/SIMPLE marker conflicts with actual account type/recharacterization",
    );
  }
  return type;
}

export function form4852IraMarginLabel(item: AccountSource) {
  switch (reviewedForm4852AccountType(item, true)) {
    case "traditional_ira":
      return "IRA";
    case "roth_sep_ira":
    case "sep_ira":
      return "SEP";
    case "simple_ira":
    case "roth_simple_ira":
      return "SIMPLE";
    default:
      return undefined;
  }
}
