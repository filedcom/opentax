import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { FilingStatus } from "../nodes/types.ts";
import { ordinaryTax2025 } from "../nodes/intermediate/worksheets/tax_table_2025.ts";
import {
  calculateForm8582CR,
  inputSchema as form8582crInputSchema,
} from "../nodes/intermediate/forms/form8582cr/index.ts";
import { inputSchema as f3800InputSchema } from "../nodes/inputs/f3800/index.ts";
import { buildCurrentYearCarryforwardLedger } from "../nodes/intermediate/forms/form8582cr/carryforward-ledger.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import { form8582cr } from "./mef/forms/f8582cr.ts";
import { form8582crPdf } from "./pdf/forms/f8582cr.ts";
import { form3800Pdf } from "./pdf/forms/f3800.ts";
import { form8874Pdf } from "./pdf/forms/f8874.ts";
import {
  form3800PartIAndIIFields,
  form3800PartIIIFields,
  form3800PartVFields,
} from "./pdf/forms/f3800_fields.ts";

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

function filedReturn(
  investmentAmount = 10_000,
  interestBoxes: number[] = [],
  nonpassiveInvestmentAmount = 0,
  additionalPassiveInvestmentAmounts: number[] = [],
) {
  const interestAmount = interestBoxes.reduce((sum, amount) => sum + amount, 0);
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
        f1099int: interestBoxes.map((box1, index) => ({
          payer_name: `Community Bank ${index + 1}`,
          payer_tin: `${987654321 - index}`,
          source_document_reference: `2025 Community Bank ${
            index + 1
          } 1099-INT`,
          box1,
        })),
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
      investments: [
        {
          ...investment,
          qualified_equity_investment_amount: investmentAmount,
        },
        ...(nonpassiveInvestmentAmount > 0
          ? [{
            ...investment,
            initial_investment_date: "2022-04-15",
            designation_notice_reference: "2022 nonpassive QEI notice",
            qualified_equity_investment_amount: nonpassiveInvestmentAmount,
            subject_to_passive_activity_limit: false,
            passive_activity_reference: undefined,
            passive_source_document_reference: undefined,
          }]
          : []),
        ...additionalPassiveInvestmentAmounts.map((amount, index) => ({
          ...investment,
          cde_name: `Community Development Entity ${index + 2}`,
          cde_ein: String(987654321 - index),
          initial_investment_date: "2025-06-15",
          credit_allowance_date: "2025-06-15",
          designation_notice_reference: `2025 community QEI notice ${
            index + 2
          }`,
          qualified_equity_investment_amount: amount,
          passive_activity_reference: `community-investment-${index + 2}`,
          passive_source_document_reference: `2025 community QEI notice ${
            index + 2
          }`,
        })),
      ],
    },
    form8582cr: {
      credit_sources: [
        {
          ...source,
          current_year_credit: investmentAmount * 0.05,
        },
        ...additionalPassiveInvestmentAmounts.map((amount, index) => ({
          ...source,
          activity_reference: `community-investment-${index + 2}`,
          source_document_reference: `2025 community QEI notice ${index + 2}`,
          current_year_credit: amount * 0.05,
        })),
      ],
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

function filedMixedK1Return(
  additionalPartnershipCredits: number[] = [],
  additionalSCorpCredits: number[] = [],
) {
  const partnershipReference = "2025 partnership K-1 code AD mixed";
  const sCorpReference = "2025 S corporation K-1 code AD mixed";
  const partnerships = [
    {
      partnership_name: "Community partnership",
      partnership_ein: "123456789",
      source_document_reference: partnershipReference,
      recipient_tin: "111223333",
      box15_code_ad_new_markets_credit: 5_000,
      new_markets_credit_subject_to_passive_activity_limit: true,
    },
    ...additionalPartnershipCredits.map((credit, index) => ({
      partnership_name: `Community partnership ${index + 2}`,
      partnership_ein: String(345678901 - index),
      source_document_reference: `2025 partnership K-1 code AD ${index + 2}`,
      recipient_tin: "111223333",
      box15_code_ad_new_markets_credit: credit,
      new_markets_credit_subject_to_passive_activity_limit: true,
    })),
  ];
  const corporations = [
    {
      corporation_name: "Community S corporation",
      corporation_ein: "234567891",
      source_document_reference: sCorpReference,
      recipient_tin: "111223333",
      box13_code_ad_new_markets_credit: 2_500,
      new_markets_credit_subject_to_passive_activity_limit: true,
    },
    ...additionalSCorpCredits.map((credit, index) => ({
      corporation_name: `Community S corporation ${index + 2}`,
      corporation_ein: String(456789012 - index),
      source_document_reference: `2025 S corporation K-1 code AD ${index + 2}`,
      recipient_tin: "111223333",
      box13_code_ad_new_markets_credit: credit,
      new_markets_credit_subject_to_passive_activity_limit: true,
    })),
  ];
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
      k1_partnerships: partnerships,
    },
    k1_s_corp: {
      k1_s_corps: corporations,
    },
    form8582cr: {
      credit_sources: [
        ...partnerships.map((k1) => ({
          ...source,
          activity_reference: k1.source_document_reference,
          source_document_reference: k1.source_document_reference,
          current_year_credit: k1.box15_code_ad_new_markets_credit,
          source_origin: {
            kind: "partnership" as const,
            entity_reference: k1.partnership_name,
            ein: k1.partnership_ein,
          },
        })),
        ...corporations.map((k1) => ({
          ...source,
          activity_reference: k1.source_document_reference,
          source_document_reference: k1.source_document_reference,
          current_year_credit: k1.box13_code_ad_new_markets_credit,
          source_origin: {
            kind: "s_corporation" as const,
            entity_reference: k1.corporation_name,
            ein: k1.corporation_ein,
          },
        })),
      ],
      regular_tax_all_income: taxAll,
      regular_tax_without_passive: taxWithout,
      line6_ordinary_worksheet: worksheet,
    },
  });
  assertEquals(result.diagnostics, []);
  return result;
}

