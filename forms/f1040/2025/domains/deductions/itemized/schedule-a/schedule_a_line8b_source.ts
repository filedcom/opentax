import {
  sellerFinancedLine8bSchema,
} from "../../../../../nodes/inputs/deductions/itemized/schedule_a/index.ts";

export function sellerFinancedLine8b(source: Record<string, unknown>) {
  const amount = source.line_8b_mortgage_interest_no_1098 ?? 0;
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 0) {
    throw new Error("Schedule A line 8b needs a whole-dollar interest amount");
  }
  if (amount === 0) {
    if (source.line_8b_seller_financed !== undefined) {
      throw new Error(
        "Schedule A line 8b seller source needs positive interest",
      );
    }
    return undefined;
  }
  if (source.line_8b_seller_financed === undefined) {
    throw new Error(
      "Schedule A positive line 8b needs reviewed seller-financed recipient details; other line 8b cases are not yet supported",
    );
  }
  const seller = sellerFinancedLine8bSchema.parse(
    source.line_8b_seller_financed,
  );
  if (seller.amount !== amount) {
    throw new Error(
      "Schedule A seller-financed line 8b differs from interest source",
    );
  }
  const description = `${seller.seller_name} / ${seller.seller_tin} / ` +
    `${seller.address.line1}, ${seller.address.city}, ${seller.address.state} ${seller.address.zip}`;
  if (description.length > 80) {
    throw new Error(
      "Schedule A seller-financed line 8b details exceed the PDF widget",
    );
  }
  return { ...seller, description };
}
