import { bonusElectionTexts } from "../../../../../nodes/intermediate/forms/deductions/business/form4562/elections.ts";
import { reconcileCurrentYearInventory } from "./f4562_current_year.ts";
import { element, elements } from "../../../../../mef/xml.ts";
import type {
  MefBuildContext,
  MefFormDescriptor,
} from "../../../form-descriptor.ts";

function electionSource(context?: MefBuildContext) {
  const raw = context?.pending?.form4562;
  if (!raw || typeof raw !== "object" || !("current_year_inventory" in raw)) {
    return undefined;
  }
  const inventory = reconcileCurrentYearInventory(raw, context?.pending ?? {})
    .current_year_inventory;
  return {
    inventory,
    texts: bonusElectionTexts(inventory.assets, inventory.bonus_election),
  };
}

export const form4562ElectionOutStatement: MefFormDescriptor<
  "form4562_election_out",
  unknown
> = {
  pendingKey: "form4562_election_out",
  sourcePendingKeys: ["form4562"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f4562--2025.pdf",
  build(_fields, context) {
    const source = electionSource(context);
    return source?.texts.optedOut
      ? elements("SpclDeprecAllwncElectOutStmt", [
        element("ElectionExplanationTxt", source.texts.optedOut),
      ])
      : "";
  },
};

export const form4562ReducedBonusStatement: MefFormDescriptor<
  "form4562_reduced_bonus_election",
  unknown
> = {
  pendingKey: "form4562_reduced_bonus_election",
  sourcePendingKeys: ["form4562"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f4562--2025.pdf",
  build(_fields, context) {
    const source = electionSource(context);
    return source?.texts.reduced
      ? elements("GeneralDependencyMedium", [
        element("SSN", source.inventory.bonus_election!.proprietor_ssn),
        element("FormLineOrInstructionRefTxt", "Form 4562 line 14"),
        element(
          "RegulationReferenceTxt",
          "IRC section 168(k)(10); Notice 2026-11 section 4.03",
        ),
        element(
          "Desc",
          "Election to claim 40 percent special depreciation allowance",
        ),
        element("AttachmentInformationMedDesc", source.texts.reduced),
      ])
      : "";
  },
};