function filedSelfAndK1Return(
  additionalSelfInvestmentAmounts: number[] = [],
  additionalPartnershipCredits: number[] = [],
) {
  const investments = [
    {
      ...investment,
      qualified_equity_investment_amount: 100_000,
    },
    ...additionalSelfInvestmentAmounts.map((amount, index) => ({
      ...investment,
      cde_name: `Additional Community Development Entity ${index + 1}`,
      cde_ein: String(987654321 - index),
      initial_investment_date: "2025-06-15",
      credit_allowance_date: "2025-06-15",
      designation_notice_reference: `2025 additional QEI notice ${index + 1}`,
      qualified_equity_investment_amount: amount,
      passive_activity_reference: `additional-self-investment-${index + 1}`,
      passive_source_document_reference: `2025 additional QEI notice ${
        index + 1
      }`,
    })),
  ];
  const partnerships = [
    {
      partnership_name: "Mixed source partnership",
      partnership_ein: "345678901",
      source_document_reference: "2025 mixed partnership K-1 code AD",
      recipient_tin: "111223333",
      box15_code_ad_new_markets_credit: 2_500,
      new_markets_credit_subject_to_passive_activity_limit: true,
    },
    ...additionalPartnershipCredits.map((amount, index) => ({
      partnership_name: `Additional mixed partnership ${index + 1}`,
      partnership_ein: String(456789012 - index),
      source_document_reference: `2025 additional mixed partnership K-1 ${
        index + 1
      }`,
      recipient_tin: "111223333",
      box15_code_ad_new_markets_credit: amount,
      new_markets_credit_subject_to_passive_activity_limit: true,
    })),
  ];
  const corporation = {
    corporation_name: "Mixed source S corporation",
    corporation_ein: "567890123",
    source_document_reference: "2025 mixed S corporation K-1 code AD",
    recipient_tin: "111223333",
    box13_code_ad_new_markets_credit: 1_500,
    new_markets_credit_subject_to_passive_activity_limit: true,
  };
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
    f8874: { investments },
    k1_partnership: { k1_partnerships: partnerships },
    k1_s_corp: { k1_s_corps: [corporation] },
    form8582cr: {
      credit_sources: [
        ...investments.map((item) => ({
          ...source,
          activity_reference: item.passive_activity_reference,
          source_document_reference: item.passive_source_document_reference,
          current_year_credit: item.qualified_equity_investment_amount * 0.05,
        })),
        ...partnerships.map((k1) => ({
          ...source,
          activity_reference: k1.source_document_reference,
          source_document_reference: k1.source_document_reference,
          current_year_credit: k1.box15_code_ad_new_markets_credit,
          source_origin: {
            kind: "partnership" as const,
            entity_reference: k1.partnership_name,
            ein: k1.partnership_ein,
          },
        })),
        {
          ...source,
          activity_reference: corporation.source_document_reference,
          source_document_reference: corporation.source_document_reference,
          current_year_credit: corporation.box13_code_ad_new_markets_credit,
          source_origin: {
            kind: "s_corporation" as const,
            entity_reference: corporation.corporation_name,
            ein: corporation.corporation_ein,
          },
        },
      ],
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

Deno.test("partnership and S corporation code AD credits share one passive tax limit with distinct Worksheet 9 and Part V rows", async () => {
  const result = filedMixedK1Return();
  const pending = normalizeAllPending(result.pending);
  const ledger = buildCurrentYearCarryforwardLedger(pending.form8582cr);
  assertEquals(ledger.total_credit, 7_500);
  assertEquals(ledger.allowed_credit, 4_412);
  assertEquals(
    ledger.rows.map((row) => [
      row.source.source_origin.kind,
      row.total_credit,
      row.allowed_credit,
      row.unallowed_credit,
    ]),
    [
      ["partnership", 5_000, 2_941, 2_059],
      ["s_corporation", 2_500, 1_471, 1_029],
    ],
  );
  assertEquals(pending.schedule3.line6a_total, 4_412);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 4_412);
  const passivePdf = form8582crPdf.projectFields!(pending.form8582cr, pending);
  assertEquals(passivePdf.line4a, 7_500);
  assertEquals(passivePdf.line37, 4_412);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    extractFilerIdentity(general),
  );
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.lines.line2, 7_500);
  assertEquals(parts.lines.line3, 4_412);
  assertEquals(parts.lines.line38, 4_412);
  assertEquals(parts.currentRows.length, 1);
  assertEquals(parts.currentRows[0].metadata.sourceCount, 2);
  assertEquals(parts.currentRows[0].metadata.referenceDocumentId, undefined);
  assertEquals(
    parts.passiveCurrentDetails.map((detail) => [
      detail.source.sourceOrigin.kind,
      detail.source.activityReference,
      detail.source.beforePassiveLimit,
      detail.source.afterPassiveLimit,
      detail.sourceDocument,
    ]),
    ledger.rows.map((row) => [
      row.source.source_origin.kind,
      row.source.activity_reference,
      row.total_credit,
      row.allowed_credit,
      undefined,
    ]),
  );
  assertEquals(
    [...prepared.bundle.xml.matchAll(/<Frm8874CYAggrgtAmtGrp/g)].length,
    2,
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<PassThroughEntityEIN>234567891</PassThroughEntityEIN>",
  );
  assert(!prepared.bundle.xml.includes("<IRS8874 "));
  const filed = normalizeAllPending(prepared.bundle.pending);
  const form3800Printed = form3800Pdf.instances?.(
    filed.f3800,
    extractFilerIdentity(general),
    filed,
    parts,
  )?.[0];
  assertEquals(form3800Printed?.[form3800PartIIIFields("1i").g], 4_412);
  assertEquals(form3800Printed?.[form3800PartVFields(1).c1], "123456789");
  assertEquals(form3800Printed?.[form3800PartVFields(2).c1], "234567891");
  assertEquals(form3800Printed?.[form3800PartIAndIIFields.line38], 4_412);
  assert(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount() > 0,
  );
  const partnership =
    (filed.k1_partnership.k1_partnerships as Record<string, unknown>[])[0];
  const corporation =
    (filed.k1_s_corp.k1_s_corps as Record<string, unknown>[])[0];
  for (
    const changed of [
      {
        ...filed,
        k1_partnership: {
          k1_partnerships: [{ ...partnership, partnership_ein: "999887777" }],
        },
      },
      {
        ...filed,
        k1_s_corp: {
          k1_s_corps: [{ ...corporation, recipient_tin: "999887777" }],
        },
      },
      {
        ...filed,
        k1_s_corp: {
          k1_s_corps: [{
            ...corporation,
            box13_code_ad_new_markets_credit: 2_499,
          }],
        },
      },
      {
        ...filed,
        k1_s_corp: {
          k1_s_corps: [{ ...corporation, box1_ordinary_business: 10 }],
        },
      },
    ]
  ) {
    assertThrows(
      () => form8582crPdf.projectFields!(changed.form8582cr, changed),
      Error,
    );
  }
  assertThrows(
    () =>
      form3800Pdf.instances?.(
        filed.f3800,
        extractFilerIdentity(general),
        filed,
        {
          ...parts,
          passiveCurrentDetails: [parts.passiveCurrentDetails[0], {
            ...parts.passiveCurrentDetails[1],
            source: {
              ...parts.passiveCurrentDetails[1].source,
              sourceDocumentReference: "wrong S corporation K-1",
            },
          }],
        },
      ),
    Error,
    "pass-through New Markets activities",
  );
});

