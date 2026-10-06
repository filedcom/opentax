import {
  currentRothConversionDocuments,
  currentRothConversionSchema,
  reviewedCurrentRothConversion,
} from "./roth-current-conversion.ts";
import {
  reviewedRothConversions,
  rothConversionDocuments,
  rothConversionYearSchema,
  rothSourceMoney,
} from "./roth-conversion.ts";
import { z } from "zod";
import {
  reviewedRothHistory,
  rothDistributionYearSchema,
} from "./roth-history.ts";
import { isDeepStrictEqual } from "node:util";
import { roundWholeDollars } from "../../../../whole-dollars.ts";
import {
  rothActivityReviewSchema,
  rothPaymentAgeFacts,
} from "./roth-activity.ts";

const paymentSchema = rothActivityReviewSchema.shape.payment.extend({
  form1099r_source_document_reference: z.string().trim().min(1),
  issuer: z.object({
    name: z.string().trim().min(1),
    address_line1: z.string().trim().min(1),
    city: z.string().trim().min(1),
    state: z.string().regex(/^[A-Z]{2}$/),
    zip: z.string().trim().min(5),
  }).strict(),
  federal_withheld: z.number().nonnegative(),
  state_tax_withheld: z.number().nonnegative(),
  local_tax_withheld: z.number().nonnegative(),
}).strict();
export const rothOwnerInventorySchema = rothActivityReviewSchema.omit({
  payment: true,
  form1099r_source_document_reference: true,
  inventory: true,
}).extend({
  owner: z.enum(["T", "S"]),
  inventory: rothActivityReviewSchema.shape.inventory.omit({
    no_other_current_roth_distribution: true,
    no_conversions_or_qualified_plan_rollovers: true,
    no_prior_distributions_or_returned_contributions: true,
  })
    .extend({
      all_current_roth_payments_included: z.literal(true),
      no_conversions_or_qualified_plan_rollovers: z.boolean(),
      all_prior_roth_conversion_records_included: z.literal(true).optional(),
      no_qualified_plan_rollovers_confirmed: z.literal(true).optional(),
      no_prior_distributions_or_returned_contributions: z.boolean(),
      all_prior_roth_payments_included: z.literal(true).optional(),
      no_returned_contributions_confirmed: z.literal(true).optional(),
    }).strict(),
  contributions: rothActivityReviewSchema.shape.contributions.element.extend({
    form5498: rothActivityReviewSchema.shape.contributions.element.shape
      .form5498.extend({ box3_roth_conversion_amount: rothSourceMoney }),
  }).array(),
  conversions: z.array(rothConversionYearSchema).min(1).optional(),
  current_conversion: currentRothConversionSchema.optional(),
  prior_distributions: z.array(rothDistributionYearSchema).min(1).optional(),
  payments: z.array(paymentSchema),
}).strict();
export type RothOwnerInventory = z.infer<typeof rothOwnerInventorySchema>;
const sumMoney = (values: readonly number[]) =>
  values.reduce((sum, value) => sum + Math.round(value * 100), 0) / 100;

