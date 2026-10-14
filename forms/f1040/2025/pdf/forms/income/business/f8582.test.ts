import { f1040_2025 } from "../../../../index.ts";
import { buildMefXml } from "../../../../mef/builder.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../builder.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { type FilerIdentity, FilingStatus } from "../../../../../mef/header.ts";
import { form8582Pdf } from "./f8582.ts";
import { form8582 as nativeForm8582 } from "../../../../mef/forms/income/business/f8582/f8582.ts";
import { scheduleEPdf } from "../rental-passthrough/schedule_e.ts";

Deno.test("first-year entire-sale gain prints Part V from the same Schedule E and Form 4797 activity", () => {
  const sale = {
    activity_id: "first-year-entire-gain",
    activity_name: "First year rental",
    part: "II" as const,
    property_description: "Short-held rental property",
    acquired_on: "2025-02-01",
    sold_on: "2025-08-01",
    gross_sales_price: 30_000,
    cost_or_other_basis: 20_000,
    depreciation_allowed: 0 as const,
    entire_activity_interest_disposed: true,
    buyer_unrelated: true,
    fully_taxable: true,
    installment_method: false,
    disposition_document_reference: "2025 sale closing statement",
  };
  const firstYear = {
    activity_id: sale.activity_id,
    activity_name: sale.activity_name,
    activity_acquired_on: sale.acquired_on,
    acquisition_document_reference: "2025 purchase closing statement",
    not_grouped_with_prior_activity: true as const,
  };
  const property = {
    tsj: "T" as const,
    activity_id: sale.activity_id,
    property_description: sale.activity_name,
    property_type: 1,
    activity_type: "B" as const,
    fair_rental_days: 180,
    personal_use_days: 0,
    rent_income: 0,
    form_1099_payments_made: false,
    street_address: "12 Main Street",
    city: "Austin",
    state: "TX",
    zip: "78701",
    expense_taxes: 2_000,
    disposed_of: true,
    first_year_activity_source: firstYear,
    passive_property_sales: [sale],
  };
  const fields = {
    activities: [{
      activity_id: sale.activity_id,
      name: sale.activity_name,
      activity_type: "B" as const,
      property_type: 1,
      reporting_form: "schedule_e" as const,
      current_net: -2_000,
      prior_unallowed_operating: 0,
      prior_unallowed_4797_part1: 0,
      prior_unallowed_4797_part2: 0,
      first_year_activity_source: firstYear,
    }],
    current_loss: 2_000,
    has_other_passive: true,
    has_current_4797_transaction: true,
    current_4797_sale_gains: [{
      activity_id: sale.activity_id,
      activity_name: sale.activity_name,
      part: "II" as const,
      gain: 10_000,
      entire_activity_interest_disposed: true,
    }],
  };
  const pending = {
    schedule_e: { schedule_es: [property] },
    form4797: { passive_property_sales: [sale] },
    form8582: fields,
    schedule1: { line5_schedule_e: -2_000 },
  };
  const xml = nativeForm8582.build(fields, { pending });
  assertStringIncludes(xml, "<OverallGainAmt>8000</OverallGainAmt>");
  const form = form8582Pdf.projectFields!(fields, pending);
  assertEquals(form.part5_1_income, "10000");
  assertEquals(form.part5_1_loss, "2000");
  assertEquals(form.part5_1_gain, "8000");
  assertEquals(form.part5_1_prior, undefined);
  const scheduleE = scheduleEPdf.projectFields!(pending.schedule_e, pending);
  assertEquals(scheduleE.property_0_line22, 2_000);
  assertEquals(scheduleE.line26, -2_000);
  const changedClosing = {
    ...pending,
    form4797: {
      passive_property_sales: [{
        ...sale,
        disposition_document_reference: "Different closing statement",
      }],
    },
  };
  assertThrows(
    () => nativeForm8582.build(fields, { pending: changedClosing }),
    Error,
    "disposition facts do not match",
  );
  assertThrows(
    () => form8582Pdf.projectFields!(fields, changedClosing),
    Error,
    "disposition facts do not match",
  );
  assertThrows(
    () =>
      nativeForm8582.build(fields, {
        pending: {
          ...pending,
          schedule_e: {
            schedule_es: [{
              ...property,
              first_year_activity_source: undefined,
            }],
          },
        },
      }),
    Error,
    "do not match their Schedule E",
  );
});

