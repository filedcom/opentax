import { assertOwnedScheduleSE } from "../../../../domains/taxes/self-employment/schedule-se/schedule-se-owner-source.ts";
import { element, elements } from "../../../../../mef/xml.ts";
import { scheduleSELines } from "../../../../../nodes/intermediate/forms/taxes/self-employment/schedule_se/calculation.ts";
import type { MefBuildContext, MefFormDescriptor } from "../../../form-descriptor.ts";
import { FilingStatus as MefFilingStatus } from "../../../../../mef/header.ts";
import { scheduleSeSpouseProprietor } from "../../../../domains/taxes/self-employment/schedule-se/schedule-se-proprietor.ts";
import { mefTaxYear, mefYearConfig } from "../../../support/year-config.ts";
import { withMinisterialEarnings } from "../../../../../nodes/intermediate/forms/taxes/self-employment/schedule_se/ministerial.ts";
import { assertFileableClergyReturn } from "../../../../domains/income/wages/clergy/clergy_source.ts";

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

/** Clergy presentation for one proprietor's Schedule SE. */
interface ClergyScheduleSE {
  /** Line A: Form 4361 minister with $400 or more of other SE earnings. */
  readonly lineA: (owner: "T" | "S") => boolean;
  /** Document ID of the owner's line 2 ministerial explanation statement. */
  readonly explanationId: (owner: "T" | "S") => string | undefined;
}

function clergyScheduleSE(context?: MefBuildContext): ClergyScheduleSE {
  const facts = context?.pending
    ? assertFileableClergyReturn(
      context.pending as Readonly<Record<string, Record<string, unknown>>>,
      mefTaxYear(context),
      context.filer,
    )
    : undefined;
  const owners = (["T", "S"] as const).filter((owner) =>
    facts?.scheduleSeExplanations.has(owner)
  );
  const ids = context?.documentIdsByPendingKey
    ?.allowable_se_expense_explanation_statement ?? [];
  return {
    lineA: (owner) => facts?.scheduleSeLineA.has(owner) === true,
    explanationId(owner) {
      const index = owners.indexOf(owner);
      if (index === -1) return undefined;
      if (context?.documentIdsByPendingKey && ids[index] === undefined) {
        throw new Error(
          "Schedule SE ministerial earnings need their attached explanation",
        );
      }
      return ids[index];
    },
  };
}

