import {
  AccountType,
  type FilerIdentity,
  FilingStatus,
} from "../mef/header.ts";
import {
  DependentCreditCategory,
  dependentFilingSchema,
  eicChildSourceProjection,
  filedDependentsFromGeneral,
  inputSchema as generalInputSchema,
} from "../nodes/inputs/general/index.ts";
import { inputSchema as form1099gSchema } from "../nodes/inputs/f1099g/index.ts";
import { inputSchema as form1099mSchema } from "../nodes/inputs/f1099m/index.ts";
import { inputSchema as form1099kSchema } from "../nodes/inputs/f1099k/index.ts";
import {
  distributionTotal,
  inputSchema as form1099patrSchema,
} from "../nodes/inputs/f1099patr/schema.ts";

export function assertKIncomeClassification(
  pending: Record<string, unknown>,
): void {
  if (pending.f1099k !== undefined) {
    form1099kSchema.parse(pending.f1099k);
  }
  const raw = (pending.f1099k as
    | { f1099ks?: Array<Record<string, unknown>> }
    | undefined)?.f1099ks ?? [];
  for (const item of raw) {
    const gross = item.box1a_gross_payments;
    if (gross === undefined || gross === 0) continue;
    if (
      typeof gross !== "number" || !Number.isFinite(gross) || gross < 0 ||
      ![
        "schedule_c",
        "schedule_1_line_8j",
        "personal_item_sales",
        "mixed_schedule_c_personal_item_sales",
        "reported_in_error",
      ].includes(item.for_routing as string)
    ) {
      throw new Error(
        "Form 1099-K box 1a needs a reviewed income classification before filing",
      );
    }
  }
}

function tin(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new Error(`Form 1040 ${label} source TIN must have nine digits`);
  }
  const digits = value.replaceAll("-", "");
  if (!/^\d{9}$/.test(digits)) {
    throw new Error(`Form 1040 ${label} source TIN must have nine digits`);
  }
  return digits;
}

function kRecipientMatches(
  item: Record<string, unknown>,
  filer: FilerIdentity,
): boolean {
  const recipient = tin(item.recipient_tin, "1099-K recipient");
  const recipients = [tin(filer.primarySSN, "taxpayer")];
  if (filer.filingStatus === FilingStatus.MarriedFilingJointly) {
    recipients.push(tin(filer.spouse?.ssn, "spouse"));
  }
  const tinMatches = Boolean(recipient && recipients.includes(recipient));
  const review = item.recipient_identity_review as
    | Record<string, unknown>
    | undefined;
  if (!review) return tinMatches;
  const normalize = (value: unknown) =>
    typeof value === "string"
      ? value.trim().replace(/\s+/g, " ").toUpperCase()
      : "";
  const names = [
    filer.fullName,
    filer.firstName && filer.lastName
      ? `${filer.firstName} ${filer.lastName}`
      : undefined,
    filer.filingStatus === FilingStatus.MarriedFilingJointly && filer.spouse
      ? `${filer.spouse.firstName} ${filer.spouse.lastName}`
      : undefined,
  ].map(normalize).filter(Boolean);
  return names.includes(normalize(review.recipient_name)) &&
    normalize(review.address_line1) === normalize(filer.address.line1) &&
    normalize(review.address_line2) === normalize(filer.address.line2) &&
    normalize(review.address_city) === normalize(filer.address.city) &&
    normalize(review.address_state) === normalize(filer.address.state) &&
    normalize(review.address_zip) === normalize(filer.address.zip) &&
    Boolean(normalize(review.source_reference));
}

export function assertKReportedErrorSources(
  pending: Record<string, unknown>,
  filer: FilerIdentity,
): void {
  const raw = (pending.f1099k as
    | { f1099ks?: Array<Record<string, unknown>> }
    | undefined)?.f1099ks ?? [];
  let total = 0;
  for (const item of raw) {
    if (
      item.for_routing !== "reported_in_error" &&
      item.reported_error_review === undefined
    ) continue;
    const review = item.reported_error_review as
      | Record<string, unknown>
      | undefined;
    const payments = review?.payments;
    const gross = item.box1a_gross_payments;
    if (
      typeof item.pse_name !== "string" || !item.pse_name.trim() ||
      !tin(item.pse_tin, "1099-K PSE") || !kRecipientMatches(item, filer) ||
      typeof gross !== "number" || !Number.isSafeInteger(gross) ||
      gross <= 0 || !Array.isArray(payments) || payments.length === 0 ||
      typeof review?.correction_request_reference !== "string" ||
      !review.correction_request_reference.trim()
    ) {
      throw new Error(
        "1099-K reported error needs identified payer, recipient, and correction request",
      );
    }
    const seen = new Set<string>();
    let subtotal = 0;
    for (const value of payments) {
      if (!value || typeof value !== "object") {
        throw new Error("1099-K reported-error payment is invalid");
      }
      const payment = value as Record<string, unknown>;
      if (
        typeof payment.transaction_id !== "string" ||
        !payment.transaction_id.trim() ||
        seen.has(payment.transaction_id) ||
        typeof payment.amount !== "number" ||
        !Number.isSafeInteger(payment.amount) || payment.amount <= 0 ||
        !["personal_gift", "expense_reimbursement"].includes(
          payment.kind as string,
        ) ||
        typeof payment.sender_name !== "string" ||
        !payment.sender_name.trim() ||
        typeof payment.payment_record_reference !== "string" ||
        !payment.payment_record_reference.trim() ||
        payment.no_goods_or_services !== true
      ) {
        throw new Error("1099-K reported-error payment is invalid");
      }
      seen.add(payment.transaction_id);
      subtotal += payment.amount;
    }
    const sales = item.personal_item_sales_review;
    if (
      Array.isArray(sales) &&
      sales.some((value) =>
        value && typeof value === "object" &&
        seen.has((value as Record<string, unknown>).transaction_id as string)
      )
    ) {
      throw new Error(
        "1099-K personal sale and reported error cannot share a transaction ID",
      );
    }
    if (
      item.for_routing === "reported_in_error"
        ? subtotal !== gross
        : subtotal >= gross
    ) {
      throw new Error("1099-K reported-error payments differ from box 1a");
    }
    total += subtotal;
  }
  const schedule1 = pending.schedule1 as Record<string, unknown> | undefined;
  if ((schedule1?.form1099k_reported_error_or_loss ?? 0) !== total) {
    throw new Error(
      "Schedule 1 1099-K reported-error amount differs from payer sources",
    );
  }
}

