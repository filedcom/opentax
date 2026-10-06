import { isDeepStrictEqual } from "node:util";
import { ownedSCorpLossLines } from "../../../nodes/intermediate/forms/form8995/owned-s-corp-loss.ts";
import { projectReviewedStockLoss7203 } from "../../form7203_stock_loss_projection.ts";
import { extractFilerIdentity } from "../../../mef/filer.ts";
import type { Filed8995 } from "./f8995-route.ts";

/** Reconcile the allowed current qualified loss, not the basis-suspended loss,
 * against the same owned K1/debt source used by the actual Form7203 packet. */
export function assertOwnedSCorpLoss8995(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>> | undefined,
): Filed8995 {
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
  const ssn = String(g.taxpayer_ssn ?? "").replace(/-/g, "");
  const name = `${g.taxpayer_first_name ?? ""} ${g.taxpayer_last_name ?? ""}`
    .trim();
  if (
    ssn !== source.recipient_tin || !ssn || !name ||
    typeof f.line11_agi !== "number" ||
    typeof f.line12c_deduction_total !== "number"
  ) {
    throw Error(
      "Owned S corporation loss must belong to the actual primary shareholder filer",
    );
  }
  const filer = extractFilerIdentity(g);
  if (!filer || filer.primarySSN !== ssn) {
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
