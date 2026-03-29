import { element, elements } from "../xml.ts";

interface Form4797Fields {
  section_1231_gain?: number | null;
  nonrecaptured_1231_loss?: number | null;
  ordinary_gain?: number | null;
  recapture_1245?: number | null;
  recapture_1250?: number | null;
}

type Form4797Input = Partial<Form4797Fields> & { [extra: string]: unknown };

const FIELD_MAP: ReadonlyArray<readonly [keyof Form4797Fields, string]> = [
  ["section_1231_gain", "Section1231GainLossAmt"],
  ["nonrecaptured_1231_loss", "Nonrecaptured1231LossAmt"],
  ["ordinary_gain", "OrdinaryGainLossAmt"],
  ["recapture_1245", "Section1245DepreciationAmt"],
  ["recapture_1250", "Section1250DepreciationAmt"],
];

export function buildIRS4797(fields: Form4797Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS4797", children);
}
