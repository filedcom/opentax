import { inputSchema as retirementSchema } from "../nodes/inputs/f1099r/index.ts";
import { inputSchema as wagesSchema } from "../nodes/inputs/w2/index.ts";
import {
  iraRecharacterizationExplanation,
  reviewedIraRecharacterization,
} from "../nodes/intermediate/forms/form8606/recharacterization.ts";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";

export function reconcileIraRecharacterizations(
  pending: Readonly<Record<string, unknown>>,
  filer: FilerIdentity | undefined,
) {
  const rows = pending.f1099r
    ? retirementSchema.parse(pending.f1099r).f1099rs
    : [];
  const copies = rows.filter((r) =>
    ["N", "R"].includes(r.box7_distribution_code ?? "") ||
    r.ira_recharacterization_review
  );
  if (!copies.length) return [];
  if (!filer) {
    throw new Error(
      "IRA recharacterization source needs actual filed owner identity",
    );
  }
  const reviews = copies.map((row) => ({
    row,
    review: reviewedIraRecharacterization(row),
  }));
  const wages = pending.w2 ? wagesSchema.parse(pending.w2).w2s : [];
  const general = pending.general as Record<string, unknown> | undefined;
  const f1040 = pending.f1040 as Record<string, unknown> | undefined;
  for (
    const owner of new Set(
      reviews.map((r) => r.review.original_contribution.owner_ssn),
    )
  ) {
    const own = reviews.filter((r) =>
      r.review.original_contribution.owner_ssn === owner
    );
    const spouse = owner === filer.spouse?.ssn;
    if (
      owner !== (spouse ? filer.spouse?.ssn : filer.primarySSN) ||
      spouse && filer.filingStatus !== FilingStatus.MarriedFilingJointly
    ) {
      throw new Error(
        "IRA recharacterization contribution owner differs from actual return owner",
      );
    }
    const inventory = own[0].review.annual_contribution_inventory;
    const principals = own.map((r) => r.review.original_contribution);
    if (
      own.some((r) =>
        JSON.stringify(r.review.annual_contribution_inventory) !==
          JSON.stringify(inventory)
      ) ||
      inventory.regular_contribution_receipts.length !== principals.length ||
      inventory.regular_contribution_receipts.some((c) =>
        principals.filter((p) => JSON.stringify(c) === JSON.stringify(p))
          .length !== 1
      )
    ) {
      throw new Error(
        "IRA recharacterization must reconcile every regular contribution in the complete annual owner inventory",
      );
    }
    if (
      rows.some((r) =>
        r.recipient_ssn?.replace(/\D/g, "") === owner &&
        ["J", "T", "Q"].includes(r.box7_distribution_code ?? "") &&
        r.box7_ira_simple_indicator !== true
      ) || own.some((r) => r.row.ts !== (spouse ? "S" : "T"))
    ) {
      throw new Error(
        "IRA recharacterization ordinary Roth payments need an actual annual contribution-basis Form8606 join",
      );
    }
    const compensation = wages.filter((w) =>
      w.employee_ssn?.replace(/\D/g, "") === owner &&
      w.box13_statutory_employee !== true
    ).reduce((sum, w) => sum + w.box1_wages, 0);
    const dob = String(general?.[spouse ? "spouse_dob" : "taxpayer_dob"] ?? "");
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(dob) || !Number.isFinite(Date.parse(dob)) ||
      new Date(dob).toISOString().slice(0, 10) !== dob || dob > "2025-12-31"
    ) {
      throw new Error(
        "IRA recharacterization annual limit needs actual owner birth source",
      );
    }
    const catchup = dob <= "1975-12-31";
    const limit = catchup ? 8000 : 7000;
    const principal = principals.reduce((sum, c) =>
      sum + Math.round(c.amount * 100), 0) / 100;
    const agi = f1040?.line11_agi;
    const lower = filer.filingStatus === FilingStatus.MarriedFilingJointly
      ? 236000
      : filer.filingStatus === FilingStatus.Single ||
          filer.filingStatus === FilingStatus.HeadOfHousehold
      ? 150000
      : undefined;
    const upper = lower === undefined
      ? undefined
      : lower + (filer.filingStatus === FilingStatus.MarriedFilingJointly
        ? 10000
        : 15000);
    const allowed =
      lower === undefined || upper === undefined || typeof agi !== "number"
        ? 0
        : agi >= upper
        ? 0
        : agi <= lower
        ? limit
        : Math.max(
          200,
          Math.ceil((limit * (upper - agi) / (upper - lower)) / 10) * 10,
        );
    const saverCeiling =
      filer.filingStatus === FilingStatus.MarriedFilingJointly
        ? 79000
        : filer.filingStatus === FilingStatus.HeadOfHousehold
        ? 59250
        : 39500;
    if (typeof agi === "number" && agi <= saverCeiling) {
      throw new Error(
        "IRA recharacterization below Saver's Credit ceiling needs actual annual contribution and distribution-lookback Form8880 source join",
      );
    }
    if (
      lower === undefined || typeof agi !== "number" ||
      principal > allowed || principal > compensation || pending.form2555 ||
      pending.form8839 || pending.form8815 ||
      (pending.schedule1 as Record<string, unknown> | undefined)
        ?.line20_ira_deduction
    ) {
      throw new Error(
        "IRA recharacterization needs actual sourced compensation, contribution/MAGI limits and no conflicting traditional IRA deduction or unsupported MAGI adjustments",
      );
    }
  }
  return reviews.map(({ row, review }) => {
    const owner = review.original_contribution.owner_ssn;
    const person = owner === filer.spouse?.ssn ? filer.spouse : filer;
    if (!person?.firstName || !person.lastName) {
      throw new Error(
        "IRA recharacterization statement needs actual owner name from the filed return",
      );
    }
    const name = [person.firstName, person.middleInitial, person.lastName]
      .filter(Boolean).join(" ");
    return iraRecharacterizationExplanation(row).replace(
      `Owner SSN ${owner}:`,
      `Owner ${name}, SSN ${owner}:`,
    );
  });
}