Deno.test("active rental entire-sale gain reconciles Form 8582 Part IV, Schedule E, and Form 4797", () => {
  const sale = {
    activity_id: "active-entire-gain",
    activity_name: "Active entire rental",
    part: "II" as const,
    property_description: "Short-held rental property",
    acquired_on: "2025-01-01",
    sold_on: "2025-06-01",
    gross_sales_price: 30_000,
    cost_or_other_basis: 15_000,
    depreciation_allowed: 0,
    entire_activity_interest_disposed: true,
    buyer_unrelated: true,
    fully_taxable: true,
    installment_method: false,
    disposition_document_reference: "2025 active rental closing statement",
  };
  const prior = {
    tax_year: 2024 as const,
    activity_id: sale.activity_id,
    filed_part_vii_column_c: 8_000,
    source_document_reference: "2024 filed Form 8582 Part VII",
  };
  const property = {
    tsj: "T" as const,
    activity_id: sale.activity_id,
    property_description: sale.activity_name,
    property_type: 1,
    activity_type: "A" as const,
    fair_rental_days: 365,
    personal_use_days: 0,
    rent_income: 0,
    form_1099_payments_made: false,
    street_address: "12 Main Street",
    city: "Austin",
    state: "TX",
    zip: "78701",
    expense_taxes: 2_000,
    disposed_of: true,
    prior_unallowed_passive_operating: 8_000,
    prior_passive_losses_active_when_incurred: true,
    prior_year_8582_source: prior,
    passive_property_sales: [sale],
  };
  const fields = {
    activities: [{
      activity_id: sale.activity_id,
      name: sale.activity_name,
      activity_type: "A" as const,
      property_type: 1,
      reporting_form: "schedule_e" as const,
      current_net: -2_000,
      prior_unallowed_operating: 8_000,
      prior_unallowed_4797_part1: 0,
      prior_unallowed_4797_part2: 0,
      prior_active_participation: true,
      prior_year_8582_source: prior,
    }],
    current_loss: 2_000,
    rental_current_loss: 2_000,
    rental_prior_eligible_loss: 8_000,
    prior_unallowed: 8_000,
    has_active_rental: true,
    active_participation: true,
    has_current_4797_transaction: true,
    current_4797_sale_gains: [{
      activity_id: sale.activity_id,
      activity_name: sale.activity_name,
      part: "II" as const,
      gain: 15_000,
      entire_activity_interest_disposed: true,
    }],
    modified_agi: 160_000,
  };
  const pending = {
    schedule_e: { schedule_es: [property] },
    form4797: { passive_property_sales: [sale] },
    form8582: fields,
    schedule1: { line5_schedule_e: -10_000 },
  };
  const xml = nativeForm8582.build(fields, { pending });
  assertStringIncludes(
    xml,
    "<RentalRealtyIncomeAmt>15000</RentalRealtyIncomeAmt>",
  );
  assertStringIncludes(xml, "<RentalRealtyLossAmt>2000</RentalRealtyLossAmt>");
  assertStringIncludes(
    xml,
    "<PYUnallowedRentalLossAmt>8000</PYUnallowedRentalLossAmt>",
  );
  assertStringIncludes(xml, "<OverallGainAmt>5000</OverallGainAmt>");
  const form = form8582Pdf.projectFields!(fields, pending);
  assertEquals(form.part4_1_income, "15000");
  assertEquals(form.part4_1_loss, "2000");
  assertEquals(form.part4_1_prior, "8000");
  assertEquals(form.part4_1_gain, "5000");
  const scheduleE = scheduleEPdf.projectFields!(pending.schedule_e, pending);
  assertEquals(scheduleE.property_0_line22, 10_000);
  assertEquals(scheduleE.line26, -10_000);
  assertThrows(
    () =>
      nativeForm8582.build(fields, {
        pending: {
          ...pending,
          form4797: {
            passive_property_sales: [{ ...sale, gross_sales_price: 29_999 }],
          },
        },
      }),
    Error,
    "do not match property-sale sources",
  );
});

