import { z } from "zod";
import { inputSchema as partnershipSchema } from "../../../../../nodes/inputs/income/rental-passthrough/k1_partnership/index.ts";
import { inputSchema as formSchema } from "../../../../../nodes/intermediate/forms/deductions/investments/form4952/index.ts";
import { sourceAmountsMatch } from "./form4952_combined_reconciliation.ts";

const allowed = new Set([
  "partnership_name",
  "partnership_ein",
  "source_document_reference",
  "recipient_tin",
  "investment_property_for_form4952",
  "box5_interest",
  "box6a_ordinary_dividends",
  "box6b_qualified_dividends",
  "box13_code_h_investment_interest",
]);
type Items = z.infer<typeof partnershipSchema>["k1_partnerships"];
type Form = z.infer<typeof formSchema>;
function matches(value: Form["source_k1_interest"], amounts: number[]) {
  return amounts.length
    ? sourceAmountsMatch(value, amounts)
    : value === undefined || value === 0;
}
/** Match each retained K-1 component, including income-only and expense-only copies. */
export function k1PortfolioSources(items: Items, form: Form) {
  const interest = items.map((x) => x.box5_interest ?? 0).filter((x) => x > 0);
  const dividends = items.map((x) => x.box6a_ordinary_dividends ?? 0).filter((
    x,
  ) => x > 0);
  const qualified = items.map((x) => x.box6b_qualified_dividends ?? 0).filter((
    x,
  ) => x > 0);
  const expenses = items.filter((x) =>
    x.box13_code_h_investment_interest !== undefined
  ).map((x) => x.box13_code_h_investment_interest!);
  const sum = (values: number[]) =>
    values.reduce((total, value) => total + value, 0);
  const valid = items.length > 0 &&
    new Set(items.map((x) => x.partnership_ein)).size === items.length &&
    new Set(items.map((x) => x.source_document_reference)).size ===
      items.length &&
    items.every((x) =>
      !!x.partnership_ein && !!x.source_document_reference &&
      !!x.recipient_tin &&
      !Object.keys(x).some((key) => !allowed.has(key)) &&
      (x.box6b_qualified_dividends ?? 0) <= (x.box6a_ordinary_dividends ?? 0) &&
      ((x.box5_interest ?? 0) + (x.box6a_ordinary_dividends ?? 0) === 0 ||
        x.investment_property_for_form4952 === true) &&
      (x.box5_interest ?? 0) + (x.box6a_ordinary_dividends ?? 0) +
            (x.box13_code_h_investment_interest ?? 0) > 0
    ) && matches(form.source_k1_interest, interest) &&
    matches(form.source_k1_dividends, dividends) &&
    matches(form.source_k1_qualified_dividends, qualified) &&
    matches(form.source_k1_investment_interest, expenses) && sum(expenses) > 0;
  return {
    valid,
    interest: sum(interest),
    dividends: sum(dividends),
    qualified: sum(qualified),
    expense: sum(expenses),
  };
}