Deno.test("three partnership and one S corporation passive code AD credits keep four source-specific Worksheet 9 and Part V rows", async () => {
  const result = filedMixedK1Return([1_500, 500]);
  const pending = normalizeAllPending(result.pending);
  const ledger = buildCurrentYearCarryforwardLedger(pending.form8582cr);
  assertEquals(ledger.total_credit, 9_500);
  assertEquals(ledger.allowed_credit, 4_412);
  assertEquals(
    ledger.rows.map((row) => [
      row.source.source_origin.kind,
      row.total_credit,
      row.allowed_credit,
      row.unallowed_credit,
    ]),
    [
      ["partnership", 5_000, 2_322, 2_678],
      ["partnership", 1_500, 697, 803],
      ["partnership", 500, 232, 268],
      ["s_corporation", 2_500, 1_161, 1_339],
    ],
  );
  assertEquals(pending.schedule3.line6a_total, 4_412);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 4_412);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    extractFilerIdentity(general),
  );
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.currentRows[0].metadata.sourceCount, 4);
  assertEquals(
    parts.passiveCurrentDetails.map((detail) => [
      detail.source.sourceOrigin.kind,
      detail.source.activityReference,
      detail.source.afterPassiveLimit,
    ]),
    ledger.rows.map((row) => [
      row.source.source_origin.kind,
      row.source.activity_reference,
      row.allowed_credit,
    ]),
  );
  assertEquals(
    [...prepared.bundle.xml.matchAll(/<Frm8874CYAggrgtAmtGrp/g)].length,
    4,
  );
  assert(!prepared.bundle.xml.includes("<IRS8874 "));
  const filed = normalizeAllPending(prepared.bundle.pending);
  const printed = form3800Pdf.instances?.(
    filed.f3800,
    extractFilerIdentity(general),
    filed,
    parts,
  )?.[0];
  assertEquals(printed?.[form3800PartIIIFields("1i").g], 4_412);
  assertEquals(
    [1, 2, 3, 4].map((index) => printed?.[form3800PartVFields(index).c1]),
    ["123456789", "345678901", "345678900", "234567891"],
  );
  assertEquals(printed?.[form3800PartIAndIIFields.line38], 4_412);
  assert(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount() > 0,
  );
  const partnershipRows = filed.k1_partnership.k1_partnerships as Record<
    string,
    unknown
  >[];
  assertThrows(
    () =>
      form8582crPdf.projectFields!(filed.form8582cr, {
        ...filed,
        k1_partnership: { k1_partnerships: partnershipRows.slice(0, 2) },
      }),
    Error,
    "partnership code AD credits differ",
  );
  assertThrows(
    () =>
      form8582crPdf.projectFields!(filed.form8582cr, {
        ...filed,
        k1_partnership: {
          k1_partnerships: [...partnershipRows, {
            ...partnershipRows[2],
            partnership_ein: "987654321",
            source_document_reference: "unclaimed fourth partnership K-1",
          }],
        },
      }),
    Error,
    "partnership code AD credits differ",
  );
  assertThrows(
    () =>
      form8582crPdf.projectFields!(filed.form8582cr, {
        ...filed,
        k1_partnership: {
          k1_partnerships: [
            partnershipRows[0],
            partnershipRows[1],
            {
              ...partnershipRows[2],
              box15_code_ad_new_markets_credit: 499,
            },
          ],
        },
      }),
    Error,
    "partnership code AD credits differ",
  );
  assertThrows(
    () =>
      form3800Pdf.instances?.(
        filed.f3800,
        extractFilerIdentity(general),
        filed,
        {
          ...parts,
          passiveCurrentDetails: [
            parts.passiveCurrentDetails[0],
            parts.passiveCurrentDetails[1],
            {
              ...parts.passiveCurrentDetails[2],
              source: {
                ...parts.passiveCurrentDetails[2].source,
                sourceDocumentReference: "wrong third partnership K-1",
              },
            },
            parts.passiveCurrentDetails[3],
          ],
        },
      ),
    Error,
    "pass-through New Markets activities",
  );
});

