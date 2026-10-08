import { inputSchema as sCorpSchema } from "../../../nodes/inputs/k1_s_corp/index.ts";
import { inputSchema as partnershipSchema } from "../../../nodes/inputs/k1_partnership/index.ts";
import { passiveK1Activities } from "../../../nodes/inputs/k1_passive_source.ts";
import { passiveSCorpLossBundle } from "../../../nodes/inputs/k1_s_corp_passive_loss_source.ts";
import { extractFilerIdentity } from "../../../mef/filer.ts";
import { projectFirstYearPassiveSCorp7203 } from "./form7203/form7203-passive-loss-projection.ts";

/** Calculation-only intake boundary while return/native/print joins are built. */
export function assertPassiveSCorpLossCalculationInputs(
  inputs: Record<string, unknown>,
) {
  if (
    !Array.isArray(inputs.k1_s_corp) ||
    !inputs.k1_s_corp.some((row) =>
      row?.first_year_passive_loss_source !== undefined
    )
  ) return;
  const permitted = new Set([
    "general",
    "w2",
    "f1099int",
    "f1099div",
    "k1_s_corp",
    "k1_partnership",
  ]);
  if (Object.keys(inputs).some((key) => !permitted.has(key))) {
    throw Error(
      "Passive S-corp calculation needs source review for its other return combinations",
    );
  }
  const items = sCorpSchema.parse({ k1_s_corps: inputs.k1_s_corp }).k1_s_corps;
  if (items.length !== 1) {
    throw Error("Passive S-corp calculation needs one current loss source");
  }
  const b = passiveSCorpLossBundle(items[0]);
  const filer = extractFilerIdentity(
    (inputs.general ?? {}) as Record<string, unknown>,
  );
  projectFirstYearPassiveSCorp7203(b.source, b.k1, filer);
  if (inputs.k1_partnership !== undefined) {
    const partners =
      partnershipSchema.parse({ k1_partnerships: inputs.k1_partnership })
        .k1_partnerships;
    const allowed = new Set([
      "partnership_name",
      "partnership_ein",
      "recipient_tin",
      "source_document_reference",
      "box2_rental_re",
      "box3_other_rental",
      "box14a_se_earnings",
      "eic_passive_activity_review",
      "passive_income_source",
    ]);
    for (const row of partners) {
      if (
        ![row.box2_rental_re ?? 0, row.box3_other_rental ?? 0].some((n) =>
          n > 0
        ) ||
        [row.box2_rental_re ?? 0, row.box3_other_rental ?? 0].some((n) =>
          n < 0
        ) ||
        ((row.box2_rental_re ?? 0) > 0 &&
          row.eic_passive_activity_review?.box2 !== "passive") ||
        ((row.box3_other_rental ?? 0) > 0 &&
          row.eic_passive_activity_review?.box3 !== "passive")
      ) {
        throw Error(
          "Passive S-corp calculation needs positive passive rental K1 boxes",
        );
      }
      if (
        Object.keys(row).some((key) => !allowed.has(key)) ||
        (row.box14a_se_earnings ?? 0) !== 0 ||
        ![filer!.primarySSN, filer!.spouse?.ssn].includes(row.recipient_tin)
      ) {
        throw Error(
          "Passive S-corp calculation needs owned non-QBI positive rental K1 sources",
        );
      }
    }
    passiveK1Activities(partners, "k1_partnership", true);
  }
}