export function assertKWithholdingSourceIdentity(
  pending: Record<string, unknown>,
  filer: FilerIdentity,
): void {
  const raw =
    (pending.f1099k as { f1099ks?: Array<Record<string, unknown>> } | undefined)
      ?.f1099ks ?? [];
  const withheld = raw.filter((item) =>
    typeof item.box4_federal_withheld === "number" &&
    item.box4_federal_withheld > 0
  );
  let total = 0;
  for (const item of withheld) {
    if (
      typeof item.pse_name !== "string" || !item.pse_name.trim() ||
      !tin(item.pse_tin, "1099-K PSE") ||
      typeof item.box1a_gross_payments !== "number" ||
      item.box1a_gross_payments <= 0 ||
      typeof item.box4_federal_withheld !== "number" ||
      item.box4_federal_withheld > item.box1a_gross_payments ||
      ![
        "schedule_c",
        "schedule_1_line_8j",
        "personal_item_sales",
        "mixed_schedule_c_personal_item_sales",
        "reported_in_error",
      ].includes(
        item.for_routing as string,
      ) ||
      !kRecipientMatches(item, filer)
    ) {
      throw new Error(
        "1099-K withholding needs identified payer, recipient, and reported income",
      );
    }
    total += item.box4_federal_withheld as number;
  }
  const f1040 = pending.f1040 as Record<string, unknown> | undefined;
  if (
    (f1040?.line25b_f1099k_withheld ?? 0) !== total ||
    (typeof f1040?.line25b_withheld_1099 === "number"
        ? f1040.line25b_withheld_1099
        : 0) < total
  ) {
    throw new Error(
      "Form 1040 line 25b 1099-K withholding differs from payer box 4",
    );
  }
}

export function assertKPersonalSaleSources(
  pending: Record<string, unknown>,
  filer: FilerIdentity,
): void {
  const k =
    (pending.f1099k as { f1099ks?: Array<Record<string, unknown>> } | undefined)
      ?.f1099ks ?? [];
  const personal = k.filter((item) =>
    item.for_routing === "personal_item_sales" ||
    item.for_routing === "mixed_schedule_c_personal_item_sales"
  );
  const expected: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  for (const item of personal) {
    const sales = item.personal_item_sales_review;
    const gross = item.box1a_gross_payments;
    const pseTin = tin(item.pse_tin, "1099-K PSE");
    if (
      typeof item.pse_name !== "string" || !item.pse_name.trim() ||
      !pseTin || !kRecipientMatches(item, filer) ||
      typeof gross !== "number" || gross <= 0 ||
      !Array.isArray(sales) || sales.length === 0
    ) {
      throw new Error(
        "1099-K personal-item sales need identified payer, recipient, and reviewed items",
      );
    }
    let proceedsTotal = 0;
    for (const value of sales) {
      if (!value || typeof value !== "object") {
        throw new Error("1099-K personal-item sale review is invalid");
      }
      const sale = value as Record<string, unknown>;
      const expenses = sale.selling_expenses_review as
        | Record<string, unknown>
        | undefined;
      const id = `1099k:${pseTin}:${sale.transaction_id}`;
      const acquired = new Date(`${sale.date_acquired}T00:00:00Z`);
      const sold = new Date(`${sale.date_sold}T00:00:00Z`);
      if (
        typeof sale.transaction_id !== "string" ||
        !sale.transaction_id.trim() ||
        seen.has(id) ||
        typeof sale.description !== "string" || !sale.description.trim() ||
        typeof sale.date_acquired !== "string" ||
        Number.isNaN(acquired.getTime()) ||
        acquired.toISOString().slice(0, 10) !== sale.date_acquired ||
        typeof sale.date_sold !== "string" ||
        Number.isNaN(sold.getTime()) ||
        sold.toISOString().slice(0, 10) !== sale.date_sold ||
        !sale.date_sold.startsWith("2025-") || acquired >= sold ||
        typeof sale.proceeds !== "number" ||
        !Number.isSafeInteger(sale.proceeds) ||
        sale.proceeds <= 0 || typeof sale.cost_basis !== "number" ||
        !Number.isSafeInteger(sale.cost_basis) || sale.cost_basis < 0 ||
        sale.acquired_by_purchase !== true ||
        sale.personal_use_only !== true || sale.not_main_home !== true ||
        sale.not_collectible !== true ||
        sale.no_other_information_return_for_sale !== true ||
        typeof sale.acquisition_record_reference !== "string" ||
        !sale.acquisition_record_reference.trim() ||
        typeof sale.sale_record_reference !== "string" ||
        !sale.sale_record_reference.trim() ||
        (expenses !== undefined &&
          (typeof expenses.amount !== "number" ||
            !Number.isSafeInteger(expenses.amount) ||
            expenses.amount <= 0 || expenses.amount > sale.proceeds ||
            typeof expenses.expense_record_reference !== "string" ||
            !expenses.expense_record_reference.trim() ||
            expenses.not_in_cost_basis_or_other_deduction !== true))
      ) {
        throw new Error("1099-K personal-item sale review is invalid");
      }
      seen.add(id);
      proceedsTotal += sale.proceeds;
      const anniversary = new Date(acquired);
      anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1);
      if (
        acquired.getUTCMonth() === 1 && acquired.getUTCDate() === 29 &&
        anniversary.getUTCMonth() === 2
      ) anniversary.setUTCDate(0);
      const longTerm = sold > anniversary;
      const netProceeds = sale.proceeds - (expenses?.amount as number ?? 0);
      const loss = Math.max(0, sale.cost_basis - netProceeds);
      expected.push({
        part: longTerm ? "F" : "C",
        description: sale.description,
        source_transaction_id: id,
        date_acquired: sale.date_acquired,
        date_sold: sale.date_sold,
        proceeds: netProceeds,
        cost_basis: sale.cost_basis,
        ...(loss > 0 ? { adjustment_codes: "L", adjustment_amount: loss } : {}),
        gain_loss: Math.max(0, netProceeds - sale.cost_basis),
        is_long_term: longTerm,
      });
    }
    const mixed = item.for_routing === "mixed_schedule_c_personal_item_sales";
    const error = (item.reported_error_review as
      | { payments?: Array<{ amount: number }> }
      | undefined)?.payments?.reduce(
        (sum, payment) => sum + payment.amount,
        0,
      ) ??
      0;
    const business = mixed
      ? (item.schedule_c_receipts_review as Record<string, unknown> | undefined)
      : undefined;
    if (
      mixed
        ? typeof business?.included_in_schedule_c_gross_receipts !== "number" ||
          business.included_in_schedule_c_gross_receipts <= 0 ||
          typeof business.not_included_in_schedule_c_receipts !== "number" ||
          business.not_included_in_schedule_c_receipts < 0 ||
          proceedsTotal + error +
                business.included_in_schedule_c_gross_receipts +
                business.not_included_in_schedule_c_receipts !== gross
        : proceedsTotal + error !== gross
    ) {
      throw new Error("1099-K personal-item sale proceeds differ from box 1a");
    }
  }
  const rawRows = Array.isArray(pending.form8949)
    ? pending.form8949
    : (pending.form8949 as Record<string, unknown> | undefined)?.transaction;
  const actual = (Array.isArray(rawRows) ? rawRows : rawRows ? [rawRows] : [])
    .filter((row) =>
      row && typeof row === "object" &&
      typeof row.source_transaction_id === "string" &&
      row.source_transaction_id.startsWith("1099k:")
    );
  const canonical = (rows: Array<Record<string, unknown>>) =>
    rows.map((row) =>
      JSON.stringify(
        Object.entries(row).filter(([, value]) => value !== undefined)
          .sort(([a], [b]) => a.localeCompare(b)),
      )
    ).sort();
  if (
    JSON.stringify(canonical(actual)) !== JSON.stringify(canonical(expected))
  ) {
    throw new Error(
      "1099-K personal-item sales differ from filed Form 8949 rows",
    );
  }
}

