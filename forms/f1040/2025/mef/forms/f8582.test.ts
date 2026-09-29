import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form8582 } from "./f8582.ts";

const reorderedActivityCase = {
  fields: {
    activities: [
      {
        activity_id: "loss-b",
        name: "Loss B",
        activity_type: "B" as const,
        property_type: 1,
        reporting_form: "schedule_e" as const,
        current_net: -1_000,
        prior_unallowed_operating: 0,
        prior_unallowed_4797_part1: 0,
        prior_unallowed_4797_part2: 0,
      },
      {
        activity_id: "loss-a",
        name: "Loss A",
        activity_type: "B" as const,
        property_type: 1,
        reporting_form: "schedule_e" as const,
        current_net: -2_000,
        prior_unallowed_operating: 0,
        prior_unallowed_4797_part1: 0,
        prior_unallowed_4797_part2: 0,
      },
    ],
    current_loss: 3_000,
    has_other_passive: true,
  },
  pending: {
    schedule_e: {
      schedule_es: [
        {
          tsj: "T",
          activity_id: "loss-a",
          property_description: "Loss A",
          property_type: 1,
          activity_type: "B",
          fair_rental_days: 365,
          personal_use_days: 0,
          rent_income: 0,
          expense_utilities: 2_000,
          form_1099_payments_made: false,
        },
        {
          tsj: "T",
          activity_id: "loss-b",
          property_description: "Loss B",
          property_type: 1,
          activity_type: "B",
          fair_rental_days: 365,
          personal_use_days: 0,
          rent_income: 0,
          expense_utilities: 1_000,
          form_1099_payments_made: false,
        },
      ],
    },
  },
};

Deno.test("Form 8582 omits a gain-only activity with no passive loss", () => {
  assertEquals(
    form8582.build({
      activities: [{
        activity_id: "gain-only",
        name: "Gain only activity",
        activity_type: "B",
        property_type: 1,
        reporting_form: "schedule_e",
        current_net: 5_000,
        prior_unallowed_operating: 0,
        prior_unallowed_4797_part1: 0,
        prior_unallowed_4797_part2: 0,
      }],
      current_income: 5_000,
      has_other_passive: true,
    }),
    "",
  );
});

Deno.test("Form 8582 MeF joins reordered source activities by durable ID", () => {
  const { fields, pending } = reorderedActivityCase;
  const xml = form8582.build(fields, { pending });
  assertEquals(
    xml.indexOf("<NonParticipateActivityNm>Loss B</NonParticipateActivityNm>") <
      xml.indexOf(
        "<NonParticipateActivityNm>Loss A</NonParticipateActivityNm>",
      ),
    true,
  );
  assertThrows(
    () =>
      form8582.build(fields, {
        pending: {
          schedule_e: {
            schedule_es: [
              pending.schedule_e.schedule_es[0],
              { ...pending.schedule_e.schedule_es[1], activity_id: "loss-a" },
            ],
          },
        },
      }),
    Error,
    "activities do not match",
  );
  assertThrows(
    () =>
      form8582.build(fields, {
        pending: {
          schedule_e: {
            schedule_es: [
              pending.schedule_e.schedule_es[0],
              {
                ...pending.schedule_e.schedule_es[1],
                expense_utilities: 1_001,
              },
            ],
          },
        },
      }),
    Error,
    "activities do not match",
  );
});

Deno.test("Form 8582 MeF preserves filed Part IX loss character without a 2025 sale", () => {
  const source = {
    tax_year: 2024,
    activity_id: "passive-part-ix",
    filed_part_vii_column_c: 10_000,
    source_document_reference: "2024 filed Form 8582 Part IX",
    filed_part_ix_rows: [
      { reporting_form: "schedule_e", filed_unallowed_loss: 2_000 },
      { reporting_form: "form4797_part1", filed_unallowed_loss: 6_000 },
      { reporting_form: "form4797_part2", filed_unallowed_loss: 2_000 },
    ],
  };
  const fields = {
    activities: [{
      activity_id: "passive-part-ix",
      name: "Passive rental",
      activity_type: "B",
      property_type: 1,
      reporting_form: "schedule_e",
      current_net: 4_000,
      prior_unallowed_operating: 2_000,
      prior_unallowed_4797_part1: 6_000,
      prior_unallowed_4797_part2: 2_000,
      prior_year_8582_source: source,
    }],
    current_income: 4_000,
    prior_unallowed: 10_000,
    has_other_passive: true,
  };
  const pending = {
    schedule_e: {
      schedule_es: [{
        tsj: "T",
        activity_id: "passive-part-ix",
        property_description: "Passive rental",
        property_type: 1,
        activity_type: "B",
        fair_rental_days: 365,
        personal_use_days: 0,
        rent_income: 4_000,
        form_1099_payments_made: false,
        prior_unallowed_passive_operating: 2_000,
        prior_unallowed_passive_4797_part1: 6_000,
        prior_unallowed_passive_4797_part2: 2_000,
        prior_year_8582_source: source,
      }],
    },
  };
  const xml = form8582.build(fields, { pending });
  assertStringIncludes(
    xml,
    "<PriorYearUnallowedOtherLossAmt>10000</PriorYearUnallowedOtherLossAmt>",
  );
  assertStringIncludes(xml, "Form 4797, Part I");
  assertStringIncludes(xml, "Form 4797, Part II");
  assertEquals(
    form8582.build(fields, {
      pending: {
        schedule_e: {
          schedule_es: [{
            ...pending.schedule_e.schedule_es[0],
            prior_year_8582_source: {
              ...source,
              filed_part_ix_rows: [...source.filed_part_ix_rows].reverse(),
            },
          }],
        },
      },
    }),
    xml,
  );
  assertThrows(
    () =>
      form8582.build(fields, {
        pending: {
          schedule_e: {
            schedule_es: [{
              ...pending.schedule_e.schedule_es[0],
              prior_year_8582_source: {
                ...source,
                filed_part_ix_rows: [
                  source.filed_part_ix_rows[0],
                  {
                    reporting_form: "form4797_part1",
                    filed_unallowed_loss: 5_000,
                  },
                  {
                    reporting_form: "form4797_part2",
                    filed_unallowed_loss: 3_000,
                  },
                ],
              },
            }],
          },
        },
      }),
    Error,
    "activities do not match",
  );
});

