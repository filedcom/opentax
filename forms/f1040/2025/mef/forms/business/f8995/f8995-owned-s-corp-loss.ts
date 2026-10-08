import { ownedDebtFamilyQbiLines } from "../../../../../nodes/intermediate/forms/form7203/owned-family.ts";
import { projectOwned7203Family } from "../../../../domains/business/form7203/form7203_stock_loss_projection.ts";
import { FilingStatus } from "../../../../../mef/header.ts";
import { isDeepStrictEqual } from "node:util";
import { ownedSCorpLossLines } from "../../../../../nodes/intermediate/forms/form8995/owned-s-corp-loss.ts";
import { projectReviewedStockLoss7203 } from "../../../../domains/business/form7203/form7203_stock_loss_projection.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import type { Filed8995 } from "./f8995-route.ts";

/** Reconcile the allowed current qualified loss, not the basis-suspended loss,
 * against the same owned K1/debt source used by the actual Form7203 packet. */
export function assertOwnedSCorpLoss8995(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>> | undefined,
): Filed8995 {
  if (fields.owned_s_corp_loss_sources !== undefined) {
    const f = pending?.f1040 as Record<string, unknown> | undefined,
      g = pending?.general as Record<string, unknown> | undefined;
    const filer = g ? extractFilerIdentity(g) : undefined;
    if (!f || !filer || !pending?.form7203) {
      throw Error("Owned MFJ QBI needs actual identified source/basis return");
    }
    projectOwned7203Family(
      pending.form7203 as Record<string, unknown>,
      pending,
      filer,
    );
    const taxable = Math.max(
      0,
      Number(f.line11_agi) - Number(f.line12c_deduction_total) -
        Number(f.line13b_additional_deductions ?? 0),
    );
    const expected = ownedDebtFamilyQbiLines(
      fields.owned_s_corp_loss_sources,
      taxable,
    );
    if (
      f.line13_qbi_deduction !== 0 || f.line15_taxable_income !== taxable ||
      fields.agi !== f.line11_agi || fields.qbi_deduction !== 0 ||
      Object.entries(expected).some(([k, v]) =>
        !isDeepStrictEqual(fields[k], v)
      )
    ) {
      throw Error(
        "Owned MFJ QBI rows and carry must reconcile to each source and actual joint Form1040",
      );
    }
    return {
      businesses: (expected.owned_s_corp_qbi_business_rows ??
        expected.owned_s_corp_loss_filing_rows).map((r) => ({
          businessName: r.business_name,
          tin: { kind: "ein" as const, value: r.corporation_ein },
          qbi: r.qbi,
        })),
      lines: Object.fromEntries(
        Array.from(
          { length: 16 },
          (_, i) => [i + 2, expected[`line${i + 2}` as keyof typeof expected]],
        ),
      ) as Filed8995["lines"],
    };
  }
  const k1 = pending?.k1_s_corp as
    | { k1_s_corps?: Record<string, unknown>[] }
    | undefined;
  const g = pending?.general as Record<string, unknown> | undefined;
  const f = pending?.f1040 as Record<string, unknown> | undefined;
  const basisFields = pending?.form7203 as Record<string, unknown> | undefined;
  if (
    !k1 || k1.k1_s_corps?.length !== 1 || !g || !f || !basisFields ||
    !isDeepStrictEqual(fields.owned_s_corp_loss_source, k1.k1_s_corps[0])
  ) {
    throw Error(
      "Owned S corporation Form8995 loss requires its complete actual K1/Form7203 and identified return",
    );
  }
  const source = k1.k1_s_corps[0];
  const identity = extractFilerIdentity(g);
  const owners = identity
    ? [
      identity.primarySSN,
      ...(identity.filingStatus === FilingStatus.MarriedFilingJointly &&
          identity.spouse?.ssn
        ? [identity.spouse.ssn]
        : []),
    ]
    : [];
  const ssn = String(source.recipient_tin ?? "");
  const name = `${g.taxpayer_first_name ?? ""} ${g.taxpayer_last_name ?? ""}`
    .trim();
  if (
    !owners.includes(ssn) || !ssn || !name ||
    typeof f.line11_agi !== "number" ||
    typeof f.line12c_deduction_total !== "number"
  ) {
    throw Error(
      "Owned S corporation loss must belong to the actual primary or MFJ spouse shareholder filer",
    );
  }
  const filer = extractFilerIdentity(g);
  if (!filer || !owners.includes(ssn)) {
    throw Error(
      "Owned S corporation loss needs the actual shareholder filer identity",
    );
  }
  projectReviewedStockLoss7203(basisFields, pending!, filer);
  const additional = Number(f.line13b_additional_deductions ?? 0);
  const taxable = Math.max(
    0,
    f.line11_agi - f.line12c_deduction_total - additional,
  );
  const expected = ownedSCorpLossLines(source, taxable);
  if (
    fields.qbi !== expected.line2 || f.line13_qbi_deduction !== 0 ||
    Number(f.line15_taxable_income ?? 0) !== taxable ||
    fields.qbi_deduction !== 0 || fields.agi !== f.line11_agi ||
    Object.entries(expected).some(([key, value]) => fields[key] !== value)
  ) {
    throw Error(
      "Owned S corporation Form8995 filed loss/carry lines must reconcile to basis-limited loss and actual Form1040",
    );
  }
  return {
    businesses: [{
      businessName: expected.line1_business_name,
      tin: { kind: "ein", value: expected.line1_ein },
      qbi: expected.line1_qbi,
    }],
    lines: Object.fromEntries(
      Array.from(
        { length: 16 },
        (_, i) => [i + 2, expected[`line${i + 2}` as keyof typeof expected]],
      ),
    ) as Filed8995["lines"],
  };
}