export function assertF1040SourceIdentity(
  fields: Record<string, unknown>,
  filer: FilerIdentity,
): void {
  const taxpayer = tin(fields.taxpayer_ssn, "taxpayer");
  if (taxpayer !== undefined && taxpayer !== tin(filer.primarySSN, "filer")) {
    throw new Error("Form 1040 taxpayer source TIN differs from the filer");
  }
  const spouse = tin(fields.spouse_ssn, "spouse");
  if (
    spouse !== undefined &&
    spouse !== tin(filer.spouse?.ssn, "filer spouse")
  ) {
    throw new Error("Form 1040 spouse source TIN differs from the filer");
  }
}

export function assertEitcChildSources(
  pending: Record<string, unknown>,
  filer: FilerIdentity,
): void {
  const eitc = pending.eitc as Record<string, unknown> | undefined;
  const credit = eitc?.credit_amount;
  const count = eitc?.qualifying_children;
  if (typeof credit !== "number" || credit <= 0 || count === 0) return;
  const general = pending.general as Record<string, unknown> | undefined;
  const source = general?.dependents;
  const rows = eitc?.qualifying_child_details;
  if (
    !Array.isArray(source) || !Array.isArray(rows) ||
    typeof count !== "number" || rows.length !== count ||
    (pending.f1040 as Record<string, unknown> | undefined)?.line27_eitc !==
      credit ||
    tin(general?.taxpayer_ssn, "EIC filer") !==
      tin(filer.primarySSN, "filer")
  ) {
    throw new Error("Schedule EIC child source differs from the filed credit");
  }
  const projected = eicChildSourceProjection(generalInputSchema.parse(general));
  if (
    count !== projected.count ||
    rows.some((value, index) =>
      tin((value as Record<string, unknown>)?.ssn, "Schedule EIC child") !==
        tin(projected.details[index]?.ssn, "reviewed EIC child")
    )
  ) {
    throw new Error(
      "Schedule EIC child roster differs from reviewed general source",
    );
  }
  const seen = new Set<string>();
  for (const value of rows) {
    const row = value as Record<string, unknown>;
    const ssn = tin(row?.ssn, "Schedule EIC child");
    const matches = source.filter((value) =>
      value && typeof value === "object" &&
      tin((value as Record<string, unknown>).ssn, "dependent") === ssn
    );
    if (!ssn || seen.has(ssn) || matches.length !== 1) {
      throw new Error("Schedule EIC child needs one matching general source");
    }
    if (
      ssn === tin(filer.primarySSN, "EIC filer") ||
      (filer.filingStatus === FilingStatus.MarriedFilingJointly &&
        ssn === tin(filer.spouse?.ssn, "EIC joint spouse"))
    ) {
      throw new Error(
        "Schedule EIC child cannot use filer or joint-spouse SSN",
      );
    }
    seen.add(ssn);
    const dep = matches[0] as Record<string, unknown>;
    const release = dep.custodial_eitc_release_review as
      | Record<string, unknown>
      | undefined;
    if (
      dep.first_name !== row.first_name ||
      dep.last_name !== row.last_name ||
      dep.name_control !== row.name_control ||
      dep.dob !== row.dob ||
      dep.irs_relationship_code !== row.irs_relationship_code ||
      dep.months_in_home !== row.months_in_home ||
      dep.months_lived_with_you_in_us !== row.months_lived_with_you_in_us ||
      JSON.stringify(dep.eic_birth_residency_review) !==
        JSON.stringify(row.eic_birth_residency_review) ||
      dep.lived_in_us_over_half_year !== true ||
      dep.full_time_student !== row.full_time_student ||
      dep.disabled !== row.disabled || dep.ip_pin !== row.ip_pin ||
      dep.ssn_valid_for_employment !== true ||
      dep.tin_issued_by_due_date !== true ||
      (dep.dependent_on_another_return === true &&
        (!release ||
          typeof release.form8332_source_reference !== "string" ||
          !release.form8332_source_reference.trim() ||
          typeof release.custody_record_reference !== "string" ||
          !release.custody_record_reference.trim() ||
          release.custodial_parent_for_2025 !== true ||
          release.valid_2025_release_to_noncustodial_parent !== true ||
          release.no_competing_eitc_claim_verified !== true)) ||
      (dep.dependent_on_another_return !== true && release !== undefined)
    ) {
      throw new Error(
        "Schedule EIC child differs from reviewed general source",
      );
    }
  }
}

