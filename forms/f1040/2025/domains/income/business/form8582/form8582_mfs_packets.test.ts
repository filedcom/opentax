import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../../index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import {
  buildForm8582Ledger,
} from "../../../../../nodes/intermediate/forms/income/business/form8582/ledger.ts";

// Synthetic source records, not authenticated residence documents.
const residenceSource = {
  months: Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    taxpayer_residence: "1 Taxpayer Street, Albany NY 12207",
    spouse_residence: "2 Spouse Avenue, Albany NY 12207",
    taxpayer_residence_record_reference: `Synthetic taxpayer month ${
      index + 1
    }`,
    spouse_residence_record_reference: `Synthetic spouse month ${index + 1}`,
    no_shared_residence_any_day: true as const,
  })),
};
const general = {
  filing_status: FilingStatus.MFS,
  digital_assets: false,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Owner",
  taxpayer_ssn: "111223333",
  taxpayer_dob: "1985-06-15",
  spouse_first_name: "Sam",
  spouse_last_name: "Owner",
  spouse_ssn: "222334444",
  spouse_dob: "1986-07-16",
  address_line1: "1 Taxpayer Street",
  address_city: "Albany",
  address_state: "NY",
  address_zip: "12207",
  mfs_spouse_itemizing: false,
  mfs_spouse_lived_with_taxpayer: false,
  mfs_lived_apart_source: residenceSource,
};
const rental = {
  tsj: "T",
  activity_id: "mfs-rental-home",
  property_description: "Rental home",
  property_type: 1,
  street_address: "3 Rental Lane",
  city: "Albany",
  state: "NY",
  zip: "12207",
  activity_type: "A",
  fair_rental_days: 365,
  personal_use_days: 0,
  rent_income: 0,
  expense_utilities: 20000,
  some_investment_not_at_risk: false,
  form_1099_payments_made: false,
};
function source(wages: number) {
  return {
    general,
    w2: [{
      tsj: "T",
      employee_ssn: general.taxpayer_ssn,
      employer_ein: "987654321",
      employer_name: "Albany Employer",
      employer_address_line1: "4 Work Street",
      employer_address_city: "Albany",
      employer_address_state: "NY",
      employer_address_zip: "12207",
      source_document_reference: "Synthetic Alex Owner 2025 W-2",
      box1_wages: wages,
      box2_fed_withheld: 10000,
      box3_ss_wages: wages,
      box4_ss_withheld: Math.round(wages * 6.2) / 100,
      box5_medicare_wages: wages,
      box6_medicare_withheld: Math.round(wages * 1.45) / 100,
    }],
    schedule_e: [rental],
  };
}

// IRS 2025 Form 8582 Part II: $12,500 cap and 50% phaseout $50k–$75k.
// Odd-dollar final allowance rounds to whole dollars. Taxes independently
// transcribed from MFS rows of https://www.irs.gov/pub/irs-pdf/i1040tt.pdf.
// No calculation-node result is used as the expected tax or allowance.
const cases = [
  { wages: 50000, allowed: 12500, agi: 37500, taxable: 21750, tax: 2375 },
  { wages: 50001, allowed: 12500, agi: 37501, taxable: 21751, tax: 2375 },
  { wages: 60000, allowed: 7500, agi: 52500, taxable: 36750, tax: 4175 },
  { wages: 60003, allowed: 7499, agi: 52504, taxable: 36754, tax: 4175 },
  { wages: 74999, allowed: 1, agi: 74998, taxable: 59248, tax: 7944 },
  { wages: 75000, allowed: 0, agi: 75000, taxable: 59250, tax: 7955 },
  { wages: 80000, allowed: 0, agi: 80000, taxable: 64250, tax: 9055 },
];

