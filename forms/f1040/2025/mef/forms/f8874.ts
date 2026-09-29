import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm8874,
  inputSchema,
} from "../../../nodes/inputs/f8874/index.ts";
import {
  inputSchema as f8582crInputSchema,
  PassiveCreditReportingRoute,
  PassiveCreditSourceOrigin,
} from "../../../nodes/intermediate/forms/form8582cr/index.ts";
import { inputSchema as f3800InputSchema } from "../../../nodes/inputs/f3800/index.ts";
import { inputSchema as partnershipK1InputSchema } from "../../../nodes/inputs/k1_partnership/index.ts";
import { inputSchema as sCorpK1InputSchema } from "../../../nodes/inputs/k1_s_corp/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Form8874K1Credit = {
  source_type: "partnership" | "s_corporation";
  source_ein: string;
  source_document_reference: string;
  credit_amount: number;
  subject_to_passive_activity_limit: boolean;
};

function filedForm8874K1Credits(
  pending: Readonly<Record<string, unknown>>,
): Form8874K1Credit[] {
  const partnerships = pending.k1_partnership
    ? partnershipK1InputSchema.parse(pending.k1_partnership).k1_partnerships
    : [];
  const corporations = pending.k1_s_corp
    ? sCorpK1InputSchema.parse(pending.k1_s_corp).k1_s_corps
    : [];
  return [
    ...partnerships.flatMap((source) =>
      source.box15_code_ad_new_markets_credit === undefined ? [] : [{
        source_type: "partnership" as const,
        source_ein: source.partnership_ein!,
        source_document_reference: source.source_document_reference!,
        credit_amount: source.box15_code_ad_new_markets_credit,
        subject_to_passive_activity_limit: source
          .new_markets_credit_subject_to_passive_activity_limit!,
      }]
    ),
    ...corporations.flatMap((source) =>
      source.box13_code_ad_new_markets_credit === undefined ? [] : [{
        source_type: "s_corporation" as const,
        source_ein: source.corporation_ein!,
        source_document_reference: source.source_document_reference!,
        credit_amount: source.box13_code_ad_new_markets_credit,
        subject_to_passive_activity_limit: source
          .new_markets_credit_subject_to_passive_activity_limit!,
      }]
    ),
  ];
}

export function reconciledForm8874K1Line2(
  context: MefBuildContext | undefined,
): number {
  const pending = context?.pending;
  if (!pending) return 0;
  const credits = filedForm8874K1Credits(pending);
  if (credits.length === 0) return 0;
  const form3800 = f3800InputSchema.parse(pending.f3800);
  const passive =
    credits.some((credit) => credit.subject_to_passive_activity_limit)
      ? f8582crInputSchema.parse(pending.form8582cr)
      : undefined;
  if (
    passive && context?.documentIdsByPendingKey &&
    context.documentIdsByPendingKey.form8582cr?.length !== 1
  ) {
    throw new Error(
      "Form 8874 line 2 passive K-1 credit needs attached Form 8582-CR",
    );
  }
  const seen = new Set<string>();
  let line2 = 0;
  for (const credit of credits) {
    const key = [
      credit.source_type,
      credit.source_ein,
      credit.source_document_reference,
    ].join(":");
    if (seen.has(key)) {
      throw new Error("Form 8874 line 2 K-1 source is duplicated");
    }
    seen.add(key);
    if (credit.subject_to_passive_activity_limit) {
      const amount = passive!.credit_sources.filter((source) =>
        source.source_form === "Form 8874" &&
        source.reporting_route === PassiveCreditReportingRoute.Form3800Line3 &&
        source.form3800_credit_line === "1i" &&
        source.source_document_reference === credit.source_document_reference &&
        source.source_origin.kind === credit.source_type &&
        source.source_origin.ein === credit.source_ein
      ).reduce((sum, source) => sum + source.current_year_credit, 0);
      if (amount !== credit.credit_amount) {
        throw new Error(
          "Form 8874 line 2 passive K-1 credit differs from Form 8582-CR",
        );
      }
    } else {
      const matches = (form3800.f8874_k1_credit_entries ?? []).filter(
        (entry) =>
          entry.source_type === credit.source_type &&
          entry.source_ein === credit.source_ein &&
          entry.source_document_reference ===
            credit.source_document_reference &&
          entry.credit_amount === credit.credit_amount &&
          entry.subject_to_passive_activity_limit === false,
      );
      if (matches.length !== 1) {
        throw new Error(
          "Form 8874 line 2 nonpassive K-1 credit differs from Form 3800",
        );
      }
    }
    line2 += credit.credit_amount;
  }
  if (!Number.isSafeInteger(line2)) {
    throw new Error("Form 8874 line 2 exceeds safe whole-dollar precision");
  }
  return line2;
}