Deno.test("Form 8582 MeF keeps a single filed Part VIII Form 4797 loss", () => {
  const source = {
    tax_year: 2024,
    activity_id: "passive-part-viii",
    filed_part_vii_column_c: 6_000,
    source_document_reference: "2024 filed Form 8582 Part VIII",
    filed_part_viii_row: {
      reporting_form: "form4797_part1",
      filed_unallowed_loss: 6_000,
    },
  };
  const activity = {
    activity_id: "passive-part-viii",
    name: "Passive rental",
    activity_type: "B",
    property_type: 1,
    reporting_form: "schedule_e",
    current_net: 1_000,
    prior_unallowed_operating: 0,
    prior_unallowed_4797_part1: 6_000,
    prior_unallowed_4797_part2: 0,
    prior_year_8582_source: source,
  };
  const property = {
    tsj: "T",
    activity_id: activity.activity_id,
    property_description: activity.name,
    property_type: 1,
    activity_type: "B",
    fair_rental_days: 365,
    personal_use_days: 0,
    rent_income: 1_000,
    form_1099_payments_made: false,
    prior_unallowed_passive_operating: 0,
    prior_unallowed_passive_4797_part1: 6_000,
    prior_unallowed_passive_4797_part2: 0,
    prior_year_8582_source: source,
  };
  const fields = {
    activities: [activity],
    current_income: 1_000,
    prior_unallowed: 6_000,
    has_other_passive: true,
  };
  const xml = form8582.build(fields, {
    pending: { schedule_e: { schedule_es: [property] } },
  });
  assertStringIncludes(xml, "Form 4797, Part I");
  assertThrows(
    () =>
      form8582.build(fields, {
        pending: {
          schedule_e: {
            schedule_es: [{
              ...property,
              prior_year_8582_source: {
                ...source,
                filed_part_viii_row: {
                  reporting_form: "form4797_part2",
                  filed_unallowed_loss: 6_000,
                },
              },
            }],
          },
        },
      }),
    Error,
    "activities do not match",
  );
});

type PriorOperatingActivity = {
  activity_id: string;
  name: string;
  activity_type: string;
  property_type: number;
  current_net: number;
  prior_unallowed_operating: number;
  prior_active_participation?: boolean;
};

type CurrentActivity = PriorOperatingActivity & {
  prior_unallowed_4797_part1: number;
  prior_unallowed_4797_part2: number;
};

function buildWithCurrentScheduleE(
  input: Record<string, unknown> & { activities: CurrentActivity[] },
): string {
  return form8582.build(input, {
    pending: {
      schedule_e: {
        schedule_es: input.activities.map((activity) => ({
          tsj: "T",
          activity_id: activity.activity_id,
          property_description: activity.name,
          property_type: activity.property_type,
          activity_type: activity.activity_type,
          fair_rental_days: 365,
          personal_use_days: 0,
          rent_income: Math.max(0, activity.current_net),
          expense_utilities: Math.max(0, -activity.current_net),
          form_1099_payments_made: false,
        })),
      },
    },
  });
}