export function assertScheduleCReceiptSourceIdentity(
  pending: Record<string, unknown>,
  filer: FilerIdentity,
): void {
  const rawK =
    (pending.f1099k as { f1099ks?: Array<Record<string, unknown>> } | undefined)
      ?.f1099ks ?? [];
  const expectedK = rawK.filter((item) =>
    ["schedule_c", "mixed_schedule_c_personal_item_sales"].includes(
      item.for_routing as string,
    ) &&
    typeof item.box1a_gross_payments === "number" &&
    item.box1a_gross_payments > 0
  ).map((item) => {
    const review = item.schedule_c_receipts_review as Record<string, unknown>;
    return {
      business_reference: item.schedule_c_business_reference,
      pse_name: item.pse_name,
      pse_tin: tin(item.pse_tin, "1099-K PSE"),
      recipient_tin: tin(item.recipient_tin, "1099-K recipient"),
      box1a_gross_payments: item.box1a_gross_payments,
      ...(item.reported_error_review
        ? {
          reported_error_gross: (item.reported_error_review as {
            payments: Array<{ amount: number }>;
          }).payments.reduce((sum, payment) => sum + payment.amount, 0),
        }
        : {}),
      ...(item.for_routing === "mixed_schedule_c_personal_item_sales"
        ? {
          personal_item_sales_gross:
            (item.personal_item_sales_review as Array<Record<string, unknown>>)
              ?.reduce((sum: number, sale) => sum + Number(sale.proceeds), 0),
        }
        : {}),
      amount: review?.included_in_schedule_c_gross_receipts,
      ...(review?.customer_refunds_review
        ? { customer_refunds_review: review.customer_refunds_review }
        : {}),
      ...(review?.processor_fees_review
        ? { processor_fees_review: review.processor_fees_review }
        : {}),
      not_included_in_schedule_c_receipts: review
        ?.not_included_in_schedule_c_receipts,
      allocation_reference: review?.allocation_reference,
      no_overlap_with_other_1099s: review?.no_overlap_with_other_1099s,
      overlap_review_reference: review?.overlap_review_reference,
      ...(review?.duplicate_1099_review
        ? {
          duplicate_1099_review: {
            source_form:
              (review.duplicate_1099_review as Record<string, unknown>)
                .source_form as string,
            payer_tin: tin(
              (review.duplicate_1099_review as Record<string, unknown>)
                .payer_tin,
              "duplicate 1099 payer",
            ),
            amount: (review.duplicate_1099_review as Record<string, unknown>)
              .amount as number,
            transaction_review_reference:
              (review.duplicate_1099_review as Record<string, unknown>)
                .transaction_review_reference as string,
          },
        }
        : {}),
    };
  });
  const duplicateTotals = new Map<string, number>();
  const refundTotals = new Map<string, number>();
  const processorFeeTotals = new Map<string, number>();
  const refundIds = new Set<string>();
  for (const row of expectedK) {
    if (row.processor_fees_review !== undefined) {
      const fees = row.processor_fees_review as Record<string, unknown>;
      if (
        !fees || typeof fees !== "object" ||
        typeof fees.amount !== "number" ||
        !Number.isSafeInteger(fees.amount) || fees.amount <= 0 ||
        fees.amount > (row.amount as number) ||
        typeof fees.fee_record_reference !== "string" ||
        !fees.fee_record_reference.trim() ||
        fees.for_service_payments_only !== true ||
        fees.not_capitalized_or_deducted_elsewhere !== true
      ) {
        throw new Error("1099-K processor fee review is invalid");
      }
      const key = row.business_reference as string;
      processorFeeTotals.set(
        key,
        (processorFeeTotals.get(key) ?? 0) + fees.amount,
      );
    }
    const refunds = row.customer_refunds_review;
    if (refunds !== undefined) {
      if (!Array.isArray(refunds) || refunds.length === 0) {
        throw new Error("1099-K customer refunds need reviewed transactions");
      }
      let total = 0;
      for (const value of refunds) {
        const refund = value as Record<string, unknown>;
        const id = `${row.pse_tin}:${refund?.refund_transaction_id}`;
        if (
          !refund || typeof refund !== "object" ||
          typeof refund.original_payment_transaction_id !== "string" ||
          !refund.original_payment_transaction_id.trim() ||
          typeof refund.refund_transaction_id !== "string" ||
          !refund.refund_transaction_id.trim() || refundIds.has(id) ||
          typeof refund.amount !== "number" ||
          !Number.isSafeInteger(refund.amount) || refund.amount <= 0 ||
          typeof refund.refund_record_reference !== "string" ||
          !refund.refund_record_reference.trim() ||
          refund.issued_in_2025 !== true ||
          refund.same_business_sale !== true ||
          refund.not_claimed_elsewhere !== true
        ) {
          throw new Error("1099-K customer refund review is invalid");
        }
        refundIds.add(id);
        total += refund.amount;
      }
      if (total > (row.amount as number)) {
        throw new Error("1099-K customer refunds exceed business receipts");
      }
      const key = row.business_reference as string;
      refundTotals.set(key, (refundTotals.get(key) ?? 0) + total);
    }
    const omitted = row.not_included_in_schedule_c_receipts;
    const duplicate = row.duplicate_1099_review;
    if (
      typeof omitted !== "number" ||
      (omitted > 0 && (!duplicate || duplicate.amount !== omitted)) ||
      (omitted === 0 && duplicate)
    ) {
      throw new Error(
        "1099-K omitted receipts need one identified duplicate 1099 source",
      );
    }
    if (!duplicate) continue;
    if (
      !["1099nec", "1099misc"].includes(duplicate.source_form) ||
      !duplicate.payer_tin ||
      typeof duplicate.amount !== "number" ||
      !Number.isSafeInteger(duplicate.amount) || duplicate.amount <= 0
    ) {
      throw new Error("1099-K duplicate review has an invalid 1099 source");
    }
    const source = duplicate.source_form === "1099nec"
      ? (pending.f1099nec as
        | { f1099necs?: Array<Record<string, unknown>> }
        | undefined)
        ?.f1099necs ?? []
      : duplicate.source_form === "1099misc"
      ? (pending.f1099m as
        | { f1099ms?: Array<Record<string, unknown>> }
        | undefined)
        ?.f1099ms ?? []
      : [];
    const matches = source.filter((item) =>
      tin(item.payer_tin, "duplicate 1099 payer") === duplicate.payer_tin &&
      tin(
          item.recipient_ssn ?? item.recipient_tin,
          "duplicate 1099 recipient",
        ) ===
        row.recipient_tin &&
      item.schedule_c_business_reference === row.business_reference &&
      (duplicate.source_form === "1099nec"
        ? item.for_routing === "schedule_c"
        : item.box3_other_income_routing === "schedule_c")
    );
    const amount = duplicate.source_form === "1099nec"
      ? matches[0]?.box1_nec
      : matches[0]?.box3_other_income;
    if (
      matches.length !== 1 || typeof amount !== "number" ||
      !Number.isFinite(amount) || amount < duplicate.amount ||
      typeof duplicate.transaction_review_reference !== "string" ||
      !duplicate.transaction_review_reference.trim()
    ) {
      throw new Error(
        "1099-K omitted receipts do not match a filed NEC/MISC source",
      );
    }
    const key =
      `${duplicate.source_form}:${duplicate.payer_tin}:${row.recipient_tin}:${row.business_reference}`;
    const total = (duplicateTotals.get(key) ?? 0) + duplicate.amount;
    if (total > amount) {
      throw new Error(
        "1099-K duplicate allocations exceed the filed NEC/MISC source",
      );
    }
    duplicateTotals.set(key, total);
  }
  const scheduleC = pending.schedule_c;
  if (!scheduleC || typeof scheduleC !== "object") {
    if (expectedK.length) {
      throw new Error(
        "1099-K Schedule C source differs from the filed business",
      );
    }
    return;
  }
  const fields = scheduleC as Record<string, unknown>;
  if (
    typeof fields.line1_gross_receipts === "number" &&
    fields.line1_gross_receipts > 0
  ) {
    throw new Error(
      "Schedule C top-level gross receipts need business-linked source rows",
    );
  }
  const attorneySources = fields.attorney_fee_sources;
  const receiptSources = fields.f1099m_receipt_sources;
  const necSources = fields.f1099nec_receipt_sources;
  const kSources = fields.f1099k_receipt_sources;
  const sortRows = (rows: unknown[]) =>
    rows.map((row) =>
      JSON.stringify(
        Object.entries(row as Record<string, unknown>).sort(([a], [b]) =>
          a.localeCompare(b)
        ),
      )
    ).sort();
  if (
    !Array.isArray(kSources) ||
    JSON.stringify(sortRows(kSources)) !== JSON.stringify(sortRows(expectedK))
  ) {
    if (kSources !== undefined || expectedK.length) {
      throw new Error(
        "1099-K Schedule C source differs from the filed payer report",
      );
    }
  }
  if (
    attorneySources === undefined && receiptSources === undefined &&
    necSources === undefined && kSources === undefined
  ) return;
  if (
    (attorneySources !== undefined && !Array.isArray(attorneySources)) ||
    (receiptSources !== undefined && !Array.isArray(receiptSources)) ||
    (necSources !== undefined && !Array.isArray(necSources)) ||
    (kSources !== undefined && !Array.isArray(kSources))
  ) {
    throw new Error("1099 Schedule C sources must be arrays");
  }
  const businesses = fields.schedule_cs;
  if (!Array.isArray(businesses)) {
    throw new Error("1099 receipts need a Schedule C business");
  }
  for (const [businessReference, refunds] of refundTotals) {
    const matches = businesses.filter((business) =>
      business && typeof business === "object" &&
      business.business_reference === businessReference
    );
    if (
      matches.length !== 1 ||
      matches[0].line_2_returns_allowances !== refunds
    ) {
      throw new Error(
        "1099-K customer refunds differ from Schedule C line 2",
      );
    }
  }
  for (const [businessReference, fees] of processorFeeTotals) {
    const matches = businesses.filter((business) =>
      business && typeof business === "object" &&
      business.business_reference === businessReference
    );
    if (
      matches.length !== 1 || matches[0].line_10_commissions_fees !== fees
    ) {
      throw new Error(
        "1099-K processor fees differ from Schedule C line 10",
      );
    }
  }
  const rows = [
    ...(attorneySources ?? []).map((source: unknown) => ({
      source,
      kind: "attorney" as const,
    })),
    ...(receiptSources ?? []).map((source: unknown) => ({
      source,
      kind: "misc" as const,
    })),
    ...(necSources ?? []).map((source: unknown) => ({
      source,
      kind: "nec" as const,
    })),
    ...(kSources ?? []).map((source: unknown) => ({
      source,
      kind: "k" as const,
    })),
  ];
  const totals = new Map<string, number>();
  for (const { source, kind } of rows) {
    if (!source || typeof source !== "object") {
      throw new Error("1099 Schedule C source is invalid");
    }
    const row = source as Record<string, unknown>;
    const matches = businesses.filter((business) =>
      business && typeof business === "object" &&
      business.business_reference === row.business_reference
    );
    if (matches.length !== 1) {
      throw new Error(
        "1099 receipts need one matching Schedule C business",
      );
    }
    if (
      typeof row.amount !== "number" || !Number.isFinite(row.amount) ||
      row.amount <= 0 ||
      (kind === "attorney" &&
        (typeof row.allocation_review_reference !== "string" ||
          !row.allocation_review_reference.trim())) ||
      (kind === "misc" &&
        ![
          "box1_rents",
          "box2_royalties",
          "box3_other_income",
          "box5_fishing_boat",
          "box6_medical_payments",
          "box11_fish_purchased",
        ].includes(row.box as string)) ||
      (kind === "nec" &&
        (typeof row.payer_name !== "string" || !row.payer_name.trim() ||
          !tin(row.payer_tin, "1099-NEC payer"))) ||
      (kind === "k" &&
        (typeof row.pse_name !== "string" || !row.pse_name.trim() ||
          !tin(row.pse_tin, "1099-K PSE") ||
          typeof row.box1a_gross_payments !== "number" ||
          typeof row.not_included_in_schedule_c_receipts !== "number" ||
          row.amount + row.not_included_in_schedule_c_receipts !==
            (row.box1a_gross_payments as number) -
              (typeof row.personal_item_sales_gross === "number"
                ? row.personal_item_sales_gross
                : 0) -
              (typeof row.reported_error_gross === "number"
                ? row.reported_error_gross
                : 0) ||
          row.no_overlap_with_other_1099s !== true ||
          typeof row.allocation_reference !== "string" ||
          !row.allocation_reference.trim() ||
          typeof row.overlap_review_reference !== "string" ||
          !row.overlap_review_reference.trim())) ||
      typeof matches[0].line_1_gross_receipts !== "number" ||
      matches[0].line_1_gross_receipts < row.amount
    ) {
      throw new Error(
        "1099 source amount must be included in Schedule C gross receipts",
      );
    }
    const businessReference = row.business_reference as string;
    const total = (totals.get(businessReference) ?? 0) + row.amount;
    if (total > matches[0].line_1_gross_receipts) {
      throw new Error(
        "1099 sources exceed Schedule C gross receipts",
      );
    }
    totals.set(businessReference, total);
    const proprietor = matches[0].proprietor_recipient;
    if (matches[0].line_f_accounting_method !== "cash") {
      throw new Error(
        "1099 receipts need a cash-basis Schedule C business",
      );
    }
    const expected = proprietor === "T"
      ? tin(filer.primarySSN, "taxpayer")
      : proprietor === "S"
      ? tin(filer.spouse?.ssn, "spouse")
      : undefined;
    if (
      !expected ||
      tin(row.recipient_tin, "1099 recipient") !== expected
    ) {
      throw new Error(
        "1099 recipient differs from the Schedule C proprietor",
      );
    }
  }
}

