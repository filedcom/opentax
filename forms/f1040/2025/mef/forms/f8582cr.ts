import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm8582CR,
  inputSchema,
  PassiveCreditReportingRoute,
  PassiveCreditSourceOrigin,
} from "../../../nodes/intermediate/forms/form8582cr/index.ts";
import { inputSchema as f3800InputSchema } from "../../../nodes/inputs/f3800/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import { sameForm3800PassiveAllocations } from "./f3800_passive_link.ts";
import { reconcileOrphanDrugK1Credits } from "./f8820_credit_evidence.ts";
import { reconcileDisabledAccessK1Credits } from "./f8826_credit_evidence.ts";
import { readDisabledAccessCapLedger } from "./f8826_cap_ledger.ts";
import { reconcileNewMarketsK1Credits } from "./f8874_credit_evidence.ts";
import {
  calculateForm8874,
  inputSchema as f8874InputSchema,
} from "../../../nodes/inputs/f8874/index.ts";

function combineK1ActivityCredits<
  T extends {
    source_type: string;
    entity_ein: string;
    source_document_reference: string;
    source_statement_reference?: string;
    credit_amount: number;
  },
>(credits: readonly T[]): T[] {
  const combined = new Map<string, T>();
  for (const credit of credits) {
    const key = [
      credit.source_type,
      credit.entity_ein,
      credit.source_document_reference,
      credit.source_type === "estate" || credit.source_type === "trust"
        ? credit.source_statement_reference ?? ""
        : "",
    ].join(":");
    const prior = combined.get(key);
    combined.set(
      key,
      prior
        ? {
          ...prior,
          credit_amount: prior.credit_amount + credit.credit_amount,
        }
        : credit,
    );
  }
  return [...combined.values()];
}

function reconcilePassiveDisabledAccessSources(
  sourceAllocations: ReturnType<
    typeof calculateForm8582CR
  >["sourceAllocations"],
  context: MefBuildContext,
): void {
  if (!context.documentIdsByPendingKey) return;
  if (!context.pending) {
    throw new Error("Form 8582-CR source evidence needs the filed return");
  }
  const grossSources = readDisabledAccessCapLedger(context)
    ?.rawPassiveSources ?? sourceAllocations;
  const credits = grossSources.flatMap((source) => {
    if (
      source.form3800_credit_line !== "1e" ||
      source.current_year_credit === 0
    ) return [];
    const origin = source.source_origin;
    if (origin.kind === PassiveCreditSourceOrigin.Self) return [];
    if (
      origin.kind === PassiveCreditSourceOrigin.Cooperative ||
      !origin.ein || source.source_form !== "Form 8826"
    ) {
      throw new Error(
        "Form 8582-CR passive disabled-access credit needs identifiable Form 8826 K-1 evidence",
      );
    }
    return [{
      source_type: origin.kind,
      entity_ein: origin.ein,
      source_document_reference: source.source_document_reference,
      source_statement_reference: source.source_statement_reference,
      credit_amount: source.current_year_credit,
      subject_to_passive_activity_limit: true,
    }];
  });
  reconcileDisabledAccessK1Credits(
    combineK1ActivityCredits(credits),
    context.pending,
  );
}

function reconcilePassiveOrphanDrugSources(
  sourceAllocations: ReturnType<
    typeof calculateForm8582CR
  >["sourceAllocations"],
  context: MefBuildContext,
): void {
  if (!context.documentIdsByPendingKey) return;
  if (!context.pending) {
    throw new Error("Form 8582-CR source evidence needs the filed return");
  }
  const credits = sourceAllocations.flatMap((source) => {
    if (
      source.form3800_credit_line !== "1h" ||
      source.current_year_credit === 0
    ) {
      return [];
    }
    const origin = source.source_origin;
    if (origin.kind === PassiveCreditSourceOrigin.Self) return [];
    if (
      origin.kind === PassiveCreditSourceOrigin.Cooperative ||
      !origin.ein || source.source_form !== "Form 8820"
    ) {
      throw new Error(
        "Form 8582-CR passive orphan-drug credit needs identifiable Form 8820 K-1 evidence",
      );
    }
    return [{
      source_type: origin.kind,
      entity_ein: origin.ein,
      source_document_reference: source.source_document_reference,
      credit_amount: source.current_year_credit,
      subject_to_passive_activity_limit: true,
    }];
  });
  reconcileOrphanDrugK1Credits(
    combineK1ActivityCredits(credits),
    context.pending,
  );
}

