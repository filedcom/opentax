import { z } from "zod";
import { inputSchema as form1099oidSchema } from "../nodes/inputs/f1099oid/index.ts";

type OidItem = z.infer<typeof form1099oidSchema>["f1099oids"][number];

/** An affirmed, unadjusted taxable box 1 OID payer. */
export function plainInvestmentOid(item: OidItem): boolean {
  return item.investment_property_for_form4952 === true &&
    (item.box1_oid ?? 0) > 0 &&
    [
      item.box2_other_interest,
      item.box3_early_withdrawal_penalty,
      item.box4_federal_withheld,
      item.box5_market_discount,
      item.box6_acquisition_premium,
      item.box8_oid_treasury,
      item.box9_investment_expenses,
      item.box10_bond_premium,
      item.box11_tax_exempt_oid,
      item.box11_pab_oid,
      item.box12_state_tax,
      item.nominee_oid,
    ].every((amount) => (amount ?? 0) === 0) &&
    item.box5_included_in_income_currently !== true &&
    item.box6_applies_to === undefined &&
    item.box10_applies_to === undefined &&
    item.box13_fatca !== true;
}
