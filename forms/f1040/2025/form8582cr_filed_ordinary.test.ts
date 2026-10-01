import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { FilingStatus } from "../nodes/types.ts";
import { ordinaryTax2025 } from "../nodes/intermediate/worksheets/tax_table_2025.ts";
import { calculateForm8582CR } from "../nodes/intermediate/forms/form8582cr/index.ts";
import { buildCurrentYearCarryforwardLedger } from "../nodes/intermediate/forms/form8582cr/carryforward-ledger.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import { form8582cr } from "./mef/forms/f8582cr.ts";
import { form8582crPdf } from "./pdf/forms/f8582cr.ts";

const passiveIncome = 20_000;
const taxable = 104_250;
const taxAll = ordinaryTax2025(taxable, FilingStatus.Single);
const taxWithout = ordinaryTax2025(
  taxable - passiveIncome,
  FilingStatus.Single,
);
const incomeReference = "2025 rental income ledger";
const investmentReference = "2025 community QEI notice";
const worksheet = {
  tax_year: 2025 as const,
  tax_method: "ordinary" as const,
  activity_id: "rental-1",
  passive_income_source_document_reference: incomeReference,
  net_passive_income: passiveIncome,
  taxable_income_including_passive: taxable,
  taxable_income_without_passive: taxable - passiveIncome,
  tax_including_passive: taxAll,
  tax_without_passive: taxWithout,
};
const investment = {
  cde_name: "Community Development Entity",
  cde_ein: "123456789",
  cde_address: {
    line1: "10 Community Way",
    city: "Wilmington",
    state: "DE",
    zip: "19801",
  },
  initial_investment_date: "2025-04-15",
  credit_allowance_date: "2025-04-15",
  qualified_equity_investment_amount: 10_000,
  designation_notice_reference: investmentReference,
  held_on_credit_allowance_date: true,
  qualified_on_credit_allowance_date: true,
  recapture_notice_received: false,
  subject_to_passive_activity_limit: true,
  passive_activity_reference: "community-investment-1",
  passive_source_document_reference: investmentReference,
};
const source = {
  activity_reference: "community-investment-1",
  source_form: "Form 8874",
  source_origin: { kind: "self" as const },
  source_document_reference: investmentReference,
  category: "other" as const,
  reporting_route: "form3800_line3" as const,
  form3800_credit_line: "1i" as const,
  current_year_credit: 500,
  prior_unallowed_credits: [],
  publicly_traded_partnership: false,
};
const general = {
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Owner",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};

function filedReturn(investmentAmount = 10_000, interestAmount = 0) {
  const taxableWithInterest = taxable + interestAmount;
  const taxAllWithInterest = ordinaryTax2025(
    taxableWithInterest,
    FilingStatus.Single,
  );
  const taxWithoutWithInterest = ordinaryTax2025(
    taxableWithInterest - passiveIncome,
    FilingStatus.Single,
  );
  const result = f1040_2025.executeReturn({
    general,
    w2: [{ box1_wages: 100_000, box2_fed_withheld: 16_000 }],
    ...(interestAmount > 0
      ? {
        f1099int: [{
          payer_name: "Community Bank",
          payer_tin: "987654321",
          source_document_reference: "2025 Community Bank 1099-INT",
          box1: interestAmount,
        }],
      }
      : {}),
    schedule_e: [{
      tsj: "T",
      activity_id: "rental-1",
      passive_income_source_document_reference: incomeReference,
      property_description: "Rental property",
      property_type: 1,
      activity_type: "B",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: passiveIncome,
      form_1099_payments_made: false,
    }],
    f8874: {
      investments: [{
        ...investment,
        qualified_equity_investment_amount: investmentAmount,
      }],
    },
    form8582cr: {
      credit_sources: [{
        ...source,
        current_year_credit: investmentAmount * 0.05,
      }],
      regular_tax_all_income: taxAllWithInterest,
      regular_tax_without_passive: taxWithoutWithInterest,
      line6_ordinary_worksheet: {
        ...worksheet,
        taxable_income_including_passive: taxableWithInterest,
        taxable_income_without_passive: taxableWithInterest - passiveIncome,
        tax_including_passive: taxAllWithInterest,
        tax_without_passive: taxWithoutWithInterest,
      },
    },
  });
  assertEquals(result.diagnostics, []);
  return result;
}

function filedPartnershipReturn() {
  const result = f1040_2025.executeReturn({
    general,
    w2: [{ box1_wages: 100_000, box2_fed_withheld: 16_000 }],
    schedule_e: [{
      tsj: "T",
      activity_id: "rental-1",
      passive_income_source_document_reference: incomeReference,
      property_description: "Rental property",
      property_type: 1,
      activity_type: "B",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: passiveIncome,
      form_1099_payments_made: false,
    }],
    k1_partnership: {
      k1_partnerships: [{
        partnership_name: "Community partnership",
        partnership_ein: "123456789",
        source_document_reference: "2025 partnership K-1 code AD",
        recipient_tin: "111223333",
        box15_code_ad_new_markets_credit: 500,
        new_markets_credit_subject_to_passive_activity_limit: true,
      }],
    },
    form8582cr: {
      credit_sources: [{
        ...source,
        activity_reference: "2025 partnership K-1 code AD",
        source_document_reference: "2025 partnership K-1 code AD",
        source_origin: {
          kind: "partnership" as const,
          entity_reference: "Community partnership",
          ein: "123456789",
        },
      }],
      regular_tax_all_income: taxAll,
      regular_tax_without_passive: taxWithout,
      line6_ordinary_worksheet: worksheet,
    },
  });
  assertEquals(result.diagnostics, []);
  return result;
}

function filedSCorpReturn() {
  const result = f1040_2025.executeReturn({
    general,
    w2: [{ box1_wages: 100_000, box2_fed_withheld: 16_000 }],
    schedule_e: [{
      tsj: "T",
      activity_id: "rental-1",
      passive_income_source_document_reference: incomeReference,
      property_description: "Rental property",
      property_type: 1,
      activity_type: "B",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: passiveIncome,
      form_1099_payments_made: false,
    }],
    k1_s_corp: {
      k1_s_corps: [{
        corporation_name: "Community S corporation",
        corporation_ein: "234567891",
        source_document_reference: "2025 S corporation K-1 code AD",
        recipient_tin: "111223333",
        box13_code_ad_new_markets_credit: 500,
        new_markets_credit_subject_to_passive_activity_limit: true,
      }],
    },
    form8582cr: {
      credit_sources: [{
        ...source,
        activity_reference: "2025 S corporation K-1 code AD",
        source_document_reference: "2025 S corporation K-1 code AD",
        source_origin: {
          kind: "s_corporation" as const,
          entity_reference: "Community S corporation",
          ein: "234567891",
        },
      }],
      regular_tax_all_income: taxAll,
      regular_tax_without_passive: taxWithout,
      line6_ordinary_worksheet: worksheet,
    },
  });
  assertEquals(result.diagnostics, []);
  return result;
}

Deno.test("S corporation K-1 code AD passive credit reconciles rental line 6, Form 3800, native and PDF", async () => {
  const result = filedSCorpReturn();
  const pending = normalizeAllPending(result.pending);
  assertEquals(pending.schedule3.line6a_total, 500);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 500);
  const xml = form8582cr.build(pending.form8582cr, { pending });
  assertStringIncludes(xml, "<AllowedCreditsAmt>500</AllowedCreditsAmt>");
  const pdf = form8582crPdf.projectFields!(pending.form8582cr, pending);
  assertEquals(pdf.line4a, 500);
  assertEquals(pdf.line37, 500);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(prepared.bundle.xml, "<IRS8582CR ");
  assert(!prepared.bundle.xml.includes("<IRS8874 "));
  assertStringIncludes(
    prepared.bundle.xml,
    "<PassThroughEntityEIN>234567891</PassThroughEntityEIN>",
  );
  assert(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount() > 2,
  );
});