Deno.test("active retained-sale PAL projects Part IV and special allowance without releasing all loss", () => {
  const sale = {
    activity_id: "active-retained",
    activity_name: "Active retained rental",
    part: "II" as const,
    property_description: "Short-held rental property",
    acquired_on: "2025-01-01",
    sold_on: "2025-06-01",
    gross_sales_price: 8_000,
    cost_or_other_basis: 5_000,
    depreciation_allowed: 0 as const,
    entire_activity_interest_disposed: false,
    buyer_unrelated: true,
    fully_taxable: true,
    installment_method: false,
    disposition_document_reference: "2025 partial property closing statement",
  };
  const prior = {
    tax_year: 2024 as const,
    activity_id: sale.activity_id,
    filed_part_vii_column_c: 8_000,
    source_document_reference: "2024 filed Form 8582 Part VII",
  };
  const fields = {
    activities: [{
      activity_id: sale.activity_id,
      name: sale.activity_name,
      activity_type: "A" as const,
      property_type: 1,
      reporting_form: "schedule_e" as const,
      current_net: -5_000,
      prior_unallowed_operating: 8_000,
      prior_unallowed_4797_part1: 0,
      prior_unallowed_4797_part2: 0,
      prior_active_participation: true,
      prior_year_8582_source: prior,
    }],
    current_loss: 5_000,
    rental_current_loss: 5_000,
    rental_prior_eligible_loss: 8_000,
    prior_unallowed: 8_000,
    has_active_rental: true,
    active_participation: true,
    filing_status: "single" as const,
    modified_agi: 140_000,
    has_current_4797_transaction: true,
    current_4797_sale_gains: [{
      activity_id: sale.activity_id,
      activity_name: sale.activity_name,
      part: "II" as const,
      gain: 3_000,
      entire_activity_interest_disposed: false,
    }],
  };
  const pending = {
    schedule_e: {
      schedule_es: [{
        tsj: "T",
        activity_id: sale.activity_id,
        property_description: sale.activity_name,
        property_type: 1,
        activity_type: "A",
        fair_rental_days: 365,
        personal_use_days: 0,
        rent_income: 0,
        form_1099_payments_made: false,
        expense_taxes: 5_000,
        disposed_of: true,
        prior_unallowed_passive_operating: 8_000,
        prior_passive_losses_active_when_incurred: true,
        prior_year_8582_source: prior,
        passive_property_sales: [sale],
      }],
    },
    form4797: { passive_property_sales: [sale] },
    form8582: fields,
    schedule1: { line5_schedule_e: -8_000 },
  };
  const projected = form8582Pdf.projectFields!(fields, pending);
  assertEquals(projected.part4_1_income, "3000");
  assertEquals(projected.part4_1_loss, "5000");
  assertEquals(projected.part4_1_prior, "8000");
  assertEquals(projected.part4_1_overall_loss, "10000");
  assertEquals(projected.line9, "5000");
  assertEquals(projected.line11, "8000");
  assertEquals(projected.part7_1_unallowed, "5000");
  const changedBuyer = {
    ...pending,
    form4797: {
      passive_property_sales: [{ ...sale, buyer_unrelated: false }],
    },
  };
  assertThrows(
    () => nativeForm8582.build(fields, { pending: changedBuyer }),
    Error,
    "disposition facts do not match",
  );
  assertThrows(
    () => form8582Pdf.projectFields!(fields, changedBuyer),
    Error,
    "disposition facts do not match",
  );
});

const rental = {
  activity_id: "rental-home",
  name: "Rental home",
  activity_type: "A" as const,
  property_type: 1,
  reporting_form: "schedule_e" as const,
  current_net: -20_000,
  prior_unallowed_operating: 0,
  prior_unallowed_4797_part1: 0,
  prior_unallowed_4797_part2: 0,
};

const rentalFields = {
  activities: [rental],
  current_loss: 20_000,
  rental_current_loss: 20_000,
  has_active_rental: true,
  active_participation: true,
  filing_status: "mfs" as const,
  mfs_lived_apart_all_year: true,
  mfs_lived_apart_source: {
    months: Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      taxpayer_residence: "1 Taxpayer Street",
      spouse_residence: "2 Spouse Avenue",
      taxpayer_residence_record_reference: `Taxpayer month ${index + 1}`,
      spouse_residence_record_reference: `Spouse month ${index + 1}`,
      no_shared_residence_any_day: true as const,
    })),
  },
  modified_agi: 60_000,
};

