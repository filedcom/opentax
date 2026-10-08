import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { itemSchema } from "../../../../nodes/inputs/f4852/index.ts";
import {
  rothOwnerInventoryDocuments,
  rothOwnerInventorySchema,
} from "../../../../nodes/intermediate/forms/form8606/roth-inventory.ts";
import { rothConversionYearSchema } from "../../../../nodes/intermediate/forms/form8606/roth-conversion.ts";
import {
  rothInventoryCases,
  rothInventoryReturnSource,
} from "./form4852_roth_inventory.fixture.ts";
import {
  officialForm4852EvidenceTemplate,
  retainedForm4852Sources,
} from "./form4852_filing.fixture.ts";
export const rothConversionCases = [
  {
    id: "irs-5329-two-conversion-fifo-recapture",
    joint: false,
    amounts: [11000, 11000, 11000],
    basis: 4000,
    years: [{ year: 2021, gross: 20000, taxable: 15000 }, {
      year: 2022,
      gross: 10000,
      taxable: 7000,
    }],
    taxable: 0,
    early: 2200,
    tax: 21267,
  },
  {
    id: "expired-2020-before-taxable-2021",
    joint: false,
    amounts: [3000, 4000, 2000],
    basis: 1000,
    years: [{ year: 2020, gross: 5000, taxable: 4000 }, {
      year: 2021,
      gross: 5000,
      taxable: 3500,
    }],
    taxable: 0,
    early: 300,
    tax: 19367,
  },
  {
    id: "conversion-earnings-after-all-basis",
    joint: false,
    amounts: [6000, 5000, 4000],
    basis: 1000,
    years: [{ year: 2020, gross: 5000, taxable: 4000 }, {
      year: 2022,
      gross: 5000,
      taxable: 3500,
    }],
    taxable: 4000,
    early: 750,
    tax: 20777,
  },
  {
    id: "conversion-only-no-regular-contribution",
    joint: false,
    amounts: [3000, 4000, 2000],
    basis: 0,
    years: [{ year: 2021, gross: 10000, taxable: 7000 }],
    taxable: 0,
    early: 700,
    tax: 19767,
  },
  {
    id: "joint-separate-conversion-histories",
    joint: true,
    amounts: [3000, 4000, 2000],
    basis: 1000,
    years: [{ year: 2020, gross: 5000, taxable: 4000 }, {
      year: 2022,
      gross: 5000,
      taxable: 3500,
    }],
    taxable: 0,
    early: 550,
    tax: 11296,
  },
  {
    id: "conversion-cents-filed-fifo-residual",
    gross: 9001,
    joint: false,
    amounts: [3000.25, 4000.25, 2000],
    basis: 1000.5,
    years: [{ year: 2020, gross: 5001, rawGross: 5000.5, taxable: 4000 }, {
      year: 2021,
      gross: 5001,
      rawGross: 5000.5,
      taxable: 3500,
    }],
    taxable: 0,
    early: 300,
    tax: 19367,
  },
  {
    id: "age-exempt-T-with-2024-conversion-and-earnings",
    joint: false,
    ageExempt: true,
    amounts: [3000, 4000, 2000],
    basis: 1000,
    years: [{ year: 2024, gross: 5000, taxable: 3500 }],
    taxable: 3000,
    early: 0,
    tax: 19787,
  },
  {
    id: "joint-individually-rounded-recapture-taxes",
    joint: true,
    splitRound: true,
    amounts: [3000, 4000, 2000],
    basis: 1000,
    years: [{ year: 2020, gross: 5006, taxable: 4000 }, {
      year: 2022,
      gross: 5000,
      taxable: 3500,
    }],
    taxable: 0,
    early: 548,
    tax: 11294,
  },
] as const;
async function filedConversionPdf(
  prior: {
    tax_year: number;
    owner_name: string;
    owner_ssn: string;
    filed_line16_converted: number;
    filed_line17_nontaxable: number;
    filed_line18_taxable: number;
  },
) {
  const cache = `.state/research/f8606--${prior.tax_year}.pdf`;
  let bytes: Uint8Array;
  try {
    bytes = await Deno.readFile(cache);
  } catch {
    const response = await fetch(
      `https://www.irs.gov/pub/irs-prior/f8606--${prior.tax_year}.pdf`,
    );
    if (!response.ok) throw new Error(`prior8606 ${response.status}`);
    bytes = new Uint8Array(await response.arrayBuffer());
    await Deno.mkdir(".state/research", { recursive: true });
    await Deno.writeFile(cache, bytes);
  }
  const pdf = await PDFDocument.load(bytes), form = pdf.getForm();
  form.getTextField("topmostSubform[0].Page1[0].f1_1[0]").setText(
    prior.owner_name,
  );
  form.getTextField("topmostSubform[0].Page1[0].f1_2[0]").setText(
    prior.owner_ssn,
  );
  for (
    const [index, value] of [
      prior.filed_line16_converted,
      prior.filed_line17_nontaxable,
      prior.filed_line18_taxable,
    ].entries()
  ) {
    form.getTextField(`topmostSubform[0].Page2[0].f2_${index + 1}[0]`).setText(
      String(value),
    );
  }
  form.updateFieldAppearances(await pdf.embedFont(StandardFonts.Helvetica));
  return pdf.save();
}
export async function rothConversionReturnSource(
  row: typeof rothConversionCases[number],
  n: number,
) {
  const base = await rothInventoryReturnSource(
    rothInventoryCases[row.joint ? 3 : 0],
    n,
  );
  const reviews = base.reviews.map((old, ownerIndex) => {
    const annual = ownerIndex === 0
      ? row.years
      : "splitRound" in row
      ? [{ year: 2020, gross: 6, taxable: 6 }, {
        year: 2022,
        gross: 10000,
        taxable: 7000,
      }]
      : [{ year: 2022, gross: 10000, taxable: 7000 }];
    const regular = ownerIndex === 0 ? row.basis : 6000;
    const amounts = ownerIndex === 0 ? row.amounts : [4000, 4500];
    const ownerName = ownerIndex === 0
      ? base.filer.fullName
      : [base.filer.spouse!.firstName, base.filer.spouse!.lastName].join(" ");
    const account = old.inventory.accounts[0];
    const conversions = annual.map((year) =>
      rothConversionYearSchema.parse({
        prior_form8606: {
          source_document_reference:
            `${row.id}-${old.owner}-${year.year}-filed8606-${n}`,
          tax_year: year.year,
          owner_ssn: old.owner_identity.owner_ssn,
          owner_name: ownerName,
          filed_line16_converted: year.gross,
          filed_line17_nontaxable: year.gross - year.taxable,
          filed_line18_taxable: year.taxable,
        },
        accounts: [{
          form5498: {
            source_document_reference:
              `${row.id}-${old.owner}-${year.year}-conversion5498-${n}`,
            tax_year: year.year,
            owner_ssn: old.owner_identity.owner_ssn,
            ...account,
            roth_ira_confirmed: true,
            box3_roth_conversion_amount: "rawGross" in year
              ? year.rawGross
              : year.gross,
            box2_rollover_contributions: 0,
            box10_roth_contributions: regular > 0 && year.year === 2021
              ? regular
              : 0,
          },
          transfers: [{
            issued_form1099r: {
              source_document_reference:
                `${row.id}-${old.owner}-${year.year}-issued1099R-${n}`,
              tax_year: year.year,
              owner_ssn: old.owner_identity.owner_ssn,
              payer_ein: account.custodian_ein,
              traditional_account_number:
                `actual-prior-traditional-${old.owner}-${year.year}`,
              distribution_reference:
                `actual-prior-conversion-${old.owner}-${year.year}`,
              distributed_on: `${year.year}-10-01`,
              box1_gross_distribution: "rawGross" in year
                ? year.rawGross
                : year.gross,
              box2a_taxable_amount: "rawGross" in year
                ? year.rawGross
                : year.gross,
              box2b_taxable_not_determined: true,
              box7_ira_indicator: true,
              box7_distribution_code: "ageExempt" in row ? "7" : "2",
              complete_direct_roth_conversion_confirmed: true,
            },
            receipt: {
              source_document_reference:
                `${row.id}-${old.owner}-${year.year}-incoming-conversion-${n}`,
              owner_ssn: old.owner_identity.owner_ssn,
              ...account,
              received_on: `${year.year}-10-01`,
              amount: "rawGross" in year ? year.rawGross : year.gross,
              originating_distribution_reference:
                `actual-prior-conversion-${old.owner}-${year.year}`,
            },
          }],
        }],
      })
    );
    return rothOwnerInventorySchema.parse({
      ...old,
      owner_identity: {
        ...old.owner_identity,
        date_of_birth: "ageExempt" in row
          ? "1964-01-01"
          : old.owner_identity.date_of_birth,
      },
      inventory: {
        ...old.inventory,
        no_conversions_or_qualified_plan_rollovers: false,
        all_prior_roth_conversion_records_included: true,
        no_qualified_plan_rollovers_confirmed: true,
      },
      conversions,
      contributions: regular === 0 ? [] : old.contributions.map((entry) => ({
        ...entry,
        form5498: {
          ...entry.form5498,
          tax_year: 2021,
          source_document_reference: conversions.find((year) =>
            year.prior_form8606.tax_year === 2021
          )?.accounts[0].form5498.source_document_reference ??
            entry.form5498.source_document_reference,
          box3_roth_conversion_amount: conversions.find((year) =>
            year.prior_form8606.tax_year === 2021
          )?.accounts[0].form5498.box3_roth_conversion_amount ?? 0,
          box10_roth_contributions: regular,
        },
        receipts: entry.receipts.map((receipt) => ({
          ...receipt,
          designated_tax_year: 2021,
          received_on: "2021-02-01",
          amount: regular,
        })),
      })),
      payments: old.payments.map((payment, index) => ({
        ...payment,
        gross_distribution: amounts[index],
        distribution_code: "ageExempt" in row ? "T" : payment.distribution_code,
      })),
    });
  });
  const items = base.items.map((item) => {
    const review = reviews.find((review) =>
      review.owner_identity.owner_ssn === item.recipient_ssn
    )!;
    const payment = review.payments.find((payment) =>
      payment.form1099r_source_document_reference ===
        item.completed_form_review_reference
    )!;
    return itemSchema.parse({
      ...item,
      gross_distribution: payment.gross_distribution,
      distribution_code: payment.distribution_code,
      distribution_source: {
        ...item.distribution_source,
        gross_distribution: payment.gross_distribution,
        distribution_code: payment.distribution_code,
      },
      retirement_source: {
        ...item.retirement_source,
        box1_gross_distribution: payment.gross_distribution,
        box7_distribution_code: payment.distribution_code,
        roth_owner_inventory_review: review,
      },
    });
  });
  const ordinary = base.inputs.f1099r.map((item) => {
    const review = reviews.find((review) => review.owner === item.ts)!;
    const payment = review.payments.find((payment) =>
      payment.form1099r_source_document_reference ===
        item.source_document_reference
    )!;
    return {
      ...item,
      box1_gross_distribution: payment.gross_distribution,
      box7_distribution_code: payment.distribution_code,
      roth_owner_inventory_review: review,
    };
  });
  const retained = await retainedForm4852Sources(
    items,
    base.filer,
    await officialForm4852EvidenceTemplate("f4852"),
  );
  const documents = new Map(
    retained.documents.map(
      (document) => [document.document_reference, document],
    ),
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
    for (const year of review.conversions ?? []) {
      const prior = year.prior_form8606;
      let document = documents.get(prior.source_document_reference);
      if (!document) {
        document = {
          document_reference: prior.source_document_reference,
          bytes: await filedConversionPdf(prior),
        };
        documents.set(prior.source_document_reference, document);
      }
      record.treatment_documents.push({
        document_reference: prior.source_document_reference,
        sha256: createHash("sha256").update(document.bytes).digest("hex"),
      });
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
      general: {
        ...base.inputs.general,
        taxpayer_dob: reviews[0].owner_identity.date_of_birth,
      },
      f1099r: ordinary,
      f4852: items,
      f4852_reviewed_source: { reviewed_source: retained.reviewed_source },
    },
  };
}