Deno.test("S corporation K-1 code AD passive credit rejects changed issuer, amount, income boxes and recipient", () => {
  const pending = normalizeAllPending(filedSCorpReturn().pending);
  const row = (pending.k1_s_corp.k1_s_corps as Record<string, unknown>[])[0];
  for (
    const changedRow of [
      { ...row, corporation_ein: "987654321" },
      { ...row, box13_code_ad_new_markets_credit: 501 },
      { ...row, box1_ordinary_business: 10 },
      { ...row, recipient_tin: "999887777" },
    ]
  ) {
    const changed = {
      ...pending,
      k1_s_corp: { k1_s_corps: [changedRow] },
    };
    assertThrows(
      () => form8582cr.build(changed.form8582cr, { pending: changed }),
      Error,
    );
    assertThrows(
      () => form8582crPdf.projectFields!(changed.form8582cr, changed),
      Error,
    );
  }
});

Deno.test("partnership K-1 code AD passive credit reconciles rental line 6, Form 3800, native and PDF", async () => {
  const result = filedPartnershipReturn();
  const pending = normalizeAllPending(result.pending);
  assertEquals(pending.schedule3.line6a_total, 500);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 500);
  const xml = form8582cr.build(pending.form8582cr, { pending });
  assertStringIncludes(xml, "<AllowedCreditsAmt>500</AllowedCreditsAmt>");
  const pdf = form8582crPdf.projectFields!(pending.form8582cr, pending);
  assertEquals(pdf.line4a, 500);
  assertEquals(pdf.line37, 500);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(prepared.bundle.xml, "<IRS8582CR ");
  assert(!prepared.bundle.xml.includes("<IRS8874 "));
  assertStringIncludes(
    prepared.bundle.xml,
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  assert(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount() > 2,
  );
});

