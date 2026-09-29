import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { TSJ } from "../../../nodes/types.ts";
import { f1099m } from "../../../nodes/inputs/f1099m/index.ts";
import { scheduleE as scheduleENode } from "../../../nodes/inputs/schedule_e/index.ts";
import { calculateForm4952 } from "../../../nodes/intermediate/forms/form4952/index.ts";
import { form4952Pdf } from "../../pdf/forms/f4952.ts";
import { scheduleEPdf } from "../../pdf/forms/schedule_e.ts";
import { form4952 } from "./f4952.ts";
import { scheduleE } from "./schedule_e.ts";

const misc = {
  payer_name: "Patent Licensee",
  payer_tin: "123456789",
  recipient_tin: "987654321",
  box2_royalties: 800,
  box2_royalties_routing: "schedule_e" as const,
  box2_nonpassive_portfolio_investment_for_form4952_verified: true as const,
};
const property = {
  tsj: TSJ.T,
  property_description: "Patent royalty property",
  property_type: 6,
  activity_type: "D" as const,
  fair_rental_days: 0,
  personal_use_days: 0,
  rent_income: 0,
  royalties_income: 800,
  form_1099_payments_made: false,
  f1099m_royalty_source: {
    payer_name: misc.payer_name,
    payer_tin: misc.payer_tin,
    recipient_tin: misc.recipient_tin,
    box2_gross_royalties: 800,
  },
};
const inputs = {
  investment_interest_expense: 300,
  investment_interest_expense_excludes_royalty_attributable_interest:
    true as const,
  source_1099_royalties: 800,
  amt_refigure: {
    prior_year_disallowed_interest: 0,
    interest_on_private_activity_bonds: 0,
    other_gross_income_adjustment: 0,
    qualified_dividends_adjustment: 0,
    net_disposition_gain_adjustment: 0,
    net_capital_gain_adjustment: 0,
    investment_expenses_adjustment: 0,
  },
};
const fields = { ...inputs, ...calculateForm4952(inputs) };
const filer = {
  primarySSN: "987654321",
  nameLine1: "Morgan Taxpayer",
  nameControl: "TAXP",
  address: {
    line1: "1 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  filingStatus: FilingStatus.Single,
};
const pending = {
  f1099m: { f1099ms: [misc] },
  schedule_e: { schedule_es: [property], royalty_income: 800 },
  schedule1: { line5_schedule_e: 800, line9_total_other_income: 800 },
  schedule_a: { line_9_investment_interest: 300 },
  standard_deduction: { itemized_deductions: 20_000 },
  income_tax_calculation: { taking_standard_deduction: false },
  f1040: {
    line8_additional_income: 800,
    line12e_itemized_deductions: 20_000,
  },
};

Deno.test("one 1099-MISC portfolio royalty posts once to Schedule E and Form 4952", () => {
  const fromMisc = f1099m.compute(
    { taxYear: 2025, formType: "f1040" },
    pending.f1099m,
  );
  assertEquals(
    fromMisc.outputs.find((entry) => entry.nodeType === "form4952")?.fields
      .source_1099_royalties,
    800,
  );
  const fromScheduleE = scheduleENode.compute(
    { taxYear: 2025, formType: "f1040" },
    pending.schedule_e,
  );
  assertEquals(
    fromScheduleE.outputs.find((entry) => entry.nodeType === "schedule1")
      ?.fields.line5_schedule_e,
    800,
  );
  assertStringIncludes(
    scheduleE.build(pending.schedule_e, { pending, filer }),
    "<TotalRoyaltiesReceivedAmt>800</TotalRoyaltiesReceivedAmt>",
  );
  assertStringIncludes(
    form4952.build(fields, { pending, filer }),
    "<InvestmentPropGrossIncomeAmt>800</InvestmentPropGrossIncomeAmt>",
  );
  assertEquals(form4952Pdf.projectFields?.(fields, pending), fields);
  const pdf = scheduleEPdf.projectFields?.(pending.schedule_e, pending);
  assertEquals(pdf?.line4, 800);
  assertEquals(pdf?.property_address, undefined);
  assertEquals(pdf?.fair_rental_days, undefined);
  assertEquals(pdf?.personal_use_days, undefined);
  assertEquals(
    form4952Pdf.instances?.(fields, filer, pending),
    [fields],
  );
  assertEquals(
    scheduleEPdf.instances?.(pdf ?? {}, filer, pending),
    [pdf!],
  );
});

Deno.test("1099-MISC portfolio royalty rejects source, property, deduction, and filed-line mismatches", () => {
  const cases = [
    {
      ...pending,
      f1099m: { f1099ms: [{ ...misc, box2_royalties: 700 }] },
    },
    {
      ...pending,
      f1099m: { f1099ms: [{ ...misc, box2_royalties_routing: "schedule_c" }] },
    },
    {
      ...pending,
      schedule_e: {
        ...pending.schedule_e,
        schedule_es: [{ ...property, expense_taxes: 100 }],
      },
    },
    {
      ...pending,
      schedule_e: {
        ...pending.schedule_e,
        schedule_es: [{ ...property, f1099m_royalty_source: undefined }],
      },
    },
    {
      ...pending,
      schedule1: { ...pending.schedule1, line5_schedule_e: 700 },
    },
    {
      ...pending,
      f1040: { ...pending.f1040, line8_additional_income: 700 },
    },
  ];
  for (const changed of cases) {
    assertThrows(() => form4952.build(fields, { pending: changed, filer }));
    assertThrows(() => form4952Pdf.projectFields?.(fields, changed));
  }
  assertThrows(() =>
    form4952.build({ ...fields, line4a: 900 }, { pending, filer })
  );
  assertThrows(() =>
    form4952.build({
      ...fields,
      investment_interest_expense_excludes_royalty_attributable_interest:
        undefined,
    }, { pending, filer })
  );
  assertThrows(() =>
    form4952.build(fields, {
      pending: { ...pending, form_1116: { foreign_tax_paid: 100 } },
      filer,
    })
  );
  const wrongRecipient = {
    ...pending,
    f1099m: {
      f1099ms: [{ ...misc, recipient_tin: "111223333" }],
    },
    schedule_e: {
      ...pending.schedule_e,
      schedule_es: [{
        ...property,
        f1099m_royalty_source: {
          ...property.f1099m_royalty_source,
          recipient_tin: "111223333",
        },
      }],
    },
  };
  assertThrows(() =>
    form4952.build(fields, { pending: wrongRecipient, filer })
  );
  assertThrows(() =>
    scheduleE.build(wrongRecipient.schedule_e, {
      pending: wrongRecipient,
      filer,
    })
  );
  assertThrows(() => form4952Pdf.instances?.(fields, filer, wrongRecipient));
  assertThrows(() => scheduleEPdf.instances?.({}, filer, wrongRecipient));
});
