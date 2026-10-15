import {
  type BusinessReturnSource2026,
  resolveBusinessQbi2026,
} from "./business-qbi.ts";

/** i8863 (2026), line 7: personal services, capital and allocated half-SE tax.
 * Reuse the existing per-business SE deduction allocation, but retain a distinct
 * education workpaper rather than treating EIC earnings as interchangeable. */
export function businessPersonalServices2026(raw: BusinessReturnSource2026) {
  const r = resolveBusinessQbi2026(raw),
    review = r.source_input.earned_income_review;
  if (!review) {
    throw new Error(
      "Business personal-service earnings need an income-character review",
    );
  }
  const refs = new Set(review.activities.map((a) => a.business_reference));
  if (
    refs.size !== review.activities.length ||
    refs.size !== r.business.businesses.length ||
    r.business.businesses.some((b) => !refs.has(b.source.business_reference))
  ) {
    throw new Error(
      "Business earned-income review must cover every activity exactly once",
    );
  }
  const rows = r.business.businesses.map((b) => {
    const evidence = review.activities.find((a) =>
      a.business_reference === b.source.business_reference
    )!;
    const qbi = r.rows.find((a) =>
      a.business_reference === b.source.business_reference
    )!;
    const statutory = b.source.kind === "statutory_employee";
    if (statutory !== (evidence.kind === "statutory_employee")) {
      throw new Error(
        "Business income-character review conflicts with the statutory-employee source",
      );
    }
    const net = b.lines.line31 - qbi.allocated_se_deduction;
    const capitalCap = evidence.kind === "services_and_capital"
      ? Math.max(0, net) * .3
      : null;
    const earned = evidence.kind === "services_and_capital"
      ? Math.min(
        evidence.reasonable_compensation_for_owner_services,
        capitalCap!,
      )
      : statutory
      ? b.lines.line1
      : net;
    return {
      business_reference: b.source.business_reference,
      owner_tin: b.source.owner_tin,
      review: evidence,
      net_profit: b.lines.line31,
      statutory_gross_income: statutory ? b.lines.line1 : 0,
      allocated_se_deduction: qbi.allocated_se_deduction,
      capital_limit: capitalCap,
      education_earned_income: earned,
    };
  });
  return {
    rows,
    // Nonjoint refundability uses only the primary filer's own services.
    taxpayer_education_earned_income: rows.filter((b) =>
      b.owner_tin === r.source_input.taxpayer_tin
    ).reduce((n, b) => n + b.education_earned_income, 0),
    has_material_capital: rows.some((b) => b.capital_limit !== null),
    schedule1_line3: r.business.schedule1_line3,
  };
}
