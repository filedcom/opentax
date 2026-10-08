import { createHash } from "node:crypto";
import {
  form4852CalculationSources,
  itemSchema,
} from "../../../../nodes/inputs/f4852/index.ts";
import {
  rothOwnerInventoryDocuments,
  rothOwnerInventorySchema,
} from "../../../../nodes/intermediate/forms/form8606/roth-inventory.ts";
import { rothCases, rothReturnSource } from "./form4852_roth.fixture.ts";
import {
  officialForm4852EvidenceTemplate,
  retainedForm4852Sources,
} from "./form4852_filing.fixture.ts";

export const rothInventoryCases = [
  {
    id: "single-three-payments-global-basis",
    joint: false,
    crossing: false,
    qualifiedSpouse: false,
    gross: 9000,
    taxable: 4000,
    early: 400,
    totalTax: 20427,
    copies: 1,
  },
  {
    id: "joint-two-owner-five-payments",
    joint: true,
    crossing: false,
    qualifiedSpouse: false,
    gross: 17500,
    taxable: 6500,
    early: 400,
    totalTax: 12228,
    copies: 2,
  },
  {
    id: "joint-age-crossing-and-qualified-spouse",
    joint: true,
    crossing: true,
    qualifiedSpouse: true,
    gross: 17500,
    taxable: 4000,
    early: 0,
    totalTax: 11284,
    copies: 1,
  },
  {
    id: "joint-both-early-owner-copies",
    joint: true,
    crossing: false,
    qualifiedSpouse: false,
    earlySpouse: true,
    gross: 17500,
    taxable: 6500,
    early: 650,
    totalTax: 12478,
    copies: 2,
  },
  {
    id: "single-multi-payment-cents",
    joint: false,
    crossing: false,
    qualifiedSpouse: false,
    cents: true,
    gross: 9001,
    taxable: 4000,
    early: 400,
    totalTax: 20427,
    copies: 1,
  },
  {
    id: "single-qualified-three-payments-no-8606",
    joint: false,
    crossing: false,
    qualifiedSpouse: false,
    qualifiedOnly: true,
    gross: 9000,
    taxable: 0,
    early: 0,
    totalTax: 19067,
    copies: 0,
  },
] as const;