function buildWithFiledPriorOperating(
  input: Record<string, unknown> & { activities: PriorOperatingActivity[] },
): string {
  const activities = input.activities.map((activity) => ({
    ...activity,
    ...(activity.prior_unallowed_operating > 0
      ? {
        prior_year_8582_source: {
          tax_year: 2024,
          activity_id: activity.activity_id,
          filed_part_vii_column_c: activity.prior_unallowed_operating,
          source_document_reference:
            `2024 filed Form 8582 Part VII, ${activity.activity_id}`,
        },
      }
      : {}),
  }));
  return form8582.build({ ...input, activities }, {
    pending: {
      schedule_e: {
        schedule_es: activities.map((activity) => ({
          tsj: "T",
          activity_id: activity.activity_id,
          property_description: activity.name,
          property_type: activity.property_type,
          activity_type: activity.activity_type,
          fair_rental_days: 365,
          personal_use_days: 0,
          rent_income: Math.max(0, activity.current_net),
          expense_taxes: Math.max(0, -activity.current_net),
          form_1099_payments_made: false,
          prior_unallowed_passive_operating: activity.prior_unallowed_operating,
          prior_passive_losses_active_when_incurred:
            activity.prior_active_participation,
          prior_year_8582_source: activity.prior_year_8582_source,
        })),
      },
    },
  });
}

Deno.test("Form 8582: absent activity emits no document", () => {
  assertEquals(form8582.build({}), "");
  assertEquals(form8582.build({ modified_agi: 75_000, current_loss: 0 }), "");
});

Deno.test("Form 8582 XML reconciles a retained Part II sale with filed prior operating PAL", () => {
  const sale = {
    activity_id: "rental-retained",
    activity_name: "Retained rental",
    part: "II",
    property_description: "Short-held parcel",
    acquired_on: "2025-01-01",
    sold_on: "2025-06-01",
    gross_sales_price: 9_000,
    cost_or_other_basis: 5_000,
    depreciation_allowed: 0,
    entire_activity_interest_disposed: false,
    buyer_unrelated: true,
    fully_taxable: true,
    installment_method: false,
    disposition_document_reference: "2025 retained parcel closing statement",
  };
  const source = {
    tax_year: 2024,
    activity_id: "rental-retained",
    filed_part_vii_column_c: 3_000,
    source_document_reference: "2024 filed Form 8582 Part VII",
  };
  const fields = {
    activities: [{
      activity_id: "rental-retained",
      name: "Retained rental",
      activity_type: "B",
      property_type: 1,
      reporting_form: "schedule_e",
      current_net: -2_000,
      prior_unallowed_operating: 3_000,
      prior_year_8582_source: source,
      prior_unallowed_4797_part1: 0,
      prior_unallowed_4797_part2: 0,
    }],
    current_loss: 2_000,
    prior_unallowed: 3_000,
    has_other_passive: true,
    has_current_4797_transaction: true,
    current_4797_sale_gains: [{
      activity_id: "rental-retained",
      activity_name: "Retained rental",
      part: "II",
      gain: 4_000,
      entire_activity_interest_disposed: false,
    }],
  };
  const pending = {
    schedule_e: {
      schedule_es: [{
        tsj: "T",
        activity_id: "rental-retained",
        property_description: "Retained rental",
        property_type: 1,
        activity_type: "B",
        fair_rental_days: 365,
        personal_use_days: 0,
        rent_income: 0,
        form_1099_payments_made: false,
        expense_taxes: 2_000,
        disposed_of: true,
        passive_property_sales: [sale],
        prior_unallowed_passive_operating: 3_000,
        prior_year_8582_source: source,
      }],
    },
    form4797: { passive_property_sales: [sale] },
  };
  const xml = form8582.build(fields, { pending });
  assertStringIncludes(
    xml,
    "<OtherActivityIncomeAmt>4000</OtherActivityIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<PriorYearUnallowedOtherLossAmt>3000</PriorYearUnallowedOtherLossAmt>",
  );
  assertThrows(
    () =>
      form8582.build({
        ...fields,
        current_4797_sale_gains: [{
          ...fields.current_4797_sale_gains[0],
          entire_activity_interest_disposed: undefined,
        }],
      }, { pending }),
    Error,
    "disposition review",
  );
});

Deno.test("Form 8582 XML puts active retained-sale PAL on Part IV with phased allowance", () => {
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
      prior_active_participation: true,
      prior_year_8582_source: prior,
      prior_unallowed_4797_part1: 0,
      prior_unallowed_4797_part2: 0,
    }],
    current_loss: 5_000,
    rental_current_loss: 5_000,
    prior_unallowed: 8_000,
    rental_prior_eligible_loss: 8_000,
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
  };
  const xml = form8582.build(fields, { pending });
  assertStringIncludes(
    xml,
    "<RentalRealtyIncomeAmt>3000</RentalRealtyIncomeAmt>",
  );
  assertStringIncludes(xml, "<RentalRealtyLossAmt>5000</RentalRealtyLossAmt>");
  assertStringIncludes(
    xml,
    "<PYUnallowedRentalLossAmt>8000</PYUnallowedRentalLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>5000</AllowedRentalRealtyLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalLossesAllowedAmt>8000</TotalLossesAllowedAmt>",
  );
  assertThrows(
    () =>
      form8582.build(fields, {
        pending: {
          ...pending,
          schedule_e: {
            schedule_es: [{
              ...pending.schedule_e.schedule_es[0],
              prior_passive_losses_active_when_incurred: false,
            }],
          },
        },
      }),
    Error,
    "section 469(g) review",
  );
});

