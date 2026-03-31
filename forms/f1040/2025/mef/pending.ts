import type { F8949Transaction, MefFormsPending } from "./types.ts";

function extractForm8949Transactions(
  raw: Record<string, unknown> | undefined,
): F8949Transaction[] | undefined {
  if (raw === undefined) return undefined;
  const tx = raw["transaction"];
  if (tx === undefined) return undefined;
  return (Array.isArray(tx) ? tx : [tx]) as F8949Transaction[];
}

export function buildPending(
  pending: Record<string, unknown>,
): MefFormsPending {
  const p = pending;
  return {
    f1040: p["f1040"] as MefFormsPending["f1040"],
    schedule1: p["schedule1"] as MefFormsPending["schedule1"],
    schedule2: p["schedule2"] as MefFormsPending["schedule2"],
    schedule3: p["schedule3"] as MefFormsPending["schedule3"],
    schedule_d: p["schedule_d"] as MefFormsPending["schedule_d"],
    form8889: p["form8889"] as MefFormsPending["form8889"],
    form2441: p["form2441"] as MefFormsPending["form2441"],
    form8949: extractForm8949Transactions(
      p["form8949"] as Record<string, unknown> | undefined,
    ),
    form8959: p["form8959"] as MefFormsPending["form8959"],
    form8960: p["form8960"] as MefFormsPending["form8960"],
    form4137: p["form4137"] as MefFormsPending["form4137"],
    form8919: p["form8919"] as MefFormsPending["form8919"],
    form4972: p["form4972"] as MefFormsPending["form4972"],
    schedule_se: p["schedule_se"] as MefFormsPending["schedule_se"],
    form8606: p["form8606"] as MefFormsPending["form8606"],
    form_1116: p["form_1116"] as MefFormsPending["form_1116"],
    form8582: p["form8582"] as MefFormsPending["form8582"],
    schedule_f: p["schedule_f"] as MefFormsPending["schedule_f"],
    schedule_b: p["schedule_b"] as MefFormsPending["schedule_b"],
    form4797: p["form4797"] as MefFormsPending["form4797"],
    form8880: p["form8880"] as MefFormsPending["form8880"],
    form8995: p["form8995"] as MefFormsPending["form8995"],
    form4562: p["form4562"] as MefFormsPending["form4562"],
    form8995a: p["form8995a"] as MefFormsPending["form8995a"],
    form6251: p["form6251"] as MefFormsPending["form6251"],
    form5329: p["form5329"] as MefFormsPending["form5329"],
    form8853: p["form8853"] as MefFormsPending["form8853"],
    form_8829: p["form_8829"] as MefFormsPending["form_8829"],
    form8839: p["form8839"] as MefFormsPending["form8839"],
    form8962: p["form8962"] as MefFormsPending["form8962"],
    form8824: p["form8824"] as MefFormsPending["form8824"],
    eitc: p["eitc"] as MefFormsPending["eitc"],
    form2555: p["form2555"] as MefFormsPending["form2555"],
    form461: p["form461"] as MefFormsPending["form461"],
    form4684: p["form4684"] as MefFormsPending["form4684"],
    form4952: p["form4952"] as MefFormsPending["form4952"],
    form5695: p["form5695"] as MefFormsPending["form5695"],
    form6198: p["form6198"] as MefFormsPending["form6198"],
    form6252: p["form6252"] as MefFormsPending["form6252"],
    form6781: p["form6781"] as MefFormsPending["form6781"],
    form7206: p["form7206"] as MefFormsPending["form7206"],
    form8396: p["form8396"] as MefFormsPending["form8396"],
    form8615: p["form8615"] as MefFormsPending["form8615"],
    form8815: p["form8815"] as MefFormsPending["form8815"],
    form8990: p["form8990"] as MefFormsPending["form8990"],
    form982: p["form982"] as MefFormsPending["form982"],
    schedule_h: p["schedule_h"] as MefFormsPending["schedule_h"],
    schedule_a: p["schedule_a"] as MefFormsPending["schedule_a"],
  };
}