Deno.test("fifteen credit-only New Markets K-1 sources fill Form 3800 Part V and reject a sixteenth", async () => {
  const result = filedMixedK1Return(Array(13).fill(500));
  const pending = normalizeAllPending(result.pending);
  const ledger = buildCurrentYearCarryforwardLedger(pending.form8582cr);
  assertEquals(ledger.rows.length, 15);
  assertEquals(ledger.total_credit, 14_000);
  assertEquals(ledger.allowed_credit, 4_412);
  assertEquals(pending.schedule3.line6a_total, 4_412);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    extractFilerIdentity(general),
  );
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.currentRows[0].metadata.sourceCount, 15);
  assertEquals(parts.passiveCurrentDetails.length, 15);
  assertEquals(
    [...prepared.bundle.xml.matchAll(/<Frm8874CYAggrgtAmtGrp/g)].length,
    15,
  );
  const filed = normalizeAllPending(prepared.bundle.pending);
  const printed = form3800Pdf.instances?.(
    filed.f3800,
    extractFilerIdentity(general),
    filed,
    parts,
  )?.[0];
  assertEquals(printed?.[form3800PartVFields(15).c1], "234567891");
  assertEquals(printed?.[form3800PartIAndIIFields.line38], 4_412);
  assert(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount() > 0,
  );
  const originalSources = form8582crInputSchema.parse(pending.form8582cr)
    .credit_sources;
  assertThrows(
    () =>
      form8582crPdf.projectFields!({
        ...pending.form8582cr,
        credit_sources: [...originalSources, {
          ...originalSources[0],
          activity_reference: "sixteenth-pass-through-activity",
          source_document_reference: "sixteenth-pass-through-K-1",
        }],
      }, pending),
    Error,
    "within Form 3800 Part V capacity",
  );
});

Deno.test("self-earned Form 8874 and two passive code AD K-1 credits reconcile source form line 2 and mixed Part V details", async () => {
  const result = filedSelfAndK1Return();
  const pending = normalizeAllPending(result.pending);
  const ledger = buildCurrentYearCarryforwardLedger(pending.form8582cr);
  assertEquals(ledger.total_credit, 9_000);
  assertEquals(ledger.allowed_credit, 4_412);
  assertEquals(
    ledger.rows.map((row) => [
      row.source.source_origin.kind,
      row.total_credit,
      row.allowed_credit,
      row.unallowed_credit,
    ]),
    [
      ["self", 5_000, 2_451, 2_549],
      ["partnership", 2_500, 1_226, 1_274],
      ["s_corporation", 1_500, 735, 765],
    ],
  );
  assertEquals(pending.schedule3.line6a_total, 4_412);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 4_412);
  const passivePdf = form8582crPdf.projectFields!(pending.form8582cr, pending);
  assertEquals(passivePdf.line4a, 9_000);
  assertEquals(passivePdf.line37, 4_412);
  const sourcePdf = form8874Pdf.projectFields!(pending.f8874, pending);
  assertEquals(sourcePdf.row_1_credit, 5_000);
  assertEquals(sourcePdf.line2, 4_000);
  assertEquals(sourcePdf.line3, 9_000);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    extractFilerIdentity(general),
  );
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.lines.line2, 9_000);
  assertEquals(parts.lines.line3, 4_412);
  assertEquals(parts.lines.line38, 4_412);
  assertEquals(parts.currentRows[0].metadata.sourceCount, 3);
  assertEquals(parts.currentRows[0].metadata.referenceDocumentName, "IRS8874");
  const form8874Id = parts.currentRows[0].metadata.referenceDocumentId;
  assert(form8874Id);
  assertEquals(
    parts.passiveCurrentDetails.map((detail) => [
      detail.source.sourceOrigin.kind,
      detail.source.afterPassiveLimit,
      detail.sourceDocument?.documentId,
    ]),
    [
      ["self", 2_451, form8874Id],
      ["partnership", 1_226, undefined],
      ["s_corporation", 735, undefined],
    ],
  );
  assertEquals(
    [...prepared.bundle.xml.matchAll(/<Frm8874CYAggrgtAmtGrp/g)].length,
    3,
  );
  assertStringIncludes(prepared.bundle.xml, "<IRS8874 ");
  assertStringIncludes(
    prepared.bundle.xml,
    "<PassThroughEntityEIN>345678901</PassThroughEntityEIN>",
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<PassThroughEntityEIN>567890123</PassThroughEntityEIN>",
  );
  const filed = normalizeAllPending(prepared.bundle.pending);
  const printed = form3800Pdf.instances?.(
    filed.f3800,
    extractFilerIdentity(general),
    filed,
    parts,
  )?.[0];
  assertEquals(printed?.[form3800PartIIIFields("1i").g], 4_412);
  assertEquals(printed?.[form3800PartVFields(1).c1], undefined);
  assertEquals(printed?.[form3800PartVFields(2).c1], "345678901");
  assertEquals(printed?.[form3800PartVFields(3).c1], "567890123");
  assertEquals(printed?.[form3800PartIAndIIFields.line38], 4_412);
  assert(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount() > 0,
  );
  const investments = filed.f8874.investments as Record<string, unknown>[];
  assertThrows(
    () =>
      form8582crPdf.projectFields!(filed.form8582cr, {
        ...filed,
        f8874: {
          investments: [{
            ...investments[0],
            qualified_equity_investment_amount: 99_000,
          }],
        },
      }),
    Error,
    "credit differs from the filed passive Form 8874 investment",
  );
  const partnership =
    (filed.k1_partnership.k1_partnerships as Record<string, unknown>[])[0];
  assertThrows(
    () =>
      form8582crPdf.projectFields!(filed.form8582cr, {
        ...filed,
        k1_partnership: {
          k1_partnerships: [{
            ...partnership,
            box15_code_ad_new_markets_credit: 2_499,
          }],
        },
      }),
    Error,
    "partnership code AD credits differ",
  );
  assertThrows(
    () =>
      form3800Pdf.instances?.(
        filed.f3800,
        extractFilerIdentity(general),
        filed,
        {
          ...parts,
          passiveCurrentDetails: [
            parts.passiveCurrentDetails[0],
            {
              ...parts.passiveCurrentDetails[1],
              source: {
                ...parts.passiveCurrentDetails[1].source,
                sourceDocumentReference: "wrong partnership K-1",
              },
            },
            parts.passiveCurrentDetails[2],
          ],
        },
      ),
    Error,
    "self-earned and K-1 New Markets activities",
  );
});