function reconcilePassiveNewMarketsSources(
  sourceAllocations: ReturnType<
    typeof calculateForm8582CR
  >["sourceAllocations"],
  context: MefBuildContext,
): void {
  if (!context.documentIdsByPendingKey) return;
  if (!context.pending) {
    throw new Error("Form 8582-CR source evidence needs the filed return");
  }
  const selfSources = sourceAllocations.filter((source) =>
    source.form3800_credit_line === "1i" &&
    source.current_year_credit > 0 &&
    source.source_origin.kind === PassiveCreditSourceOrigin.Self
  );
  if (selfSources.length > 0) {
    const raw = context.pending.f8874;
    if (!raw || context.documentIdsByPendingKey.f8874?.length !== 1) {
      throw new Error(
        "Form 8582-CR self-earned New Markets credit needs attached Form 8874",
      );
    }
    const investments = calculateForm8874(f8874InputSchema.parse(raw)).rows
      .filter((row) => row.investment.subject_to_passive_activity_limit);
    if (
      investments.length !== selfSources.length ||
      investments.some((row) =>
        !selfSources.some((source) =>
          source.source_form === "Form 8874" &&
          source.reporting_route ===
            PassiveCreditReportingRoute.Form3800Line3 &&
          source.activity_reference ===
            row.investment.passive_activity_reference &&
          source.source_document_reference ===
            row.investment.passive_source_document_reference &&
          source.current_year_credit === row.creditAmount
        )
      )
    ) {
      throw new Error(
        "Form 8582-CR self-earned New Markets credit differs from filed Form 8874",
      );
    }
  }
  const credits = sourceAllocations.flatMap((source) => {
    if (
      source.form3800_credit_line !== "1i" ||
      source.current_year_credit === 0
    ) return [];
    const origin = source.source_origin;
    if (origin.kind === PassiveCreditSourceOrigin.Self) return [];
    if (
      origin.kind === PassiveCreditSourceOrigin.Cooperative ||
      !origin.ein || source.source_form !== "Form 8874"
    ) {
      throw new Error(
        "Form 8582-CR passive New Markets Credit needs identifiable Form 8874 source evidence",
      );
    }
    return [{
      source_type: origin.kind,
      source_ein: origin.ein,
      source_document_reference: source.source_document_reference,
      source_statement_reference: source.source_statement_reference,
      credit_amount: source.current_year_credit,
      subject_to_passive_activity_limit: true,
    }];
  });
  reconcileNewMarketsK1Credits(
    combineK1ActivityCredits(credits.map((credit) => ({
      ...credit,
      entity_ein: credit.source_ein,
    }))),
    context.pending,
  );
}

function reconcileFiledBusinessCredits(
  sourceAllocations: ReturnType<
    typeof calculateForm8582CR
  >["sourceAllocations"],
  context: MefBuildContext,
): void {
  const businessSources = sourceAllocations.filter((source) =>
    source.reporting_route !== PassiveCreditReportingRoute.Form8834
  );
  if (businessSources.length === 0 || !context.documentIdsByPendingKey) return;
  if (context.documentIdsByPendingKey.f3800?.length !== 1) {
    throw new Error(
      "Form 8582-CR business credit needs one attached Form 3800",
    );
  }
  const form3800 = f3800InputSchema.parse(context.pending?.f3800);
  if (
    !sameForm3800PassiveAllocations(
      businessSources,
      form3800.passive_source_allocations ?? [],
    )
  ) {
    throw new Error(
      "Form 8582-CR business credit differs from filed Form 3800",
    );
  }
}