const rentalPending = {
  general: {
    filing_status: "mfs",
    mfs_spouse_lived_with_taxpayer: false,
    mfs_lived_apart_source: rentalFields.mfs_lived_apart_source,
  },
  schedule_e: {
    schedule_es: [{
      tsj: "T",
      activity_id: "rental-home",
      property_description: "Rental home",
      property_type: 1,
      activity_type: "A",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 0,
      form_1099_payments_made: false,
      expense_utilities: 20_000,
    }],
  },
};

Deno.test("Form 8582 PDF projects Parts I–VIII from the native activity worksheet", () => {
  const fields = form8582Pdf.projectFields!(rentalFields, rentalPending);
  assertEquals(fields.line1b, "20000");
  assertEquals(fields.line1d, "-20000");
  assertEquals(fields.line3, "-20000");
  assertEquals(fields.line5, "75000");
  assertEquals(fields.line6, "60000");
  assertEquals(fields.line7, "15000");
  assertEquals(fields.line8, "7500");
  assertEquals(fields.line9, "7500");
  assertEquals(fields.line11, "7500");
  assertEquals(fields.part4_1_name, "Rental home");
  assertEquals(fields.part4_1_loss, "20000");
  assertEquals(fields.part4_total_loss, "20000");
  assertEquals(fields.part6_1_allowance, "7500");
  assertEquals(fields.part7_1_unallowed, "12500");
  assertEquals(fields.partVIII_1_allowed, "7500");
  assertEquals(fields.part9_name, undefined);
});

Deno.test("Form 8582 PDF projects rounded odd-dollar MFS Part II allowance", () => {
  const fields = form8582Pdf.projectFields!(
    { ...rentalFields, modified_agi: 60_003 },
    rentalPending,
  );
  assertEquals(fields.line5, "75000");
  assertEquals(fields.line6, "60003");
  assertEquals(fields.line7, "14997");
  assertEquals(fields.line8, "7499");
  assertEquals(fields.line9, "7499");
  assertEquals(fields.line11, "7499");
  assertEquals(fields.part6_1_allowance, "7499");
  assertEquals(fields.part7_1_unallowed, "12501");
  assertEquals(fields.partVIII_1_allowed, "7499");
});

Deno.test("Form 8582 native and PDF retain a filed prior active-rental operating PAL", () => {
  const prior = {
    tax_year: 2024 as const,
    activity_id: "rental-home",
    filed_part_vii_column_c: 8_000,
    source_document_reference: "Filed 2024 Form 8582 rental row",
  };
  const fields = {
    ...rentalFields,
    activities: [{
      ...rental,
      current_net: -20_000,
      prior_unallowed_operating: 8_000,
      prior_active_participation: true,
      prior_year_8582_source: prior,
    }],
    filing_status: "single" as const,
    modified_agi: 120_000,
    prior_unallowed: 8_000,
    rental_prior_eligible_loss: 8_000,
  };
  const pending = {
    schedule_e: {
      schedule_es: [{
        ...rentalPending.schedule_e.schedule_es[0],
        prior_unallowed_passive_operating: 8_000,
        prior_passive_losses_active_when_incurred: true,
        prior_year_8582_source: prior,
      }],
    },
  };
  const xml = nativeForm8582.build(fields, { pending });
  assertStringIncludes(
    xml,
    "<PYUnallowedRentalLossAmt>8000</PYUnallowedRentalLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalLossesAllowedAmt>15000</TotalLossesAllowedAmt>",
  );
  const projected = form8582Pdf.projectFields!(fields, pending);
  assertEquals(projected.line1c, "8000");
  assertEquals(projected.line9, "15000");
  assertEquals(projected.part4_1_prior, "8000");
  assertEquals(projected.part7_1_unallowed, "13000");
  assertEquals(projected.partVIII_1_allowed, "15000");
  const secondPrior = {
    ...prior,
    activity_id: "rental-two",
    filed_part_vii_column_c: 2_000,
  };
  const twoFields = {
    ...fields,
    activities: [...fields.activities, {
      ...fields.activities[0],
      activity_id: "rental-two",
      name: "Second rental",
      current_net: -10_000,
      prior_unallowed_operating: 2_000,
      prior_year_8582_source: secondPrior,
    }],
    current_loss: 30_000,
    rental_current_loss: 30_000,
    prior_unallowed: 10_000,
    rental_prior_eligible_loss: 10_000,
  };
  const twoPending = {
    schedule_e: {
      schedule_es: [...pending.schedule_e.schedule_es, {
        ...pending.schedule_e.schedule_es[0],
        activity_id: "rental-two",
        property_description: "Second rental",
        expense_utilities: 10_000,
        prior_unallowed_passive_operating: 2_000,
        prior_year_8582_source: secondPrior,
      }],
    },
  };
  assertStringIncludes(
    nativeForm8582.build(twoFields, { pending: twoPending }),
    "<PYUnallowedRentalLossAmt>10000</PYUnallowedRentalLossAmt>",
  );
  const twoProjected = form8582Pdf.projectFields!(twoFields, twoPending);
  assertEquals(twoProjected.part4_2_prior, "2000");
  assertEquals(twoProjected.part6_2_allowance, "4500");
  assertEquals(twoProjected.part7_2_unallowed, "7500");
  assertEquals(twoProjected.partVIII_2_allowed, "4500");
  assertThrows(
    () =>
      nativeForm8582.build(fields, {
        pending: {
          schedule_e: {
            schedule_es: [{
              ...pending.schedule_e.schedule_es[0],
              prior_passive_losses_active_when_incurred: false,
            }],
          },
        },
      }),
    Error,
    "activities do not match",
  );
});