Deno.test("Form 8582 joins multiple current Form 4797 sales by exact source facts, not row order", () => {
  const firstSale = {
    activity_id: "multi-sale",
    activity_name: "Multi sale rental",
    part: "II" as const,
    property_description: "Parcel A",
    acquired_on: "2025-01-01",
    sold_on: "2025-06-01",
    gross_sales_price: 1_500,
    cost_or_other_basis: 1_000,
    depreciation_allowed: 0 as const,
  };
  const secondSale = {
    ...firstSale,
    property_description: "Parcel B",
    gross_sales_price: 1_700,
  };
  const fields = {
    activities: [{
      activity_id: "multi-sale",
      name: "Multi sale rental",
      activity_type: "B",
      property_type: 1,
      reporting_form: "schedule_e",
      current_net: -2_000,
      prior_unallowed_operating: 0,
      prior_unallowed_4797_part1: 0,
      prior_unallowed_4797_part2: 0,
    }],
    current_loss: 2_000,
    has_other_passive: true,
    has_current_4797_transaction: true,
    current_4797_sale_gains: [
      {
        activity_id: "multi-sale",
        activity_name: "Multi sale rental",
        part: "II",
        gain: 500,
      },
      {
        activity_id: "multi-sale",
        activity_name: "Multi sale rental",
        part: "II",
        gain: 700,
      },
    ],
  };
  const pending = {
    schedule_e: {
      schedule_es: [{
        tsj: "T",
        activity_id: "multi-sale",
        property_description: "Multi sale rental",
        property_type: 1,
        activity_type: "B",
        fair_rental_days: 365,
        personal_use_days: 0,
        form_1099_payments_made: false,
        rent_income: 0,
        expense_taxes: 2_000,
        disposed_of: true,
        passive_property_sales: [firstSale, secondSale],
      }],
    },
    form4797: { passive_property_sales: [secondSale, firstSale] },
  };
  const xml = form8582.build(fields, { pending });
  assertStringIncludes(
    xml,
    "<OtherActivityIncomeAmt>1200</OtherActivityIncomeAmt>",
  );
  assertThrows(
    () =>
      form8582.build(fields, {
        pending: {
          ...pending,
          form4797: {
            passive_property_sales: [
              { ...secondSale, gross_sales_price: 1_600 },
              { ...firstSale, gross_sales_price: 1_600 },
            ],
          },
        },
      }),
    Error,
    "do not match property-sale sources",
  );
  assertThrows(
    () =>
      form8582.build(fields, {
        pending: {
          ...pending,
          form4797: { passive_property_sales: [firstSale, firstSale] },
        },
      }),
    Error,
    "do not match property-sale sources",
  );
});

Deno.test("Form 8582: aggregate losses cannot create invented MeF XML", () => {
  assertThrows(
    () =>
      form8582.build({ current_loss: 8_000 }, {
        pending: { schedule_e: { schedule_es: [] } },
      }),
    Error,
    "requires per-activity",
  );
});

Deno.test("Form 8582: rental classification alone is insufficient", () => {
  assertThrows(
    () =>
      form8582.build({ rental_current_loss: 8_000, has_active_rental: true }, {
        pending: { schedule_e: { schedule_es: [] } },
      }),
    Error,
    "requires per-activity",
  );
});