/** Calculate the annual owner basis once; each payment keeps its actual lineage. */
export function reviewedRothOwnerInventory(raw: unknown) {
  const review = rothOwnerInventorySchema.parse(raw);
  if (!review.payments.length && !review.current_conversion) {
    throw new Error(
      "Empty current owner inventory requires actual conversion sources",
    );
  }
  const hasHistory = !!review.prior_distributions?.length;
  const currentConversion = review.current_conversion
    ? reviewedCurrentRothConversion(
      review.current_conversion,
      review.owner_identity,
      review.inventory.accounts,
    )
    : undefined;
  if (review.current_conversion) {
    const prior = review.current_conversion.prior_form8606;
    const annuals = [
      ...(review.conversions ?? []).map((r) => r.prior_form8606),
      ...(review.prior_distributions ?? []).map((r) => r.prior_form8606),
    ].filter((r) => r.tax_year === 2024);
    if (
      annuals.some((r) =>
        ["source_document_reference", "owner_name", "owner_ssn"].some((k) =>
          r[k as keyof typeof r] !== prior[k as keyof typeof prior]
        )
      ) || (review.conversions ?? []).some((r) =>
        r.prior_form8606.tax_year === 2024 &&
        (prior.filed_part_i.method !== "allocated" ||
          prior.filed_part_i.line8 !==
            r.prior_form8606.filed_line16_converted ||
          prior.filed_part_i.line11 !==
            r.prior_form8606.filed_line17_nontaxable)
      )
    ) {
      throw new Error(
        "Current conversion prior basis must join one actual annual filed2024 8606",
      );
    }
  }
  for (const annual of review.prior_distributions ?? []) {
    const convertedYear = review.conversions?.find((row) =>
      row.prior_form8606.tax_year === annual.prior_form8606.tax_year
    );
    if (
      convertedYear &&
      ["source_document_reference", "owner_ssn", "owner_name"].some((key) =>
        convertedYear
          .prior_form8606[key as keyof typeof convertedYear.prior_form8606] !==
          annual.prior_form8606[key as keyof typeof annual.prior_form8606]
      )
    ) {
      throw new Error(
        "Roth conversion/distribution PartsII/III must join one actual annual filed8606",
      );
    }
  }
  if (
    hasHistory
      ? review.inventory.no_prior_distributions_or_returned_contributions !==
          false ||
        review.inventory.all_prior_roth_payments_included !== true ||
        review.inventory.no_returned_contributions_confirmed !== true
      : review.inventory.no_prior_distributions_or_returned_contributions !==
        true
  ) {
    throw new Error(
      "Roth prior distribution inventory needs complete original payment and filed-history sources",
    );
  }
  const converted = reviewedRothConversions(
    review.conversions ?? [],
    review.owner_identity.owner_ssn,
    review.inventory.accounts,
    review.owner_identity.date_of_birth,
  );
  if (
    (converted.length || currentConversion)
      ? review.inventory.no_conversions_or_qualified_plan_rollovers !== false ||
        review.inventory.all_prior_roth_conversion_records_included !== true ||
        review.inventory.no_qualified_plan_rollovers_confirmed !== true
      : review.inventory.no_conversions_or_qualified_plan_rollovers !== true ||
        review.contributions.length === 0
  ) {
    throw new Error(
      "Roth complete conversion inventory needs actual listed prior records or regular-only history",
    );
  }
  const owned = review.inventory.accounts.map((row) =>
    JSON.stringify([row.custodian_ein, row.account_number])
  );
  if (
    new Set(owned).size !== owned.length ||
    review.inventory.owner_ssn !== review.owner_identity.owner_ssn
  ) throw new Error("Roth complete inventory owner/accounts differ");
  const years = new Set<string>();
  const dates = [
    ...(currentConversion?.review.accounts ?? []).flatMap((account) =>
      account.transfers.map((t) => t.receipt.received_on)
    ),
    ...(review.conversions ?? []).flatMap((row) =>
      row.accounts.flatMap((account) =>
        account.transfers.map((row) => row.receipt.received_on)
      )
    ),
  ];
  for (const row of review.contributions) {
    const form = row.form5498,
      key = JSON.stringify([
        form.tax_year,
        form.custodian_ein,
        form.account_number,
      ]);
    if (
      years.has(key) ||
      !owned.includes(
        JSON.stringify([form.custodian_ein, form.account_number]),
      ) || form.owner_ssn !== review.owner_identity.owner_ssn ||
      sumMoney(row.receipts.map((row) => row.amount)) !==
        form.box10_roth_contributions
    ) {
      throw new Error(
        "Roth complete regular5498/receipt owner/account/annual amounts differ",
      );
    }
    years.add(key);
    for (const receipt of row.receipts) {
      if (
        receipt.owner_ssn !== form.owner_ssn ||
        receipt.custodian_ein !== form.custodian_ein ||
        receipt.account_number !== form.account_number ||
        receipt.designated_tax_year !== form.tax_year ||
        receipt.received_on < review.owner_identity.date_of_birth ||
        receipt.received_on < `${form.tax_year}-01-01` ||
        receipt.received_on > `${form.tax_year + 1}-04-15`
      ) {
        throw new Error(
          "Roth complete regular contribution receipt facts differ",
        );
      }
      dates.push(receipt.received_on);
    }
  }
  for (const regular of review.contributions) {
    const convertedForm = [
      ...(review.conversions ?? []).flatMap((year) =>
        year.accounts.map((account) => account.form5498)
      ),
      ...(review.current_conversion?.accounts ?? []).map((account) =>
        account.form5498
      ),
    ].find((form) =>
      form.tax_year === regular.form5498.tax_year &&
      form.custodian_ein === regular.form5498.custodian_ein &&
      form.account_number === regular.form5498.account_number
    );
    if (
      convertedForm
        ? !isDeepStrictEqual(convertedForm, regular.form5498)
        : regular.form5498.box3_roth_conversion_amount !== 0
    ) {
      throw new Error(
        "Roth regular/conversion activity must join one actual annual issued5498 with both source boxes",
      );
    }
  }
  for (
    const form of [
      ...(review.conversions ?? []).flatMap((year) =>
        year.accounts.map((account) => account.form5498)
      ),
      ...(review.current_conversion?.accounts ?? []).map((account) =>
        account.form5498
      ),
    ]
  ) {
    const regular = review.contributions.find((row) =>
      row.form5498.tax_year === form.tax_year &&
      row.form5498.custodian_ein === form.custodian_ein &&
      row.form5498.account_number === form.account_number
    );
    if (form.box10_roth_contributions > 0 && !regular) {
      throw new Error(
        "Roth conversion annual5498 includes undisclosed regular contributions",
      );
    }
  }
  const firstContributionTaxYear = Math.min(
    ...review.contributions.map((row) => row.form5498.tax_year),
    ...converted.map((row) => row.year),
    ...(currentConversion ? [2025] : []),
  );
  const rawBasis = sumMoney(
    review.contributions.map((row) => row.form5498.box10_roth_contributions),
  );
  const history = hasHistory
    ? reviewedRothHistory(
      review.prior_distributions!,
      review.owner_identity,
      review.inventory.accounts,
      review.contributions,
      review.conversions ?? [],
    )
    : undefined;
  const basis = history?.regularBasis ?? roundWholeDollars(rawBasis);
  const currentConversions = [
    ...(history?.pools ?? converted),
    ...(currentConversion ? [currentConversion] : []),
  ];
  const payments = review.payments.map((payment) => {
    if (
      payment.owner_ssn !== review.owner_identity.owner_ssn ||
      !owned.includes(
        JSON.stringify([payment.custodian_ein, payment.account_number]),
      ) || !payment.distributed_on.startsWith("2025-") ||
      payment.distributed_on < review.owner_identity.date_of_birth ||
      dates.every((date) => date > payment.distributed_on)
    ) {
      throw new Error(
        "Roth complete payment owner/account/date has no actual historical source join",
      );
    }
    return {
      payment,
      rawBasis,
      basis,
      firstContributionTaxYear,
      ...rothPaymentAgeFacts(
        review.owner_identity,
        payment,
        firstContributionTaxYear,
      ),
    };
  });
  const references = [
    ...rothOwnerInventoryDocuments(review).map((row) =>
      row.source_document_reference
    ),
    ...(review.conversions ?? []).filter((row) =>
      !review.prior_distributions?.some((annual) =>
        annual.prior_form8606.source_document_reference ===
          row.prior_form8606.source_document_reference
      )
    ).map((row) => row.prior_form8606.source_document_reference),
    ...(review.prior_distributions ?? []).flatMap((
      row,
    ) => [
      row.prior_form8606.source_document_reference,
      ...(row.prior_form5329
        ? [row.prior_form5329.source_document_reference]
        : []),
    ]),
    ...(review.current_conversion &&
        ![
          ...(review.conversions ?? []).map((r) =>
            r.prior_form8606.source_document_reference
          ),
          ...(review.prior_distributions ?? []).map((r) =>
            r.prior_form8606.source_document_reference
          ),
        ].includes(
          review.current_conversion.prior_form8606.source_document_reference,
        )
      ? [review.current_conversion.prior_form8606.source_document_reference]
      : []),
    ...review.payments.map((row) => row.form1099r_source_document_reference),
  ];
  const lineage = review.payments.map((row) =>
    JSON.stringify([
      row.custodian_ein,
      row.account_number,
      row.distribution_reference,
    ])
  );
  if (
    new Set(references).size !== references.length ||
    new Set(lineage).size !== lineage.length
  ) {
    throw new Error(
      "Roth owner inventory repeats current payment source/copy/account lineage",
    );
  }
  const nonqualified = payments.filter((row) => !row.qualified);
  const rawGross = sumMoney(
    payments.map((row) => row.payment.gross_distribution),
  );
  const rawNonqualifiedGross = sumMoney(
    nonqualified.map((row) => row.payment.gross_distribution),
  );
  const gross = roundWholeDollars(rawGross);
  const nonqualifiedGross = roundWholeDollars(rawNonqualifiedGross);
  const afterRegular = Math.max(0, nonqualifiedGross - basis);
  const conversionBasis = currentConversions.reduce(
    (sum, row) => sum + row.gross,
    0,
  );
  const taxable = Math.max(0, afterRegular - conversionBasis);
  // Age-based J payments necessarily precede this owner's age-exempt T
  // payments. Regular contributions are consumed first across every account.
  const earlyGross = roundWholeDollars(
    sumMoney(
      nonqualified.filter((row) => !row.ageException).map((row) =>
        row.payment.gross_distribution
      ),
    ),
  );
  let earlyRemainder = Math.max(0, earlyGross - basis);
  let recapture = 0;
  const conversionAllocations = currentConversions.map((row) => {
    const allocatedTaxable = Math.min(earlyRemainder, row.taxable);
    earlyRemainder -= allocatedTaxable;
    const allocatedNontaxable = Math.min(earlyRemainder, row.nontaxable);
    earlyRemainder -= allocatedNontaxable;
    if (row.year >= 2021) recapture += allocatedTaxable;
    return { ...row, allocatedTaxable, allocatedNontaxable };
  });
  const earlyEarnings = Math.min(taxable, earlyRemainder);
  const earlyTaxable = recapture + earlyEarnings +
    (currentConversion?.earlyWithdrawalTaxable ?? 0);
  return {
    review,
    payments,
    rawGross,
    gross,
    nonqualifiedGross,
    rawBasis,
    basis,
    taxable,
    earlyTaxable,
    earlyEarnings,
    recapture,
    conversionBasis,
    conversionAllocations,
    requires8606: nonqualified.length > 0 || !!currentConversion,
    currentConversion,
    rawTotalGross: sumMoney([rawGross, currentConversion?.rawGross ?? 0]),
    totalTaxable: taxable + (currentConversion?.taxable ?? 0) +
      (currentConversion?.withdrawalTaxable ?? 0),
    rawRemainingContributionBasis: Math.max(
      0,
      rawBasis - rawNonqualifiedGross,
    ),
    print: {
      print_roth_line19_distributions: nonqualifiedGross,
      print_roth_line20_homebuyer: 0,
      print_roth_line21_after_homebuyer: nonqualifiedGross,
      print_roth_line22_contribution_basis: basis,
      print_roth_line23_after_contribution_basis: afterRegular,
      print_roth_line24_conversion_basis: conversionBasis,
      print_roth_line25a_earnings: taxable,
      print_roth_line25b_disaster: 0,
      print_roth_line25c_taxable: taxable,
    },
  };
}