Deno.test("Form 8582 PDF keeps other-passive Part V separate from rental Part IV", () => {
  const fields = form8582Pdf.projectFields!({
    activities: [{ ...rental, activity_type: "B", current_net: -4_000 }],
    current_loss: 4_000,
    has_other_passive: true,
  }, {
    schedule_e: {
      schedule_es: [{
        ...rentalPending.schedule_e.schedule_es[0],
        activity_type: "B",
        expense_utilities: 4_000,
      }],
    },
  });
  assertEquals(fields.line1b, undefined);
  assertEquals(fields.line2b, "4000");
  assertEquals(fields.part5_1_name, "Rental home");
  assertEquals(fields.part5_1_loss, "4000");
  assertEquals(fields.part5_total_loss, "4000");
  assertEquals(fields.part7_1_unallowed, "4000");
});

Deno.test("Form 8582 PDF keeps activity rows stable when Schedule E source order changes", () => {
  const lossB = {
    ...rental,
    activity_id: "loss-b",
    name: "Loss B",
    activity_type: "B" as const,
    current_net: -1_000,
  };
  const lossA = {
    ...rental,
    activity_id: "loss-a",
    name: "Loss A",
    activity_type: "B" as const,
    current_net: -2_000,
  };
  const source = (activity: typeof lossB) => ({
    ...rentalPending.schedule_e.schedule_es[0],
    activity_id: activity.activity_id,
    property_description: activity.name,
    activity_type: "B",
    expense_utilities: -activity.current_net,
  });
  const projected = form8582Pdf.projectFields!({
    activities: [lossB, lossA],
    current_loss: 3_000,
    has_other_passive: true,
  }, {
    schedule_e: { schedule_es: [source(lossA), source(lossB)] },
  });
  assertEquals(projected.part5_1_name, "Loss B");
  assertEquals(projected.part5_2_name, "Loss A");
  assertEquals(projected.part7_1_name, "Loss B");
  assertEquals(projected.part7_2_name, "Loss A");
});

Deno.test("Form 8582 PDF field map targets all three actual 2025 pages", () => {
  const entries = form8582Pdf.fields;
  assertEquals(
    entries.find((entry) => entry.domainKey === "line1b")?.pdfField,
    "topmostSubform[0].Page1[0].f1_04[0]",
  );
  assertEquals(
    entries.find((entry) => entry.domainKey === "part4_1_name")?.pdfField,
    "topmostSubform[0].Page1[0].Table_Part4[0].Row1[0].f1_20[0]",
  );
  assertEquals(
    entries.find((entry) => entry.domainKey === "part7_1_unallowed")?.pdfField,
    "topmostSubform[0].Page2[0].Table_Part7[0].Row1[0].f2_74[0]",
  );
  assertEquals(
    entries.find((entry) => entry.domainKey === "part9_1_allowed")?.pdfField,
    "topmostSubform[0].Page3[0].Form1_NotATable[0].f3_08[0]",
  );
});

