import {
  ownedDebtInputs,
  ownedDebtSource,
} from "./form7203_owned_debt.fixture.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";

export const spouseOwnedDebtCases = [{
  id: "primary_mfj",
  owners: ["T"],
  repaid: false,
  allowed: 3500,
  suspended: 500,
  tax: 1503,
  pages: 8,
}, {
  id: "spouse_mfj",
  owners: ["S"],
  repaid: false,
  allowed: 3500,
  suspended: 500,
  tax: 1503,
  pages: 8,
}, {
  id: "spouse_repaid_mfj",
  owners: ["S"],
  repaid: true,
  allowed: 3100,
  suspended: 900,
  tax: 1543,
  pages: 8,
}, {
  id: "independent_spouses",
  owners: ["T", "S"],
  repaid: false,
  allowed: 7000,
  suspended: 1000,
  tax: 1153,
  pages: 10,
}, {
  id: "independent_spouses_repaid",
  owners: ["T", "S"],
  repaid: true,
  allowed: 6600,
  suspended: 1400,
  tax: 1193,
  pages: 10,
}, {
  id: "independent_basis_capacity",
  owners: ["T", "S"],
  repaid: false,
  allowed: 7500,
  suspended: 500,
  tax: 1103,
  pages: 10,
}];
export function spouseOwnedSource(owner: string, repaid = false) {
  const source = ownedDebtSource(repaid ? [400] : [], false, true);
  if (owner !== "S") return source;
  function convert(v: any, key = ""): any {
    if (Array.isArray(v)) return v.map((x) => convert(x));
    if (v && typeof v === "object") {
      return Object.fromEntries(
        Object.entries(v).map(([k, x]) => [k, convert(x, k)]),
      );
    }
    if (typeof v === "string") {
      if (v === "123456789") return "234567890";
      if (v === "987654321") return "876543210";
      if (v === "Alex Taxpayer") return "Casey Taxpayer";
      if (v === "Test S Corp") return "Spouse Service S Corp";
      if (key.endsWith("_reference") || key.endsWith("_id")) {
        return v + " spouse";
      }
    }
    return v;
  }
  return convert(source);
}
export function spouseOwnedDebtInputs(
  spec: typeof spouseOwnedDebtCases[number],
) {
  const input: any = ownedDebtInputs(
    spouseOwnedSource(spec.owners[0], spec.repaid && spec.owners[0] === "S"),
  );
  input.k1_s_corp = spec.owners.map((owner) =>
    spouseOwnedSource(owner, spec.repaid && owner === "S")
  );
  if (spec.id === "independent_basis_capacity") {
    const n = input.k1_s_corp[0].form7203_debt_evidence;
    n.cash_advance_amount = 3000;
    const r =
      n.owned_current_records.complete_current_shareholder_debt_inventory[0];
    r.stated_principal = 3000;
    Object.assign(r.funding, {
      bank_debit: 3000,
      bank_credit: 3000,
      shareholder_cash_after: r.funding.shareholder_cash_before - 3000,
      corporate_cash_after: r.funding.corporate_cash_before + 3000,
    });
    Object.assign(r.principal_entries[0], {
      principal_amount: 3000,
      closing_principal: 3000,
    });
  }
  Object.assign(input.general, {
    filing_status: "mfj",
    spouse_first_name: "Casey",
    spouse_last_name: "Taxpayer",
    spouse_ssn: "234-56-7890",
    spouse_dob: "1987-05-20",
  });
  return { inputs: input, filer: extractFilerIdentity(input.general)! };
}