export function assertSchedule1Box3SourceIdentity(
  pending: Record<string, unknown>,
  filer: FilerIdentity,
): void {
  const raw = (pending.f1099m as
    | { f1099ms?: Array<Record<string, unknown>> }
    | undefined)?.f1099ms ?? [];
  const sourceRows = raw.filter((item) =>
    item.box3_other_income_routing === "other_income" &&
    typeof item.box3_other_income === "number" &&
    item.box3_other_income > 0
  );
  const schedule1 = pending.schedule1 as Record<string, unknown> | undefined;
  const rows = schedule1?.f1099m_box3_other_income_sources;
  if (sourceRows.length === 0 && rows === undefined) return;
  if (!Array.isArray(rows) || rows.length !== sourceRows.length) {
    throw new Error(
      "Schedule 1 needs one 1099-MISC box 3 row per issued other-income source",
    );
  }
  const recipients = [tin(filer.primarySSN, "taxpayer")];
  if (filer.filingStatus === FilingStatus.MarriedFilingJointly) {
    recipients.push(tin(filer.spouse?.ssn, "spouse"));
  }
  const unmatched = [...rows] as Array<Record<string, unknown>>;
  for (const item of sourceRows) {
    const recipient = tin(item.recipient_tin, "1099-MISC recipient");
    if (
      !recipients.includes(recipient) ||
      typeof item.payer_name !== "string" || !item.payer_name.trim() ||
      !tin(item.payer_tin, "1099-MISC payer") ||
      typeof item.box3_other_income_description !== "string" ||
      !item.box3_other_income_description.trim() ||
      !Number.isSafeInteger(item.box3_other_income)
    ) {
      throw new Error("1099-MISC box 3 issued source is invalid");
    }
    const index = unmatched.findIndex((row) =>
      row && typeof row === "object" &&
      row.payer_name === item.payer_name &&
      tin(row.payer_tin, "1099-MISC payer") ===
        tin(item.payer_tin, "1099-MISC payer") &&
      tin(row.recipient_tin, "1099-MISC recipient") === recipient &&
      row.description === item.box3_other_income_description &&
      row.amount === item.box3_other_income
    );
    if (index < 0) {
      throw new Error(
        "Schedule 1 1099-MISC box 3 row differs from its issued source",
      );
    }
    unmatched.splice(index, 1);
  }
  if (unmatched.length !== 0) {
    throw new Error(
      "Schedule 1 1099-MISC box 3 row differs from its issued source",
    );
  }
}

