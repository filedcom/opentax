import { z } from "zod";
import {
  calculateForm8911PropertyAmounts,
  computePersonalCreditAmounts,
  inputSchema,
  personalCreditProperties,
} from "../../../../../nodes/inputs/credits/business/f8911/index.ts";
import { inputSchema as scheduleCInputSchema } from "../../../../../nodes/inputs/income/business/schedule_c/model.ts";
import { inputSchema as form3800InputSchema } from "../../../../../nodes/inputs/credits/business/f3800/index.ts";
import { roundWholeDollars } from "../../../../../whole-dollars.ts";

const returnOwnerSchema = z.object({
  taxpayer_ssn: z.string().regex(/^(?:\d{9}|\d{3}-\d{2}-\d{4})$/),
});

/** Ownership and amount joins only; does not authenticate property or PWA evidence. */
export function reconcileForm8911BusinessSources(
  raw: unknown,
  pending: Readonly<Record<string, unknown>>,
) {
  const source = inputSchema.parse(raw);
  if (
    JSON.stringify(source) !== JSON.stringify(inputSchema.parse(pending.f8911))
  ) {
    throw new Error(
      "Form 8911 property-source reconciliation differs from the prepared return",
    );
  }
  computePersonalCreditAmounts(source, true);
  const properties = personalCreditProperties(source).filter((property) =>
    (property.business_use_pct ?? 0) > 0
  );
  if (properties.length === 0) {
    throw new Error(
      "Form 8911 property-source reconciliation needs business properties",
    );
  }
  const owner = returnOwnerSchema.parse(pending.f1040);
  const businesses = scheduleCInputSchema.safeParse(pending.schedule_c);
  if (!businesses.success) {
    throw new Error(
      "Form 8911 property-source reconciliation needs Schedule C sources",
    );
  }
  for (const property of properties) {
    const review = property.business_source;
    if (
      !review ||
      review.proprietor_ssn !== owner.taxpayer_ssn.replaceAll("-", "")
    ) {
      throw new Error(
        "Form 8911 property proprietor differs from finalized Form 1040",
      );
    }
    const matches = businesses.data.schedule_cs.filter((business) =>
      business.business_reference === review.schedule_c_business_reference
    );
    if (
      matches.length !== 1 || matches[0].proprietor_recipient !== "T" ||
      matches[0].line_g_material_participation !== true ||
      matches[0].statutory_employee === true ||
      matches[0].disposed_of_business === true ||
      review.subject_to_passive_activity_limit
    ) {
      throw new Error(
        "Form 8911 property needs one participating taxpayer-owned Schedule C business",
      );
    }
  }
  const businessCredit = roundWholeDollars(
    properties.reduce(
      (sum, property) =>
        sum + calculateForm8911PropertyAmounts(property).businessCredit,
      0,
    ),
  );
  const filedCredit = form3800InputSchema.parse(pending.f3800).f8911_credit;
  if (
    !filedCredit || filedCredit.credit_amount !== businessCredit ||
    filedCredit.subject_to_passive_activity_limit
  ) {
    throw new Error(
      "Form 8911 business property credit differs from Form 3800 line 1s source",
    );
  }
  return { source, properties, businessCredit };
}