Deno.test("two self-earned investments and three K-1s keep mixed source identities", async () => {
  const result = filedSelfAndK1Return([10_000], [800]);
  const pending = normalizeAllPending(result.pending);
  const ledger = buildCurrentYearCarryforwardLedger(pending.form8582cr);
  assertEquals(ledger.rows.length, 5);
  assertEquals(ledger.total_credit, 10_300);
  assertEquals(ledger.allowed_credit, 4_412);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    extractFilerIdentity(general),
  );
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.currentRows[0].metadata.sourceCount, 5);
  assertEquals(parts.passiveCurrentDetails.length, 5);
  assertEquals(
    [...prepared.bundle.xml.matchAll(/<Frm8874CYAggrgtAmtGrp/g)].length,
    5,
  );
  const filed = normalizeAllPending(prepared.bundle.pending);
  const sourcePdf = form8874Pdf.projectFields!(filed.f8874, filed);
  assertEquals(sourcePdf.line2, 4_800);
  assertEquals(sourcePdf.line3, 10_300);
  const printed = form3800Pdf.instances?.(
    filed.f3800,
    extractFilerIdentity(general),
    filed,
    parts,
  )?.[0];
  assertEquals(
    [1, 2, 3, 4, 5].map((index) => printed?.[form3800PartVFields(index).c1]),
    [undefined, undefined, "345678901", "456789012", "567890123"],
  );
  assertEquals(printed?.[form3800PartIAndIIFields.line38], 4_412);
  assert(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount() > 0,
  );
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

Deno.test("one passive and one nonpassive Form 8874 investment join Form 3800 line 1i and final tax", async () => {
  const result = filedReturn(10_000, [], 5_000);
  const pending = normalizeAllPending(result.pending);
  const passive = form8582crInputSchema.parse(pending.form8582cr);
  const business = f3800InputSchema.parse(pending.f3800);
  assertEquals(passive.credit_sources.length, 1);
  assertEquals(business.f8874_credit?.credit_amount, 300);
  assertEquals(business.allowed_credit, 800);
  assertEquals(pending.schedule3.line6a_total, 800);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 800);
  const passivePdf = form8582crPdf.projectFields!(pending.form8582cr, pending);
  assertEquals(passivePdf.line4a, 500);
  assertEquals(passivePdf.line37, 500);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    extractFilerIdentity(general),
  );
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.lines.line1, 300);
  assertEquals(parts.lines.line2, 500);
  assertEquals(parts.lines.line3, 500);
  assertEquals(parts.lines.line6, 800);
  assertEquals(parts.lines.line17, 800);
  assertEquals(parts.lines.line38, 800);
  const [row] = parts.currentRows;
  const [amount] = parts.currentAmounts;
  assertEquals(parts.currentRows.length, 1);
  assertEquals(row.line, "1i");
  assertEquals(row.metadata.sourceCount, 2);
  assertEquals(row.metadata.referenceDocumentName, "IRS8874");
  assertEquals(
    parts.currentDetails[0].sourceDocumentId,
    row.metadata.referenceDocumentId,
  );
  assertEquals(
    parts.passiveCurrentDetails[0].sourceDocument?.documentId,
    row.metadata.referenceDocumentId,
  );
  assertEquals(amount.nonpassiveCredit, 300);
  assertEquals(amount.passiveBeforeLimit, 500);
  assertEquals(amount.passiveAfterLimit, 500);
  assertEquals(amount.appliedCredit, 800);
  assertStringIncludes(prepared.bundle.xml, "<IRS8874>");
  assertStringIncludes(prepared.bundle.xml, "<IRS8582CR ");
  assertStringIncludes(prepared.bundle.xml, "<Form8874CYCreditsGrp");
  assertEquals(
    [...prepared.bundle.xml.matchAll(/<Frm8874CYAggrgtAmtGrp/g)].length,
    2,
  );
  const filed = normalizeAllPending(prepared.bundle.pending);
  const printed = form3800Pdf.instances?.(
    filed.f3800,
    extractFilerIdentity(general),
    filed,
    parts,
  )?.[0];
  assertEquals(printed?.[form3800PartIIIFields("1i").g], 800);
  assertEquals(printed?.[form3800PartIAndIIFields.line38], 800);
  assert(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount() > 0,
  );
  assertThrows(
    () =>
      form3800Pdf.instances?.(
        filed.f3800,
        extractFilerIdentity(general),
        filed,
        {
          ...parts,
          currentAmounts: [{ ...amount, passiveAfterLimit: 499 }],
        },
      ),
    Error,
    "mixed passive/nonpassive Form 8874 row",
  );
  const investments = pending.f8874.investments as Record<string, unknown>[];
  const changedSource = {
    ...pending,
    f8874: {
      investments: [investments[0], {
        ...investments[1],
        qualified_equity_investment_amount: 4_000,
      }],
    },
  };
  assertThrows(
    () => form8582crPdf.projectFields!(pending.form8582cr, changedSource),
    Error,
    "current-year source allocation differ",
  );
  assertThrows(
    () =>
      form8582crPdf.projectFields!(pending.form8582cr, {
        ...pending,
        f3800: {
          ...business,
          f8874_credit: {
            credit_amount: 299,
            subject_to_passive_activity_limit: false,
          },
        },
      }),
    Error,
    "current-year source allocation differ",
  );
});