Deno.test("Form 8582 PDF preserves the native source and MFS guards", () => {
  assertThrows(
    () => form8582Pdf.projectFields!({ current_loss: 8_000 }, {}),
    Error,
    "requires per-activity",
  );
  assertThrows(
    () =>
      form8582Pdf.projectFields!({
        ...rentalFields,
        mfs_lived_apart_all_year: false,
      }, rentalPending),
    Error,
    "requires per-activity",
  );
  assertThrows(
    () =>
      form8582Pdf.projectFields!(rentalFields, {
        ...rentalPending,
        schedule_e: { schedule_es: [] },
      }),
    Error,
    "activities do not match",
  );
});

function overflowSource(count: number, active = false) {
  const activities = Array.from({ length: count }, (_, index) => ({
    ...rental,
    activity_id: `property-${index + 1}`,
    name: `Property ${index + 1}`,
    activity_type: active ? "A" as const : "B" as const,
    current_net: -1_000,
  }));
  const schedule_es = activities.map((activity) => ({
    ...rentalPending.schedule_e.schedule_es[0],
    activity_id: activity.activity_id,
    property_description: activity.name,
    activity_type: activity.activity_type,
    expense_utilities: 1_000,
  }));
  const source = active
    ? {
      ...rentalFields,
      activities,
      current_loss: count * 1_000,
      rental_current_loss: count * 1_000,
      filing_status: "single" as const,
      modified_agi: 140_000,
    }
    : { activities, current_loss: count * 1_000, has_other_passive: true };
  const pending = {
    general: { filing_status: "single" },
    schedule_e: { schedule_es },
    form8582: source,
  };
  return { source, pending };
}

const continuationFiler: FilerIdentity = {
  primarySSN: "111223333",
  nameLine1: "ALEX EXAMPLE",
  nameControl: "EXAM",
  fullName: "Alex Example",
  filingStatus: FilingStatus.Single,
  address: {
    line1: "1 Example Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
};

Deno.test("Form 8582 continuation preserves every native overflow row in multiple pages", async () => {
  for (const active of [false, true]) {
    const { source, pending } = overflowSource(22, active);
    const projected = form8582Pdf.projectFields!(source, pending);
    assertEquals(
      projected[active ? "part4_total_loss" : "part5_total_loss"],
      "22000",
    );
    assertEquals(
      projected[active ? "part4_6_name" : "part5_6_name"],
      undefined,
    );
    const document = await PDFDocument.create();
    await form8582Pdf.appendSupplementalPages!(
      document,
      projected,
      continuationFiler,
      pending,
    );
    // 17 overflow rows occupy three pages per emitted worksheet part.
    assertEquals(document.getPageCount(), active ? 12 : 9);
    const path = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(path, await document.save());
      const output = await new Deno.Command("pdftotext", {
        args: ["-raw", path, "-"],
      }).output();
      assertEquals(output.code, 0);
      const text = new TextDecoder().decode(output.stdout);
      for (let index = 6; index <= 22; index++) {
        assertEquals(
          [...text.matchAll(new RegExp(`Property ${index}(?![0-9])`, "g"))]
            .length,
          active ? 4 : 3,
        );
      }
      assertStringIncludes(text, "111223333");
      assertStringIncludes(text, "Rows 22-22; continuation page 3 of 3");
      assertStringIncludes(text, "22000");
    } finally {
      await Deno.remove(path);
    }
  }
});