Deno.test("partnership K-1 code AD passive credit rejects changed issuer, amount, income boxes and recipient", () => {
  const pending = normalizeAllPending(filedPartnershipReturn().pending);
  const row =
    (pending.k1_partnership.k1_partnerships as Record<string, unknown>[])[0];
  for (
    const changedRow of [
      { ...row, partnership_ein: "987654321" },
      { ...row, box15_code_ad_new_markets_credit: 501 },
      { ...row, box1_ordinary_business: 10 },
      { ...row, recipient_tin: "999887777" },
    ]
  ) {
    const changed = {
      ...pending,
      k1_partnership: { k1_partnerships: [changedRow] },
    };
    assertThrows(
      () => form8582cr.build(changed.form8582cr, { pending: changed }),
      Error,
    );
    assertThrows(
      () => form8582crPdf.projectFields!(changed.form8582cr, changed),
      Error,
    );
  }
});

Deno.test("current-year passive New Markets credit and rental income reconcile Form 8582-CR line 6, Form 3800, Form 1040, native and PDF", () => {
  const pending = normalizeAllPending(filedReturn().pending);
  assertEquals(pending.f1040.line8_additional_income, passiveIncome);
  assertEquals(pending.f1040.line16_income_tax, taxAll);
  assertEquals(pending.schedule3.line6a_total, 500);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 500);
  const xml = form8582cr.build(pending.form8582cr, { pending });
  assertStringIncludes(
    xml,
    `<NetPassiveIncomeTaxAmt>${taxAll - taxWithout}</NetPassiveIncomeTaxAmt>`,
  );
  assertStringIncludes(xml, "<AllowedCreditsAmt>500</AllowedCreditsAmt>");
  const pdf = form8582crPdf.projectFields!(pending.form8582cr, pending);
  assertEquals(pdf.line4a, 500);
  assertEquals(pdf.line5, 500);
  assertEquals(pdf.line6, taxAll - taxWithout);
  assertEquals(pdf.line7, 0);
  assertEquals(pdf.line37, 500);
  assert(form8582crPdf.fields.some((field) =>
    field.domainKey === "line37" &&
    field.pdfField === "topmostSubform[0].Page2[0].f2_21[0]"
  ));
});

Deno.test("one sourced 1099-INT box 1 joins passive rental line 6, Form 3800, Form 1040, native and PDF", async () => {
  const result = filedReturn(10_000, 1_000);
  const pending = normalizeAllPending(result.pending);
  const expectedAllTax = ordinaryTax2025(taxable + 1_000, FilingStatus.Single);
  const expectedWithout = ordinaryTax2025(
    taxable + 1_000 - passiveIncome,
    FilingStatus.Single,
  );
  assertEquals(pending.f1040.line2b_taxable_interest, 1_000);
  assertEquals(pending.f1040.line9_total_income, 121_000);
  assertEquals(pending.f1040.line16_income_tax, expectedAllTax);
  assertEquals(pending.schedule3.line6a_total, 500);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 500);
  const xml = form8582cr.build(pending.form8582cr, { pending });
  assertStringIncludes(
    xml,
    `<NetPassiveIncomeTaxAmt>${
      expectedAllTax - expectedWithout
    }</NetPassiveIncomeTaxAmt>`,
  );
  assertStringIncludes(xml, "<AllowedCreditsAmt>500</AllowedCreditsAmt>");
  const pdf = form8582crPdf.projectFields!(pending.form8582cr, pending);
  assertEquals(pdf.line6, expectedAllTax - expectedWithout);
  assertEquals(pdf.line37, 500);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(prepared.bundle.xml, "<IRS8582CR ");
  assertStringIncludes(prepared.bundle.xml, "<IRS3800 ");
  assert(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount() > 2,
  );
});