export async function rothInventoryReturnSource(
  row: typeof rothInventoryCases[number],
  n: number,
) {
  const primary = await rothReturnSource(rothCases[0], n);
  const spouse = row.joint
    ? await rothReturnSource(rothCases[6], n + 100)
    : undefined;
  const bases = spouse ? [primary, spouse] : [primary];
  const allItems = [];
  const reviews = [];
  let ordinary;
  for (const [ownerIndex, base] of bases.entries()) {
    const amounts = ownerIndex === 0
      ? ("cents" in row ? [3000.25, 4000.25, 2000] : [3000, 4000, 2000])
      : [4000, 4500];
    const items = amounts.map((amount, index) => {
      const account = `${base.item.account_number}-current-${index + 1}`;
      const prefix = `${row.id}-${ownerIndex}-${index + 1}-${n}`;
      const payer = index === 2
        ? "223456790"
        : base.item.payer_tin!.replace(/\D/g, "");
      const date = row.crossing && ownerIndex === 0
        ? ["2025-03-01", "2025-10-01", "2025-11-01"][index]
        : `2025-0${index + 6}-01`;
      const code = "qualifiedOnly" in row
        ? "T"
        : ownerIndex === 1 && "earlySpouse" in row
        ? "J"
        : row.crossing && ownerIndex === 0 && index > 0
        ? "T"
        : base.item.distribution_code;
      const original = base.item.distribution_source!;
      return {
        ...base.item,
        account_number: account,
        source_copy_lineage: `actual-custodian-copy-${prefix}`,
        distribution_reference: `actual-payment-${prefix}`,
        payer_tin: payer,
        gross_distribution: amount,
        distribution_code: code,
        completed_form_review_reference: index === 2
          ? `${prefix}-issued-1099R`
          : `${prefix}-completed-4852`,
        source_workpaper_reference: `${prefix}-workpaper`,
        distribution_source: {
          ...original,
          source_document_reference: `${prefix}-custodian-payment`,
          payer_tin: payer,
          account_number: account,
          distribution_reference: `actual-payment-${prefix}`,
          paid_on: date,
          gross_distribution: amount,
          distribution_code: code,
        },
        retirement_source: {
          ...base.item.retirement_source,
          roth_activity_review: undefined,
          account_number: account,
          payer_ein: payer,
          box1_gross_distribution: amount,
          box13_date_of_payment: date,
          box7_distribution_code: code,
          exclude_8606_roth: true,
          source_document_reference: index === 2
            ? `${prefix}-issued-1099R`
            : `${prefix}-completed-4852`,
        },
      };
    });
    const { no_other_current_roth_distribution: _old, ...inventory } =
      base.review.inventory;
    const ownerReview = rothOwnerInventorySchema.parse({
      owner: ownerIndex === 0 ? "T" : "S",
      owner_identity: {
        ...base.review.owner_identity,
        date_of_birth: "qualifiedOnly" in row
          ? "1964-01-01"
          : ownerIndex === 1 && "earlySpouse" in row
          ? "1985-07-15"
          : row.crossing && ownerIndex === 0
          ? "1966-04-01"
          : base.review.owner_identity.date_of_birth,
      },
      inventory: {
        ...inventory,
        accounts: [
          ...inventory.accounts,
          ...items.map((item) => ({
            custodian_ein: item.payer_tin,
            account_number: item.account_number,
          })),
        ],
        all_current_roth_payments_included: true,
      },
      contributions: base.review.contributions.map((entry) => ({
        ...entry,
        form5498: {
          ...entry.form5498,
          tax_year: ownerIndex === 1
            ? row.qualifiedSpouse ? 2020 : 2021
            : "qualifiedOnly" in row
            ? 2020
            : row.crossing
            ? 2021
            : 2025,
          box10_roth_contributions: ownerIndex === 1
            ? 6000
            : "cents" in row
            ? 5000.5
            : 5000,
        },
        receipts: entry.receipts.map((receipt) => ({
          ...receipt,
          designated_tax_year: ownerIndex === 1
            ? row.qualifiedSpouse ? 2020 : 2021
            : "qualifiedOnly" in row
            ? 2020
            : row.crossing
            ? 2021
            : 2025,
          received_on: `${
            ownerIndex === 1
              ? row.qualifiedSpouse ? 2020 : 2021
              : "qualifiedOnly" in row
              ? 2020
              : row.crossing
              ? 2021
              : 2025
          }-02-01`,
          amount: ownerIndex === 1 ? 6000 : "cents" in row ? 5000.5 : 5000,
        })),
      })),
      payments: items.map((item) => ({
        source_document_reference:
          `${item.distribution_source.source_document_reference}-owned-record`,
        owner_ssn: item.recipient_ssn,
        custodian_ein: item.payer_tin,
        account_number: item.account_number,
        distribution_reference: item.distribution_reference,
        distributed_on: item.distribution_source.paid_on,
        gross_distribution: item.gross_distribution,
        distribution_code: item.distribution_code,
        issuer: {
          name: item.payer_name,
          address_line1: item.payer_address_line1,
          city: item.payer_address_city,
          state: item.payer_address_state,
          zip: item.payer_address_zip,
        },
        federal_withheld: item.federal_withheld ?? 0,
        state_tax_withheld: item.state_tax_withheld ?? 0,
        local_tax_withheld: item.local_tax_withheld ?? 0,
        form1099r_source_document_reference:
          item.completed_form_review_reference,
      })),
    });
    reviews.push(ownerReview);
    for (const [index, item] of items.entries()) {
      const parsed = itemSchema.parse({
        ...item,
        retirement_source: {
          ...item.retirement_source,
          roth_owner_inventory_review: ownerReview,
        },
      });
      if (ownerIndex === 0 && index === 2) {
        ordinary = {
          ...form4852CalculationSources([parsed]).f1099rs[0],
          nonstandard_document_review: undefined,
        };
      } else allItems.push(parsed);
    }
  }
  const filer = spouse?.filer ?? primary.filer;
  const retained = await retainedForm4852Sources(
    allItems,
    filer,
    await officialForm4852EvidenceTemplate("f4852"),
  );
  const documents = new Map(
    retained.documents.map((
      document,
    ) => [document.document_reference, document]),
  );
  for (const record of retained.reviewed_source.records) {
    const review = record.reviewed_substitute.retirement_source!
      .roth_owner_inventory_review!;
    for (const facts of rothOwnerInventoryDocuments(review)) {
      const bytes = new TextEncoder().encode(JSON.stringify(facts));
      documents.set(facts.source_document_reference, {
        document_reference: facts.source_document_reference,
        bytes,
      });
      record.treatment_documents.push({
        document_reference: facts.source_document_reference,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
    }
  }
  retained.documents = [...documents.values()];
  const base = spouse?.inputs ?? primary.inputs;
  return {
    inputs: {
      ...base,
      general: {
        ...base.general,
        taxpayer_dob: reviews[0].owner_identity.date_of_birth,
        ...(reviews[1]
          ? { spouse_dob: reviews[1].owner_identity.date_of_birth }
          : {}),
      },
      f1099r: [ordinary!],
      f4852: allItems,
      f4852_reviewed_source: { reviewed_source: retained.reviewed_source },
    },
    filer,
    retained,
    reviews,
    items: allItems,
  };
}
