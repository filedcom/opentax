import { inputSchema as wagesSchema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { isDeepStrictEqual } from "node:util";
import { inputSchema as rSchema } from "../../../../../nodes/inputs/income/retirement/f1099r/index.ts";
import {
  reconcileRothOwnerInventoryCopies,
  rothOwnerPrintFields,
} from "../../../../../nodes/intermediate/forms/income/retirement/form8606/roth-inventory.ts";
import { roundWholeDollars } from "../../../../../whole-dollars.ts";
import { type FilerIdentity, FilingStatus } from "../../../../../mef/header.ts";

/** Final filing joins use every actual source copy and separate owner forms. */
export function reconcileForm8606RothInventories(
  pending: Readonly<Record<string, unknown>>,
  filer?: FilerIdentity,
) {
  const items = pending.f1099r ? rSchema.parse(pending.f1099r).f1099rs : [];
  const facts = reconcileRothOwnerInventoryCopies(items);
  const collection = pending.form8606 as {
    roth_owner_inventory_reviews?: unknown;
    owner_forms?: Record<string, unknown>[];
  } | undefined;
  if (!facts.length) {
    if (collection?.roth_owner_inventory_reviews) {
      throw new Error(
        "Roth owner forms have no actual current source inventory",
      );
    }
    return undefined;
  }
  if (
    !filer ||
    !(filer.filingStatus === FilingStatus.Single ||
      filer.filingStatus === FilingStatus.MarriedFilingJointly) ||
    items.some((row) =>
      (row.box7_ira_simple_indicator ||
        ["J", "T", "Q"].includes(row.box7_distribution_code ?? "")) &&
      !row.roth_owner_inventory_review
    )
  ) {
    throw new Error(
      "Complete Roth owner filing needs supported filer and all current IRA source joins",
    );
  }
  for (const row of facts) {
    for (
      const transfer of row.review.current_conversion?.accounts.flatMap((a) =>
        a.transfers
      ) ?? []
    ) {
      const source = transfer.issued_form1099r;
      if (source.source_kind === "completed_form4852") {
        const substitutes = (pending.f4852 as {
          f4852s?: {
            completed_form_review_reference?: string;
            distribution_source?: { account_type?: string };
            retirement_source?: { roth_owner_inventory_review?: unknown };
          }[];
        } | undefined)?.f4852s ?? [];
        const matched = substitutes.filter((s) =>
          s.completed_form_review_reference ===
            source.completed_form4852_reference &&
          isDeepStrictEqual(
            s.retirement_source?.roth_owner_inventory_review,
            row.review,
          )
        );
        const accountType = matched[0]?.distribution_source?.account_type;
        const matchedType = source.originating_account_type === "simple_ira"
          ? accountType === "simple_ira"
          : accountType === "traditional_ira" || accountType === "sep_ira";
        if (
          matched.length !== 1 || !matchedType
        ) {
          throw new Error(
            "Current traditional/SIMPLE conversion requires its matching retained Form4852 account classification",
          );
        }
      }
    }
  }
  const annualOwners = facts.filter((row) =>
    row.review.current_conversion?.annual_traditional_activity
  );
  if (annualOwners.length) {
    const wages = pending.w2 ? wagesSchema.parse(pending.w2).w2s : [];
    const identities = [
      filer.primarySSN,
      ...(filer.filingStatus === FilingStatus.MarriedFilingJointly
        ? [filer.spouse?.ssn]
        : []),
    ].filter(Boolean).map((s) => s!.replace(/\D/g, ""));
    const compensation = wages.filter((w) =>
      w.box13_statutory_employee !== true &&
      identities.includes(w.employee_ssn?.replace(/\D/g, "") ?? "")
    ).reduce((total, w) =>
      total + Math.round(w.box1_wages * 100), 0) / 100;
    const contributed = facts.map((row) => ({
      row,
      amount: (row.review.current_conversion?.annual_traditional_activity
            ?.contributions ?? []).reduce(
              (total, c) =>
                total + Math.round(c.form5498.box1_ira_contributions * 100),
              0,
            ) / 100 +
        row.review.contributions.filter((c) => c.form5498.tax_year === 2025)
            .reduce(
              (total, c) =>
                total + Math.round(c.form5498.box10_roth_contributions * 100),
              0,
            ) / 100,
    }));
    const schedule1 = pending.schedule1 as Record<string, unknown> | undefined;
    const agi = (pending.f1040 as Record<string, unknown> | undefined)
      ?.line11_agi;
    if (typeof agi === "number") {
      const magi = agi - facts.reduce((sum, row) =>
        sum + (row.currentConversion?.taxable ?? 0), 0) +
        Number(schedule1?.line21_student_loan_interest ?? 0);
      for (const row of facts) {
        const currentRoth = row.review.contributions.filter((c) =>
          c.form5498.tax_year === 2025
        ).reduce((sum, c) =>
          sum + Math.round(c.form5498.box10_roth_contributions * 100), 0) / 100;
        if (!currentRoth) {
          continue;
        }
        const traditional =
          (row.review.current_conversion?.annual_traditional_activity
            ?.contributions ?? []).reduce((sum, c) =>
              sum + Math.round(c.form5498.box1_ira_contributions * 100), 0) /
          100;
        const fullLimit = Math.min(
          row.review.owner_identity.date_of_birth <= "1975-12-31" ? 8000 : 7000,
          compensation - contributed.filter((c) =>
            c.row !== row
          ).reduce((sum, c) =>
            sum + c.amount, 0),
        );
        const residual = fullLimit - traditional;
        const lower = filer.filingStatus === FilingStatus.MarriedFilingJointly
          ? 236000
          : 150000;
        const width = filer.filingStatus === FilingStatus.MarriedFilingJointly
          ? 10000
          : 15000;
        const allowed = magi >= lower + width
          ? 0
          : magi <= lower
          ? residual
          : Math.min(
            residual,
            Math.max(
              200,
              Math.ceil(fullLimit * (lower + width - magi) / width / 10) * 10,
            ),
          );
        if (
          currentRoth > allowed || pending.form2555 || pending.form8839 ||
          pending.form8815 || items.some((i) =>
            i.box7_distribution_code === "H" ||
            i.box7_distribution_code === "G" &&
              (i.box2a_taxable_amount ?? 0) > 0
          )
        ) {
          throw new Error(
            "Annual current Roth regular contributions need actual MAGI/combined-contribution eligibility and supported exclusion/plan-conversion source joins",
          );
        }
      }
    }
    const saverCeiling =
      filer.filingStatus === FilingStatus.MarriedFilingJointly ? 79000 : 39500;
    if (
      contributed.some(({ row, amount }) =>
        amount >
          (row.review.owner_identity.date_of_birth <= "1975-12-31"
            ? 8000
            : 7000)
      ) || contributed.reduce((t, c) => t + c.amount, 0) > compensation ||
      (schedule1?.line20_ira_deduction ?? 0) !== 0 || typeof agi !== "number" ||
      agi <= saverCeiling
    ) {
      throw new Error(
        "Annual nondeductible traditional contributions need actual owner/combined compensation limits, retained election, no conflicting deduction and supported Saver-credit source joins",
      );
    }
  }
  const expectedForms = facts.filter((row) => row.requires8606).map((row) => ({
    owner: row.review.owner,
    ...rothOwnerPrintFields(row),
  }));
  const rootFields = collection as Record<string, unknown> | undefined;
  const rootZero = [
    "print_line1_nondeductible",
    "print_line2_prior_basis",
    "print_line3_total_basis",
    "print_line14_remaining_basis",
    "source_traditional_distributions",
    "source_roth_conversion",
    "source_roth_distribution",
    "source_roth_basis_contributions",
    "source_roth_basis_conversions",
  ];
  if (
    !rootFields || (rootFields.nondeductible_contributions ?? 0) !== 0 ||
    rootZero.some((key) => rootFields[key] !== 0) ||
    Object.entries(rootFields).some(([key, value]) =>
      value !== undefined &&
      ![
        ...rootZero,
        "roth_owner_inventory_reviews",
        "owner_forms",
        "nondeductible_contributions",
      ].includes(key)
    )
  ) {
    throw new Error(
      "Roth owner collection cannot merge unrelated scalar/other8606 activity",
    );
  }
  if (
    !isDeepStrictEqual(
      collection?.roth_owner_inventory_reviews,
      facts.map((row) => row.review),
    ) ||
    !isDeepStrictEqual(collection?.owner_forms, expectedForms)
  ) {
    throw new Error(
      "Form8606 separate owner copies/history/basis/earnings differ from actual current inventory",
    );
  }
  const general = pending.general as Record<string, unknown> | undefined;
  const forms5329 = (pending.form5329 as
    | { owner_forms?: Record<string, unknown>[] }
    | undefined)?.owner_forms ?? [];
  const owners = facts.map((row) => {
    const spouse = row.review.owner === "S";
    const ownerSsn = (spouse ? filer.spouse?.ssn : filer.primarySSN)?.replace(
      /\D/g,
      "",
    );
    const ownerName = spouse
      ? [
        filer.spouse?.firstName,
        filer.spouse?.middleInitial,
        filer.spouse?.lastName,
      ].filter(Boolean).join(" ")
      : filer.fullName;
    const earlyForms = forms5329.filter((form) =>
      form.owner === row.review.owner
    );
    if (
      (spouse && filer.filingStatus !== FilingStatus.MarriedFilingJointly) ||
      !ownerName ||
      ownerSsn !== row.review.owner_identity.owner_ssn ||
      general?.[spouse ? "spouse_dob" : "taxpayer_dob"] !==
        row.review.owner_identity.date_of_birth ||
      (row.earlyTaxable > 0
        ? earlyForms.length !== 1 ||
          earlyForms[0].early_distribution !== row.earlyTaxable ||
          !isDeepStrictEqual(
            earlyForms[0].roth_owner_inventory_review,
            (row.review.conversions?.length ||
                row.review.prior_distributions?.length ||
                row.review.current_conversion)
              ? row.review
              : undefined,
          )
        : earlyForms.length !== 0)
    ) {
      throw new Error(
        "Roth separate owner birth/header and Form5329 early earnings inventory differ",
      );
    }
    return {
      ...row,
      ownerSsn,
      ownerName,
      fields: expectedForms.find((form) => form.owner === row.review.owner),
    };
  });
  const f1040 = pending.f1040 as Record<string, unknown> | undefined;
  const gross = roundWholeDollars(
    facts.reduce((sum, row) => sum + Math.round(row.rawTotalGross * 100), 0) /
      100,
  );
  const taxable = facts.reduce((sum, row) => sum + row.totalTaxable, 0);
  if (
    f1040?.line4a_ira_gross !== gross ||
    (f1040?.line4b_ira_taxable ?? 0) !== taxable
  ) {
    throw new Error(
      "Form1040 Roth gross/taxable differs from all actual current owner payments",
    );
  }
  return { owners, gross, taxable };
}
