import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { itemSchema } from "../../../../nodes/inputs/f4852/index.ts";
import {
  rothOwnerInventoryDocuments,
  rothOwnerInventorySchema,
} from "../../../../nodes/intermediate/forms/form8606/roth-inventory.ts";
import { rothDistributionYearSchema } from "../../../../nodes/intermediate/forms/form8606/roth-history.ts";
import {
  rothConversionCases,
  rothConversionReturnSource,
} from "./form4852_roth_conversion.fixture.ts";
import {
  officialForm4852EvidenceTemplate,
  retainedForm4852Sources,
} from "./form4852_filing.fixture.ts";

export const rothHistoryCases = [
  {
    id: "2020-filed-conversion-and-consumption-before-later-regular",
    base: 1,
    history: [{
      year: 2020,
      gross: 1000,
      basis: 0,
      conversion: 5000,
      earnings: 0,
      early: 1000,
    }],
    basis: 1000,
    converted: 9000,
    taxable: 0,
    early: 350,
    tax: 19417,
  },
  {
    id: "prior-regular-partial-consumption",
    base: 1,
    history: [{
      year: 2023,
      gross: 500,
      basis: 1000,
      conversion: null,
      earnings: null,
      early: 0,
    }],
    basis: 500,
    converted: 10000,
    taxable: 0,
    early: 350,
    tax: 19417,
  },
  {
    id: "prior-taxable-conversion-consumed",
    base: 1,
    history: [{
      year: 2023,
      gross: 8000,
      basis: 1000,
      conversion: 10000,
      earnings: 0,
      early: 6000,
    }],
    basis: 0,
    converted: 3000,
    taxable: 6000,
    early: 750,
    tax: 21257,
  },
  {
    id: "multiple-prior-annual-consumptions",
    base: 1,
    history: [{
      year: 2022,
      gross: 500,
      basis: 1000,
      conversion: null,
      earnings: null,
      early: 0,
    }, {
      year: 2024,
      gross: 6500,
      basis: 500,
      conversion: 10000,
      earnings: 0,
      early: 5000,
    }],
    basis: 0,
    converted: 4000,
    taxable: 5000,
    early: 750,
    tax: 21017,
  },
  {
    id: "new-regular-contribution-after-consumption",
    base: 1,
    newRegular: true,
    history: [{
      year: 2022,
      gross: 1000,
      basis: 1000,
      conversion: null,
      earnings: null,
      early: 0,
    }],
    basis: 6000,
    converted: 10000,
    taxable: 0,
    early: 0,
    tax: 19067,
  },
  {
    id: "new-conversion-after-consumption",
    base: 1,
    laterConversion: true,
    history: [{
      year: 2022,
      gross: 6000,
      basis: 1000,
      conversion: 5000,
      earnings: 0,
      early: 4000,
    }],
    basis: 0,
    converted: 5000,
    taxable: 4000,
    early: 750,
    tax: 20777,
  },
  {
    id: "joint-separate-prior-consumed-pools",
    base: 4,
    history: [{
      year: 2023,
      gross: 8000,
      basis: 1000,
      conversion: 10000,
      earnings: 0,
      early: 6000,
    }],
    basis: 0,
    converted: 3000,
    taxable: 6000,
    early: 1350,
    tax: 13074,
  },
  {
    id: "prior-cent-filed-residual",
    base: 5,
    history: [{
      year: 2023,
      gross: 501,
      rawGross: 500.5,
      basis: 1001,
      conversion: null,
      earnings: null,
      early: 0,
    }],
    basis: 500,
    converted: 10002,
    taxable: 0,
    early: 350,
    tax: 19417,
  },
  {
    id: "same-annual-filed-conversion-and-consumption",
    base: 1,
    history: [{
      year: 2021,
      gross: 8000,
      basis: 1000,
      conversion: 10000,
      earnings: 0,
      early: 6000,
    }],
    basis: 0,
    converted: 3000,
    taxable: 6000,
    early: 750,
    tax: 21257,
  },
  {
    id: "prior-conversions-and-earnings-exhausted",
    base: 1,
    history: [{
      year: 2024,
      gross: 13000,
      basis: 1000,
      conversion: 10000,
      earnings: 2000,
      early: 9500,
    }],
    basis: 0,
    converted: 0,
    taxable: 9000,
    early: 900,
    tax: 22127,
  },
  {
    id: "prior-age-exempt-T-consumed-conversion",
    base: 6,
    history: [{
      year: 2024,
      gross: 2000,
      basis: 1000,
      conversion: 5000,
      earnings: 0,
      early: 0,
    }],
    basis: 0,
    converted: 4000,
    taxable: 5000,
    early: 0,
    tax: 20267,
  },
  {
    id: "same-payer-two-prior-account-payments",
    base: 1,
    splitPrior: true,
    history: [{
      year: 2023,
      gross: 8000,
      basis: 1000,
      conversion: 10000,
      earnings: 0,
      early: 6000,
    }],
    basis: 0,
    converted: 3000,
    taxable: 6000,
    early: 750,
    tax: 21257,
  },
] as const;

