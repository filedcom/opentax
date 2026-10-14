import { inputSchema as partnershipSchema } from "../../../../../inputs/income/rental-passthrough/k1_partnership/index.ts";
import { inputSchema as sCorpSchema } from "../../../../../inputs/income/rental-passthrough/k1_s_corp/index.ts";
import { passiveK1Activities } from "../../../../../inputs/income/rental-passthrough/k1_passive_source.ts";
import { TSJ } from "../../../../../types.ts";

/** Reuse issued current-activity K-1 records; never infer a passive box or owner. */
export function reviewedLine6K1Income(
  rawPartnership: unknown,
  rawSCorp: unknown,
  taxpayerTin: string | undefined,
) {
  const groups = [
    {
      kind: "partnership" as const,
      reporting: "k1_partnership" as const,
      items: rawPartnership === undefined
        ? []
        : partnershipSchema.parse(rawPartnership).k1_partnerships,
    },
    {
      kind: "s_corporation" as const,
      reporting: "k1_s_corp" as const,
      items: rawSCorp === undefined
        ? []
        : sCorpSchema.parse(rawSCorp).k1_s_corps,
    },
  ];
  return groups.flatMap(({ kind, reporting, items }) =>
    items.flatMap((item) => {
      const amounts = [item.box2_rental_re, item.box3_other_rental];
      if (amounts.every((amount) => amount === undefined)) {
        if (item.passive_income_source || item.eic_passive_activity_review) {
          throw new Error(
            "Form 8582-CR K-1 rental review has no entered income",
          );
        }
        return [];
      }
      const source = item.passive_income_source;
      if (
        !source || item.recipient_tin !== taxpayerTin?.replaceAll("-", "") ||
        amounts.some((amount) =>
          amount !== undefined && (!Number.isSafeInteger(amount) || amount <= 0)
        ) ||
        (item.box2_rental_re !== undefined &&
          item.eic_passive_activity_review?.box2 !== "passive") ||
        (item.box3_other_rental !== undefined &&
          item.eic_passive_activity_review?.box3 !== "passive") ||
        item.eic_passive_activity_review?.box1 !== undefined ||
        item.box1_ordinary_business !== undefined
      ) {
        throw new Error(
          "Form 8582-CR K-1 rental income needs owned positive box 2/3 activity sources",
        );
      }
      const activities = passiveK1Activities([item], reporting, true);
      return activities.map((activity) => ({
        tsj: TSJ.T,
        activity_id: activity.activity_id,
        passive_income_source_document_reference:
          source.activity_statement_reference,
        net_passive_income: activity.current_net,
        source_origin: { kind, ein: source.issuer_ein },
      }));
    })
  );
}
