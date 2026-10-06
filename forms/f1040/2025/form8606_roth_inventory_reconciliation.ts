import { isDeepStrictEqual } from "node:util";
import { inputSchema as rSchema } from "../nodes/inputs/f1099r/index.ts";
import {
  reconcileRothOwnerInventoryCopies,
  rothOwnerPrintFields,
} from "../nodes/intermediate/forms/form8606/roth-inventory.ts";
import { roundWholeDollars } from "../whole-dollars.ts";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";

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
