import { createHash } from "node:crypto";
import {
  itemSchema,
  reviewedSourceSchema,
} from "../../../../../nodes/inputs/income/wages/f4852/index.ts";
import {
  rothOwnerInventoryDocuments,
  rothOwnerInventorySchema,
} from "../../../../../nodes/intermediate/forms/income/retirement/form8606/roth-inventory.ts";
import {
  rothCurrentConversionCases,
  rothCurrentConversionReturnSource,
} from "../../wages/form4852/form4852_roth_current_conversion.fixture.ts";
import {
  officialForm4852EvidenceTemplate,
  retainedForm4852Sources,
} from "../../wages/form4852/form4852_filing.fixture.ts";
/** Constructed reviewed account records prove binding/calculation, not issuer authenticity. */
export const annualTraditionalCases = [
  {
    id: "annual-before-and-postyear-contributions-withdrawal-and-conversion",
    base: 8,
    contributions: [1000, 1000],
    withdrawals: [4000],
    withheld: 0,
  },
  {
    id: "annual-withheld-conversion-unconverted-cash-and-two-withdrawals",
    base: 8,
    contributions: [1000, 1000],
    withdrawals: [2000, 2000],
    withheld: 1000,
  },
  {
    id: "joint-annual-owner-contributions-withdrawals-and-conversions",
    base: 13,
    contributions: [1000, 1000],
    withdrawals: [4000],
    withheld: 1000,
  },
  {
    id: "annual-age-T-contribution-withdrawal-and-conversion",
    base: 12,
    contributions: [1000, 1000],
    withdrawals: [4000],
    withheld: 1000,
  },
  {
    id: "annual-conversion-without-Roth-withdrawal",
    base: 8,
    contributions: [1000, 1000],
    withdrawals: [4000],
    withheld: 1000,
    noRoth: true,
  },
  {
    id: "annual-cent-source-receipts-withholding-and-aggregate-filing",
    base: 8,
    contributions: [1000.25, 1000.25],
    withdrawals: [2000.25, 2000.25],
    withheld: 1000.5,
  },
  {
    id: "annual-small-basis-prescribed-four-decimal-ratio",
    base: 1,
    contributions: [1],
    withdrawals: [500],
    withheld: 0,
    converted: 1000,
  },
  {
    id: "annual-two-owned-traditional-accounts-and-distinct-issued-custodians",
    base: 8,
    contributions: [1000.25, 1000.25],
    withdrawals: [2000.25, 2000.25],
    withheld: 1000.5,
    twoAccounts: true,
  },
  {
    id:
      "annual-current-shared-Roth5498-regular-and-conversion-plus-traditional-contribution",
    base: 6,
    contributions: [1000, 1000],
    withdrawals: [2000, 2000],
    withheld: 1000,
  },
  {
    id:
      "annual-current-Roth-regular-MAGI-phaseout-with-traditional-contribution",
    base: 6,
    contributions: [1000, 1000],
    withdrawals: [2000, 2000],
    withheld: 1000,
    wages: 157864,
  },
] as const;
export async function annualTraditionalReturnSource(
  row: typeof annualTraditionalCases[number],
  n: number,
) {
  const base = await rothCurrentConversionReturnSource(
    rothCurrentConversionCases[row.base],
    n,
  );
  const reviews = base.reviews.map((original) => {
    const r = structuredClone(original),
      c = r.current_conversion!,
      owner = r.owner_identity.owner_ssn;
    const prefix = `annual-${n}-${r.owner}`,
      trad = c.inventory.traditional_accounts[0],
      transfer = c.accounts[0].transfers[0];
    if ("converted" in row) {
      transfer.issued_form1099r.box1_gross_distribution = row.converted;
      transfer.issued_form1099r.box2a_taxable_amount = row.converted;
      transfer.receipt.amount = row.converted;
      c.accounts[0].form5498.box3_roth_conversion_amount = row.converted;
    }
    c.inventory.no_current_traditional_contributions = false;
    c.inventory.all_current_traditional_distributions_are_listed_conversions =
      false;
    c.annual_traditional_activity = {
      source_document_reference: `${prefix}-complete-annual-inventory`,
      owner_ssn: owner,
      all_current_regular_traditional_contributions_included: true,
      all_current_nonconversion_traditional_distributions_included: true,
      no_employer_sep_simple_or_returned_excess_contributions: true,
      nondeductible_election: {
        source_document_reference: `${prefix}-owner-nondeductible-election`,
        owner_ssn: owner,
        tax_year: 2025,
        all_listed_regular_contributions_nondeductible_confirmed: true,
      },
      contributions: [{
        form5498: {
          source_document_reference: `${prefix}-issued-traditional5498`,
          owner_ssn: owner,
          tax_year: 2025,
          ...trad,
          traditional_ira_confirmed: true,
          box1_ira_contributions: row.contributions.reduce((s, n) =>
            s + Math.round(n * 100), 0) / 100,
          box2_rollover_contributions: 0,
          box8_sep_contributions: 0,
          box9_simple_contributions: 0,
        },
        receipts: row.contributions.map((amount, j) => ({
          source_document_reference: `${prefix}-paid-contribution-${j}`,
          owner_ssn: owner,
          ...trad,
          designated_tax_year: 2025,
          received_on: j ? "2026-02-10" : "2025-01-10",
          amount,
        })),
      }],
      withdrawals: row.withdrawals.map((amount, j) => ({
        issued_form1099r: {
          ...transfer.issued_form1099r,
          source_document_reference: `${prefix}-issued-withdrawal-${j}`,
          distribution_reference: `${prefix}-withdrawal-${j}`,
          box1_gross_distribution: amount,
          box2a_taxable_amount: amount,
          box7_distribution_code:
            transfer.issued_form1099r.box7_distribution_code === "7"
              ? "7"
              : "1",
          distributed_on: `2025-0${j + 5}-10`,
          complete_direct_roth_conversion_confirmed: undefined,
          federal_withheld: 100,
          state_tax_withheld: 0,
          local_tax_withheld: 0,
        },
        disposition: {
          source_document_reference: `${prefix}-paid-withdrawal-${j}`,
          owner_ssn: owner,
          distribution_reference: `${prefix}-withdrawal-${j}`,
          paid_on: `2025-0${j + 5}-11`,
          cash_paid_to_owner: amount - 100,
          no_early_distribution_exception_claimed: true,
        },
      })),
    } as NonNullable<typeof c.annual_traditional_activity>;
    if ("twoAccounts" in row) {
      const second = {
        custodian_ein: "665432110",
        account_number: `${trad.account_number}-SECOND`,
      };
      c.inventory.traditional_accounts.push(second);
      c.year_end_statements[0].fair_market_value /= 2;
      c.year_end_statements.push({
        ...c.year_end_statements[0],
        ...second,
        source_document_reference: `${prefix}-second-traditional-year-end`,
      });
      const contribution = c.annual_traditional_activity!.contributions[0];
      c.annual_traditional_activity!.contributions = contribution.receipts.map((
        receipt,
        j,
      ) => ({
        form5498: {
          ...contribution.form5498,
          ...(j ? second : trad),
          source_document_reference: `${prefix}-issued-traditional5498-${j}`,
          box1_ira_contributions: receipt.amount,
        },
        receipts: [{ ...receipt, ...(j ? second : trad) }],
      }));
      const withdrawal =
        c.annual_traditional_activity!.withdrawals[1].issued_form1099r;
      withdrawal.payer_ein = second.custodian_ein;
      withdrawal.traditional_account_number = second.account_number;
      withdrawal.issuer = {
        ...withdrawal.issuer,
        name: "Second Traditional Custodian",
      };
    }
    if (row.withheld) {
      transfer.issued_form1099r.complete_direct_roth_conversion_confirmed =
        false;
      transfer.issued_form1099r.federal_withheld = row.withheld;
      transfer.issued_form1099r.box1_gross_distribution += row.withheld + 500;
      transfer.issued_form1099r.box2a_taxable_amount = transfer.receipt.amount;
      transfer.unconverted_disposition = {
        source_document_reference: `${prefix}-conversion-cash-disposition`,
        owner_ssn: owner,
        distribution_reference:
          transfer.issued_form1099r.distribution_reference,
        paid_on: transfer.issued_form1099r.distributed_on,
        cash_paid_to_owner: 500,
        no_early_distribution_exception_claimed: true,
      };
    }
    if ("noRoth" in row) {
      r.payments = [];
      transfer.issued_form1099r.source_kind = "completed_form4852";
      transfer.issued_form1099r.completed_form4852_reference =
        transfer.issued_form1099r.source_document_reference;
      transfer.issued_form1099r.source_document_reference +=
        "-custodian-record";
      delete transfer.issued_form1099r.box2a_taxable_amount;
    }
    for (const w of c.annual_traditional_activity.withdrawals) {
      delete (w.issued_form1099r as unknown as Record<string, unknown>)
        .complete_direct_roth_conversion_confirmed;
    }
    return rothOwnerInventorySchema.parse(r);
  });
  let items = "noRoth" in row ? [] : base.items.map((i) =>
    itemSchema.parse({
      ...i,
      retirement_source: {
        ...i.retirement_source,
        roth_owner_inventory_review: reviews.find((r) =>
          r.owner === i.subject_ts
        )!,
      },
    })
  );
  const ordinary =
    ("noRoth" in row
      ? []
      : base.inputs.f1099r.filter((i) => i.rollover_code !== "C")).map((i) => ({
        ...i,
        roth_owner_inventory_review: reviews.find((r) => r.owner === i.ts)!,
      }));
  const issued = reviews.flatMap((r) =>
    [
      ...r.current_conversion!.accounts.flatMap((a) =>
        a.transfers.map((t) => ({ i: t.issued_form1099r, converted: true }))
      ),
      ...r.current_conversion!.annual_traditional_activity!.withdrawals.map(
        (w) => ({ i: w.issued_form1099r, converted: false }),
      ),
    ].map(({ i, converted }) => ({
      ts: r.owner,
      recipient_ssn: i.owner_ssn,
      payer_ein: i.payer_ein,
      payer_name: i.issuer.name,
      payer_address_line1: i.issuer.address_line1,
      payer_address_city: i.issuer.city,
      payer_address_state: i.issuer.state,
      payer_address_zip: i.issuer.zip,
      account_number: i.traditional_account_number,
      source_document_reference: ("completed_form4852_reference" in i
        ? i.completed_form4852_reference
        : undefined) ?? i.source_document_reference,
      box1_gross_distribution: i.box1_gross_distribution,
      ...(i.box2a_taxable_amount !== undefined
        ? { box2a_taxable_amount: i.box2a_taxable_amount }
        : {}),
      box2b_not_determined: true,
      box7_ira_simple_indicator: true,
      box7_distribution_code: i.box7_distribution_code,
      box13_date_of_payment: i.distributed_on,
      box4_federal_withheld: i.federal_withheld,
      box14_state_tax: i.state_tax_withheld,
      box17_local_tax: i.local_tax_withheld,
      ...(converted ? { rollover_code: "C" } : {}),
      roth_owner_inventory_review: r,
    }))
  );
  if ("noRoth" in row) {
    const copy = issued.find((i) => i.rollover_code === "C")!,
      prior = base.items[0],
      r = reviews[0],
      t = r.current_conversion!.accounts[0].transfers[0],
      i = t.issued_form1099r;
    const reference = i.completed_form4852_reference!;
    items = [itemSchema.parse({
      ...prior,
      source_copy_lineage: `annual-${n}-traditional-substitute`,
      payer_name: i.issuer.name,
      payer_tin: i.payer_ein,
      payer_address_line1: i.issuer.address_line1,
      payer_address_city: i.issuer.city,
      payer_address_state: i.issuer.state,
      payer_address_zip: i.issuer.zip,
      recipient_ssn: i.owner_ssn,
      account_number: i.traditional_account_number,
      distribution_reference: i.distribution_reference,
      source_workpaper_reference: `annual-${n}-traditional-workpaper`,
      completed_form_review_reference: reference,
      gross_distribution: i.box1_gross_distribution,
      taxable_amount: undefined,
      taxable_amount_not_determined: true,
      federal_withheld: i.federal_withheld,
      is_ira: true,
      distribution_code: i.box7_distribution_code,
      subject_ts: r.owner,
      retirement_source: copy,
      distribution_source: {
        account_type: "traditional_ira",
        source_document_reference: `annual-${n}-traditional-debit`,
        payer_tin: i.payer_ein,
        owner_ssn: i.owner_ssn,
        account_number: i.traditional_account_number,
        distribution_reference: i.distribution_reference,
        paid_on: i.distributed_on,
        gross_distribution: i.box1_gross_distribution,
        taxable_amount: undefined,
        taxable_amount_not_determined: true,
        employee_contributions: 0,
        capital_gain: 0,
        federal_withheld: i.federal_withheld,
        state_tax_withheld: 0,
        local_tax_withheld: 0,
        distribution_code: i.box7_distribution_code,
        is_ira: true,
      },
    })];
    issued.splice(issued.indexOf(copy), 1);
  }
  // The pure ordinary-issued case retains the actual source inventory in copies;
  // substitute cases also retain those bytes in the ERO source contract.
  const initialRetained = await retainedForm4852Sources(
    items,
    base.filer,
    await officialForm4852EvidenceTemplate("f4852"),
  );
  const retained = {
    ...initialRetained,
    reviewed_source: reviewedSourceSchema.parse(
      initialRetained.reviewed_source,
    ),
  };
  const documents = new Map(
    retained.documents.map((d) => [d.document_reference, d]),
  );
  for (const r of reviews) {
    for (const facts of rothOwnerInventoryDocuments(r)) {
      documents.set(facts.source_document_reference, {
        document_reference: facts.source_document_reference,
        bytes: new TextEncoder().encode(JSON.stringify(facts)),
      });
    }
    for (
      const prior of [
        r.current_conversion!.prior_form8606,
        ...(r.conversions ?? []).map((h) => h.prior_form8606),
        ...(r.prior_distributions ?? []).flatMap(
          (h) => [
            h.prior_form8606,
            ...(h.prior_form5329 ? [h.prior_form5329] : []),
          ],
        ),
      ]
    ) {
      const d = base.retained.documents.find((d) =>
        d.document_reference === prior.source_document_reference
      )!;
      documents.set(d.document_reference, d);
    }
  }
  for (const record of retained.reviewed_source.records) {
    record.treatment_documents ??= [];
    const r = record.reviewed_substitute.retirement_source!
      .roth_owner_inventory_review!;
    if ("noRoth" in row) {
      const withdrawals =
        r.current_conversion!.annual_traditional_activity!.withdrawals;
      record.other_current_copy_references = withdrawals.map((w) =>
        w.issued_form1099r.source_document_reference
      );
      record.other_current_copy_sources = withdrawals.map((w) => {
        const i = w.issued_form1099r;
        return {
          issued_source_document_reference: i.source_document_reference,
          source_copy_lineage: i.distribution_reference,
          distribution_source: {
            source_document_reference: `${i.source_document_reference}-lineage`,
            payer_tin: i.payer_ein,
            owner_ssn: i.owner_ssn,
            account_number: i.traditional_account_number,
            distribution_reference: i.distribution_reference,
            paid_on: i.distributed_on,
            gross_distribution: i.box1_gross_distribution,
            taxable_amount: i.box2a_taxable_amount,
            employee_contributions: 0,
            capital_gain: 0,
            federal_withheld: i.federal_withheld,
            state_tax_withheld: i.state_tax_withheld,
            local_tax_withheld: i.local_tax_withheld,
            distribution_code: i.box7_distribution_code,
            is_ira: true,
          },
        };
      });
    }
    for (const lineage of record.other_current_copy_sources ?? []) {
      const facts = lineage.distribution_source!;
      documents.set(facts.source_document_reference, {
        document_reference: facts.source_document_reference,
        bytes: new TextEncoder().encode(JSON.stringify(facts)),
      });
      record.treatment_documents.push({
        document_reference: facts.source_document_reference,
        sha256: createHash("sha256").update(
          documents.get(facts.source_document_reference)!.bytes,
        ).digest("hex"),
      });
    }
    const workpaper = new TextEncoder().encode(JSON.stringify({
      substitute: record.reviewed_substitute,
      other_current_copy_references: record.other_current_copy_references ?? [],
      other_current_copy_sources: record.other_current_copy_sources ?? [],
    }));
    documents.set(record.source_workpaper.document_reference, {
      document_reference: record.source_workpaper.document_reference,
      bytes: workpaper,
    });
    record.source_workpaper.sha256 = createHash("sha256").update(workpaper)
      .digest("hex");
    const refs = [
      ...rothOwnerInventoryDocuments(r).map((d) => d.source_document_reference),
      r.current_conversion!.prior_form8606.source_document_reference,
      ...(r.conversions ?? []).map((h) =>
        h.prior_form8606.source_document_reference
      ),
      ...(r.prior_distributions ?? []).flatMap(
        (h) => [
          h.prior_form8606.source_document_reference,
          ...(h.prior_form5329
            ? [h.prior_form5329.source_document_reference]
            : []),
        ],
      ),
    ];
    record.treatment_documents = [
      ...record.treatment_documents,
      ...[...new Set(refs)].map((reference) => ({
        document_reference: reference,
        sha256: createHash("sha256").update(documents.get(reference)!.bytes)
          .digest("hex"),
      })),
    ];
  }
  retained.documents = [...documents.values()];
  if ("wages" in row) {
    Object.assign(base.inputs.w2[0], {
      box1_wages: row.wages,
      box3_ss_wages: row.wages,
      box4_ss_withheld: Math.round(row.wages * .062 * 100) / 100,
      box5_medicare_wages: row.wages,
      box6_medicare_withheld: Math.round(row.wages * .0145 * 100) / 100,
    });
  }
  return {
    ...base,
    reviews,
    items,
    retained,
    inputs: {
      ...base.inputs,
      f4852: items,
      f1099r: [...ordinary, ...issued],
      f4852_reviewed_source: { reviewed_source: retained.reviewed_source },
    },
  };
}
