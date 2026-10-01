import { element, elements } from "../../../mef/xml.ts";
import { farmOptionalMethodLines } from "../../../nodes/intermediate/forms/schedule_se/calculation.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  net_profit_schedule_c?: number | null;
  net_profit_schedule_f?: number | null;
  farm_optional_method_elected?: boolean | null;
  gross_farm_income?: number | null;
  unreported_tips_4137?: number | null;
  wages_8919?: number | null;
  w2_ss_wages?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

// Tag names and element ordering verified against IRS1040ScheduleSE.xsd
// in the TY2025 v5.4 schema package:
//   net_profit_schedule_f → NetFarmProfitLossAmt   (xsd line 79)
//   net_profit_schedule_c → NetNonFarmProfitLossAmt (xsd line 97)
//   w2_ss_wages           → SSTWagesRRTCompAmt      (xsd line 271; W-2 SS wages for SE cap)
//   unreported_tips_4137  → UnreportedTipsAmt        (xsd line 280)
//   wages_8919            → WagesSubjectToSSTAmt     (xsd line 289)
// IRS1040ScheduleSE.xsd requires the filer's SSN before Part I fields.
// SE_INCOME_KEYS: fields that trigger Schedule SE emission. w2_ss_wages alone
// (W-2-only filers) should not cause a Schedule SE to be generated.
const SE_INCOME_KEYS: ReadonlyArray<keyof Fields> = [
  "net_profit_schedule_c",
  "net_profit_schedule_f",
  "unreported_tips_4137",
  "wages_8919",
];

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["net_profit_schedule_f", "NetFarmProfitLossAmt"],
  ["net_profit_schedule_c", "NetNonFarmProfitLossAmt"],
  ["w2_ss_wages", "SSTWagesRRTCompAmt"],
  ["unreported_tips_4137", "UnreportedTipsAmt"],
  ["wages_8919", "WagesSubjectToSSTAmt"],
];

// Schedule SE line 2 (NetNonFarmProfitLossAmt) carries Schedule C profit plus
// ministerial SE earnings for clergy without an approved Form 4361 (Pub 517).
function withMinisterialEarnings(fields: Input): Input {
  const ministerial = fields["ministerial_se_earnings"];
  if (typeof ministerial !== "number" || ministerial === 0) return fields;
  return {
    ...fields,
    net_profit_schedule_c: (fields.net_profit_schedule_c ?? 0) + ministerial,
  };
}

function buildIRS1040ScheduleSE(
  rawFields: Input,
  context?: MefBuildContext,
): string {
  const fields = withMinisterialEarnings(rawFields);
  const optional = farmOptionalMethodLines(fields);
  const hasSeIncome = SE_INCOME_KEYS.some((key) =>
    typeof fields[key] === "number"
  );
  if (!hasSeIncome) return "";
  // The printed 2025 Schedule SE directs the filer to stop at line 4c.
  if (optional && optional.line4c < 400) return "";

  const ssn = context?.filer?.primarySSN.replaceAll("-", "");
  if (!ssn || !/^\d{9}$/.test(ssn) || ssn === "000000000") {
    throw new Error("Schedule SE MeF needs the filer's nine-digit SSN");
  }
  if (
    typeof fields["taxpayer_ssn"] === "string" &&
    fields["taxpayer_ssn"].replaceAll("-", "") !== ssn
  ) {
    throw new Error("Schedule SE SSN does not match the filer");
  }

  const ssnChild = element("SSN", ssn);
  const value = (key: keyof Fields, tag: string): string => {
    const amount = fields[key];
    return typeof amount === "number" ? element(tag, amount) : "";
  };
  const children = [
    optional ? "" : value("net_profit_schedule_f", "NetFarmProfitLossAmt"),
    value("net_profit_schedule_c", "NetNonFarmProfitLossAmt"),
    optional ? element("SETotalNetEarningsOrLossAmt", optional.line3) : "",
    optional ? element("MinimumProfitForSETaxAmt", optional.line4a) : "",
    optional ? element("OptionalMethodAmt", optional.line4b) : "",
    optional ? element("CombinedSEAmt", optional.line4c) : "",
    optional ? element("CombinedSEAndChurchWagesAmt", optional.line6) : "",
    value("w2_ss_wages", "SSTWagesRRTCompAmt"),
    value("unreported_tips_4137", "UnreportedTipsAmt"),
    value("wages_8919", "WagesSubjectToSSTAmt"),
    optional ? element("SETaxFarmOptionalMethodAmt", optional.line15) : "",
  ];
  return elements("IRS1040ScheduleSE", [ssnChild, ...children]);
}

export const scheduleSE: MefFormDescriptor<"schedule_se", Input> = {
  pendingKey: "schedule_se",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sse.pdf",
  build(fields, context) {
    return buildIRS1040ScheduleSE(fields, context);
  },
};
