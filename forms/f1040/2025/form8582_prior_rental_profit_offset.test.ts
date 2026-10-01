import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { FilingStatus } from "../nodes/types.ts";
import { normalizeAllPending } from "./pending.ts";
import { form8582 } from "./mef/forms/f8582.ts";
import { scheduleE } from "./mef/forms/schedule_e.ts";
import { form8582Pdf } from "./pdf/forms/f8582.ts";
import { scheduleEPdf } from "./pdf/forms/schedule_e.ts";

const prior = {
  tax_year: 2024 as const,
  activity_id: "north-rental",
  filed_part_vii_column_c: 5_000,
  source_document_reference: "filed 2024 Form 8582 Part VII North rental",
};
const rental = {
  tsj: "T",
  activity_id: "north-rental",
  property_description: "North rental",
  property_type: 1,
  activity_type: "B",
  street_address: "10 North St",
  city: "Austin",
  state: "TX",
  zip: "78701",
  fair_rental_days: 365,
  personal_use_days: 0,
  rent_income: 5_000,
  expense_repairs: 2_000,
  form_1099_payments_made: false,
  prior_unallowed_passive_operating: 5_000,
  prior_year_8582_source: prior,
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

function filedReturn() {
  return f1040_2025.executeReturn({
    general,
    w2: [{ box1_wages: 50_000, box2_fed_withheld: 8_000 }],
    schedule_e: [rental],
  });
}

Deno.test("2024 rental PAL offsets same activity 2025 profit and stays in Part V", () => {
  const result = filedReturn();
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8582.current_income, 3_000);
  assertEquals(result.pending.form8582.prior_unallowed, 5_000);
  assertEquals(result.pending.schedule1.line5_schedule_e, 0);
  assertEquals(result.pending.f1040.line8_additional_income ?? 0, 0);
  assertEquals(result.pending.f1040.line11_agi, 50_000);
  assertEquals(result.carryforwards.suspended_pal_8582, 2_000);
  assertEquals(result.carryforwards["suspended_pal_8582:north-rental"], 2_000);
  const pending = normalizeAllPending(result.pending);
  const xml = form8582.build(pending.form8582, { pending });
  assertStringIncludes(
    xml,
    "<OtherActivityIncomeAmt>3000</OtherActivityIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<PriorYearUnallowedOtherLossAmt>5000</PriorYearUnallowedOtherLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalLossesAllowedAmt>3000</TotalLossesAllowedAmt>",
  );
  assertStringIncludes(
    scheduleE.build(pending.schedule_e, { pending }),
    "<TotalIncomeOrLossAmt>0</TotalIncomeOrLossAmt>",
  );
  const pdf = form8582Pdf.projectFields!(pending.form8582, pending);
  assertEquals(pdf.line2a, "3000");
  assertEquals(pdf.line2c, "5000");
  assertEquals(pdf.line11, "3000");
  const schedulePdf = scheduleEPdf.projectFields!(pending.schedule_e, pending);
  assertEquals(schedulePdf.property_0_line22, undefined);
});

Deno.test("2024 rental PAL source and finalized return tampering stop MeF and PDF", () => {
  const pending = normalizeAllPending(filedReturn().pending);
  const altered = [
    {
      ...pending,
      schedule_e: {
        schedule_es: [{ ...rental, prior_unallowed_passive_operating: 4_999 }],
      },
    },
    {
      ...pending,
      schedule_e: {
        schedule_es: [{
          ...rental,
          prior_year_8582_source: {
            ...prior,
            source_document_reference: "other return",
          },
        }],
      },
    },
    { ...pending, schedule1: { ...pending.schedule1, line5_schedule_e: 1 } },
    { ...pending, f1040: { ...pending.f1040, line11_agi: 49_999 } },
  ];
  for (const changed of altered) {
    assertThrows(
      () => form8582.build(pending.form8582, { pending: changed }),
      Error,
    );
    assertThrows(
      () => form8582Pdf.projectFields!(pending.form8582, changed),
      Error,
    );
  }
});