async function historicalPdf(
  type: "8606" | "5329",
  year: number,
  name: string,
  ssn: string,
  values: readonly { page: number; index: number; value: number | null }[],
) {
  const path = `.state/research/roth-consumed-history/f${type}--${year}.pdf`;
  let bytes: Uint8Array;
  try {
    bytes = await Deno.readFile(path);
  } catch {
    const response = await fetch(
      `https://www.irs.gov/pub/irs-prior/f${type}--${year}.pdf`,
    );
    if (!response.ok) throw new Error(`prior${type} ${response.status}`);
    bytes = new Uint8Array(await response.arrayBuffer());
    await Deno.mkdir(".state/research/roth-consumed-history", {
      recursive: true,
    });
    await Deno.writeFile(path, bytes);
  }
  const pdf = await PDFDocument.load(bytes), form = pdf.getForm();
  const field = (page: number, index: number) =>
    `topmostSubform[0].Page${page}[0].f${page}_${
      type === "5329" && year <= 2022 && index < 10 ? "0" : ""
    }${index}[0]`;
  form.getTextField(field(1, 1)).setText(name);
  form.getTextField(field(1, 2)).setText(ssn);
  for (const row of values) {
    form.getTextField(field(row.page, row.index)).setText(
      row.value === null ? "" : String(row.value),
    );
  }
  form.updateFieldAppearances(await pdf.embedFont(StandardFonts.Helvetica));
  return pdf.save();
}