Deno.test("Form 8582: MFS lived apart prints the $75,000 phaseout and $7,500 allowance", () => {
  const input = {
    activities: [{
      activity_id: "id-Rental home",
      name: "Rental home",
      activity_type: "A" as const,
      property_type: 1,
      reporting_form: "schedule_e" as const,
      current_net: -20_000,
      prior_unallowed_operating: 0,
      prior_unallowed_4797_part1: 0,
      prior_unallowed_4797_part2: 0,
    }],
    current_loss: 20_000,
    rental_current_loss: 20_000,
    has_active_rental: true,
    active_participation: true,
    filing_status: "mfs" as const,
    mfs_lived_apart_all_year: true,
    modified_agi: 60_000,
  };
  const context = {
    pending: {
      general: {
        filing_status: "mfs",
        mfs_spouse_lived_with_taxpayer: false,
      },
      schedule_e: {
        schedule_es: [{
          tsj: "T",
          activity_id: "id-Rental home",
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
    },
  };
  const xml = form8582.build(input, context);
  assertStringIncludes(
    xml,
    "<MaximumAllowedIncomeAmt>75000</MaximumAllowedIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<PercentNetSpecialAllowanceAmt>7500</PercentNetSpecialAllowanceAmt>",
  );
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>7500</AllowedRentalRealtyLossAmt>",
  );
  const belowPhaseout = form8582.build({
    ...input,
    modified_agi: 50_000,
  }, context);
  assertStringIncludes(
    belowPhaseout,
    "<AllowedRentalRealtyLossAmt>12500</AllowedRentalRealtyLossAmt>",
  );
  const afterPhaseout = form8582.build({
    ...input,
    modified_agi: 75_000,
  }, context);
  assertStringIncludes(
    afterPhaseout,
    "<AllowedRentalRealtyLossAmt>0</AllowedRentalRealtyLossAmt>",
  );
  assertThrows(
    () =>
      form8582.build({
        ...input,
        activities: [{ ...input.activities[0], activity_id: "other-rental" }],
      }, context),
    Error,
    "activities do not match",
  );
  assertThrows(
    () =>
      form8582.build({ ...input, mfs_lived_apart_all_year: false }, context),
    Error,
    "requires per-activity allocation",
  );
  assertThrows(
    () =>
      form8582.build(input, {
        pending: {
          ...context.pending,
          general: {
            filing_status: "mfs",
            mfs_spouse_lived_with_taxpayer: true,
          },
        },
      }),
    Error,
  );
});

Deno.test("Form 8582: prior-year suspended losses require activity allocation", () => {
  assertThrows(
    () =>
      form8582.build({ prior_unallowed: 2_000 }, {
        pending: { schedule_e: { schedule_es: [] } },
      }),
    Error,
    "needs activity rows",
  );
});

Deno.test("Form 8582 MeF joins filed prior balance to its Schedule E activity", () => {
  const source = {
    tax_year: 2024,
    activity_id: "rental-7",
    filed_part_vii_column_c: 500,
    source_document_reference: "2024 filed Form 8582 Part VII, rental-7",
  };
  const fields = {
    activities: [{
      activity_id: "rental-7",
      name: "Renamed rental",
      activity_type: "B",
      property_type: 1,
      reporting_form: "schedule_e",
      current_net: 1_000,
      prior_unallowed_operating: 500,
      prior_unallowed_4797_part1: 0,
      prior_unallowed_4797_part2: 0,
      prior_year_8582_source: source,
    }],
    current_income: 1_000,
    prior_unallowed: 500,
    has_other_passive: true,
  };
  const property = {
    tsj: "T",
    activity_id: "rental-7",
    property_description: "Renamed rental",
    property_type: 1,
    activity_type: "B",
    fair_rental_days: 365,
    personal_use_days: 0,
    rent_income: 1_000,
    form_1099_payments_made: false,
    prior_unallowed_passive_operating: 500,
    prior_year_8582_source: source,
  };
  const context = { pending: { schedule_e: { schedule_es: [property] } } };
  const xml = form8582.build(fields, context);
  assertStringIncludes(
    xml,
    "<PriorYearUnallowedOtherLossAmt>500</PriorYearUnallowedOtherLossAmt>",
  );
  assertThrows(() => form8582.build(fields), Error, "linked Schedule E");
  assertThrows(
    () =>
      form8582.build(fields, {
        pending: {
          schedule_e: {
            schedule_es: [{
              ...property,
              prior_year_8582_source: {
                ...source,
                filed_part_vii_column_c: 499,
              },
            }],
          },
        },
      }),
    Error,
    "do not match their Schedule E",
  );
  assertThrows(
    () =>
      form8582.build(fields, {
        pending: {
          schedule_e: {
            schedule_es: [{ ...property, disposed_of: true }],
          },
        },
      }),
    Error,
    "section 469(g) review",
  );
});

Deno.test("Form 8582 rejects prior Form 4797 character and current sale without disposition review", () => {
  const activity = {
    activity_id: "id-Land rental",
    name: "Land rental",
    activity_type: "B",
    property_type: 1,
    reporting_form: "schedule_e",
    current_net: 0,
    prior_unallowed_operating: 1_000,
    prior_unallowed_4797_part1: 3_000,
    prior_unallowed_4797_part2: 1_000,
  };
  const input = {
    activities: [activity],
    prior_unallowed: 5_000,
    has_other_passive: true,
  };
  assertThrows(
    () =>
      form8582.build(input, {
        pending: { schedule_e: { schedule_es: [] } },
      }),
    Error,
    "prior Form 4797 character",
  );
  assertThrows(
    () =>
      form8582.build({
        ...input,
        has_current_4797_transaction: true,
        current_4797_sale_gains: [{
          activity_id: activity.activity_id,
          activity_name: activity.name,
          part: "I",
          gain: 1_000,
        }],
      }, { pending: { schedule_e: { schedule_es: [] } } }),
    Error,
    "disposition review",
  );
});

const singleRental = {
  activities: [{
    activity_id: "id-Rental house",
    name: "Rental house",
    activity_type: "A",
    property_type: 1,
    current_net: -8_000,
    prior_unallowed_operating: 0,
    prior_unallowed_4797_part1: 0,
    prior_unallowed_4797_part2: 0,
  }],
  current_loss: 8_000,
  rental_current_loss: 8_000,
  has_active_rental: true,
  active_participation: true,
  modified_agi: 75_000,
  filing_status: "single",
};

Deno.test("Form 8582 active direct MeF cannot omit its Schedule E source", () => {
  assertThrows(
    () => form8582.build(singleRental),
    Error,
    "active filing needs linked Schedule E or Form 4835 source context",
  );
});

Deno.test("Form 8582: fully allowed active rental reconciles Part I, II and worksheets", () => {
  const xml = buildWithCurrentScheduleE(singleRental);
  assertStringIncludes(xml, "<RentalRealtyLossAmt>8000</RentalRealtyLossAmt>");
  assertStringIncludes(xml, "<NetRentalRealtyAmt>-8000</NetRentalRealtyAmt>");
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>8000</AllowedRentalRealtyLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<WrkshtRentalActGrp><PassiveActivityNm>Rental house</PassiveActivityNm>",
  );
  assertStringIncludes(xml, "<LossesPct>1.00000</LossesPct>");
});

Deno.test("Form 8582: partially suspended rental allocates allowed and carried losses", () => {
  const xml = buildWithCurrentScheduleE({
    ...singleRental,
    modified_agi: 140_000,
  });
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>5000</AllowedRentalRealtyLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetSpecialAllowanceAmt>3000</NetSpecialAllowanceAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>3000</TotalUnallowedLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<F8582WrkshtAllowedLossesAmt>5000</F8582WrkshtAllowedLossesAmt>",
  );
});