Deno.test("partial passive Form 8874 allowance joins one fully used nonpassive investment and retains the 2025 remainder", async () => {
  const result = filedReturn(100_000, [], 5_000);
  const pending = normalizeAllPending(result.pending);
  const lines = calculateForm8582CR(pending.form8582cr);
  const ledger = buildCurrentYearCarryforwardLedger(pending.form8582cr);
  const allowedPassive = lines.line37;
  const allowedReturn = allowedPassive + 300;
  assertEquals(taxAll, 17_867);
  assertEquals(taxWithout, 13_455);
  assertEquals(allowedPassive, 4_412);
  assertEquals(allowedReturn, 4_712);
  assert(allowedPassive > 0 && allowedPassive < 5_000);
  assertEquals(ledger.allowed_credit, allowedPassive);
  assertEquals(ledger.unallowed_credit, 5_000 - allowedPassive);
  assertEquals(ledger.rows[0].originating_tax_year, 2025);
  assertEquals(
    ledger.rows[0].source.activity_reference,
    "community-investment-1",
  );
  assertEquals(pending.schedule3.line6a_total, allowedReturn);
  assertEquals(pending.f1040.line20_nonrefundable_credits, allowedReturn);
  const passivePdf = form8582crPdf.projectFields!(pending.form8582cr, pending);
  assertEquals(passivePdf.line4a, 5_000);
  assertEquals(passivePdf.line7, 5_000 - allowedPassive);
  assertEquals(passivePdf.line37, allowedPassive);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    extractFilerIdentity(general),
  );
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.lines.line1, 300);
  assertEquals(parts.lines.line2, 5_000);
  assertEquals(parts.lines.line3, allowedPassive);
  assertEquals(parts.lines.line6, allowedReturn);
  assertEquals(parts.lines.line17, allowedReturn);
  assertEquals(parts.lines.line38, allowedReturn);
  assertEquals(parts.currentRows.length, 1);
  assertEquals(parts.currentRows[0].metadata.sourceCount, 2);
  assertEquals(parts.currentRows[0].metadata.referenceDocumentName, "IRS8874");
  assertEquals(parts.currentAmounts[0].nonpassiveCredit, 300);
  assertEquals(parts.currentAmounts[0].passiveBeforeLimit, 5_000);
  assertEquals(parts.currentAmounts[0].passiveAfterLimit, allowedPassive);
  assertEquals(parts.currentAmounts[0].appliedCredit, allowedReturn);
  assertEquals(parts.passiveCurrentDetails[0].source.beforePassiveLimit, 5_000);
  assertEquals(
    parts.passiveCurrentDetails[0].source.afterPassiveLimit,
    allowedPassive,
  );
  assertEquals(parts.passiveCurrentDetails[0].source.unusedAfterTaxLimit, 0);
  assertEquals(
    [...prepared.bundle.xml.matchAll(/<Frm8874CYAggrgtAmtGrp/g)].length,
    2,
  );
  const filed = normalizeAllPending(prepared.bundle.pending);
  const printed = form3800Pdf.instances?.(
    filed.f3800,
    extractFilerIdentity(general),
    filed,
    parts,
  )?.[0];
  assertEquals(printed?.[form3800PartIIIFields("1i").g], allowedReturn);
  assertEquals(printed?.[form3800PartIAndIIFields.line38], allowedReturn);
  assert(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount() > 0,
  );
  const investments = pending.f8874.investments as Record<string, unknown>[];
  assertThrows(
    () =>
      form8582crPdf.projectFields!(pending.form8582cr, {
        ...pending,
        f8874: {
          investments: [{
            ...investments[0],
            qualified_equity_investment_amount: 99_000,
          }, investments[1]],
        },
      }),
    Error,
    "credit differs from the filed passive Form 8874 investment",
  );
  assertThrows(
    () =>
      form8582crPdf.projectFields!(pending.form8582cr, {
        ...pending,
        f8874: {
          investments: [investments[0], {
            ...investments[1],
            passive_activity_reference: "wrong-activity",
          }],
        },
      }),
    Error,
    "credit differs from the filed passive Form 8874 investment",
  );
  assertThrows(
    () =>
      form3800Pdf.instances?.(
        filed.f3800,
        extractFilerIdentity(general),
        filed,
        {
          ...parts,
          currentAmounts: [{
            ...parts.currentAmounts[0],
            passiveAfterLimit: allowedPassive + 1,
          }],
        },
      ),
    Error,
    "mixed passive/nonpassive Form 8874 row",
  );
});