Deno.test("Form 8582-CR interest branch rejects altered issuer box, filed interest, and tax", () => {
  const pending = normalizeAllPending(filedReturn(10_000, 1_000).pending);
  const row = pending.f1099int.f1099ints[0];
  const cases = [
    {
      ...pending,
      f1099int: { f1099ints: [{ ...row, box1: 999 }] },
    },
    {
      ...pending,
      f1099int: { f1099ints: [{ ...row, box3: 10 }] },
    },
    {
      ...pending,
      f1040: { ...pending.f1040, line2b_taxable_interest: 999 },
    },
    {
      ...pending,
      f1040: { ...pending.f1040, line16_income_tax: 1 },
    },
  ];
  for (const changed of cases) {
    assertThrows(
      () => form8582cr.build(changed.form8582cr, { pending: changed }),
      Error,
    );
    assertThrows(
      () => form8582crPdf.projectFields!(changed.form8582cr, changed),
      Error,
    );
  }
});

Deno.test("Form 8582-CR native and PDF reject changed rental, credit, tax and filed-return joins", () => {
  const pending = normalizeAllPending(filedReturn().pending);
  const cases = [
    {
      ...pending,
      schedule_e: {
        ...pending.schedule_e,
        schedule_es: [{
          ...(pending.schedule_e.schedule_es as Record<string, unknown>[])[0],
          passive_income_source_document_reference: "wrong rental ledger",
        }],
      },
    },
    {
      ...pending,
      f8874: {
        investments: [{
          ...investment,
          qualified_equity_investment_amount: 9_000,
        }],
      },
    },
    {
      ...pending,
      form8582cr: {
        ...pending.form8582cr,
        regular_tax_without_passive: taxWithout + 1,
      },
    },
    { ...pending, f1040: { ...pending.f1040, line16_income_tax: taxAll + 1 } },
    { ...pending, schedule3: { ...pending.schedule3, line6a_total: 499 } },
  ];
  for (const changed of cases) {
    assertThrows(
      () => form8582cr.build(changed.form8582cr, { pending: changed }),
      Error,
    );
    assertThrows(
      () => form8582crPdf.projectFields!(changed.form8582cr, changed),
      Error,
    );
  }
  const missing = {
    ...pending.form8582cr,
    line6_ordinary_worksheet: undefined,
  };
  assertThrows(
    () =>
      form8582crPdf.projectFields!(missing, {
        ...pending,
        form8582cr: missing,
      }),
    Error,
  );
});

Deno.test("current-year excess credit retains an activity/year Worksheet 9 balance while native and PDF print the limited amount", () => {
  const pending = normalizeAllPending(filedReturn(100_000).pending);
  const lines = calculateForm8582CR(pending.form8582cr);
  const ledger = buildCurrentYearCarryforwardLedger(pending.form8582cr);
  assert(lines.partI.line7 > 0);
  assertEquals(ledger.rows[0].originating_tax_year, 2025);
  assertEquals(
    ledger.rows[0].source.activity_reference,
    "community-investment-1",
  );
  assertEquals(ledger.unallowed_credit, 5_000 - lines.line37);
  assertStringIncludes(
    form8582cr.build(pending.form8582cr, { pending }),
    `<AllowedCreditsAmt>${lines.line37}</AllowedCreditsAmt>`,
  );
  const pdf = form8582crPdf.projectFields!(pending.form8582cr, pending);
  assertEquals(pdf.line7, ledger.unallowed_credit);
  assertEquals(pdf.line37, ledger.allowed_credit);
});

Deno.test("filed passive Form 8582-CR is included in the complete printable return packet", async () => {
  const result = filedReturn();
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(prepared.bundle.xml, "<IRS8582CR ");
  const printable = await prepared.renderPdf();
  assert((await PDFDocument.load(printable)).getPageCount() > 2);
});