Deno.test("Form 8582: zero special allowance carries the whole rental loss", () => {
  const xml = buildWithCurrentScheduleE({
    ...singleRental,
    modified_agi: 150_000,
  });
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>0</AllowedRentalRealtyLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>8000</TotalUnallowedLossAmt>",
  );
  assertEquals(xml.includes("<ParentWrkshtAllowanceGrp>"), false);
});

Deno.test("Form 8582: multiple fully allowed rentals allocate exact worksheet ratios", () => {
  const second = {
    ...singleRental.activities[0],
    activity_id: "id-Second house",
    name: "Second house",
    current_net: -16_000,
  };
  const xml = buildWithCurrentScheduleE({
    ...singleRental,
    activities: [singleRental.activities[0], second],
    current_loss: 24_000,
    rental_current_loss: 24_000,
  });
  assertStringIncludes(xml, "<RentalRealtyLossAmt>24000</RentalRealtyLossAmt>");
  assertStringIncludes(xml, "<LossesPct>0.33333</LossesPct>");
  assertStringIncludes(xml, "<LossesPct>0.66667</LossesPct>");
  assertEquals(xml.match(/<WrkshtRentalActGrp>/g)?.length, 2);
  assertEquals(xml.match(/<WrkshtAllowanceGrp>/g)?.length, 2);
});

Deno.test("Form 8582: eligible prior rental operating loss appears on line 1c", () => {
  const xml = buildWithFiledPriorOperating({
    ...singleRental,
    activities: [{
      ...singleRental.activities[0],
      prior_unallowed_operating: 3_000,
      prior_active_participation: true,
    }],
    prior_unallowed: 3_000,
    rental_prior_eligible_loss: 3_000,
  });
  assertStringIncludes(xml, "<RentalRealtyLossAmt>8000</RentalRealtyLossAmt>");
  assertStringIncludes(
    xml,
    "<PYUnallowedRentalLossAmt>3000</PYUnallowedRentalLossAmt>",
  );
  assertStringIncludes(xml, "<NetRentalRealtyAmt>-11000</NetRentalRealtyAmt>");
  assertStringIncludes(
    xml,
    "<PriorYearRentalUnallowedAmt>3000</PriorYearRentalUnallowedAmt>",
  );
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>11000</AllowedRentalRealtyLossAmt>",
  );
});

Deno.test("Form 8582: prior loss without past active participation moves to Part V", () => {
  const xml = buildWithFiledPriorOperating({
    ...singleRental,
    activities: [{
      ...singleRental.activities[0],
      prior_unallowed_operating: 3_000,
      prior_active_participation: false,
    }],
    prior_unallowed: 3_000,
    has_other_passive: true,
  });
  assertStringIncludes(xml, "<RentalRealtyLossAmt>8000</RentalRealtyLossAmt>");
  assertStringIncludes(
    xml,
    "<PriorYearUnallowedOtherLossAmt>3000</PriorYearUnallowedOtherLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<PriorYearUnallowedLossesAmt>3000</PriorYearUnallowedLossesAmt>",
  );
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>8000</AllowedRentalRealtyLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>3000</TotalUnallowedLossAmt>",
  );
  assertEquals(xml.includes("<PriorYearRentalUnallowedAmt>"), false);
});

