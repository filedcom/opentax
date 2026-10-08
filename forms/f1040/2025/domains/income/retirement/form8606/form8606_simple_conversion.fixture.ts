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
  annualTraditionalCases,
  annualTraditionalReturnSource,
} from "./form8606_annual_traditional.fixture.ts";
import {
  officialForm4852EvidenceTemplate,
  retainedForm4852Sources,
} from "../../wages/form4852/form4852_filing.fixture.ts";

/** The regular 2025 IRA contribution/withdrawal and prior filed basis remain the
 * retained annual source. This adds a different, employer-funded SIMPLE account. */
export async function simpleConversionReturnSource(n: number) {
  const base = await annualTraditionalReturnSource(
    annualTraditionalCases[4],
    n,
  );
  const old = base.reviews[0], review = structuredClone(old);
  const current = review.current_conversion!,
    owner = review.owner_identity.owner_ssn;
  const first = "2023-04-10", paid = "2025-04-10", amount = 2000;
  const origin = {
    source_document_reference: `simple-${n}-employer-plan-inventory`,
    owner_ssn: owner,
    employer_ein: "745432109",
    plan_reference: `SIMPLE-PLAN-${n}`,
    custodian_ein: "735432109",
    account_number: `SIMPLE-ACCOUNT-${n}`,
    account_opened_on: "2022-02-01",
    plan_document: {
      source_document_reference: `simple-${n}-employer-plan-document`,
      owner_ssn: owner,
      employer_ein: "745432109",
      plan_reference: `SIMPLE-PLAN-${n}`,
      custodian_ein: "735432109",
      account_number: `SIMPLE-ACCOUNT-${n}`,
      plan_kind: "traditional_simple_ira" as const,
      effective_on: "2022-01-01",
    },
    first_employer_deposit_ledger_complete: true as const,
    employer_deposits: [
      {
        source_document_reference: `simple-${n}-first-employer-deposit`,
        owner_ssn: owner,
        employer_ein: "745432109",
        plan_reference: `SIMPLE-PLAN-${n}`,
        custodian_ein: "735432109",
        account_number: `SIMPLE-ACCOUNT-${n}`,
        deposited_on: first,
        amount: 1000,
      },
      {
        source_document_reference: `simple-${n}-second-employer-deposit`,
        owner_ssn: owner,
        employer_ein: "745432109",
        plan_reference: `SIMPLE-PLAN-${n}`,
        custodian_ein: "735432109",
        account_number: `SIMPLE-ACCOUNT-${n}`,
        deposited_on: "2024-04-10",
        amount: 1000,
      },
    ],
  };
  current.inventory.traditional_accounts.push({
    custodian_ein: origin.custodian_ein,
    account_number: origin.account_number,
  });
  current.inventory.simple_origins = [origin];
  current.year_end_statements.push({
    source_document_reference: `simple-${n}-year-end-balance`,
    owner_ssn: owner,
    custodian_ein: origin.custodian_ein,
    account_number: origin.account_number,
    as_of: "2025-12-31",
    fair_market_value: 0,
  });
  const prior = current.accounts[0].transfers[0];
  const transfer = structuredClone(prior);
  transfer.issued_form1099r = {
    ...transfer.issued_form1099r,
    source_document_reference: `simple-${n}-custodian-debit`,
    source_kind: "completed_form4852",
    completed_form4852_reference: `simple-${n}-completed4852`,
    originating_account_type: "simple_ira",
    payer_ein: origin.custodian_ein,
    traditional_account_number: origin.account_number,
    distribution_reference: `simple-${n}-distribution`,
    distributed_on: paid,
    box1_gross_distribution: amount,
    box7_distribution_code: "2",
    complete_direct_roth_conversion_confirmed: true,
    federal_withheld: 0,
    state_tax_withheld: 0,
    local_tax_withheld: 0,
    issuer: {
      name: "SIMPLE Plan Custodian",
      address_line1: "100 Plan Road",
      city: "Denver",
      state: "CO",
      zip: "80202",
    },
  };
  delete transfer.issued_form1099r.box2a_taxable_amount;
  transfer.receipt = {
    ...transfer.receipt,
    source_document_reference: `simple-${n}-Roth-paid`,
    received_on: "2025-04-11",
    amount,
    originating_distribution_reference:
      transfer.issued_form1099r.distribution_reference,
  };
  delete transfer.unconverted_disposition;
  current.accounts[0].transfers.push(transfer);
  current.accounts[0].form5498.box3_roth_conversion_amount += amount;
  const parsed = rothOwnerInventorySchema.parse(review);
  const original = itemSchema.parse({
    ...base.items[0],
    retirement_source: {
      ...base.items[0].retirement_source,
      roth_owner_inventory_review: parsed,
    },
  });
  const i = transfer.issued_form1099r;
  const simpleIssued = {
    ...original.retirement_source!,
    payer_ein: i.payer_ein,
    payer_name: i.issuer.name,
    payer_address_line1: i.issuer.address_line1,
    payer_address_city: i.issuer.city,
    payer_address_state: i.issuer.state,
    payer_address_zip: i.issuer.zip,
    account_number: i.traditional_account_number,
    source_document_reference: i.completed_form4852_reference!,
    box1_gross_distribution: amount,
    box2a_taxable_amount: undefined,
    box7_distribution_code: "2",
    box13_date_of_payment: paid,
    box4_federal_withheld: 0,
    roth_owner_inventory_review: parsed,
  };
  const simple = itemSchema.parse({
    ...original,
    source_copy_lineage: `simple-${n}-copy`,
    payer_name: i.issuer.name,
    payer_tin: i.payer_ein,
    payer_address_line1: i.issuer.address_line1,
    payer_address_city: i.issuer.city,
    payer_address_state: i.issuer.state,
    payer_address_zip: i.issuer.zip,
    account_number: i.traditional_account_number,
    distribution_reference: i.distribution_reference,
    completed_form_review_reference: i.completed_form4852_reference,
    source_workpaper_reference: `simple-${n}-workpaper`,
    gross_distribution: amount,
    federal_withheld: 0,
    distribution_code: "2",
    retirement_source: simpleIssued,
    distribution_source: {
      ...original.distribution_source!,
      account_type: "simple_ira",
      source_document_reference: `simple-${n}-paid-distribution`,
      payer_tin: i.payer_ein,
      owner_ssn: owner,
      account_number: i.traditional_account_number,
      distribution_reference: i.distribution_reference,
      paid_on: paid,
      gross_distribution: amount,
      federal_withheld: 0,
      distribution_code: "2",
    },
  });
  const generated = await retainedForm4852Sources(
    [simple],
    base.filer,
    await officialForm4852EvidenceTemplate("f4852"),
  );
  const documents = new Map(
    base.retained.documents.map((d) => [d.document_reference, d]),
  );
  for (const d of generated.documents) documents.set(d.document_reference, d);
  const encode = (facts: unknown) =>
    new TextEncoder().encode(JSON.stringify(facts));
  const put = (reference: string, facts: unknown) =>
    documents.set(reference, {
      document_reference: reference,
      bytes: encode(facts),
    });
  for (const facts of rothOwnerInventoryDocuments(parsed)) {
    // Prior filed forms are retained PDFs, not reconstructed JSON.
    if (
      !documents.has(facts.source_document_reference) ||
      facts.source_document_reference ===
        current.inventory.source_document_reference ||
      facts.source_document_reference ===
        current.accounts[0].form5498.source_document_reference
    ) put(facts.source_document_reference, facts);
  }
  const originalRecord = structuredClone(
    base.retained.reviewed_source.records[0],
  );
  originalRecord.reviewed_substitute = original;
  const newRecord = generated.reviewed_source.records[0];
  const annualOther = originalRecord.other_current_copy_sources ?? [];
  const extra = annualOther.flatMap((row) =>
    row.distribution_source
      ? [row.distribution_source.source_document_reference]
      : []
  );
  const oldSource = original.distribution_source!.source_document_reference;
  const allReviewRefs = rothOwnerInventoryDocuments(parsed).map((d) =>
    d.source_document_reference
  );
  const priorRefs = (originalRecord.treatment_documents ?? []).map((d) =>
    d.document_reference
  ).filter((r) =>
    r !== oldSource && !extra.includes(r) && !allReviewRefs.includes(r)
  );
  const hash = (bytes: Uint8Array) =>
    createHash("sha256").update(bytes).digest("hex");
  for (const record of [originalRecord, newRecord]) {
    const refs = [
      record.reviewed_substitute.distribution_source!.source_document_reference,
      ...(record === originalRecord ? extra : []),
      ...allReviewRefs,
      ...priorRefs,
    ];
    record.treatment_documents = [...new Set(refs)].map((reference) => ({
      document_reference: reference,
      sha256: hash(documents.get(reference)!.bytes),
    }));
    const workpaper = encode({
      substitute: record.reviewed_substitute,
      other_current_copy_references: record === originalRecord
        ? originalRecord.other_current_copy_references ?? []
        : [],
      other_current_copy_sources: record === originalRecord
        ? originalRecord.other_current_copy_sources ?? []
        : [],
    });
    documents.set(record.source_workpaper.document_reference, {
      document_reference: record.source_workpaper.document_reference,
      bytes: workpaper,
    });
    record.source_workpaper.sha256 = hash(workpaper);
  }
  const items = [original, simple];
  const f1099r = base.inputs.f1099r.map((row) => ({
    ...row,
    roth_owner_inventory_review: parsed,
  }));
  const retained = {
    documents: [...documents.values()],
    reviewed_source: reviewedSourceSchema.parse({
      records: [originalRecord, newRecord],
    }),
  };
  return {
    ...base,
    reviews: [parsed],
    items,
    retained,
    inputs: {
      ...base.inputs,
      f4852: items,
      f1099r,
      f4852_reviewed_source: { reviewed_source: retained.reviewed_source },
    },
  };
}
