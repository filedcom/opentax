import { childCreditGraphFixture2026 } from "../nodes/f8812.fixture.ts";
import { saverSource2026 } from "./savers-credit.fixture.ts";
import { Box12Code } from "../../nodes/inputs/income/wages/w2/index.ts";
export function saverGraph2026(wages = 24000, children = 0) {
  const b = childCreditGraphFixture2026(wages, children);
  const {
    no_nonrefundable_credits_other_than_dependent_care_and_education: _old,
    ...child
  } = b.f8812;
  const claim = saverSource2026().claim;
  claim.owners[0].owner_tin = b.general.taxpayer_ssn;
  return {
    ...b,
    w2s: b.w2s!.map((w) => ({
      ...w,
      box4_ss_withheld: Math.round(wages * .062 * 100) / 100,
      box12_entries: [{ code: Box12Code.D, amount: 2000 }],
    })),
    form8880: { claim },
    f8812: {
      ...child,
      savers_inventory_reference: claim.record_reference,
      no_nonrefundable_credits_other_than_reviewed_sources: true as const,
    },
  };
}