export function assertSchedule1Box8SourceIdentity(
  pending: Record<string, unknown>,
  filer: FilerIdentity,
): void {
  const raw = (pending.f1099m as
    | { f1099ms?: Array<Record<string, unknown>> }
    | undefined)?.f1099ms ?? [];
  if (
    raw.some((item) =>
      item.box8_substitute_payments !== undefined &&
      (typeof item.box8_substitute_payments !== "number" ||
        !Number.isSafeInteger(item.box8_substitute_payments) ||
        item.box8_substitute_payments < 0)
    )
  ) {
    throw new Error("1099-MISC box 8 needs a nonnegative whole-dollar amount");
  }
  const sourceRows = raw.filter((item) =>
    typeof item.box8_substitute_payments === "number" &&
    item.box8_substitute_payments > 0
  );
  const schedule1 = pending.schedule1 as Record<string, unknown> | undefined;
  const filedRows = schedule1?.f1099m_box8_substitute_sources;
  const filedTotal = schedule1?.line8z_substitute_payments;
  if (
    sourceRows.length === 0 && filedRows === undefined &&
    filedTotal === undefined
  ) return;
  if (!Array.isArray(filedRows) || filedRows.length !== sourceRows.length) {
    throw new Error(
      "Schedule 1 substitute payments need one row per 1099-MISC box 8 source",
    );
  }
  const recipients = [tin(filer.primarySSN, "taxpayer")];
  if (filer.filingStatus === FilingStatus.MarriedFilingJointly) {
    recipients.push(tin(filer.spouse?.ssn, "spouse"));
  }
  const unmatched = [...filedRows] as Record<string, unknown>[];
  let expectedTotal = 0;
  for (const item of sourceRows) {
    const amount = item.box8_substitute_payments;
    if (
      typeof amount !== "number" || !Number.isSafeInteger(amount) ||
      amount <= 0 || typeof item.payer_name !== "string" ||
      !item.payer_name.trim() || !tin(item.payer_tin, "1099-MISC payer") ||
      !tin(item.recipient_tin, "1099-MISC recipient") ||
      !recipients.includes(tin(item.recipient_tin, "1099-MISC recipient"))
    ) {
      throw new Error("1099-MISC box 8 source identity or amount is invalid");
    }
    const index = unmatched.findIndex((row) =>
      row && typeof row === "object" &&
      row.payer_name === item.payer_name &&
      tin(row.payer_tin, "1099-MISC payer") ===
        tin(item.payer_tin, "1099-MISC payer") &&
      tin(row.recipient_tin, "1099-MISC recipient") ===
        tin(item.recipient_tin, "1099-MISC recipient") &&
      row.amount === amount
    );
    if (index < 0) {
      throw new Error(
        "Schedule 1 substitute payment row differs from its 1099-MISC source",
      );
    }
    unmatched.splice(index, 1);
    expectedTotal += amount;
  }
  if (unmatched.length !== 0 || filedTotal !== expectedTotal) {
    throw new Error(
      "Schedule 1 substitute payments differ from 1099-MISC box 8 sources",
    );
  }
}

export function assertSchedule1NecSourceIdentity(
  pending: Record<string, unknown>,
  filer: FilerIdentity,
): void {
  const schedule1 = pending.schedule1;
  if (!schedule1 || typeof schedule1 !== "object") return;
  const rows = (schedule1 as Record<string, unknown>)
    .f1099nec_nonbusiness_sources;
  if (rows === undefined) return;
  if (!Array.isArray(rows)) {
    throw new Error("Schedule 1 1099-NEC nonbusiness sources must be rows");
  }
  const recipients = [
    tin(filer.primarySSN, "taxpayer"),
    tin(filer.spouse?.ssn, "spouse"),
  ];
  for (const value of rows) {
    if (!value || typeof value !== "object") {
      throw new Error("Schedule 1 1099-NEC nonbusiness source is invalid");
    }
    const row = value as Record<string, unknown>;
    if (!recipients.includes(tin(row.recipient_tin, "1099-NEC recipient"))) {
      throw new Error("1099-NEC nonbusiness recipient differs from the filer");
    }
  }
}

export function assertSchedule1KSourceIdentity(
  pending: Record<string, unknown>,
  filer: FilerIdentity,
): void {
  const raw =
    (pending.f1099k as { f1099ks?: Array<Record<string, unknown>> } | undefined)
      ?.f1099ks ?? [];
  const hobby = raw.filter((item) =>
    item.for_routing === "schedule_1_line_8j" &&
    typeof item.box1a_gross_payments === "number" &&
    item.box1a_gross_payments > 0
  );
  let expected = 0;
  for (const item of hobby) {
    const review = item.nonbusiness_activity_review as
      | Record<string, unknown>
      | undefined;
    if (
      typeof item.pse_name !== "string" || !item.pse_name.trim() ||
      !tin(item.pse_tin, "1099-K PSE") ||
      !kRecipientMatches(item, filer) ||
      !review || typeof review.activity_description !== "string" ||
      !review.activity_description.trim() ||
      typeof review.included_in_line8j !== "number" ||
      !Number.isSafeInteger(review.included_in_line8j) ||
      review.included_in_line8j <= 0 ||
      review.included_in_line8j +
            ((item.reported_error_review as
              | { payments?: Array<{ amount: number }> }
              | undefined)?.payments?.reduce(
                (sum, payment) => sum + payment.amount,
                0,
              ) ?? 0) !== item.box1a_gross_payments ||
      typeof review.allocation_reference !== "string" ||
      !review.allocation_reference.trim() ||
      review.no_overlap_with_other_1099s !== true ||
      typeof review.overlap_review_reference !== "string" ||
      !review.overlap_review_reference.trim()
    ) {
      throw new Error(
        "1099-K nonbusiness source needs a matching filer and reviewed box 1a allocation",
      );
    }
    expected += review.included_in_line8j;
  }
  const schedule1 = pending.schedule1 as Record<string, unknown> | undefined;
  const actual = schedule1?.line8j_f1099k_hobby_income;
  if (expected !== (actual ?? 0)) {
    throw new Error(
      "1099-K nonbusiness income differs from Schedule 1 line 8j source",
    );
  }
}