export function rothOwnerInventoryDocuments(review: RothOwnerInventory) {
  return [
    review.owner_identity,
    review.inventory,
    ...review.contributions.flatMap((row) => [row.form5498, ...row.receipts]),
    ...review.payments,
    ...(review.prior_distributions ?? []).flatMap((row) =>
      row.payments.flatMap((payment) => [payment, payment.issued_form1099r])
    ),
    ...[
      ...rothConversionDocuments(review.conversions ?? []),
      ...(review.current_conversion
        ? currentRothConversionDocuments(review.current_conversion)
        : []),
    ].filter((document) => {
      if (!("box3_roth_conversion_amount" in document)) return true;
      const regular = review.contributions.find((row) =>
        row.form5498.source_document_reference ===
          document.source_document_reference
      );
      if (!regular) return true;
      if (!isDeepStrictEqual(regular.form5498, document)) {
        throw new Error(
          "Shared issued5498 source reference has conflicting annual boxes",
        );
      }
      return false;
    }),
  ];
}

type SourceCopy = {
  roth_owner_inventory_review?: unknown;
  ts?: string;
  recipient_ssn?: string;
  payer_ein: string;
  payer_name?: string;
  payer_address_line1?: string;
  payer_address_city?: string;
  payer_address_state?: string;
  payer_address_zip?: string;
  account_number?: string;
  source_document_reference?: string;
  box1_gross_distribution: number;
  box7_distribution_code: string;
  box7_code2?: string;
  box13_date_of_payment?: string;
  box2a_taxable_amount?: number;
  box2b_not_determined?: boolean;
  box7_ira_simple_indicator?: boolean;
  exclude_8606_roth?: boolean;
  rollover_code?: string;
  box4_federal_withheld?: number;
  box14_state_tax?: number;
  box17_local_tax?: number;
};