export async function rothHistoryReturnSource(
  row: typeof rothHistoryCases[number],
  n: number,
) {
  const base = await rothConversionReturnSource(
    rothConversionCases[row.base],
    n,
  );
  const reviews = base.reviews.map((old, ownerIndex) => {
    const next = structuredClone(old);
    const name = ownerIndex === 0
      ? base.filer.fullName
      : `${base.filer.spouse!.firstName} ${base.filer.spouse!.lastName}`;
    if (ownerIndex === 0 && "laterConversion" in row) {
      const moved = next.conversions![1];
      moved.prior_form8606.tax_year = 2024;
      moved.prior_form8606.source_document_reference += "-2024-revision";
      for (const account of moved.accounts) {
        account.form5498.tax_year = 2024;
        account.form5498.source_document_reference += "-2024-revision";
        account.form5498.box10_roth_contributions = 0;
        for (const transfer of account.transfers) {
          transfer.issued_form1099r.tax_year = 2024;
          transfer.issued_form1099r.distributed_on = "2024-04-02";
          transfer.receipt.received_on = "2024-04-02";
        }
      }
      next.contributions[0].form5498.box3_roth_conversion_amount = 0;
    }
    if (ownerIndex === 0 && "newRegular" in row) {
      const later = structuredClone(next.contributions[0]);
      later.form5498.tax_year = 2024;
      later.form5498.box10_roth_contributions = 6000;
      later.form5498.box3_roth_conversion_amount = 0;
      later.form5498.source_document_reference += "-2024-new";
      later.receipts.forEach((receipt) => {
        receipt.designated_tax_year = 2024;
        receipt.received_on = "2024-02-01";
        receipt.amount = 6000;
        receipt.source_document_reference += "-2024-new";
      });
      next.contributions.push(later);
    }
    const history = ownerIndex === 0 ? row.history : [{
      year: 2024,
      gross: 7000,
      basis: 6000,
      conversion: 10000,
      earnings: 0,
      early: 1000,
    }];
    return rothOwnerInventorySchema.parse({
      ...next,
      inventory: {
        ...next.inventory,
        no_prior_distributions_or_returned_contributions: false,
        all_prior_roth_payments_included: true,
        no_returned_contributions_confirmed: true,
      },
      prior_distributions: history.map((annual) => {
        const account = next.inventory.accounts[0];
        const amount = "rawGross" in annual ? annual.rawGross : annual.gross;
        const prefix = `${row.id}-${next.owner}-${annual.year}-${n}`;
        const converted = next.conversions?.find((year) =>
          year.prior_form8606.tax_year === annual.year
        );
        const parsed = rothDistributionYearSchema.parse({
          prior_form8606: {
            source_document_reference:
              converted?.prior_form8606.source_document_reference ??
                `${prefix}-filed8606`,
            tax_year: annual.year,
            owner_name: name,
            owner_ssn: next.owner_identity.owner_ssn,
            filed_line19_distributions: annual.gross,
            filed_line20_homebuyer: 0,
            filed_line21_after_homebuyer: annual.gross,
            filed_line22_regular_basis: annual.basis,
            filed_line23_after_regular: Math.max(
              0,
              annual.gross - annual.basis,
            ),
            filed_line24_conversion_basis: annual.conversion,
            filed_line25a_earnings: annual.earnings,
            filed_line25b_disaster:
              annual.earnings === null || annual.earnings === 0 ? null : 0,
            filed_line25c_taxable:
              annual.earnings === null || annual.earnings === 0
                ? null
                : annual.earnings,
          },
          ...(annual.early > 0
            ? {
              prior_form5329: {
                source_document_reference: `${prefix}-filed5329`,
                tax_year: annual.year,
                owner_name: name,
                owner_ssn: next.owner_identity.owner_ssn,
                filed_line1_early_distributions: annual.early,
                filed_line2_exceptions: 0,
                filed_line3_subject_to_tax: annual.early,
                filed_line4_additional_tax: Math.round(annual.early * .1),
              },
            }
            : {}),
          payments: [{
            ...account,
            source_document_reference: `${prefix}-custodian-payment`,
            tax_year: annual.year,
            owner_ssn: next.owner_identity.owner_ssn,
            distribution_reference: `${prefix}-distribution`,
            distributed_on: `${annual.year}-10-10`,
            gross_distribution: amount,
            distribution_code: row.base === 6 ? "T" : "J",
            issued_form1099r: {
              source_document_reference: `${prefix}-issued1099R`,
              tax_year: annual.year,
              owner_ssn: next.owner_identity.owner_ssn,
              payer_ein: account.custodian_ein,
              account_number: account.account_number,
              distribution_reference: `${prefix}-distribution`,
              distributed_on: `${annual.year}-10-10`,
              box1_gross_distribution: amount,
              box2a_taxable_amount: 0,
              box2b_taxable_not_determined: true,
              box7_ira_indicator: false,
              box7_distribution_code: row.base === 6 ? "T" : "J",
            },
          }],
        });
        if ("splitPrior" in row) {
          const original = parsed.payments[0];
          original.gross_distribution /= 2;
          original.issued_form1099r.box1_gross_distribution /= 2;
          const second = structuredClone(original);
          second.source_document_reference += "-second-account";
          second.account_number = next.inventory.accounts[1].account_number;
          second.distribution_reference += "-second-account";
          second.issued_form1099r.source_document_reference +=
            "-second-account";
          second.issued_form1099r.account_number = second.account_number;
          second.issued_form1099r.distribution_reference =
            second.distribution_reference;
          parsed.payments.push(second);
        }
        return parsed;
      }),
    });
  });
  const items = base.items.map((item) =>
    itemSchema.parse({
      ...item,
      retirement_source: {
        ...item.retirement_source,
        roth_owner_inventory_review: reviews.find((review) =>
          review.owner_identity.owner_ssn === item.recipient_ssn
        )!,
      },
    })
  );
  const ordinary = base.inputs.f1099r.map((item) => ({
    ...item,
    roth_owner_inventory_review: reviews.find((review) =>
      review.owner === item.ts
    )!,
  }));
  const retained = await retainedForm4852Sources(
    items,
    base.filer,
    await officialForm4852EvidenceTemplate("f4852"),
  );
  const documents = new Map(
    retained.documents.map((doc) => [doc.document_reference, doc]),
  );
  for (const record of retained.reviewed_source.records) {
    const review = record.reviewed_substitute.retirement_source!
      .roth_owner_inventory_review!;
    const put = (reference: string, newBytes: Uint8Array) => {
      const bytes = documents.get(reference)?.bytes ?? newBytes;
      documents.set(reference, { document_reference: reference, bytes });
      record.treatment_documents.push({
        document_reference: reference,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
    };
    for (const facts of rothOwnerInventoryDocuments(review)) {
      put(
        facts.source_document_reference,
        new TextEncoder().encode(JSON.stringify(facts)),
      );
    }
    const years = new Set([
      ...(review.conversions ?? []).map((year) => year.prior_form8606.tax_year),
      ...review.prior_distributions!.map((year) =>
        year.prior_form8606.tax_year
      ),
    ]);
    for (const year of years) {
      const conversion = review.conversions?.find((annual) =>
        annual.prior_form8606.tax_year === year
      )?.prior_form8606;
      const annual = review.prior_distributions!.find((annual) =>
        annual.prior_form8606.tax_year === year
      );
      const prior = annual?.prior_form8606 ?? conversion!;
      const values: { page: number; index: number; value: number | null }[] =
        conversion
          ? [
            conversion.filed_line16_converted,
            conversion.filed_line17_nontaxable,
            conversion.filed_line18_taxable,
          ].map((value, index) => ({ page: 2, index: index + 1, value }))
          : [];
      if (annual) {
        const part = annual.prior_form8606;
        values.push(
          ...[
            part.filed_line19_distributions,
            part.filed_line20_homebuyer,
            part.filed_line21_after_homebuyer,
            part.filed_line22_regular_basis,
            part.filed_line23_after_regular,
            part.filed_line24_conversion_basis,
            part.filed_line25a_earnings,
            part.filed_line25b_disaster,
            part.filed_line25c_taxable,
          ].map((value, index) => ({ page: 2, index: index + 4, value })),
        );
      }
      put(
        prior.source_document_reference,
        await historicalPdf(
          "8606",
          year,
          prior.owner_name,
          prior.owner_ssn,
          values,
        ),
      );
      if (annual?.prior_form5329) {
        const prior = annual.prior_form5329;
        put(
          prior.source_document_reference,
          await historicalPdf(
            "5329",
            year,
            prior.owner_name,
            prior.owner_ssn,
            [
              prior.filed_line1_early_distributions,
              prior.filed_line2_exceptions,
              prior.filed_line3_subject_to_tax,
              prior.filed_line4_additional_tax,
            ]
              .map((value, index) => ({
                page: 1,
                index: [9, 11, 12, 13][index],
                value,
              })),
          ),
        );
      }
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
      f1099r: ordinary,
      f4852_reviewed_source: { reviewed_source: retained.reviewed_source },
    },
  };
}