Deno.test("Form 8582: rental profit offsets prior loss before special allowance", () => {
  const xml = buildWithFiledPriorOperating({
    ...singleRental,
    activities: [{
      ...singleRental.activities[0],
      current_net: 5_000,
      prior_unallowed_operating: 8_000,
      prior_active_participation: true,
    }],
    current_income: 5_000,
    rental_current_income: 5_000,
    current_loss: 0,
    rental_current_loss: 0,
    prior_unallowed: 8_000,
    rental_prior_eligible_loss: 8_000,
    modified_agi: 140_000,
  });
  assertStringIncludes(
    xml,
    "<RentalRealtyIncomeAmt>5000</RentalRealtyIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<PYUnallowedRentalLossAmt>8000</PYUnallowedRentalLossAmt>",
  );
  assertStringIncludes(xml, "<NetRentalRealtyAmt>-3000</NetRentalRealtyAmt>");
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>3000</AllowedRentalRealtyLossAmt>",
  );
  assertStringIncludes(xml, "<TotalIncomeAmt>5000</TotalIncomeAmt>");
  assertStringIncludes(
    xml,
    "<TotalLossesAllowedAmt>8000</TotalLossesAllowedAmt>",
  );
  assertStringIncludes(xml, "<OverallLossAmt>3000</OverallLossAmt>");
});

Deno.test("Form 8582: profitable rental releases part of another rental loss", () => {
  const xml = buildWithCurrentScheduleE({
    ...singleRental,
    activities: [
      {
        ...singleRental.activities[0],
        activity_id: "id-Rental profit",
        name: "Rental profit",
        current_net: 10_000,
      },
      {
        ...singleRental.activities[0],
        activity_id: "id-Rental loss",
        name: "Rental loss",
        current_net: -20_000,
      },
    ],
    current_income: 10_000,
    rental_current_income: 10_000,
    current_loss: 20_000,
    rental_current_loss: 20_000,
    modified_agi: 140_000,
  });
  assertStringIncludes(
    xml,
    "<RentalRealtyLossLimitAmt>10000</RentalRealtyLossLimitAmt>",
  );
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>5000</AllowedRentalRealtyLossAmt>",
  );
  assertStringIncludes(xml, "<TotalIncomeAmt>10000</TotalIncomeAmt>");
  assertStringIncludes(
    xml,
    "<TotalLossesAllowedAmt>15000</TotalLossesAllowedAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>5000</TotalUnallowedLossAmt>",
  );
  assertStringIncludes(xml, "<OverallGainAmt>10000</OverallGainAmt>");
});

Deno.test("Form 8582: overall rental gain releases prior loss without Part II", () => {
  const xml = buildWithFiledPriorOperating({
    ...singleRental,
    activities: [{
      ...singleRental.activities[0],
      current_net: 10_000,
      prior_unallowed_operating: 8_000,
      prior_active_participation: true,
    }],
    current_income: 10_000,
    rental_current_income: 10_000,
    current_loss: 0,
    rental_current_loss: 0,
    prior_unallowed: 8_000,
    rental_prior_eligible_loss: 8_000,
    modified_agi: 145_000,
  });
  assertStringIncludes(xml, "<NetRentalRealtyAmt>2000</NetRentalRealtyAmt>");
  assertStringIncludes(xml, "<OverallGainAmt>2000</OverallGainAmt>");
  assertEquals(xml.includes("<RentalRealtyLossLimitAmt>"), false);
  assertEquals(xml.includes("<ParentWrkshtAllowanceGrp>"), false);
});

const otherPassive = {
  activities: [{
    activity_id: "id-Passive rental",
    name: "Passive rental",
    activity_type: "B",
    property_type: 1,
    current_net: -10_000,
    prior_unallowed_operating: 0,
    prior_unallowed_4797_part1: 0,
    prior_unallowed_4797_part2: 0,
  }],
  current_loss: 10_000,
  has_other_passive: true,
  filing_status: "single",
};

Deno.test("Form 8582: other passive rental loss uses Part V without special allowance", () => {
  const xml = buildWithCurrentScheduleE(otherPassive);
  assertStringIncludes(
    xml,
    "<OtherActivityLossAmt>10000</OtherActivityLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetOtherActivityAmt>-10000</NetOtherActivityAmt>",
  );
  assertStringIncludes(
    xml,
    "<WrkshtPassiveGrp><NonParticipateActivityNm>Passive rental</NonParticipateActivityNm>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>10000</TotalUnallowedLossAmt>",
  );
  assertEquals(xml.includes("<ParentWrkshtAllowanceGrp>"), false);
  assertEquals(xml.includes("<RentalRealtyLossLimitAmt>"), false);
});