Deno.test("Form 8582 continuation rejects tampered worksheet, totals and identity", async () => {
  const { source, pending } = overflowSource(6);
  const projected = form8582Pdf.projectFields!(source, pending);
  for (
    const changed of [{ ...projected, part5_total_loss: "5999" }, {
      ...projected,
      pdf_continuation: [],
    }, { ...projected, extra: true }]
  ) {
    await assertRejects(
      async () =>
        form8582Pdf.appendSupplementalPages!(
          await PDFDocument.create(),
          changed,
          continuationFiler,
          pending,
        ),
      Error,
      "differs from finalized worksheet",
    );
  }
  await assertRejects(
    async () =>
      form8582Pdf.appendSupplementalPages!(
        await PDFDocument.create(),
        projected,
        undefined,
        pending,
      ),
    Error,
    "needs filer identity",
  );
  await assertRejects(
    async () =>
      form8582Pdf.appendSupplementalPages!(
        await PDFDocument.create(),
        projected,
        continuationFiler,
        {},
      ),
    Error,
    "needs finalized worksheet source",
  );
});

Deno.test("Form 8582 five-row boundary adds no continuation pages", async () => {
  const { source, pending } = overflowSource(5);
  const projected = form8582Pdf.projectFields!(source, pending);
  assertEquals(projected.pdf_continuation, undefined);
  const document = await PDFDocument.create();
  await form8582Pdf.appendSupplementalPages!(
    document,
    projected,
    undefined,
    pending,
  );
  assertEquals(document.getPageCount(), 0);
});

Deno.test("Form 8582 PDF does not print an empty form", () => {
  assertEquals(form8582Pdf.projectFields!({ modified_agi: 80_000 }, {}), {});
});

Deno.test("Form 8582 Part IX retains a second native activity block on its own schedule", async () => {
  const activities = [1, 2].map((i) => ({
    activity_id: `passive-ix-${i}`,
    name: `Passive rental ${i}`,
    activity_type: "B" as const,
    property_type: 1,
    reporting_form: "schedule_e" as const,
    current_net: 4_000,
    prior_unallowed_operating: 2_000,
    prior_unallowed_4797_part1: 6_000,
    prior_unallowed_4797_part2: 2_000,
    prior_year_8582_source: {
      tax_year: 2024 as const,
      activity_id: `passive-ix-${i}`,
      filed_part_vii_column_c: 10_000,
      source_document_reference: `Synthetic prior IX ${i}`,
      filed_part_ix_rows: [
        { reporting_form: "schedule_e" as const, filed_unallowed_loss: 2_000 },
        {
          reporting_form: "form4797_part1" as const,
          filed_unallowed_loss: 6_000,
        },
        {
          reporting_form: "form4797_part2" as const,
          filed_unallowed_loss: 2_000,
        },
      ],
    },
  }));
  const source = {
    activities,
    current_income: 8_000,
    prior_unallowed: 20_000,
    has_other_passive: true,
  };
  const pending = {
    form8582: source,
    schedule_e: {
      schedule_es: activities.map((a) => ({
        tsj: "T",
        activity_id: a.activity_id,
        property_description: a.name,
        property_type: 1,
        activity_type: "B",
        fair_rental_days: 365,
        personal_use_days: 0,
        rent_income: 4_000,
        form_1099_payments_made: false,
        prior_unallowed_passive_operating: 2_000,
        prior_unallowed_passive_4797_part1: 6_000,
        prior_unallowed_passive_4797_part2: 2_000,
        prior_year_8582_source: a.prior_year_8582_source,
      })),
    },
  };
  const projected = form8582Pdf.projectFields!(source, pending);
  assertEquals(projected.part9_name, "Passive rental 1");
  const document = await PDFDocument.create();
  await form8582Pdf.appendSupplementalPages!(
    document,
    projected,
    continuationFiler,
    pending,
  );
  assertEquals(document.getPageCount(), 1);
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, await document.save());
    const output = await new Deno.Command("pdftotext", {
      args: ["-raw", path, "-"],
    }).output();
    assertEquals(output.code, 0);
    const text = new TextDecoder().decode(output.stdout);
    assertStringIncludes(text, "Passive rental 2");
    assertStringIncludes(text, "Sch E, line 22");
    assertStringIncludes(text, "Form 4797, Part I");
    assertStringIncludes(text, "Form 4797, Part II");
    assertStringIncludes(text, "Rows 1-3");
  } finally {
    await Deno.remove(path);
  }
});