export function assertScheduleFFarmSourceIdentity(
  pending: Record<string, unknown>,
  filer: FilerIdentity,
): void {
  const gRows = pending.f1099g === undefined
    ? []
    : form1099gSchema.parse(pending.f1099g).f1099gs;
  const expectedG = gRows.flatMap((item) => {
    const payerTin = item.payer_tin?.replace(/\D/g, "");
    return ([
      [
        item.box_7_payment_kind === "crop_disaster_current_taxable"
          ? "1099g_crop_disaster_current_taxable"
          : "1099g_agriculture",
        item.box_7_agriculture ?? 0,
      ],
      ["1099g_ccc_market_gain", item.box_9_market_gain ?? 0],
    ] as const).filter(([, amount]) => amount > 0).map(([kind, amount]) => ({
      farm_id: item.farm_id,
      kind,
      amount,
      payer_name: item.payer_name,
      payer_tin: payerTin,
      recipient_tin: item.recipient_tin,
      source_document_reference: item.source_document_reference,
    }));
  });
  const mRows = pending.f1099m === undefined
    ? []
    : form1099mSchema.parse(pending.f1099m).f1099ms;
  const expectedM = mRows.filter((item) => (item.box9_crop_insurance ?? 0) > 0)
    .map((item) => ({
      farm_id: item.farm_id,
      kind: "1099m_crop_insurance",
      amount: item.box9_crop_insurance,
      payer_name: item.payer_name,
      payer_tin: item.payer_tin,
      recipient_tin: item.recipient_tin,
      source_document_reference: item.source_document_reference,
      deferred: item.box9_crop_insurance_deferred === true,
    }));
  const patrRows = pending.f1099patr === undefined
    ? []
    : form1099patrSchema.parse(pending.f1099patr).f1099patrs;
  const expectedPatr = patrRows.flatMap((item) => {
    const treatment = item.distribution_treatment;
    if (treatment?.kind !== "farm" || distributionTotal(item) === 0) {
      return [];
    }
    return [{
      farm_id: treatment.farm_id,
      kind: "1099patr_cooperative",
      amount: distributionTotal(item),
      taxable_amount: treatment.verified_taxable_amount,
      payer_name: item.payer_name,
      payer_tin: item.payer_tin?.replace(/\D/g, ""),
      recipient_tin: item.recipient_tin,
      source_document_reference: item.source_document_reference,
    }];
  });
  const scheduleF = pending.schedule_f;
  if (!scheduleF || typeof scheduleF !== "object") {
    if (expectedG.length + expectedM.length + expectedPatr.length > 0) {
      throw new Error("1099 farm payments need a Schedule F source");
    }
    return;
  }
  const sources = (scheduleF as Record<string, unknown>).farm_sources;
  if (sources === undefined) {
    if (expectedG.length + expectedM.length + expectedPatr.length > 0) {
      throw new Error("Schedule F 1099 farm sources are missing");
    }
    return;
  }
  if (!Array.isArray(sources)) {
    throw new Error("Schedule F farm sources must be rows");
  }
  const actualG = sources.filter((value) =>
    value && typeof value === "object" &&
    (value.kind === "1099g_agriculture" ||
      value.kind === "1099g_crop_disaster_current_taxable" ||
      value.kind === "1099g_ccc_market_gain")
  );
  const sourceKey = (value: Record<string, unknown>) =>
    JSON.stringify([
      value.farm_id,
      value.kind,
      value.amount,
      value.payer_name,
      value.payer_tin,
      value.recipient_tin,
      value.source_document_reference,
      value.taxable_amount,
      value.deferred === true,
    ]);
  if (
    JSON.stringify(actualG.map((value) => sourceKey(value)).sort()) !==
      JSON.stringify(expectedG.map((value) => sourceKey(value)).sort())
  ) {
    throw new Error(
      "Schedule F 1099-G farm sources differ from retained payer copies",
    );
  }
  const actualM = sources.filter((value) =>
    value && typeof value === "object" && value.kind === "1099m_crop_insurance"
  );
  if (
    JSON.stringify(actualM.map((value) => sourceKey(value)).sort()) !==
      JSON.stringify(expectedM.map((value) => sourceKey(value)).sort())
  ) {
    throw new Error(
      "Schedule F 1099-MISC crop-insurance sources differ from retained payer copies",
    );
  }
  const actualPatr = sources.filter((value) =>
    value && typeof value === "object" && value.kind === "1099patr_cooperative"
  );
  if (
    JSON.stringify(actualPatr.map((value) => sourceKey(value)).sort()) !==
      JSON.stringify(expectedPatr.map((value) => sourceKey(value)).sort())
  ) {
    throw new Error(
      "Schedule F 1099-PATR sources differ from retained cooperative copies",
    );
  }
  const farms = (scheduleF as Record<string, unknown>).schedule_fs;
  if (!Array.isArray(farms)) {
    throw new Error("Schedule F sources need named farms");
  }
  for (const value of sources) {
    if (!value || typeof value !== "object") {
      throw new Error("Schedule F farm source is invalid");
    }
    const row = value as Record<string, unknown>;
    if (
      row.kind !== "1099m_box3_other_income" &&
      row.kind !== "1099nec_farm_income" &&
      row.kind !== "1099g_agriculture" &&
      row.kind !== "1099g_crop_disaster_current_taxable" &&
      row.kind !== "1099g_ccc_market_gain" &&
      row.kind !== "1099m_crop_insurance" &&
      row.kind !== "1099patr_cooperative"
    ) continue;
    const matches = farms.filter((farm) =>
      farm && typeof farm === "object" &&
      farm.farm_id === row.farm_id
    );
    if (matches.length !== 1) {
      throw new Error("1099 farm source needs one matching Schedule F farm");
    }
    const proprietor = matches[0].proprietor_recipient;
    const expected = proprietor === "T"
      ? tin(filer.primarySSN, "taxpayer")
      : proprietor === "S"
      ? tin(filer.spouse?.ssn, "spouse")
      : undefined;
    if (
      typeof row.payer_name !== "string" || !row.payer_name.trim() ||
      !tin(row.payer_tin, "1099 payer") ||
      !expected ||
      tin(row.recipient_tin, "1099 recipient") !== expected
    ) {
      throw new Error(
        "1099 farm recipient differs from the Schedule F proprietor",
      );
    }
  }
}