Deno.test("Form 8582: other passive profit releases another rental's current and prior loss", () => {
  const xml = buildWithFiledPriorOperating({
    ...otherPassive,
    activities: [
      {
        ...otherPassive.activities[0],
        activity_id: "id-Profit rental",
        name: "Profit rental",
        current_net: 6_000,
      },
      {
        ...otherPassive.activities[0],
        activity_id: "id-Loss rental",
        name: "Loss rental",
        current_net: -10_000,
        prior_unallowed_operating: 2_000,
      },
    ],
    current_income: 6_000,
    prior_unallowed: 2_000,
  });
  assertStringIncludes(
    xml,
    "<OtherActivityIncomeAmt>6000</OtherActivityIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<PriorYearUnallowedOtherLossAmt>2000</PriorYearUnallowedOtherLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalLossesAllowedAmt>6000</TotalLossesAllowedAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>6000</TotalUnallowedLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<F8582WrkshtAllowedLossesAmt>6000</F8582WrkshtAllowedLossesAmt>",
  );
});

Deno.test("Form 8582: mixed Part IV and V gives special allowance only to active rental", () => {
  const xml = buildWithCurrentScheduleE({
    ...singleRental,
    activities: [
      singleRental.activities[0],
      { ...otherPassive.activities[0], name: "Other passive rental" },
    ],
    current_loss: 18_000,
    rental_current_loss: 8_000,
    has_other_passive: true,
  });
  assertStringIncludes(xml, "<NetRentalRealtyAmt>-8000</NetRentalRealtyAmt>");
  assertStringIncludes(
    xml,
    "<NetOtherActivityAmt>-10000</NetOtherActivityAmt>",
  );
  assertStringIncludes(
    xml,
    "<RentalRealtyLossLimitAmt>8000</RentalRealtyLossLimitAmt>",
  );
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>8000</AllowedRentalRealtyLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<WrkshtRentalActGrp><PassiveActivityNm>Rental house</PassiveActivityNm>",
  );
  assertStringIncludes(
    xml,
    "<WrkshtPassiveGrp><NonParticipateActivityNm>Other passive rental</NonParticipateActivityNm>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>10000</TotalUnallowedLossAmt>",
  );
  assertEquals(xml.match(/<WrkshtAllowanceGrp>/g)?.length, 1);
  assertEquals(xml.match(/<WrkshtLossGrp>/g)?.length, 1);
});

Deno.test("Form 8582: mixed losses share passive income and remaining suspension", () => {
  const xml = buildWithCurrentScheduleE({
    ...singleRental,
    activities: [
      { ...singleRental.activities[0], current_net: -30_000 },
      {
        ...otherPassive.activities[0],
        activity_id: "id-Other loss",
        name: "Other loss",
        current_net: -20_000,
      },
      {
        ...otherPassive.activities[0],
        activity_id: "id-Other profit",
        name: "Other profit",
        current_net: 10_000,
      },
    ],
    current_income: 10_000,
    current_loss: 50_000,
    rental_current_loss: 30_000,
    modified_agi: 120_000,
    has_other_passive: true,
  });
  assertStringIncludes(
    xml,
    "<TotalLossesAllowedAmt>25000</TotalLossesAllowedAmt>",
  );
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>15000</AllowedRentalRealtyLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>25000</TotalUnallowedLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetOtherActivityAmt>-10000</NetOtherActivityAmt>",
  );
  assertEquals(xml.match(/<WrkshtAllowanceGrp>/g)?.length, 1);
  assertEquals(xml.match(/<WrkshtLossGrp>/g)?.length, 2);
});

Deno.test("Form 8582: active rental profit cannot give Part V loss a special allowance", () => {
  const xml = buildWithCurrentScheduleE({
    ...singleRental,
    activities: [
      { ...singleRental.activities[0], current_net: 10_000 },
      { ...otherPassive.activities[0], current_net: -20_000 },
    ],
    current_income: 10_000,
    rental_current_income: 10_000,
    current_loss: 20_000,
    rental_current_loss: 0,
    has_other_passive: true,
  });
  assertStringIncludes(xml, "<NetRentalRealtyAmt>10000</NetRentalRealtyAmt>");
  assertStringIncludes(
    xml,
    "<TotalLossesAllowedAmt>10000</TotalLossesAllowedAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>10000</TotalUnallowedLossAmt>",
  );
  assertEquals(xml.includes("<RentalRealtyLossLimitAmt>"), false);
  assertEquals(xml.includes("<ParentWrkshtAllowanceGrp>"), false);
});

Deno.test("Form 8582: other passive overall gain releases prior loss", () => {
  const xml = buildWithFiledPriorOperating({
    ...otherPassive,
    activities: [{
      ...otherPassive.activities[0],
      current_net: 10_000,
      prior_unallowed_operating: 8_000,
    }],
    current_income: 10_000,
    current_loss: 0,
    prior_unallowed: 8_000,
  });
  assertStringIncludes(xml, "<NetOtherActivityAmt>2000</NetOtherActivityAmt>");
  assertStringIncludes(xml, "<OverallGainAmt>2000</OverallGainAmt>");
  assertEquals(xml.includes("<ParentWrkshtLossGrp>"), false);
});