Deno.test("two passive Form 8874 activities share line 6 and keep separate 2025 Worksheet 9 balances", async () => {
  const result = filedReturn(100_000, [], 0, [100_000]);
  const pending = normalizeAllPending(result.pending);
  const lines = calculateForm8582CR(pending.form8582cr);
  const ledger = buildCurrentYearCarryforwardLedger(pending.form8582cr);
  assertEquals(lines.partI.line5, 10_000);
  assertEquals(lines.partI.line6, 4_412);
  assertEquals(lines.line37, 4_412);
  assertEquals(ledger.rows.length, 2);
  assertEquals(
    ledger.rows.map((row) => [
      row.source.activity_reference,
      row.allowed_credit,
      row.unallowed_credit,
      row.originating_tax_year,
    ]),
    [
      ["community-investment-1", 2_206, 2_794, 2025],
      ["community-investment-2", 2_206, 2_794, 2025],
    ],
  );
  assertEquals(pending.schedule3.line6a_total, 4_412);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 4_412);
  const passivePdf = form8582crPdf.projectFields!(pending.form8582cr, pending);
  assertEquals(passivePdf.line4a, 10_000);
  assertEquals(passivePdf.line7, 5_588);
  assertEquals(passivePdf.line37, 4_412);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    extractFilerIdentity(general),
  );
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.lines.line1, 0);
  assertEquals(parts.lines.line2, 10_000);
  assertEquals(parts.lines.line3, 4_412);
  assertEquals(parts.lines.line6, 4_412);
  assertEquals(parts.lines.line17, 4_412);
  assertEquals(parts.lines.line38, 4_412);
  assertEquals(parts.currentRows.length, 1);
  assertEquals(parts.currentRows[0].metadata.sourceCount, 2);
  assertEquals(parts.currentRows[0].metadata.referenceDocumentName, "IRS8874");
  assertEquals(parts.currentDetails.length, 0);
  assertEquals(parts.passiveCurrentDetails.length, 2);
  assertEquals(
    parts.passiveCurrentDetails.map((detail) => [
      detail.source.activityReference,
      detail.source.beforePassiveLimit,
      detail.source.afterPassiveLimit,
      detail.sourceDocument?.documentId,
    ]),
    [
      [
        "community-investment-1",
        5_000,
        2_206,
        parts.currentRows[0].metadata.referenceDocumentId,
      ],
      [
        "community-investment-2",
        5_000,
        2_206,
        parts.currentRows[0].metadata.referenceDocumentId,
      ],
    ],
  );
  assertEquals(
    [...prepared.bundle.xml.matchAll(/<Frm8874CYAggrgtAmtGrp/g)].length,
    2,
  );
  const filed = normalizeAllPending(prepared.bundle.pending);
  const printed = form3800Pdf.instances?.(
    filed.f3800,
    extractFilerIdentity(general),
    filed,
    parts,
  )?.[0];
  assertEquals(printed?.[form3800PartIIIFields("1i").g], 4_412);
  assertEquals(printed?.[form3800PartIAndIIFields.line38], 4_412);
  assert(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount() > 0,
  );
  const investments = pending.f8874.investments as Record<string, unknown>[];
  assertThrows(
    () =>
      form8582crPdf.projectFields!(pending.form8582cr, {
        ...pending,
        f8874: {
          investments: [investments[0], {
            ...investments[1],
            qualified_equity_investment_amount: 99_000,
          }],
        },
      }),
    Error,
    "credit differs from the filed passive Form 8874 investment",
  );
  assertThrows(
    () =>
      form3800Pdf.instances?.(
        filed.f3800,
        extractFilerIdentity(general),
        filed,
        {
          ...parts,
          passiveCurrentDetails: [
            parts.passiveCurrentDetails[0],
            {
              ...parts.passiveCurrentDetails[1],
              source: {
                ...parts.passiveCurrentDetails[1].source,
                activityReference: "wrong-activity",
              },
            },
          ],
        },
      ),
    Error,
    "passive Form 8874 activities",
  );
});

Deno.test("three different passive Form 8874 credits allocate one ordinary line 6 by source through native and PDF", async () => {
  const result = filedReturn(100_000, [], 0, [50_000, 50_000]);
  const pending = normalizeAllPending(result.pending);
  const ledger = buildCurrentYearCarryforwardLedger(pending.form8582cr);
  assertEquals(ledger.total_credit, 10_000);
  assertEquals(ledger.allowed_credit, 4_412);
  assertEquals(
    ledger.rows.map((row) => [
      row.source.activity_reference,
      row.total_credit,
      row.allowed_credit,
      row.unallowed_credit,
    ]),
    [
      ["community-investment-1", 5_000, 2_206, 2_794],
      ["community-investment-2", 2_500, 1_103, 1_397],
      ["community-investment-3", 2_500, 1_103, 1_397],
    ],
  );
  assertEquals(pending.schedule3.line6a_total, 4_412);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 4_412);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    extractFilerIdentity(general),
  );
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.currentRows[0].metadata.sourceCount, 3);
  assertEquals(parts.currentRows[0].metadata.referenceDocumentName, "IRS8874");
  assertEquals(
    parts.passiveCurrentDetails.map((detail) => [
      detail.source.activityReference,
      detail.source.beforePassiveLimit,
      detail.source.afterPassiveLimit,
      detail.sourceDocument?.documentId,
    ]),
    ledger.rows.map((row) => [
      row.source.activity_reference,
      row.total_credit,
      row.allowed_credit,
      parts.currentRows[0].metadata.referenceDocumentId,
    ]),
  );
  assertEquals(
    [...prepared.bundle.xml.matchAll(/<Frm8874CYAggrgtAmtGrp/g)].length,
    3,
  );
  const filed = normalizeAllPending(prepared.bundle.pending);
  const printed = form3800Pdf.instances?.(
    filed.f3800,
    extractFilerIdentity(general),
    filed,
    parts,
  )?.[0];
  assertEquals(printed?.[form3800PartIIIFields("1i").g], 4_412);
  assertEquals(printed?.[form3800PartIAndIIFields.line38], 4_412);
  assert(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount() > 0,
  );
  const filedAllocations = f3800InputSchema.parse(filed.f3800)
    .passive_source_allocations!;
  const changed = {
    ...filed,
    f3800: {
      ...filed.f3800,
      passive_source_allocations: [
        ...filedAllocations.slice(0, 2),
        {
          ...filedAllocations[2],
          source_document_reference: "wrong-third-QEI-notice",
        },
      ],
    },
  };
  assertThrows(
    () =>
      form3800Pdf.instances?.(
        changed.f3800,
        extractFilerIdentity(general),
        changed,
        parts,
      ),
    Error,
    "line 37 and current-year source allocation differ",
  );
});

Deno.test("seven passive Form 8874 activities use investment overflow and all seven Form 3800 Part V rows", async () => {
  const result = filedReturn(10_000, [], 0, Array(6).fill(10_000));
  const pending = normalizeAllPending(result.pending);
  const ledger = buildCurrentYearCarryforwardLedger(pending.form8582cr);
  assertEquals(ledger.rows.length, 7);
  assertEquals(ledger.total_credit, 3_500);
  assertEquals(ledger.allowed_credit, 3_500);
  assertEquals(ledger.unallowed_credit, 0);
  assertEquals(pending.schedule3.line6a_total, 3_500);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 3_500);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    extractFilerIdentity(general),
  );
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.currentRows[0].metadata.sourceCount, 7);
  assertEquals(parts.passiveCurrentDetails.length, 7);
  assertEquals(
    [...prepared.bundle.xml.matchAll(/<Frm8874CYAggrgtAmtGrp/g)].length,
    7,
  );
  const filed = normalizeAllPending(prepared.bundle.pending);
  const form8874Printed = form8874Pdf.projectFields!(filed.f8874, filed);
  assertEquals((form8874Printed.print_overflow_rows as unknown[]).length, 2);
  const form3800Printed = form3800Pdf.instances?.(
    filed.f3800,
    extractFilerIdentity(general),
    filed,
    parts,
  )?.[0];
  assertEquals(form3800Printed?.[form3800PartIIIFields("1i").g], 3_500);
  assert(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount() > 0,
  );
});

