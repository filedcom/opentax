import { element, elements } from "../../../mef/xml.ts";
import {
  type Form8997Part,
  type Form8997Row,
} from "../../../nodes/inputs/f8997/ledger.ts";
import { reconcileForm8997Pending } from "../../../nodes/inputs/f8997/reconciliation.ts";
import type { ExecuteResult } from "../../../../../core/runtime/executor.ts";

// Deliberately not registered in ALL_MEF_FORMS. This is a source-ledger
// projection only; Form 8949/4797 and finalized-return joins remain open.

function rowXml(
  groupTag: string,
  dateTag: string,
  descriptionTag: string,
  shortTag: string,
  longTag: string,
  row: Form8997Row,
): string {
  if (row.description.length > 100) {
    throw new Error("Form 8997 description exceeds the TY2025 MeF one-line limit");
  }
  return elements(groupTag, [
    element("EIN", row.qof_ein),
    element(dateTag, row.date),
    element(descriptionTag, row.description),
    element("SpecialGainCd", row.special_gain_code),
    row.short_term > 0 ? element(shortTag, row.short_term) : "",
    row.long_term > 0 ? element(longTag, row.long_term) : "",
  ]);
}

function partXml(
  part: Form8997Part,
  groupTag: string,
  dateTag: string,
  descriptionTag: string,
  shortTag: string,
  longTag: string,
  totalShortTag: string,
  totalLongTag: string,
): string[] {
  return [
    ...part.rows.map((row) =>
      rowXml(groupTag, dateTag, descriptionTag, shortTag, longTag, row)
    ),
    part.totals.short_term > 0
      ? element(totalShortTag, part.totals.short_term)
      : "",
    part.totals.long_term > 0
      ? element(totalLongTag, part.totals.long_term)
      : "",
  ];
}

export function buildStagedIRS8997(pending: ExecuteResult["pending"]): string {
  const statement = reconcileForm8997Pending(pending);
  return elements("IRS8997", [
    ...partXml(
      statement.part_i,
      "TotQOFInvstHoldBOYGrp",
      "InvestmentAcquiredDt",
      "QOFInvestmentDesc",
      "ShortTermDefrdGainRmngQOFAmt",
      "LongTermDefrdGainRmngQOFAmt",
      "TotBOYSTDefrdGainRmngQOFAmt",
      "TotBOYLTDefrdGainRmngQOFAmt",
    ),
    ...partXml(
      statement.part_ii,
      "CapGainDefrdInvstQOFCurrTYGrp",
      "InvestmentAcquiredDt",
      "InterestAcquiredDesc",
      "ShortTermDefrdGainRmngAmt",
      "LongTermDefrdGainRmngAmt",
      "TotShortTermDefrdGainRmngAmt",
      "TotLongTermDefrdGainRmngAmt",
    ),
    element(
      "FrgnEligTxpyrTYAfterMarchInd",
      String(statement.foreign_eligible_taxpayer),
    ),
    statement.foreign_eligible_taxpayer
      ? element(
        "WvrTrtyBnftFutureInclusionInd",
        String(statement.treaty_benefits_waived),
      )
      : "",
    ...partXml(
      statement.part_iii,
      "InclsnEvtOthTrnsfrDurCurrTYGrp",
      "EventDt",
      "EventDesc",
      "PrevDefrdShortTermGainAmt",
      "PrevDefrdLongTermGainAmt",
      "TotPrevDefrdShortTermGainAmt",
      "TotPrevDefrdLongTermGainAmt",
    ),
    statement.no_form1099b_for_disposition
      ? element("Form1099BNotReceivedInd", "X")
      : "",
    ...partXml(
      statement.part_iv,
      "TotQOFInvstHoldEOYGrp",
      "InvestmentAcquiredDt",
      "InterestAcquiredDesc",
      "ShortTermDefrdGainInvstAmt",
      "LongTermDefrdGainInvstAmt",
      "TotEOYSTDefrdGainInvstAmt",
      "TotEOYLTDefrdGainInvstAmt",
    ),
  ]);
}