Deno.test("Form 8582 public return graph retains 22 active and other-passive rentals in the full packet", async () => {
  const general = {
    "filing_status": "single",
    "taxpayer_first_name": "Alex",
    "taxpayer_last_name": "Example",
    "taxpayer_ssn": "111-22-3333",
    "taxpayer_dob": "1985-06-15",
    "child_eic_filer_review": {
      "not_qualifying_child_of_another_taxpayer_verified": true,
      "relationship_age_residence_record_reference":
        "Synthetic 2025 filer family and residence review",
    },
    "prior_eic_disallowance_review": {
      "status": "none",
      "irs_account_record_reference": "Synthetic IRS account transcript review",
      "no_nonclerical_disallowance_since_1996_verified": true,
    },
    "eic_tax_residency_review": {
      "status": "all_year_resident",
      "taxpayer_status_record_reference":
        "Synthetic 2025 resident status review",
      "spouse_status_record_reference": "Synthetic 2025 spouse status review",
    },
    "address_line1": "1 Example Way",
    "address_city": "Austin",
    "address_state": "TX",
    "address_zip": "78701",
    "digital_assets": false,
  };
  const w2 = [
    {
      "box1_wages": 140000,
      "box2_fed_withheld": 20000,
      "employee_ssn": "111-22-3333",
      "box3_ss_wages": 140000,
      "box4_ss_withheld": 8680,
      "box5_medicare_wages": 140000,
      "box6_medicare_withheld": 2030,
      "employer_ein": "12-3456789",
      "employer_name": "Example Employer",
      "employer_address_line1": "10 Employer Road",
      "employer_address_city": "Austin",
      "employer_address_state": "TX",
      "employer_address_zip": "78701",
      "box12_entries": [],
    },
  ];
  for (const active of [false, true]) {
    const result = f1040_2025.executeReturn({
      general,
      w2,
      schedule_e: Array.from({ length: 22 }, (_, i) => ({
        tsj: "T",
        activity_id: `rental-${i + 1}`,
        property_description: `Property ${i + 1}`,
        street_address: `${100 + i} Rental Road`,
        city: "Austin",
        state: "TX",
        zip: "78701",
        property_type: 1,
        activity_type: active ? "A" : "B",
        fair_rental_days: 365,
        personal_use_days: 0,
        rent_income: 0,
        form_1099_payments_made: false,
        expense_utilities: 1000,
      })),
    });
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.f1040.line11_agi, active ? 135_000 : 140_000);
    assertEquals(
      result.pending.f1040.line37_amount_owed,
      active ? 1_467 : 2_667,
    );
    const filer = extractFilerIdentity(result.pending.f1040);
    const xml = buildMefXml(buildPending(result.pending), filer);
    assertEquals(
      [...xml.matchAll(/<PropertyRealEstAndRoyaltyGroup>/g)].length,
      22,
    );
    assertStringIncludes(
      xml,
      active
        ? "<TotalSuppIncomeOrLossAmt>-5000</TotalSuppIncomeOrLossAmt>"
        : "<TotalSuppIncomeOrLossAmt>0</TotalSuppIncomeOrLossAmt>",
    );
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      result.pending,
      filer,
      ".pdf-cache",
      undefined,
      origins,
    );
    assertEquals(origins.length, active ? 27 : 22);
    assertEquals(origins.filter((o) => o.formKey === "schedule_e").length, 8);
    const path = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(path, pdf);
      const output = await new Deno.Command("pdftotext", {
        args: ["-raw", path, "-"],
      }).output();
      assertEquals(output.code, 0);
      const text = new TextDecoder().decode(output.stdout);
      for (let i = 1; i <= 22; i++) {
        assertEquals(
          [...text.matchAll(new RegExp(`Property ${i}(?![0-9])`, "g"))].length,
          active ? 4 : 3,
        );
      }
      assertStringIncludes(text, active ? "21467" : "22667");
      assertStringIncludes(text, active ? "1467" : "2667");
    } finally {
      await Deno.remove(path);
    }
    const changed = structuredClone(result.pending);
    (changed.schedule_e.schedule_es as Record<string, unknown>[])[3]
      .expense_utilities = 999;
    assertThrows(() => buildMefXml(buildPending(changed), filer), Error);
    await assertRejects(
      () => buildPdfBytes(changed, filer, ".pdf-cache"),
      Error,
      "Schedule E passive loss does not match Form 8582 activity",
    );
  }
});