export const form8582cr: MefFormDescriptor<"form8582cr", unknown> = {
  pendingKey: "form8582cr",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8582cr.pdf",
  build(raw, context) {
    if (
      raw && typeof raw === "object" &&
      ("required_orphan_drug_k1_credits" in raw ||
        "required_new_markets_k1_credits" in raw ||
        "required_new_markets_self_credits" in raw ||
        "required_disabled_access_k1_credits" in raw) &&
      !("credit_sources" in raw)
    ) {
      throw new Error(
        "Form 8582-CR passive credit needs activity and tax facts",
      );
    }
    if (!raw || typeof raw !== "object" || !("credit_sources" in raw)) {
      return "";
    }
    const lines = calculateForm8582CR(inputSchema.parse(raw));
    if (context) {
      reconcilePassiveDisabledAccessSources(lines.sourceAllocations, context);
      if (lines.partI.line5 > 0) {
        reconcileFiledBusinessCredits(lines.sourceAllocations, context);
        reconcilePassiveOrphanDrugSources(lines.sourceAllocations, context);
        reconcilePassiveNewMarketsSources(lines.sourceAllocations, context);
      }
    }
    if (lines.partI.line5 === 0) return "";
    if (
      lines.allowedByReportingRoute[PassiveCreditReportingRoute.Form8834] > 0
    ) {
      throw new Error(
        "Form 8582-CR allowed Form 8834 credit needs its separate filing route and tax limit",
      );
    }
    const { rental, rehabilitation, housing, other } = lines.partI;
    return elements("IRS8582CR", [
      rental.total > 0
        ? elements("RentalCreditGrp", [
          element("CurrentYearCreditAmt", rental.current),
          element("PriorUnallowedCreditAmt", rental.prior),
          element("TotalCreditAmt", rental.total),
        ])
        : "",
      rehabilitation.total > 0
        ? elements("RehabilitationCreditGrp", [
          element("CurrentYearCreditAmt", rehabilitation.current),
          element("PriorUnallowedCreditAmt", rehabilitation.prior),
          element("TotalCreditAmt", rehabilitation.total),
        ])
        : "",
      housing.total > 0
        ? elements("LowIncomeCreditGrp", [
          element("CurrentYearCreditAmt", housing.current),
          element("PriorUnallowedCreditAmt", housing.prior),
          element("TotalCreditAmt", housing.total),
        ])
        : "",
      other.total > 0
        ? elements("AllPassiveCreditGrp", [
          element("OtherCurrentYearAmt", other.current),
          element("OtherPriorUnallowedAmt", other.prior),
          element("TotalOtherCreditsAmt", other.total),
        ])
        : "",
      element("TotalCreditAmt", lines.partI.line5),
      element("NetPassiveIncomeTaxAmt", lines.partI.line6),
      element("TotalCreditMinusTaxAmt", lines.partI.line7),
      lines.partII
        ? elements("SpecialAllowActiveGrp", [
          element("SmallerAmt", lines.partII.line8),
          element("TotalArcherMSADistributionAmt", lines.partII.line9),
          element("ModifiedAGIAmt", lines.partII.line10),
          element("NetAGIAmt", lines.partII.line11),
          element("PercentNetAGIAmt", lines.partII.line12),
          element("AllowedRentalRealtyLossAmt", lines.partII.line13),
          element("TaxableAmt", lines.partII.line14),
          element("AttributableTaxAmt", lines.partII.line15),
          element("SmallestTaxAmt", lines.partII.line16),
        ])
        : "",
      lines.partIII
        ? elements("SpecialAllowRehabGrp", [
          element("TotalCreditMinusTaxAmt", lines.partIII.line17),
          element("SmallestTaxAmt", lines.partIII.line18),
          element("NetTaxAmt", lines.partIII.line19),
          element("CreditOrNetTaxAmt", lines.partIII.line20),
          lines.partIII.line21 === undefined
            ? ""
            : element("TotalArcherMSADistributionAmt", lines.partIII.line21),
          lines.partIII.line22 === undefined
            ? ""
            : element("ModifiedAGIAmt", lines.partIII.line22),
          lines.partIII.line23 === undefined
            ? ""
            : element("NetAGIAmt", lines.partIII.line23),
          lines.partIII.line24 === undefined
            ? ""
            : element("PercentNetAGIAmt", lines.partIII.line24),
          lines.partIII.line25 === undefined
            ? ""
            : element("AllowedRentalRealtyLossAmt", lines.partIII.line25),
          lines.partIII.line26 === undefined
            ? ""
            : element("TaxableAmt", lines.partIII.line26),
          element("AttributableTaxAmt", lines.partIII.line27),
          element("RepeatedTaxAmt", lines.partIII.line28),
          element("AdjustedTaxAmt", lines.partIII.line29),
          element("SmallestRehabTaxAmt", lines.partIII.line30),
        ])
        : "",
      lines.partIV
        ? elements("SpecialAllowLowIncomeGrp", [
          element("NetTaxAmt", lines.partIV.line31),
          element("SmallestTaxAmt", lines.partIV.line32),
          element("AdjustedTaxAmt", lines.partIV.line33),
          element("CreditOrNetTaxAmt", lines.partIV.line34),
          element("AttributableTaxAmt", lines.partIV.line35),
          element("TaxAmt", lines.partIV.line36),
        ])
        : "",
      element("AllowedCreditsAmt", lines.line37),
    ]);
  },
};