export function buildForm8874Document(
  raw: unknown,
  passThroughCredit: number,
): string {
  const input = inputSchema.parse(raw);
  const lines = calculateForm8874(input);
  if (!Number.isSafeInteger(passThroughCredit) || passThroughCredit < 0) {
    throw new Error("Form 8874 line 2 needs a nonnegative whole-dollar credit");
  }
  const totalCents = Math.round(lines.line1 * 100) + passThroughCredit * 100;
  if (!Number.isSafeInteger(totalCents)) {
    throw new Error("Form 8874 line 3 exceeds safe cent precision");
  }
  return elements("IRS8874", [
    ...lines.rows.map(({ investment, rate, creditAmount }) =>
      elements("CurrentYearCreditInfo", [
        elements("CDEName", [
          element("BusinessNameLine1Txt", investment.cde_name),
        ]),
        elements("USAddress", [
          element("AddressLine1Txt", investment.cde_address.line1),
          element("CityNm", investment.cde_address.city),
          element("StateAbbreviationCd", investment.cde_address.state),
          element("ZIPCd", investment.cde_address.zip),
        ]),
        element("EIN", investment.cde_ein),
        element("InitialInvestmentDt", investment.initial_investment_date),
        element(
          "EquityInvestmentAmt",
          investment.qualified_equity_investment_amount,
        ),
        element("CreditRt", rate),
        element("CreditByRatioAmt", creditAmount),
      ])
    ),
    element("CDETotalCreditAmt", lines.line1),
    passThroughCredit > 0
      ? element("NewMarketsCreditAmt", passThroughCredit)
      : "",
    element("TotalCreditAmt", totalCents / 100),
  ]);
}

export const form8874: MefFormDescriptor<"f8874", unknown> = {
  pendingKey: "f8874",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8874.pdf",
  build(raw, context) {
    if (raw === undefined || raw === null) return "";
    const lines = calculateForm8874(inputSchema.parse(raw));
    if (context?.pending) {
      const claim = context.pending.f3800;
      const direct = claim && typeof claim === "object" &&
          "f8874_credit" in claim && claim.f8874_credit &&
          typeof claim.f8874_credit === "object" &&
          "credit_amount" in claim.f8874_credit
        ? claim.f8874_credit.credit_amount
        : 0;
      if (direct !== lines.nonpassiveCredit) {
        throw new Error("Form 8874 credit does not reconcile to Form 3800");
      }
      const passiveRows = lines.rows.filter((row) =>
        row.investment.subject_to_passive_activity_limit
      );
      if (passiveRows.length > 0) {
        const passive = f8582crInputSchema.parse(context.pending.form8582cr);
        const sources = passive.credit_sources.filter((source) =>
          source.source_form === "Form 8874" &&
          source.reporting_route ===
            PassiveCreditReportingRoute.Form3800Line3 &&
          source.form3800_credit_line === "1i" &&
          source.source_origin.kind === PassiveCreditSourceOrigin.Self &&
          source.current_year_credit > 0
        );
        if (
          passiveRows.length !== sources.length ||
          passiveRows.some((row) =>
            !sources.some((source) =>
              source.activity_reference ===
                row.investment.passive_activity_reference &&
              source.source_document_reference ===
                row.investment.passive_source_document_reference &&
              source.current_year_credit === row.creditAmount
            )
          )
        ) {
          throw new Error(
            "Form 8874 passive credit does not reconcile to Form 8582-CR",
          );
        }
      }
    }
    if (
      context?.documentIdsByPendingKey &&
      context.documentIdsByPendingKey.f3800?.length !== 1
    ) {
      throw new Error("Form 8874 current-year credit needs attached Form 3800");
    }
    if (
      lines.passiveCredit > 0 && context?.documentIdsByPendingKey &&
      context.documentIdsByPendingKey.form8582cr?.length !== 1
    ) {
      throw new Error(
        "Form 8874 passive credit needs attached Form 8582-CR",
      );
    }
    return buildForm8874Document(raw, reconciledForm8874K1Line2(context));
  },
};
