import { element, elements } from "../../../mef/xml.ts";
import { inputSchema } from "../../../nodes/intermediate/forms/form6781/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

type Input = Partial<typeof inputSchema._output> & Record<string, unknown>;

// Part I amounts are derived from account rows, not flat field aliases.
export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [];

function buildIRS6781(raw: Input): string {
  // The common MeF dispatcher passes [] for every absent form.
  if (Array.isArray(raw) && raw.length === 0) return "";
  const input = inputSchema.parse(raw);
  if (!input.accounts?.length) {
    if (
      input.net_section_1256_gain !== undefined ||
      input.prior_year_loss_carryover !== undefined
    ) {
      throw new Error(
        "Form 6781 MeF needs Part I account rows; a net aggregate cannot populate line 1",
      );
    }
    return "";
  }
  if ((input.prior_year_loss_carryover ?? 0) !== 0) {
    throw new Error(
      "Form 6781 prior-year loss carryover is not a valid Part I line 6 input",
    );
  }
  const net = input.accounts.reduce((sum, row) => sum + row.gain_loss, 0);
  if (
    input.net_section_1256_gain !== undefined &&
    input.net_section_1256_gain !== net
  ) {
    throw new Error(
      "Form 6781 account rows do not match net_section_1256_gain",
    );
  }
  const losses = input.accounts.reduce(
    (sum, row) => sum + Math.max(0, -row.gain_loss),
    0,
  );
  const gains = input.accounts.reduce(
    (sum, row) => sum + Math.max(0, row.gain_loss),
    0,
  );
  return elements("IRS6781", [
    ...input.accounts.map((row) =>
      elements("Section1256CntrctsAcctInfoGrp", [
        element("AccountIdentificationDesc", row.account_identification),
        row.gain_loss < 0 ? element("LossAmt", -row.gain_loss) : "",
        row.gain_loss > 0 ? element("GainAmt", row.gain_loss) : "",
      ])
    ),
    element("TotalSection1256CntrctsLossAmt", losses),
    element("TotalSection1256CntrctsGainAmt", gains),
    element("NetGainAmt", net),
    element("NetGainAnd1099BAdjustmentsAmt", net),
    element("NetGainAndAdjPlusCarrybackAmt", net),
    element("ShortTermCapitalGainAmt", net * 0.4),
    element("LongTermCapitalGainAmt", net * 0.6),
  ]);
}

export const form6781: MefFormDescriptor<"form6781", Input> = {
  pendingKey: "form6781",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f6781--2025.pdf",
  build: buildIRS6781,
};