/** Complete owner-qualified joins, including ordinary issued and substitute copies. */
export function reconcileRothOwnerInventoryCopies(
  items: readonly SourceCopy[],
) {
  const current = items.filter((row) => row.roth_owner_inventory_review);
  if (!current.length) return [];
  const groups = new Map<
    string,
    ReturnType<typeof reviewedRothOwnerInventory>
  >();
  for (const item of current) {
    const facts = reviewedRothOwnerInventory(item.roth_owner_inventory_review);
    const previous = groups.get(facts.review.owner);
    if (previous && !isDeepStrictEqual(previous.review, facts.review)) {
      throw new Error(
        "Current Roth copies disagree on the complete owner history/payment inventory",
      );
    }
    groups.set(facts.review.owner, facts);
    const converted = facts.review.current_conversion?.accounts.flatMap(
      (account) => account.transfers,
    ).find((t) =>
      (t.issued_form1099r.completed_form4852_reference ??
        t.issued_form1099r.source_document_reference) ===
        item.source_document_reference
    )?.issued_form1099r;
    if (converted) {
      if (
        item.ts !== facts.review.owner ||
        item.recipient_ssn?.replace(/\D/g, "") !== converted.owner_ssn ||
        item.payer_ein.replace(/\D/g, "") !== converted.payer_ein ||
        item.account_number !== converted.traditional_account_number ||
        item.box1_gross_distribution !== converted.box1_gross_distribution ||
        item.box2a_taxable_amount !== converted.box2a_taxable_amount ||
        item.box13_date_of_payment !== converted.distributed_on ||
        item.box7_distribution_code !== converted.box7_distribution_code ||
        item.box7_code2 !== undefined || item.box2b_not_determined !== true ||
        item.box7_ira_simple_indicator !== true ||
        item.rollover_code !== "C" || item.exclude_8606_roth !== undefined ||
        item.payer_name !== converted.issuer.name ||
        item.payer_address_line1 !== converted.issuer.address_line1 ||
        item.payer_address_city !== converted.issuer.city ||
        item.payer_address_state !== converted.issuer.state ||
        item.payer_address_zip !== converted.issuer.zip ||
        (item.box4_federal_withheld ?? 0) !== converted.federal_withheld ||
        (item.box14_state_tax ?? 0) !== converted.state_tax_withheld ||
        (item.box17_local_tax ?? 0) !== converted.local_tax_withheld
      ) {
        throw new Error(
          "Current conversion issued copy differs from actual owner/account/debit source",
        );
      }
      continue;
    }
    const withdrawal = facts.review.current_conversion
      ?.annual_traditional_activity?.withdrawals.find((w) =>
        w.issued_form1099r.source_document_reference ===
          item.source_document_reference
      )?.issued_form1099r;
    if (withdrawal) {
      if (
        item.ts !== facts.review.owner ||
        item.recipient_ssn?.replace(/\D/g, "") !== withdrawal.owner_ssn ||
        item.payer_ein.replace(/\D/g, "") !== withdrawal.payer_ein ||
        item.account_number !== withdrawal.traditional_account_number ||
        item.box1_gross_distribution !== withdrawal.box1_gross_distribution ||
        item.box2a_taxable_amount !== withdrawal.box2a_taxable_amount ||
        item.box13_date_of_payment !== withdrawal.distributed_on ||
        item.box7_distribution_code !== withdrawal.box7_distribution_code ||
        item.box7_code2 !== undefined || item.box2b_not_determined !== true ||
        item.box7_ira_simple_indicator !== true ||
        item.rollover_code !== undefined ||
        item.exclude_8606_roth !== undefined ||
        item.payer_name !== withdrawal.issuer.name ||
        item.payer_address_line1 !== withdrawal.issuer.address_line1 ||
        item.payer_address_city !== withdrawal.issuer.city ||
        item.payer_address_state !== withdrawal.issuer.state ||
        item.payer_address_zip !== withdrawal.issuer.zip ||
        (item.box4_federal_withheld ?? 0) !== withdrawal.federal_withheld ||
        (item.box14_state_tax ?? 0) !== withdrawal.state_tax_withheld ||
        (item.box17_local_tax ?? 0) !== withdrawal.local_tax_withheld
      ) {
        throw new Error(
          "Annual traditional issued withdrawal copy differs from actual owner/account/paid source",
        );
      }
      continue;
    }
    const payment = facts.review.payments.find((row) =>
      row.form1099r_source_document_reference === item.source_document_reference
    );
    if (
      !payment || item.ts !== facts.review.owner ||
      item.recipient_ssn?.replace(/\D/g, "") !== payment.owner_ssn ||
      item.payer_ein.replace(/\D/g, "") !== payment.custodian_ein ||
      item.account_number !== payment.account_number ||
      item.box1_gross_distribution !== payment.gross_distribution ||
      item.box13_date_of_payment !== payment.distributed_on ||
      item.box7_distribution_code !== payment.distribution_code ||
      item.box7_code2 !== undefined ||
      item.payer_name !== payment.issuer.name ||
      item.payer_address_line1 !== payment.issuer.address_line1 ||
      item.payer_address_city !== payment.issuer.city ||
      item.payer_address_state !== payment.issuer.state ||
      item.payer_address_zip !== payment.issuer.zip ||
      (item.box4_federal_withheld ?? 0) !== payment.federal_withheld ||
      (item.box14_state_tax ?? 0) !== payment.state_tax_withheld ||
      (item.box17_local_tax ?? 0) !== payment.local_tax_withheld ||
      item.box2a_taxable_amount !== undefined ||
      item.box2b_not_determined !== true ||
      item.box7_ira_simple_indicator === true || item.exclude_8606_roth !== true
    ) {
      throw new Error(
        "Current Roth copy owner/account/payment and unknown-taxable facts differ from complete inventory",
      );
    }
  }
  for (const facts of groups.values()) {
    const actual = current.filter((row) => row.ts === facts.review.owner);
    const expectedCurrentReferences = [
      ...(facts.review.current_conversion?.annual_traditional_activity
        ?.withdrawals ?? []).map((w) =>
          w.issued_form1099r.source_document_reference
        ),
      ...facts.review.payments.map((payment) =>
        payment.form1099r_source_document_reference
      ),
      ...(facts.review.current_conversion?.accounts ?? []).flatMap((account) =>
        account.transfers.map((
          t,
        ) => (t.issued_form1099r.completed_form4852_reference ??
          t.issued_form1099r.source_document_reference)
        )
      ),
    ];
    if (
      actual.length !== expectedCurrentReferences.length ||
      expectedCurrentReferences.some((reference) =>
        actual.filter((row) =>
          row.source_document_reference ===
            reference
        ).length !== 1
      )
    ) {
      throw new Error(
        "Complete Roth owner inventory has missing/duplicate actual current issued/substitute payments",
      );
    }
    if (
      items.some((row) =>
        row.ts === facts.review.owner &&
        (row.box7_ira_simple_indicator ||
          ["J", "T", "Q"].includes(row.box7_distribution_code ?? "")) &&
        !row.roth_owner_inventory_review
      )
    ) {
      throw new Error(
        "Roth owner inventory conflicts with an unjoined current IRA source",
      );
    }
  }
  return [...groups.values()].sort((a, b) =>
    a.review.owner === b.review.owner ? 0 : a.review.owner === "T" ? -1 : 1
  );
}

export function rothOwnerPrintFields(
  facts: ReturnType<typeof reviewedRothOwnerInventory>,
) {
  return {
    print_line1_nondeductible: 0,
    print_line2_prior_basis: 0,
    print_line3_total_basis: 0,
    print_line14_remaining_basis: 0,
    source_traditional_distributions: facts.currentConversion?.withdrawals ?? 0,
    source_roth_conversion: facts.currentConversion?.gross ?? 0,
    source_roth_distribution: facts.nonqualifiedGross,
    source_roth_basis_contributions: facts.basis,
    source_roth_basis_conversions: facts.conversionBasis,
    roth_owner_inventory_review: facts.review,
    ...(facts.nonqualifiedGross > 0 ? facts.print : {}),
    ...(facts.currentConversion ? facts.currentConversion.print : {}),
  };
}