export function assertF1040FinalHeader(
  fields: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): void {
  assertNoUnsupportedDeceasedReturn(fields, undefined, filer);
  if (fields.dual_status_return_2025 === true) {
    throw new Error("TY2025 dual-status return cannot use Form 1040 e-file");
  }
  if (
    !filer || !/^\d{9}$/.test(filer.primarySSN) ||
    !filer.firstNameWithInitial?.trim() || !filer.lastName?.trim()
  ) {
    throw new Error(
      "Form 1040 export needs the identified taxpayer's SSN, first-name field, and last name",
    );
  }
  assertF1040SourceIdentity(fields, filer);
  const statusCodes: Readonly<Record<string, FilingStatus>> = {
    single: FilingStatus.Single,
    mfj: FilingStatus.MarriedFilingJointly,
    mfs: FilingStatus.MarriedFilingSeparately,
    hoh: FilingStatus.HeadOfHousehold,
    qss: FilingStatus.QualifyingSurvivingSpouse,
  };
  const status = fields.filing_status;
  if (
    typeof status !== "string" || statusCodes[status] === undefined ||
    statusCodes[status] !== filer.filingStatus
  ) {
    throw new Error(
      "Form 1040 export filing status must match the identified filer",
    );
  }
  if (typeof fields.digital_assets !== "boolean") {
    throw new Error("Form 1040 export needs the digital-assets answer");
  }
}

/** Deceased returns need signer, representative, and refund review before export. */
export function assertNoUnsupportedDeceasedReturn(
  fields?: Record<string, unknown>,
  general?: Record<string, unknown>,
  filer?: FilerIdentity,
): void {
  const hasDeceasedFacts = (source?: Record<string, unknown>) =>
    source?.taxpayer_deceased === true || source?.spouse_deceased === true ||
    (typeof source?.taxpayer_death_date === "string" &&
      source.taxpayer_death_date.trim().length > 0) ||
    (typeof source?.spouse_death_date === "string" &&
      source.spouse_death_date.trim().length > 0);
  if (
    hasDeceasedFacts(fields) || hasDeceasedFacts(general) ||
    filer?.deceased === true || Boolean(filer?.deathDate) ||
    filer?.spouse?.deceased === true || Boolean(filer?.spouse?.deathDate)
  ) {
    throw new Error(
      "TY2025 deceased Form 1040 needs reviewed signer, representative, and refund facts before filing",
    );
  }
}

/** Keep the filed header answers tied to the retained general input. */
export function assertGeneral1040HeaderSource(
  pending: Record<string, unknown>,
): void {
  const general = pending.general as Record<string, unknown> | undefined;
  const f1040 = pending.f1040 as Record<string, unknown> | undefined;
  assertNoUnsupportedDeceasedReturn(f1040, general);
  if (!general || !f1040) return;
  if (general.filing_status !== f1040.filing_status) {
    throw new Error(
      "Form 1040 filing status differs from the retained general source",
    );
  }
  if (
    typeof general.digital_assets === "boolean" &&
    general.digital_assets !== f1040.digital_assets
  ) {
    throw new Error(
      "Form 1040 digital-assets answer differs from the retained general source",
    );
  }
}

/** Detect a changed or omitted dependent row after general input projection. */
export function assertGeneral1040DependentSource(
  pending: Record<string, unknown>,
): void {
  if (pending.general === undefined || pending.f1040 === undefined) return;
  const source = generalInputSchema.parse(pending.general);
  const filed = pending.f1040 as Record<string, unknown>;
  const expected = filedDependentsFromGeneral(source);
  const actual = dependentFilingSchema.array().parse(
    filed.dependent_details ?? [],
  );
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      "Form 1040 dependent rows differ from the retained general source",
    );
  }
  const ctc =
    expected.filter((dep) =>
      dep.credit_category === DependentCreditCategory.ChildTaxCredit
    ).length;
  const odc =
    expected.filter((dep) =>
      dep.credit_category === DependentCreditCategory.OtherDependentCredit
    ).length;
  if (
    (filed.dependent_count ?? 0) !== expected.length ||
    (filed.qualifying_child_tax_credit_count ?? 0) !== ctc ||
    (filed.other_dependent_count ?? 0) !== odc
  ) {
    throw new Error(
      "Form 1040 dependent counts differ from the retained general source",
    );
  }
}

/** Match the bank instruction retained on the general input to the filed refund. */
export function assertGeneral1040DepositSource(
  pending: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): void {
  const general = pending.general as Record<string, unknown> | undefined;
  const routing = general?.bank_routing_number;
  const account = general?.bank_account_number;
  const type = general?.bank_account_type;
  if (routing === undefined && account === undefined && type === undefined) {
    if (filer?.bankAccount) {
      throw new Error(
        "Form 1040 direct deposit needs the retained general bank source",
      );
    }
    return;
  }
  const filed = pending.f1040 as Record<string, unknown> | undefined;
  const expectedType = type === "checking"
    ? AccountType.Checking
    : type === "savings"
    ? AccountType.Savings
    : undefined;
  if (
    typeof routing !== "string" ||
    !/^(0[1-9]|1[0-2]|2[1-9]|3[0-2])\d{7}$/.test(routing) ||
    typeof account !== "string" ||
    !/^[A-Za-z0-9-]{1,17}$/.test(account)
  ) {
    throw new Error(
      "Form 1040 direct deposit needs a valid U.S. routing and account number",
    );
  }
  if (
    expectedType === undefined || !filer?.bankAccount ||
    routing !== filer.bankAccount.routingNumber ||
    account !== filer.bankAccount.accountNumber ||
    expectedType !== filer.bankAccount.accountType ||
    routing !== filed?.bank_routing_number ||
    account !== filed?.bank_account_number ||
    type !== filed?.bank_account_type
  ) {
    throw new Error(
      "Form 1040 direct-deposit account differs from the retained general source",
    );
  }
  if (
    !filed || typeof filed.line35a_refund !== "number" ||
    filed.line35a_refund <= 0 ||
    (typeof filed.line37_amount_owed === "number" &&
      filed.line37_amount_owed > 0) ||
    pending.f8888 !== undefined
  ) {
    throw new Error(
      "Form 1040 direct deposit needs a positive refund without Form 8888 or amount owed",
    );
  }
}