for (const expected of cases) {
  Deno.test(`MFS rental MAGI ${expected.wages}: residence, allowance, ledger boundary and complete packet`, async () => {
    const input = source(expected.wages);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const suspended = 20000 - expected.allowed;
    assertEquals(pending.form8582.modified_agi, expected.wages);
    assertEquals(pending.schedule1.line5_schedule_e, -expected.allowed || 0);
    assertEquals(pending.f1040.line11_agi, expected.agi);
    assertEquals(pending.f1040.line12a_standard_deduction, 15750);
    assertEquals(pending.f1040.line15_taxable_income, expected.taxable);
    assertEquals(pending.f1040.line24_total_tax, expected.tax);
    assertEquals(pending.f1040.line33_total_payments, 10000);
    assertEquals(pending.f1040.line35a_refund, 10000 - expected.tax);
    assertEquals(result.carryforwards.suspended_pal_8582, suspended);
    assertEquals(
      result.carryforwards[`suspended_pal_8582:${rental.activity_id}`],
      suspended,
    );
    const reference = `synthetic-unfiled-contract-only:mfs-${expected.wages}`;
    // The actual graph omits has_other_passive=false; the ledger requires it.
    // Deferred boundary: do not inject the missing value into the graph.
    assertEquals(pending.form8582.has_other_passive, undefined);
    const ledgerError = assertThrows(
      () => buildForm8582Ledger(pending.form8582, reference),
      Error,
      "Form 8582 operating ledger needs identified other-passive activities",
    );

    const filer = extractFilerIdentity(pending.f1040);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const origins: PdfPageOrigin[] = [];
    const bytes = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    assertEquals(
      (await PDFDocument.load(bytes)).getPageCount(),
      origins.length,
    );
    assertEquals(origins.filter((p) => p.formKey === "form8582").length, 3);
    const root = Deno.env.get("OPENTAX_FORM8582_MFS_PROOF_DIR");
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      const path = `${root}/mfs-${expected.wages}`;
      await Deno.writeFile(`${path}.pdf`, bytes);
      await Deno.writeTextFile(`${path}.xml`, prepared.bundle.xml);
      await Deno.writeTextFile(
        `${path}.json`,
        JSON.stringify(
          {
            input,
            expected,
            pending,
            filer,
            origins,
            ledgerBlocked: ledgerError.message,
            acceptanceVerified: false,
          },
          null,
          2,
        ),
      );
    }
    for (
      const altered of [
        {
          ...pending,
          general: { ...pending.general, mfs_lived_apart_source: undefined },
        },
        {
          ...pending,
          general: { ...pending.general, mfs_spouse_lived_with_taxpayer: true },
        },
        {
          ...pending,
          general: {
            ...pending.general,
            mfs_lived_apart_source: {
              months: residenceSource.months.slice(0, 11),
            },
          },
        },
        {
          ...pending,
          general: {
            ...pending.general,
            mfs_lived_apart_source: {
              months: [{
                ...residenceSource.months[0],
                spouse_residence: residenceSource.months[0].taxpayer_residence,
              }, ...residenceSource.months.slice(1)],
            },
          },
        },
        {
          ...pending,
          schedule_e: {
            ...pending.schedule_e,
            schedule_es: [{ ...rental, expense_utilities: 20001 }],
          },
        },
        {
          ...pending,
          schedule_e: {
            ...pending.schedule_e,
            schedule_es: [{ ...rental, activity_id: "other-rental" }],
          },
        },
        {
          ...pending,
          w2: { w2s: [{ ...input.w2[0], employee_ssn: general.spouse_ssn }] },
        },
        {
          ...pending,
          schedule1: { ...pending.schedule1, line5_schedule_e: 1 },
        },
        {
          ...pending,
          f1040: { ...pending.f1040, line11_agi: expected.agi + 1 },
        },
      ]
    ) {
      await assertRejects(
        () => f1040_2025.prepareReturn(altered, filer),
        Error,
      );
      await assertRejects(() => buildPdfBytes(altered, filer), Error);
    }
  });
}