function buildIRS1040ScheduleSE(
  rawFields: Input,
  context?: MefBuildContext,
  clergy: ClergyScheduleSE = clergyScheduleSE(context),
): string {
  // Line 2 adds a minister's net earnings to Schedule C and K-1 profit; owned
  // instances already carry them (i1040sse, Ministers).
  const fields = withMinisterialEarnings(rawFields);
  const cfg = mefYearConfig(context);
  const lines = scheduleSELines(fields, cfg.ssWageBase, cfg);
  const optional = fields.farm_optional_method_elected === true;
  const hasSeIncome = SE_INCOME_KEYS.some((key) =>
    typeof fields[key] === "number"
  );
  if (!hasSeIncome) return "";
  // Under $400 on line 4c the filer stops, and i1040sse says not to file
  // Schedule SE when lines 1a and 2 total less than $434.
  if (!lines) return "";

  const pending = context?.pending;
  const spouseOwned = fields.owner_recipient === "S" ||
    (fields.owner_recipient === undefined &&
      scheduleSeSpouseProprietor(pending, fields));
  const ssn =
    (spouseOwned ? context?.filer?.spouse?.ssn : context?.filer?.primarySSN)
      ?.replaceAll("-", "");
  if (!ssn || !/^\d{9}$/.test(ssn) || ssn === "000000000") {
    throw new Error("Schedule SE MeF needs the proprietor's nine-digit SSN");
  }
  if (
    spouseOwned && (
      context?.filer?.filingStatus !== MefFilingStatus.MarriedFilingJointly ||
      (pending?.general as { spouse_ssn?: string } | undefined)?.spouse_ssn
          ?.replaceAll("-", "") !== ssn ||
      (pending?.f1040 as { spouse_ssn?: string } | undefined)?.spouse_ssn
          ?.replaceAll("-", "") !== ssn
    )
  ) {
    throw new Error(
      "Schedule SE spouse proprietor must match the joint return",
    );
  }
  if (
    typeof fields["taxpayer_ssn"] === "string" &&
    fields["taxpayer_ssn"].replaceAll("-", "") !==
      context?.filer?.primarySSN.replaceAll("-", "")
  ) {
    throw new Error("Schedule SE SSN does not match the filer");
  }

  const owner = spouseOwned ? "S" : "T";
  const ssnChild = element("SSN", ssn);
  const explanationId = clergy.explanationId(owner);
  const value = (key: keyof Fields, tag: string): string => {
    const amount = fields[key];
    return typeof amount === "number" ? element(tag, amount) : "";
  };
  const children = [
    // IRS1040ScheduleSE.xsd (TY2025): line A ExemptForm4361Ind is the first
    // element after SSN.
    clergy.lineA(owner) ? element("ExemptForm4361Ind", "X") : "",
    optional ? "" : value("net_profit_schedule_f", "NetFarmProfitLossAmt"),
    value("net_profit_schedule_c", "NetNonFarmProfitLossAmt"),
    lines ? element("SETotalNetEarningsOrLossAmt", lines.line3) : "",
    lines ? element("MinimumProfitForSETaxAmt", lines.line4a) : "",
    optional && lines ? element("OptionalMethodAmt", lines.line4b) : "",
    lines ? element("CombinedSEAmt", lines.line4c) : "",
    lines ? element("CombinedSEAndChurchWagesAmt", lines.line6) : "",
    value("w2_ss_wages", "SSTWagesRRTCompAmt"),
    value("unreported_tips_4137", "UnreportedTipsAmt"),
    value("wages_8919", "WagesSubjectToSSTAmt"),
    lines ? element("TotalWagesAndUnreportedTipsAmt", lines.line8d) : "",
    lines ? element("AllowableSEAmt", lines.line9) : "",
    lines ? element("TaxBaseAmt", lines.line10) : "",
    lines ? element("SEBaseAmt", lines.line11) : "",
    lines ? element("SelfEmploymentTaxAmt", lines.line12) : "",
    lines ? element("DeductibleSelfEmploymentTaxAmt", lines.line13) : "",
    optional && lines
      ? element("SETaxFarmOptionalMethodAmt", lines.line15)
      : "",
  ];
  // The TY2025 schema puts the statement reference on the IRS1040ScheduleSE
  // root (referenceDocumentName fixed "AllowableSEExpenseExplanationStatement");
  // NetNonFarmProfitLossAmt carries no reference attributes.
  return elements(
    "IRS1040ScheduleSE",
    [ssnChild, ...children],
    explanationId
      ? {
        referenceDocumentId: explanationId,
        referenceDocumentName: "AllowableSEExpenseExplanationStatement",
      }
      : undefined,
  );
}

export const scheduleSE: MefFormDescriptor<
  "schedule_se",
  Input,
  string | readonly string[]
> = {
  pendingKey: "schedule_se",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sse.pdf",
  build(fields, context) {
    const owned = context?.pending
      ? assertOwnedScheduleSE(
        context.pending as Record<string, Record<string, unknown>>,
        mefTaxYear(context),
        context.filer,
      )
      : undefined;
    const clergy = clergyScheduleSE(context);
    return owned
      ? owned.instances.map((row) =>
        buildIRS1040ScheduleSE(
          { ...row, owner_recipient: row.recipient },
          context,
          clergy,
        )
      )
      : buildIRS1040ScheduleSE(fields, context, clergy);
  },
};
