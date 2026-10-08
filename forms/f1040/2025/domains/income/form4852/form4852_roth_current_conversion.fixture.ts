import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { itemSchema } from "../../../../nodes/inputs/f4852/index.ts";
import {
  rothOwnerInventoryDocuments,
  rothOwnerInventorySchema,
} from "../../../../nodes/intermediate/forms/form8606/roth-inventory.ts";
import { currentRothConversionSchema } from "../../../../nodes/intermediate/forms/form8606/roth-current-conversion.ts";
import {
  rothHistoryCases,
  rothHistoryReturnSource,
} from "./form4852_roth_history.fixture.ts";
import {
  officialForm4852EvidenceTemplate,
  retainedForm4852Sources,
} from "./form4852_filing.fixture.ts";
export const rothCurrentConversionCases = [
  {
    id: "current-partial-cent-balance-filed-zero-still-PartI",
    base: 2,
    converted: 5000,
    priorBasis: 2000,
    yearEnd: 0.49,
    currentBasis: 2000,
    conversionTax: 3000,
    rothTax: 1000,
    early: 550,
    total: 20577,
  },
  {
    id: "first-ever-Roth-current-conversion-and-current-distributions",
    base: 2,
    converted: 5000,
    priorBasis: 0,
    yearEnd: 0,
    currentBasis: 0,
    conversionTax: 5000,
    rothTax: 4000,
    early: 900,
    total: 22127,
    currentOnly: true,
  },
  {
    id: "current-qualified-T-PartII-without-PartIII",
    base: 10,
    converted: 5000,
    priorBasis: 1000,
    yearEnd: 0,
    currentBasis: 1000,
    conversionTax: 4000,
    rothTax: 0,
    early: 0,
    total: 20027,
    qualified: true,
  },
  {
    id: "current-partial-market-loss-prior-basis-exceeds-assets",
    base: 2,
    converted: 10000,
    priorBasis: 15000,
    yearEnd: 1000,
    currentBasis: 10000,
    conversionTax: 0,
    rothTax: 0,
    early: 150,
    total: 19217,
  },
  {
    id: "first-current-conversion-after-prior-regular-only-payment",
    base: 1,
    converted: 10000,
    priorBasis: 3000,
    yearEnd: 10000,
    currentBasis: 1500,
    conversionTax: 8500,
    rothTax: 0,
    early: 850,
    total: 21957,
    firstConversion: true,
  },
  {
    id: "current-market-loss-prior-basis-exceeds-assets",
    blocked: true,
    base: 2,
    converted: 10000,
    priorBasis: 15000,
    yearEnd: 0,
    currentBasis: 10000,
    conversionTax: 0,
    rothTax: 0,
    early: 150,
    total: 19217,
  },
  {
    id: "current-shared5498-regular-and-converted-source",
    base: 2,
    converted: 10000,
    priorBasis: 3000,
    yearEnd: 10000,
    currentBasis: 1500,
    conversionTax: 8500,
    rothTax: 0,
    early: 650,
    total: 21757,
    regular: true,
  },
  {
    id: "current-taxable-after-consumed-conversions",
    base: 2,
    converted: 10000,
    priorBasis: 0,
    yearEnd: 0,
    currentBasis: 0,
    conversionTax: 10000,
    rothTax: 0,
    early: 750,
    total: 22217,
  },
  {
    id: "current-pro-rata-prior-basis-and-retained-balances",
    base: 2,
    converted: 10000,
    priorBasis: 3000,
    yearEnd: 10000,
    currentBasis: 1500,
    conversionTax: 8500,
    rothTax: 0,
    early: 750,
    total: 21857,
  },
  {
    id: "current-nontaxable-conversion-pool",
    base: 2,
    converted: 10000,
    priorBasis: 10000,
    yearEnd: 0,
    currentBasis: 10000,
    conversionTax: 0,
    rothTax: 0,
    early: 150,
    total: 19217,
  },
  {
    id: "current-cent-two-issued-transfers",
    base: 2,
    converted: 10000.5,
    priorBasis: 3000,
    yearEnd: 10000.5,
    currentBasis: 1500,
    conversionTax: 8501,
    rothTax: 0,
    early: 750,
    total: 21857,
    split: true,
  },
  {
    id: "current-conversion-before-earnings-exhausted-history",
    base: 9,
    converted: 5000,
    priorBasis: 2000,
    yearEnd: 0,
    currentBasis: 2000,
    conversionTax: 3000,
    rothTax: 4000,
    early: 700,
    total: 21447,
  },
  {
    id: "current-age-exempt-T-and-taxable-conversion",
    base: 10,
    converted: 5000,
    priorBasis: 1000,
    yearEnd: 0,
    currentBasis: 1000,
    conversionTax: 4000,
    rothTax: 0,
    early: 0,
    total: 20027,
  },
  {
    id: "joint-current-conversions-and-separate-pools",
    base: 6,
    converted: 10000,
    priorBasis: 3000,
    yearEnd: 10000,
    currentBasis: 1500,
    conversionTax: 13500,
    rothTax: 0,
    early: 1350,
    total: 14718,
    joint: true,
  },
] as const;
export async function rothCurrentConversionReturnSource(
  row: typeof rothCurrentConversionCases[number],
  n: number,
) {
  const base = await rothHistoryReturnSource(rothHistoryCases[row.base], n);
  const reviews = base.reviews.map((old, ownerIndex) => {
    const review = structuredClone(old);
    if ("firstConversion" in row) {
      review.conversions = undefined;
      for (const contribution of review.contributions) {
        contribution.form5498.box3_roth_conversion_amount = 0;
      }
    }
    if ("qualified" in row) {
      const contribution = review.contributions.find((c) =>
        c.form5498.tax_year === 2021
      )!;
      contribution.form5498.tax_year = 2020;
      for (const receipt of contribution.receipts) {
        receipt.designated_tax_year = 2020;
        receipt.received_on = "2020-04-01";
      }
    }
    if ("currentOnly" in row) {
      review.contributions = [];
      review.conversions = undefined;
      review.prior_distributions = undefined;
      review.inventory.no_prior_distributions_or_returned_contributions = true;
      review.inventory.all_prior_roth_payments_included = undefined;
      review.inventory.no_returned_contributions_confirmed = undefined;
    }
    const owner = review.owner_identity.owner_ssn;
    const name = ownerIndex
      ? `${base.filer.spouse!.firstName} ${base.filer.spouse!.lastName}`
      : base.filer.fullName;
    const prefix = `${row.id}-${review.owner}-2025`;
    const roth = review.inventory.accounts[0];
    const amount = ownerIndex ? 5000 : row.converted;
    const priorBasis = ownerIndex ? 0 : row.priorBasis;
    const yearEnd = ownerIndex ? 0 : row.yearEnd;
    const annual2024 = [
      ...(review.conversions ?? []).map((r) => r.prior_form8606),
      ...(review.prior_distributions ?? []).map((r) => r.prior_form8606),
    ].find((r) => r.tax_year === 2024);
    const conversion2024 = review.conversions?.find((r) =>
      r.prior_form8606.tax_year === 2024
    )?.prior_form8606;
    // Constructed reviewed prior filing operands, retained in the completed
    // official form. They are not a prior-year engine computation or issuer authentication.
    const priorPartI = conversion2024
      ? {
        method: "allocated",
        line1: 0,
        line2: 2500,
        line3: 2500,
        line4: 0,
        line5: 2500,
        line6: 3333,
        line7: 0,
        line8: 5000,
        line9: 8333,
        line10: .300,
        line11: 1500,
        line12: 0,
        line13: 1500,
      }
      : {
        method: "carryforward",
        line1: 0,
        line2: priorBasis,
        line3: priorBasis,
      };
    const trad = {
      custodian_ein: ownerIndex ? "675432109" : "665432109",
      account_number: `CURRENT-TRAD-${n}-${review.owner}`,
    };
    const issuer = {
      name: "Traditional Conversion Custodian",
      address_line1: "100 Fund Road",
      city: "Denver",
      state: "CO",
      zip: "80202",
    };
    const transfers = ("split" in row ? [amount / 2, amount / 2] : [amount])
      .map((value, index) => ({
        issued_form1099r: {
          source_document_reference: `${prefix}-issued-debit-${index}`,
          tax_year: 2025,
          owner_ssn: owner,
          payer_ein: trad.custodian_ein,
          traditional_account_number: trad.account_number,
          distribution_reference: `${prefix}-debit-${index}`,
          distributed_on: `2025-0${index + 2}-10`,
          box1_gross_distribution: value,
          box2a_taxable_amount: value,
          box2b_taxable_not_determined: true,
          box7_ira_indicator: true,
          box7_distribution_code: review.payments[0].distribution_code === "T"
            ? "7"
            : "2",
          complete_direct_roth_conversion_confirmed: true,
          issuer,
          federal_withheld: 0,
          state_tax_withheld: 0,
          local_tax_withheld: 0,
        },
        receipt: {
          source_document_reference: `${prefix}-roth-paid-${index}`,
          owner_ssn: owner,
          custodian_ein: roth.custodian_ein,
          account_number: roth.account_number,
          received_on: `2025-0${index + 2}-11`,
          amount: value,
          originating_distribution_reference: `${prefix}-debit-${index}`,
        },
      }));
    const current = currentRothConversionSchema.parse({
      inventory: {
        source_document_reference: `${prefix}-traditional-complete-inventory`,
        owner_ssn: owner,
        traditional_accounts: [trad],
        all_owned_traditional_sep_simple_iras_included: true,
        all_current_traditional_distributions_are_listed_conversions: true,
        no_current_traditional_contributions: true,
        no_outstanding_rollovers_repayments_qcd_hsa_disaster_or_transferred_basis:
          true,
      },
      prior_form8606: {
        source_document_reference: annual2024?.source_document_reference ??
          `${prefix}-filed-2024-basis8606`,
        tax_year: 2024,
        owner_ssn: owner,
        owner_name: name,
        filed_line14_basis: priorBasis,
        filed_part_i: priorPartI,
      },
      year_end_statements: [{
        source_document_reference: `${prefix}-traditional-year-end`,
        owner_ssn: owner,
        ...trad,
        as_of: "2025-12-31",
        fair_market_value: yearEnd,
      }],
      accounts: [{
        form5498: {
          source_document_reference: `${prefix}-issued-Roth5498`,
          tax_year: 2025,
          owner_ssn: owner,
          ...roth,
          roth_ira_confirmed: true,
          box3_roth_conversion_amount: amount,
          box2_rollover_contributions: 0,
          box10_roth_contributions: 0,
        },
        transfers,
      }],
    });
    if ("split" in row) {
      const second = { ...trad, account_number: `${trad.account_number}-B` };
      current.inventory.traditional_accounts.push(second);
      current.year_end_statements[0].fair_market_value /= 2;
      current.year_end_statements.push({
        ...current.year_end_statements[0],
        ...second,
        source_document_reference: `${prefix}-second-traditional-year-end`,
      });
      current.accounts[0].transfers[1].issued_form1099r
        .traditional_account_number = second.account_number;
    }
    if ("regular" in row) {
      current.accounts[0].form5498.box10_roth_contributions = 1000;
      review.contributions.push({
        form5498: current.accounts[0].form5498,
        receipts: [{
          source_document_reference: `${prefix}-regular-paid`,
          owner_ssn: owner,
          custodian_ein: roth.custodian_ein,
          account_number: roth.account_number,
          designated_tax_year: 2025,
          received_on: "2025-01-10",
          amount: 1000,
        }],
      });
    }
    return rothOwnerInventorySchema.parse({
      ...review,
      current_conversion: current,
      inventory: {
        ...review.inventory,
        no_conversions_or_qualified_plan_rollovers: false,
        all_prior_roth_conversion_records_included: true,
        no_qualified_plan_rollovers_confirmed: true,
      },
    });
  });
  const items = base.items.map((item) =>
    itemSchema.parse({
      ...item,
      retirement_source: {
        ...item.retirement_source,
        roth_owner_inventory_review: reviews.find((r) =>
          r.owner === item.subject_ts
        )!,
      },
    })
  );
  const ordinary = base.inputs.f1099r.map((item) => ({
    ...item,
    roth_owner_inventory_review: reviews.find((r) => r.owner === item.ts)!,
  }));
  const issued = reviews.flatMap((review) =>
    review.current_conversion!.accounts.flatMap((account) =>
      account.transfers.map((t) => {
        const i = t.issued_form1099r;
        return {
          ts: review.owner,
          recipient_ssn: i.owner_ssn,
          payer_ein: i.payer_ein,
          payer_name: i.issuer.name,
          payer_address_line1: i.issuer.address_line1,
          payer_address_city: i.issuer.city,
          payer_address_state: i.issuer.state,
          payer_address_zip: i.issuer.zip,
          account_number: i.traditional_account_number,
          source_document_reference: i.source_document_reference,
          box1_gross_distribution: i.box1_gross_distribution,
          box2a_taxable_amount: i.box2a_taxable_amount,
          box2b_not_determined: true,
          box7_ira_simple_indicator: true,
          box7_distribution_code: i.box7_distribution_code,
          box13_date_of_payment: i.distributed_on,
          box4_federal_withheld: 0,
          box14_state_tax: 0,
          box17_local_tax: 0,
          rollover_code: "C",
          roth_owner_inventory_review: review,
        };
      })
    )
  );
  const retained = await retainedForm4852Sources(
    items,
    base.filer,
    await officialForm4852EvidenceTemplate("f4852"),
  );
  const documents = new Map(
    retained.documents.map((d) => [d.document_reference, d]),
  );
  for (const record of retained.reviewed_source.records) {
    const review = record.reviewed_substitute.retirement_source!
      .roth_owner_inventory_review!;
    const put = (reference: string, bytes: Uint8Array) => {
      const existing = documents.get(reference);
      const actual = existing?.bytes ?? bytes;
      documents.set(reference, {
        document_reference: reference,
        bytes: actual,
      });
      if (
        !record.treatment_documents.some((d) =>
          d.document_reference === reference
        )
      ) {
        record.treatment_documents.push({
          document_reference: reference,
          sha256: createHash("sha256").update(actual).digest("hex"),
        });
      }
    };
    for (const facts of rothOwnerInventoryDocuments(review)) {
      put(
        facts.source_document_reference,
        new TextEncoder().encode(JSON.stringify(facts)),
      );
    }
    const historicalRefs = [
      ...(review.conversions ?? []).map((r) =>
        r.prior_form8606.source_document_reference
      ),
      ...(review.prior_distributions ?? []).flatMap(
        (r) => [
          r.prior_form8606.source_document_reference,
          ...(r.prior_form5329
            ? [r.prior_form5329.source_document_reference]
            : []),
        ],
      ),
    ];
    for (const reference of new Set(historicalRefs)) {
      put(
        reference,
        base.retained.documents.find((d) => d.document_reference === reference)!
          .bytes,
      );
    }
    const prior = review.current_conversion!.prior_form8606;
    const original = documents.get(prior.source_document_reference)?.bytes ??
      await officialForm4852EvidenceTemplate("f8606-2024");
    const pdf = await PDFDocument.load(original), form = pdf.getForm();
    form.getTextField("topmostSubform[0].Page1[0].f1_1[0]").setText(
      prior.owner_name,
    );
    form.getTextField("topmostSubform[0].Page1[0].f1_2[0]").setText(
      prior.owner_ssn,
    );
    form.getTextField("topmostSubform[0].Page1[0].f1_23[0]").setText(
      String(prior.filed_line14_basis),
    );
    const partIFields: Record<string, string> = {
      line1: "f1_9",
      line2: "f1_10",
      line3: "f1_11",
      line4: "f1_12",
      line5: "f1_13",
      line6: "f1_14",
      line7: "f1_15",
      line8: "f1_16",
      line9: "f1_17",
      line11: "f1_20",
      line12: "f1_21",
      line13: "f1_22",
    };
    for (const [line, field] of Object.entries(partIFields)) {
      const value = prior.filed_part_i[line as keyof typeof prior.filed_part_i];
      form.getTextField(`topmostSubform[0].Page1[0].${field}[0]`).setText(
        value === undefined ? "" : String(value),
      );
    }
    if (prior.filed_part_i.method === "allocated") {
      form.getTextField("topmostSubform[0].Page1[0].f1_18[0]").setText("0");
      form.getTextField("topmostSubform[0].Page1[0].f1_19[0]").setText(
        prior.filed_part_i.line10.toFixed(3).slice(2),
      );
    }
    form.updateFieldAppearances(await pdf.embedFont(StandardFonts.Helvetica));
    const bytes = new Uint8Array(await pdf.save());
    // One actual annual prior PDF is shared by all current reviewed substitutes.
    documents.set(prior.source_document_reference, {
      document_reference: prior.source_document_reference,
      bytes,
    });
    if (
      !record.treatment_documents.some((d) =>
        d.document_reference === prior.source_document_reference
      )
    ) {
      record.treatment_documents.push({
        document_reference: prior.source_document_reference,
        sha256: "",
      });
    }
  }
  for (const record of retained.reviewed_source.records) {
    for (const doc of record.treatment_documents) {
      doc.sha256 = createHash("sha256").update(
        documents.get(doc.document_reference)!.bytes,
      ).digest("hex");
    }
  }
  retained.documents = [...documents.values()];
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