Deno.test("fifteen passive Form 8874 activities fill Part V, while a sixteenth remains closed", async () => {
  const result = filedReturn(10_000, [], 0, Array(14).fill(10_000));
  const pending = normalizeAllPending(result.pending);
  const ledger = buildCurrentYearCarryforwardLedger(pending.form8582cr);
  assertEquals(ledger.rows.length, 15);
  assertEquals(ledger.total_credit, 7_500);
  assertEquals(ledger.allowed_credit, 4_412);
  assertEquals(ledger.unallowed_credit, 3_088);
  assertEquals(pending.schedule3.line6a_total, 4_412);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 4_412);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    extractFilerIdentity(general),
  );
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.currentRows[0].metadata.sourceCount, 15);
  assertEquals(parts.passiveCurrentDetails.length, 15);
  assertEquals(
    [...prepared.bundle.xml.matchAll(/<Frm8874CYAggrgtAmtGrp/g)].length,
    15,
  );
  const filed = normalizeAllPending(prepared.bundle.pending);
  const form8874Printed = form8874Pdf.projectFields!(filed.f8874, filed);
  assertEquals((form8874Printed.print_overflow_rows as unknown[]).length, 10);
  const form3800Printed = form3800Pdf.instances?.(
    filed.f3800,
    extractFilerIdentity(general),
    filed,
    parts,
  )?.[0];
  assertEquals(form3800Printed?.[form3800PartIIIFields("1i").g], 4_412);
  assert(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount() > 0,
  );
  const originalSources = form8582crInputSchema.parse(pending.form8582cr)
    .credit_sources;
  const manySources = Array.from({ length: 16 }, (_, index) => ({
    ...originalSources[index % 15],
    activity_reference: `too-many-activities-${index}`,
    source_document_reference: `too-many-notices-${index}`,
  }));
  assertThrows(
    () =>
      form8582crPdf.projectFields!({
        ...pending.form8582cr,
        credit_sources: manySources,
      }, pending),
    Error,
    "within Form 3800 Part V capacity",
  );
});

Deno.test("one sourced 1099-INT box 1 joins passive rental line 6, Form 3800, Form 1040, native and PDF", async () => {
  const result = filedReturn(10_000, [1_000]);
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
  const pending = normalizeAllPending(filedReturn(10_000, [1_000]).pending);
  const row = (pending.f1099int.f1099ints as Record<string, unknown>[])[0];
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

Deno.test("two distinct 1099-INT payers sum into passive rental line 6 and the complete native/PDF return", async () => {
  const result = filedReturn(10_000, [600, 400]);
  const pending = normalizeAllPending(result.pending);
  const expectedAllTax = ordinaryTax2025(taxable + 1_000, FilingStatus.Single);
  const expectedWithout = ordinaryTax2025(
    taxable + 1_000 - passiveIncome,
    FilingStatus.Single,
  );
  assertEquals((pending.f1099int.f1099ints as unknown[]).length, 2);
  assertEquals(pending.f1040.line2b_taxable_interest, 1_000);
  assertEquals(pending.f1040.line9_total_income, 121_000);
  assertEquals(pending.f1040.line16_income_tax, expectedAllTax);
  assertEquals(pending.schedule3.line6a_total, 500);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 500);
  assertStringIncludes(
    form8582cr.build(pending.form8582cr, { pending }),
    `<NetPassiveIncomeTaxAmt>${
      expectedAllTax - expectedWithout
    }</NetPassiveIncomeTaxAmt>`,
  );
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

Deno.test("Form 8582-CR rejects two-payer amount, copy, payer, and filed-return drift", () => {
  const pending = normalizeAllPending(filedReturn(10_000, [600, 400]).pending);
  const [first, second] = pending.f1099int.f1099ints as Record<
    string,
    unknown
  >[];
  const changedRows = [
    [first, { ...second, box1: 401 }],
    [first, {
      ...second,
      source_document_reference: first.source_document_reference,
    }],
    [first, { ...second, payer_tin: first.payer_tin }],
    [first],
    [first, { ...second, box11: 10 }],
  ];
  const cases = [
    ...changedRows.map((f1099ints) => ({
      ...pending,
      f1099int: { f1099ints },
    })),
    {
      ...pending,
      f1040: { ...pending.f1040, line2b_taxable_interest: 999 },
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

Deno.test("prior-only 2024 credit cannot activate the 2025 native or PDF ordinary route", () => {
  const pending = normalizeAllPending(filedReturn().pending);
  const source = (pending.form8582cr.credit_sources as Record<
    string,
    unknown
  >[])[0];
  const priorOnly = {
    ...source,
    current_year_credit: 0,
    prior_unallowed_credits: [{
      originating_tax_year: 2024,
      credit_amount: 200,
      source_document_reference: source.source_document_reference,
    }],
  };
  const changed = {
    ...pending,
    form8582cr: {
      ...pending.form8582cr,
      credit_sources: [priorOnly],
    },
  };
  assertThrows(
    () => form8582cr.build(changed.form8582cr, { pending: changed }),
    Error,
    "one current-year Form 8874 or credit-only K-1 code AD credit",
  );
  assertThrows(
    () => form8582crPdf.projectFields!(changed.form8582cr, changed),
    Error,
    "one current-year Form 8874 or credit-only K-1 code AD credit",
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
