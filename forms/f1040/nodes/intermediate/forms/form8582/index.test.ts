import { assertEquals, assertThrows } from "@std/assert";
import {
  allocateOtherPassivePrior4797,
  allocatePartIXLosses,
  allocatePassiveActivityLosses,
  allocateRentalLosses,
  form8582,
  inputSchema,
} from "./index.ts";
import { FilingStatus } from "../../../types.ts";

function compute(input: Record<string, unknown>) {
  return form8582.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(input),
  );
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

Deno.test("rental allocation preserves allowed total and stable largest remainders", () => {
  assertEquals(allocateRentalLosses([10_000, 20_000], 25_000), [8_333, 16_667]);
  assertEquals(allocateRentalLosses([1, 1, 1], 2), [1, 1, 0]);
  assertEquals(allocateRentalLosses([5_000, 5_000], 0), [0, 0]);
  assertThrows(() => allocateRentalLosses([100, 200], 301));
});

Deno.test("Form 8582 joins prior operating PAL to filed 2024 Part VII by durable activity", () => {
  const activity = {
    activity_id: "rental-7",
    name: "Renamed rental",
    activity_type: "B",
    property_type: 1,
    reporting_form: "schedule_e",
    current_net: 4_000,
    prior_unallowed_operating: 2_000,
    prior_unallowed_4797_part1: 0,
    prior_unallowed_4797_part2: 0,
    prior_year_8582_source: {
      tax_year: 2024,
      activity_id: "rental-7",
      filed_part_vii_column_c: 2_000,
      source_document_reference: "2024 filed Form 8582 Part VII, rental-7",
    },
  };
  const input = {
    activities: [activity],
    current_income: 4_000,
    prior_unallowed: 2_000,
    has_other_passive: true,
  };
  const result = compute(input);
  assertEquals(
    findOutput(result, "schedule1")?.fields.line5_schedule_e,
    -2_000,
  );
  assertThrows(
    () =>
      compute({
        ...input,
        activities: [{ ...activity, prior_year_8582_source: undefined }],
      }),
    Error,
    "filed 2024 Part VII evidence",
  );
  assertThrows(
    () =>
      compute({
        ...input,
        activities: [{
          ...activity,
          prior_year_8582_source: {
            ...activity.prior_year_8582_source,
            filed_part_vii_column_c: 1_999,
          },
        }],
      }),
    Error,
    "filed 2024 Part VII evidence",
  );
  assertThrows(
    () => compute({ ...input, has_current_4797_transaction: true }),
    Error,
    "disposition review",
  );
});

Deno.test("Form 8582 applies a sourced prior operating PAL against one retained Part II sale", () => {
  const input = {
    activities: [{
      activity_id: "rental-retained",
      name: "Retained rental",
      activity_type: "B",
      property_type: 1,
      reporting_form: "schedule_e",
      current_net: -2_000,
      prior_unallowed_operating: 3_000,
      prior_unallowed_4797_part1: 0,
      prior_unallowed_4797_part2: 0,
      prior_year_8582_source: {
        tax_year: 2024,
        activity_id: "rental-retained",
        filed_part_vii_column_c: 3_000,
        source_document_reference: "2024 filed Form 8582 Part VII",
      },
    }],
    current_income: 0,
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
  const result = compute(input);
  assertEquals(
    findOutput(result, "schedule1")?.fields.line5_schedule_e,
    -4_000,
  );
  assertEquals(
    result.carryforwards?.["suspended_pal_8582:rental-retained"],
    1_000,
  );
  assertThrows(
    () =>
      compute({
        ...input,
        current_4797_sale_gains: [{
          ...input.current_4797_sale_gains[0],
          entire_activity_interest_disposed: undefined,
        }],
      }),
    Error,
    "disposition review",
  );
});

Deno.test("Form 8582 Part IV limits active-rental PAL after a retained Part II property gain", () => {
  const activity = {
    activity_id: "active-retained",
    name: "Active retained rental",
    activity_type: "A",
    property_type: 1,
    reporting_form: "schedule_e",
    current_net: -5_000,
    prior_unallowed_operating: 8_000,
    prior_active_participation: true,
    prior_unallowed_4797_part1: 0,
    prior_unallowed_4797_part2: 0,
    prior_year_8582_source: {
      tax_year: 2024,
      activity_id: "active-retained",
      filed_part_vii_column_c: 8_000,
      source_document_reference: "2024 filed Form 8582 Part VII",
    },
  };
  const sale = {
    activity_id: activity.activity_id,
    activity_name: activity.name,
    part: "II",
    gain: 3_000,
    entire_activity_interest_disposed: false,
  };
  const input = {
    activities: [activity],
    current_loss: 5_000,
    rental_current_loss: 5_000,
    prior_unallowed: 8_000,
    rental_prior_eligible_loss: 8_000,
    has_active_rental: true,
    active_participation: true,
    filing_status: FilingStatus.Single,
    modified_agi: 140_000,
    has_current_4797_transaction: true,
    current_4797_sale_gains: [sale],
  };
  const result = compute(input);
  assertEquals(
    findOutput(result, "schedule1")?.fields.line5_schedule_e,
    -8_000,
  );
  assertEquals(
    result.carryforwards?.["suspended_pal_8582:active-retained"],
    5_000,
  );
  assertEquals(result.carryforwards?.suspended_pal_8582, 5_000);
  for (
    const changed of [
      {
        activities: [{ ...activity, prior_active_participation: false }],
        rental_prior_eligible_loss: 0,
      },
      { active_participation: false },
      { modified_agi: undefined },
      {
        current_4797_sale_gains: [{
          ...sale,
          entire_activity_interest_disposed: undefined,
        }],
      },
    ]
  ) {
    assertThrows(
      () => compute({ ...input, ...changed }),
      Error,
      "disposition review",
    );
  }
});

Deno.test("Form 8582 allows all operating PAL on a sourced entire sale with overall gain", () => {
  const input = {
    activities: [{
      activity_id: "entire-gain-rental",
      name: "Entire gain rental",
      activity_type: "B",
      property_type: 1,
      reporting_form: "schedule_e",
      current_net: -2_000,
      prior_unallowed_operating: 8_000,
      prior_unallowed_4797_part1: 0,
      prior_unallowed_4797_part2: 0,
      prior_year_8582_source: {
        tax_year: 2024,
        activity_id: "entire-gain-rental",
        filed_part_vii_column_c: 8_000,
        source_document_reference: "2024 filed Form 8582 Part VII",
      },
    }],
    current_loss: 2_000,
    prior_unallowed: 8_000,
    has_other_passive: true,
    has_current_4797_transaction: true,
    current_4797_sale_gains: [{
      activity_id: "entire-gain-rental",
      activity_name: "Entire gain rental",
      part: "II",
      gain: 15_000,
      entire_activity_interest_disposed: true,
    }],
  };
  const result = compute(input);
  assertEquals(
    findOutput(result, "schedule1")?.fields.line5_schedule_e,
    -10_000,
  );
  assertEquals(result.carryforwards, undefined);
  assertThrows(
    () =>
      compute({
        ...input,
        current_4797_sale_gains: [{
          ...input.current_4797_sale_gains[0],
          gain: 10_000,
        }],
      }),
    Error,
    "disposition review",
  );
});

Deno.test("Form 8582 Part IV releases an active rental operating PAL on sourced entire-sale overall gain", () => {
  const activity = {
    activity_id: "active-entire-gain",
    name: "Active entire rental",
    activity_type: "A",
    property_type: 1,
    reporting_form: "schedule_e",
    current_net: -2_000,
    prior_unallowed_operating: 8_000,
    prior_unallowed_4797_part1: 0,
    prior_unallowed_4797_part2: 0,
    prior_active_participation: true,
    prior_year_8582_source: {
      tax_year: 2024,
      activity_id: "active-entire-gain",
      filed_part_vii_column_c: 8_000,
      source_document_reference: "2024 filed Form 8582 Part VII",
    },
  };
  const input = {
    activities: [activity],
    current_loss: 2_000,
    rental_current_loss: 2_000,
    rental_prior_eligible_loss: 8_000,
    prior_unallowed: 8_000,
    has_active_rental: true,
    active_participation: true,
    has_current_4797_transaction: true,
    current_4797_sale_gains: [{
      activity_id: activity.activity_id,
      activity_name: activity.name,
      part: "II",
      gain: 15_000,
      entire_activity_interest_disposed: true,
    }],
  };
  const result = compute(input);
  assertEquals(
    findOutput(result, "schedule1")?.fields.line5_schedule_e,
    -10_000,
  );
  assertEquals(result.carryforwards, undefined);
  assertThrows(
    () =>
      compute({
        ...input,
        activities: [{ ...activity, prior_active_participation: false }],
        rental_prior_eligible_loss: 0,
      }),
    Error,
    "disposition review",
  );
});

Deno.test("Part IX keeps prior Form 4797 Parts I and II separate from Schedule E", () => {
  assertEquals(
    allocatePartIXLosses([
      {
        reportingForm: "Schedule E, line 22",
        lossIncludingPrior: 4_000,
        currentSamePartGain: 0,
      },
      {
        reportingForm: "Form 4797, Part I",
        lossIncludingPrior: 6_000,
        currentSamePartGain: 1_000,
      },
      {
        reportingForm: "Form 4797, Part II",
        lossIncludingPrior: 3_000,
        currentSamePartGain: 0,
      },
    ], 6_000),
    [
      {
        reportingForm: "Schedule E, line 22",
        lossIncludingPrior: 4_000,
        currentSamePartGain: 0,
        netLoss: 4_000,
        suspended: 2_000,
        allowed: 2_000,
      },
      {
        reportingForm: "Form 4797, Part I",
        lossIncludingPrior: 6_000,
        currentSamePartGain: 1_000,
        netLoss: 5_000,
        suspended: 2_500,
        allowed: 3_500,
      },
      {
        reportingForm: "Form 4797, Part II",
        lossIncludingPrior: 3_000,
        currentSamePartGain: 0,
        netLoss: 3_000,
        suspended: 1_500,
        allowed: 1_500,
      },
    ],
  );
});

Deno.test("Part IX same-part gain offsets a prior Form 4797 loss before suspension", () => {
  assertEquals(
    allocatePartIXLosses([
      {
        reportingForm: "Form 4797, Part I",
        lossIncludingPrior: 2_000,
        currentSamePartGain: 3_000,
      },
      {
        reportingForm: "Form 4797, Part II",
        lossIncludingPrior: 5_000,
        currentSamePartGain: 0,
      },
    ], 4_000),
    [
      {
        reportingForm: "Form 4797, Part I",
        lossIncludingPrior: 2_000,
        currentSamePartGain: 3_000,
        netLoss: 0,
        suspended: 0,
        allowed: 2_000,
      },
      {
        reportingForm: "Form 4797, Part II",
        lossIncludingPrior: 5_000,
        currentSamePartGain: 0,
        netLoss: 5_000,
        suspended: 4_000,
        allowed: 1_000,
      },
    ],
  );
  assertThrows(() =>
    allocatePartIXLosses([
      {
        reportingForm: "Form 4797, Part I",
        lossIncludingPrior: 2_000,
        currentSamePartGain: 3_000,
      },
    ], 1)
  );
});

Deno.test("prior Form 4797 PAL reaches Schedule 1 line 4 while operating PAL stays on line 5", () => {
  const input = {
    activities: [
      {
        activity_id: "id-Rental A",
        name: "Rental A",
        activity_type: "B",
        property_type: 1,
        reporting_form: "schedule_e",
        current_net: 0,
        prior_unallowed_operating: 2_000,
        prior_unallowed_4797_part1: 6_000,
        prior_unallowed_4797_part2: 2_000,
        prior_year_8582_source: {
          tax_year: 2024,
          activity_id: "id-Rental A",
          filed_part_vii_column_c: 10_000,
          source_document_reference: "2024 filed Form 8582 Part IX, Rental A",
          filed_part_ix_rows: [
            { reporting_form: "schedule_e", filed_unallowed_loss: 2_000 },
            { reporting_form: "form4797_part1", filed_unallowed_loss: 6_000 },
            { reporting_form: "form4797_part2", filed_unallowed_loss: 2_000 },
          ],
        },
      },
      {
        activity_id: "id-Rental B",
        name: "Rental B",
        activity_type: "B",
        property_type: 1,
        reporting_form: "schedule_e",
        current_net: 4_000,
        prior_unallowed_operating: 0,
        prior_unallowed_4797_part1: 0,
        prior_unallowed_4797_part2: 0,
      },
    ],
    current_income: 4_000,
    prior_unallowed: 10_000,
    has_other_passive: true,
  };
  const ledger = allocateOtherPassivePrior4797(inputSchema.parse(input));
  assertEquals(ledger.allowedOperating, 800);
  assertEquals(ledger.allowedPartI, 2_400);
  assertEquals(ledger.allowedPartII, 800);
  assertEquals(ledger.suspendedTotal, 6_000);
  const result = compute(input);
  assertEquals(
    findOutput(result, "schedule1")?.fields.line4_other_gains,
    -3_200,
  );
  assertEquals(findOutput(result, "schedule1")?.fields.line5_schedule_e, -800);
  assertEquals(result.carryforwards?.["suspended_pal_8582:id-Rental A"], 6_000);
  assertEquals(
    result.carryforwards
      ?.["suspended_pal_8582_partix:id-Rental%20A:schedule_e"],
    1_200,
  );
  assertEquals(
    result.carryforwards
      ?.["suspended_pal_8582_partix:id-Rental%20A:form4797_part1"],
    3_600,
  );
  assertEquals(
    result.carryforwards
      ?.["suspended_pal_8582_partix:id-Rental%20A:form4797_part2"],
    1_200,
  );
  assertThrows(
    () =>
      compute({
        ...input,
        activities: [{
          ...input.activities[0],
          prior_year_8582_source: {
            ...input.activities[0].prior_year_8582_source,
            filed_part_ix_rows: [
              { reporting_form: "schedule_e", filed_unallowed_loss: 2_000 },
              { reporting_form: "form4797_part1", filed_unallowed_loss: 5_000 },
              { reporting_form: "form4797_part2", filed_unallowed_loss: 3_000 },
            ],
          },
        }, input.activities[1]],
      }),
    Error,
    "prior Form 4797 character",
  );
  assertThrows(
    () => compute({ ...input, has_current_4797_transaction: true }),
    Error,
    "disposition review",
  );
});

Deno.test("one-form prior Form 4797 Part VIII loss keeps its reporting character", () => {
  const source = {
    tax_year: 2024 as const,
    activity_id: "rental-part-viii",
    filed_part_vii_column_c: 6_000,
    source_document_reference: "Filed 2024 Form 8582, Rental Part VIII",
    filed_part_viii_row: {
      reporting_form: "form4797_part1" as const,
      filed_unallowed_loss: 6_000,
    },
  };
  const input = {
    activities: [
      {
        activity_id: "rental-part-viii",
        name: "Rental Part VIII",
        activity_type: "B",
        property_type: 1,
        reporting_form: "schedule_e",
        current_net: 0,
        prior_unallowed_operating: 0,
        prior_unallowed_4797_part1: 6_000,
        prior_unallowed_4797_part2: 0,
        prior_year_8582_source: source,
      },
      {
        activity_id: "rental-income",
        name: "Rental Income",
        activity_type: "B",
        property_type: 1,
        reporting_form: "schedule_e",
        current_net: 4_000,
        prior_unallowed_operating: 0,
        prior_unallowed_4797_part1: 0,
        prior_unallowed_4797_part2: 0,
      },
    ],
    current_income: 4_000,
    prior_unallowed: 6_000,
    has_other_passive: true,
  };
  const result = compute(input);
  assertEquals(
    findOutput(result, "schedule1")?.fields.line4_other_gains,
    -4_000,
  );
  assertEquals(
    result.carryforwards?.["suspended_pal_8582:rental-part-viii"],
    2_000,
  );
  assertEquals(
    result.carryforwards?.[
      "suspended_pal_8582_partviii:rental-part-viii:form4797_part1"
    ],
    2_000,
  );
  assertThrows(
    () =>
      compute({
        ...input,
        activities: [{
          ...input.activities[0],
          prior_year_8582_source: {
            ...source,
            filed_part_viii_row: {
              reporting_form: "form4797_part2" as const,
              filed_unallowed_loss: 6_000,
            },
          },
        }, input.activities[1]],
      }),
    Error,
    "prior Form 4797 character",
  );
  assertThrows(
    () =>
      compute({
        ...input,
        activities: [{
          ...input.activities[0],
          prior_unallowed_operating: 1_000,
          prior_year_8582_source: {
            ...source,
            filed_part_vii_column_c: 7_000,
          },
        }, input.activities[1]],
        prior_unallowed: 7_000,
      }),
    Error,
    "prior Form 4797 character",
  );
});

Deno.test("retained passive sale gain releases prior Form 4797 PAL by part", () => {
  const input = {
    activities: [{
      activity_id: "id-Land rental",
      name: "Land rental",
      activity_type: "B",
      property_type: 1,
      reporting_form: "schedule_e",
      current_net: 0,
      prior_unallowed_operating: 1_000,
      prior_unallowed_4797_part1: 3_000,
      prior_unallowed_4797_part2: 1_000,
    }],
    current_income: 0,
    prior_unallowed: 5_000,
    has_other_passive: true,
    has_current_4797_transaction: true,
    current_4797_sale_gains: [
      {
        activity_id: "id-Land rental",
        activity_name: "Land rental",
        part: "I",
        gain: 8_000,
      },
      {
        activity_id: "id-Land rental",
        activity_name: "Land rental",
        part: "II",
        gain: 2_000,
      },
    ],
  };
  const ledger = allocateOtherPassivePrior4797(inputSchema.parse(input));
  assertEquals(ledger.allowedOperating, 1_000);
  assertEquals(ledger.allowedPartI, 3_000);
  assertEquals(ledger.allowedPartII, 1_000);
  assertEquals(ledger.suspendedTotal, 0);
  assertEquals(
    ledger.byActivity[0].partIX.map((line) => line.currentSamePartGain),
    [0, 8_000, 2_000],
  );
  assertThrows(() => compute(input), Error, "disposition review");
});

Deno.test("active-rental Form 4797 PAL uses pre-PAL MAGI and same-part gains", () => {
  const base = {
    activities: [{
      activity_id: "id-Rental house",
      name: "Rental house",
      activity_type: "A",
      property_type: 1,
      reporting_form: "schedule_e",
      current_net: 0,
      prior_unallowed_operating: 1_000,
      prior_active_participation: true,
      prior_unallowed_4797_part1: 3_000,
      prior_unallowed_4797_part2: 1_000,
    }],
    prior_unallowed: 5_000,
    rental_prior_eligible_loss: 5_000,
    has_active_rental: true,
    active_participation: true,
    has_current_4797_transaction: true,
    current_4797_sale_gains: [
      {
        activity_id: "id-Rental house",
        activity_name: "Rental house",
        part: "I",
        gain: 1_000,
      },
      {
        activity_id: "id-Rental house",
        activity_name: "Rental house",
        part: "II",
        gain: 500,
      },
    ],
  };
  const phased = allocateOtherPassivePrior4797(inputSchema.parse({
    ...base,
    modified_agi: 148_000,
  }));
  const phasedOut = allocateOtherPassivePrior4797(inputSchema.parse({
    ...base,
    modified_agi: 200_000,
  }));
  assertEquals(phased.allowedTotal, 2_500);
  assertEquals(phased.suspendedTotal, 2_500);
  assertEquals(phasedOut.allowedTotal, 1_500);
  assertEquals(phasedOut.allowedOperating, 0);
  assertEquals(phasedOut.allowedPartI, 1_000);
  assertEquals(phasedOut.allowedPartII, 500);
  assertThrows(
    () => compute({ ...base, modified_agi: 200_000 }),
    Error,
    "disposition review",
  );
});

Deno.test("active-rental operating loss and property gain stay separate in Part IV", () => {
  const ledger = allocateOtherPassivePrior4797(inputSchema.parse({
    activities: [{
      activity_id: "id-Rental house",
      name: "Rental house",
      activity_type: "A",
      property_type: 1,
      reporting_form: "schedule_e",
      current_net: -1_000,
      prior_unallowed_operating: 0,
      prior_active_participation: true,
      prior_unallowed_4797_part1: 3_000,
      prior_unallowed_4797_part2: 0,
    }],
    current_loss: 1_000,
    rental_current_loss: 1_000,
    prior_unallowed: 3_000,
    rental_prior_eligible_loss: 3_000,
    has_active_rental: true,
    active_participation: true,
    has_current_4797_transaction: true,
    current_4797_sale_gains: [{
      activity_id: "id-Rental house",
      activity_name: "Rental house",
      part: "I",
      gain: 2_000,
    }],
    modified_agi: 200_000,
  }));
  assertEquals(ledger.allowedTotal, 2_000);
  assertEquals(ledger.allowedOperating, 0);
  assertEquals(ledger.allowedPartI, 2_000);
  assertEquals(ledger.suspendedTotal, 2_000);
});

Deno.test("active-rental Part I PAL with sale needs disposition review", () => {
  assertThrows(
    () =>
      compute({
        activities: [{
          activity_id: "id-Rental house",
          name: "Rental house",
          activity_type: "A",
          property_type: 1,
          reporting_form: "schedule_e",
          current_net: 0,
          prior_unallowed_operating: 1_000,
          prior_active_participation: true,
          prior_unallowed_4797_part1: 3_000,
          prior_unallowed_4797_part2: 0,
        }],
        prior_unallowed: 4_000,
        rental_prior_eligible_loss: 4_000,
        has_active_rental: true,
        active_participation: true,
        has_current_4797_transaction: true,
        current_4797_sale_gains: [{
          activity_id: "id-Rental house",
          activity_name: "Rental house",
          part: "I",
          gain: 1_000,
        }],
        modified_agi: 50_000,
      }),
    Error,
    "disposition review",
  );
});

Deno.test("rental activity allocation offsets own profit before distributing shared allowance", () => {
  assertEquals(
    allocatePassiveActivityLosses([
      {
        currentNet: 5_000,
        priorUnallowed: 8_000,
        specialEligible: true,
        priorSpecialEligible: true,
      },
      {
        currentNet: -12_000,
        priorUnallowed: 0,
        specialEligible: true,
        priorSpecialEligible: false,
      },
    ], 15_000),
    {
      allowed: [7_000, 8_000],
      suspended: [1_000, 4_000],
      overallLosses: [3_000, 12_000],
      specialEligibleLosses: [3_000, 12_000],
      specialByActivity: [2_000, 8_000],
      postSpecialLosses: [1_000, 4_000],
    },
  );
});

Deno.test("rental activity allocation distributes unallowed loss by Part VII ratios", () => {
  assertEquals(
    allocatePassiveActivityLosses([
      {
        currentNet: 10_001,
        priorUnallowed: 0,
        specialEligible: true,
        priorSpecialEligible: false,
      },
      {
        currentNet: -10_000,
        priorUnallowed: 0,
        specialEligible: true,
        priorSpecialEligible: false,
      },
      {
        currentNet: -10_000,
        priorUnallowed: 0,
        specialEligible: true,
        priorSpecialEligible: false,
      },
    ], 15_001),
    {
      allowed: [0, 7_500, 7_501],
      suspended: [0, 2_500, 2_499],
      overallLosses: [0, 10_000, 10_000],
      specialEligibleLosses: [0, 10_000, 10_000],
      specialByActivity: [0, 2_500, 2_500],
      postSpecialLosses: [0, 7_500, 7_500],
    },
  );
});

Deno.test("mixed passive allocation excludes Part V losses from special allowance", () => {
  assertEquals(
    allocatePassiveActivityLosses([
      {
        currentNet: -8_000,
        priorUnallowed: 0,
        specialEligible: true,
        priorSpecialEligible: false,
      },
      {
        currentNet: -10_000,
        priorUnallowed: 0,
        specialEligible: false,
        priorSpecialEligible: false,
      },
    ], 8_000),
    {
      allowed: [8_000, 0],
      suspended: [0, 10_000],
      overallLosses: [8_000, 10_000],
      specialEligibleLosses: [8_000, 0],
      specialByActivity: [8_000, 0],
      postSpecialLosses: [0, 10_000],
    },
  );
});

Deno.test("prior loss without past active participation cannot receive special allowance", () => {
  assertEquals(
    allocatePassiveActivityLosses([
      {
        currentNet: -4_000,
        priorUnallowed: 6_000,
        specialEligible: true,
        priorSpecialEligible: false,
      },
    ], 4_000),
    {
      allowed: [4_000],
      suspended: [6_000],
      overallLosses: [10_000],
      specialEligibleLosses: [4_000],
      specialByActivity: [4_000],
      postSpecialLosses: [6_000],
    },
  );
});

// ─── 1. Input Validation ──────────────────────────────────────────────────────

Deno.test("valid_all_fields_pass: all valid fields present, no passive activity", () => {
  compute({
    current_income: 10_000,
    rental_current_income: 0,
    current_loss: 5_000,
    rental_current_loss: 5_000,
    prior_unallowed: 0,
    modified_agi: 80_000,
    has_active_rental: true,
    active_participation: true,
    filing_status: FilingStatus.MFJ,
    has_other_passive: false,
  });
});

Deno.test("invalid_current_income_type: current_income is string '50000' throws", () => {
  assertThrows(() => compute({ current_income: "50000" }));
});

Deno.test("invalid_current_loss_type: current_loss is string '30000' throws", () => {
  assertThrows(() => compute({ current_loss: "30000" }));
});

Deno.test("Form 8582 reconciles Schedule E and Form 4835 activity totals before routing a loss", () => {
  const activities = [
    {
      activity_id: "id-Rental house",
      name: "Rental house",
      activity_type: "A",
      property_type: 1,
      current_net: -8_000,
      prior_unallowed_operating: 2_000,
      prior_year_8582_source: {
        tax_year: 2024,
        activity_id: "id-Rental house",
        filed_part_vii_column_c: 2_000,
        source_document_reference:
          "2024 filed Form 8582 Part VII, rental house",
      },
      prior_active_participation: true,
      prior_unallowed_4797_part1: 0,
      prior_unallowed_4797_part2: 0,
    },
    {
      activity_id: "id-Farm rental",
      name: "Farm rental",
      activity_type: "B",
      property_type: 5,
      current_net: 3_000,
      prior_unallowed_operating: 0,
      prior_unallowed_4797_part1: 0,
      prior_unallowed_4797_part2: 0,
    },
  ];
  const input = {
    activities,
    current_income: 3_000,
    current_loss: 8_000,
    prior_unallowed: 2_000,
    rental_current_income: 0,
    rental_current_loss: 8_000,
    rental_prior_eligible_loss: 2_000,
    has_active_rental: true,
    has_other_passive: true,
    active_participation: true,
    modified_agi: 80_000,
  };
  const result = compute(input);
  assertEquals(result.carryforwards, undefined);
  assertEquals(
    compute({
      ...input,
      activities: [activities[0], { ...activities[1], name: "Rental house" }],
    }).carryforwards,
    undefined,
  );
  assertThrows(
    () =>
      compute({
        ...input,
        activities: [
          ...activities,
          {
            ...activities[1],
            activity_id: activities[0].activity_id,
            name: " rental HOUSE ",
            current_net: 0,
          },
        ],
      }),
    Error,
    "distinct durable activity IDs",
  );
  assertEquals(
    inputSchema.safeParse({
      ...input,
      activities: [{ ...activities[0], name: "   " }, activities[1]],
    }).success,
    false,
  );
  assertThrows(
    () => compute({ ...input, prior_unallowed: 1_000 }),
    Error,
    "activity amounts do not reconcile",
  );
  assertThrows(
    () => compute({ ...input, rental_prior_eligible_loss: 0 }),
    Error,
    "activity amounts do not reconcile",
  );
  assertThrows(
    () => compute({ ...input, current_income: 4_000 }),
    Error,
    "activity amounts do not reconcile",
  );
  assertThrows(
    () => compute({ ...input, has_active_rental: false }),
    Error,
    "activity amounts do not reconcile",
  );
});

Deno.test("Form 8582 keeps fully suspended prior Form 4797 losses off Schedule 1", () => {
  const activity = {
    activity_id: "id-Rental business",
    name: "Rental business",
    activity_type: "B",
    property_type: 1,
    reporting_form: "schedule_e",
    current_net: 0,
    prior_unallowed_operating: 0,
    prior_unallowed_4797_part1: 4_000,
    prior_unallowed_4797_part2: 0,
  };
  assertThrows(
    () =>
      compute({
        activities: [activity],
        prior_unallowed: 4_000,
        has_other_passive: true,
      }),
    Error,
    "prior Form 4797 character",
  );
  assertThrows(
    () =>
      compute({
        activities: [{
          ...activity,
          activity_type: "A",
        }],
        prior_unallowed: 4_000,
        has_active_rental: true,
      }),
    Error,
    "prior Form 4797 character",
  );
  assertThrows(
    () =>
      compute({
        activities: [{ ...activity, reporting_form: undefined }],
        prior_unallowed: 4_000,
        has_other_passive: true,
      }),
    Error,
    "prior Form 4797 character",
  );
});

Deno.test("invalid_prior_unallowed_type: prior_unallowed is string '10000' throws", () => {
  assertThrows(() => compute({ prior_unallowed: "10000" }));
});

Deno.test("invalid_modified_agi_type: modified_agi is string '100000' throws", () => {
  assertThrows(() => compute({ modified_agi: "100000" }));
});

Deno.test("invalid_has_active_rental_type: has_active_rental is string 'true' throws", () => {
  assertThrows(() => compute({ has_active_rental: "true" }));
});

Deno.test("invalid_active_participation_type: active_participation is string 'true' throws", () => {
  assertThrows(() => compute({ active_participation: "true" }));
});

Deno.test("invalid_filing_status_value: filing_status is 'invalid_status' throws", () => {
  assertThrows(() => compute({ filing_status: "invalid_status" }));
});

Deno.test("negative_current_income: current_income -10000 throws (.nonnegative())", () => {
  assertThrows(() => compute({ current_income: -10_000 }));
});

Deno.test("negative_current_loss: current_loss -10000 throws (.nonnegative())", () => {
  assertThrows(() => compute({ current_loss: -10_000 }));
});

Deno.test("negative_prior_unallowed: prior_unallowed -10000 throws (.nonnegative())", () => {
  assertThrows(() => compute({ prior_unallowed: -10_000 }));
});

Deno.test("negative_modified_agi: modified_agi -50000 throws (.nonnegative())", () => {
  assertThrows(() => compute({ modified_agi: -50_000 }));
});

Deno.test("active rental needs an explicit rental share of passive losses", () => {
  assertThrows(
    () =>
      compute({
        current_loss: 20_000,
        has_active_rental: true,
        active_participation: true,
        modified_agi: 80_000,
      }),
    Error,
    "rental portion of current passive losses",
  );
});

Deno.test("active rental needs an explicit rental share of passive income", () => {
  assertThrows(
    () =>
      compute({
        current_income: 10_000,
        current_loss: 20_000,
        rental_current_loss: 20_000,
        has_active_rental: true,
        active_participation: true,
        modified_agi: 80_000,
      }),
    Error,
    "rental portion of current passive income",
  );
});

Deno.test("rental profits reduce the special allowance before other passive losses", () => {
  const result = compute({
    current_income: 10_000,
    rental_current_income: 10_000,
    current_loss: 30_000,
    rental_current_loss: 20_000,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 80_000,
  });
  assertEquals(
    findOutput(result, "schedule1")?.fields.line5_schedule_e,
    -20_000,
  );
  assertEquals(result.carryforwards?.suspended_pal_8582, 10_000);
});

Deno.test("rental shares cannot exceed passive totals", () => {
  assertThrows(
    () =>
      compute({
        current_income: 10_000,
        rental_current_income: 11_000,
        current_loss: 30_000,
        rental_current_loss: 20_000,
      }),
    Error,
    "rental and passive activity totals do not reconcile",
  );
  assertThrows(
    () =>
      compute({
        current_loss: 30_000,
        rental_current_loss: 31_000,
      }),
    Error,
    "rental and passive activity totals do not reconcile",
  );
});

// ─── 2. Per-Field Calculation ─────────────────────────────────────────────────

Deno.test("no_activity_returns_empty: current_income 0, current_loss 0, prior_unallowed 0 → 0 outputs", () => {
  const result = compute({
    current_income: 0,
    current_loss: 0,
    prior_unallowed: 0,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("aggregate prior PAL cannot enter Form 8582 without filed activity evidence", () => {
  assertThrows(
    () =>
      compute({
        current_income: 60_000,
        current_loss: 30_000,
        prior_unallowed: 20_000,
      }),
    Error,
    "activity rows and filed 2024 Part VII evidence",
  );
});

Deno.test("passive_loss_exceeds_income: pal=40000, active rental MAGI=90000 → allowed=35000 → schedule1=-35000", () => {
  // pal = 50000 - 10000 = 40000. allowance = min(40000, 25000) = 25000
  // allowed = min(40000, 10000 + 25000) = 35000
  const result = compute({
    current_income: 10_000,
    rental_current_income: 0,
    current_loss: 50_000,
    rental_current_loss: 50_000,
    prior_unallowed: 0,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 90_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line5_schedule_e, -35_000);
});

Deno.test("magi_below_lower_full_allowance: MAGI=80000, loss=30000 → allowed=25000 → schedule1=-25000", () => {
  // pal = 30000, allowance = min(30000, 25000) = 25000, allowed = min(30000, 0 + 25000) = 25000
  const result = compute({
    has_active_rental: true,
    active_participation: true,
    modified_agi: 80_000,
    current_loss: 30_000,
    rental_current_loss: 30_000,
    prior_unallowed: 0,
    current_income: 0,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line5_schedule_e, -25_000);
});

Deno.test("magi_at_lower_threshold: MAGI=100000, loss=30000 → full $25k allowance → schedule1=-25000", () => {
  const result = compute({
    has_active_rental: true,
    active_participation: true,
    modified_agi: 100_000,
    current_loss: 30_000,
    rental_current_loss: 30_000,
    current_income: 0,
    prior_unallowed: 0,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line5_schedule_e, -25_000);
});

Deno.test("magi_above_lower_partial_allowance: MAGI=125000 → phase_out=12500, phasedAllowance=12500 → schedule1=-12500", () => {
  // phase_out = 0.5 * (125000 - 100000) = 12500, phasedAllowance = max(0, 25000 - 12500) = 12500
  // allowed = min(30000, 0 + 12500) = 12500
  const result = compute({
    has_active_rental: true,
    active_participation: true,
    modified_agi: 125_000,
    current_loss: 30_000,
    rental_current_loss: 30_000,
    current_income: 0,
    prior_unallowed: 0,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line5_schedule_e, -12_500);
});

Deno.test("magi_at_upper_threshold: MAGI=150000 → allowance=0 → does not route to schedule1", () => {
  const result = compute({
    has_active_rental: true,
    active_participation: true,
    modified_agi: 150_000,
    current_loss: 30_000,
    rental_current_loss: 30_000,
    current_income: 0,
    prior_unallowed: 0,
  });
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("magi_above_upper_threshold: MAGI=160000 → allowance=0 → does not route to schedule1", () => {
  const result = compute({
    has_active_rental: true,
    active_participation: true,
    modified_agi: 160_000,
    current_loss: 30_000,
    rental_current_loss: 30_000,
    current_income: 0,
    prior_unallowed: 0,
  });
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("rental_loss_caps_allowance: loss=15000, MAGI=50000 → allowed=15000 → schedule1=-15000", () => {
  // allowance = min(15000, 25000) = 15000 (capped by actual loss)
  const result = compute({
    has_active_rental: true,
    active_participation: true,
    modified_agi: 50_000,
    current_loss: 15_000,
    rental_current_loss: 15_000,
    current_income: 0,
    prior_unallowed: 0,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line5_schedule_e, -15_000);
});

Deno.test("allowance_max_25000: loss=40000, MAGI=50000 → allowance capped at 25000 → schedule1=-25000", () => {
  // allowance = min(40000, 25000) = 25000
  const result = compute({
    has_active_rental: true,
    active_participation: true,
    modified_agi: 50_000,
    current_loss: 40_000,
    rental_current_loss: 40_000,
    current_income: 0,
    prior_unallowed: 0,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line5_schedule_e, -25_000);
});

Deno.test("mfs_gets_zero_allowance: MFS, active rental, MAGI=40000, loss=20000 → allowance=0 → does not route to schedule1", () => {
  // MFS ineligible for Part II → allowance = 0, allowed = min(20000, 0 + 0) = 0
  const result = compute({
    filing_status: FilingStatus.MFS,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 40_000,
    current_loss: 20_000,
    rental_current_loss: 20_000,
    current_income: 0,
    prior_unallowed: 0,
  });
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("MFS lived apart all year uses the $12,500 rental allowance", () => {
  const result = compute({
    filing_status: FilingStatus.MFS,
    mfs_lived_apart_all_year: true,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 40_000,
    current_loss: 20_000,
    rental_current_loss: 20_000,
    current_income: 0,
    prior_unallowed: 0,
  });
  assertEquals(
    findOutput(result, "schedule1")?.fields.line5_schedule_e,
    -12_500,
  );
  assertEquals(result.carryforwards?.suspended_pal_8582, 7_500);
});

Deno.test("MFS lived-apart allowance phases out between $50,000 and $75,000", () => {
  const result = compute({
    filing_status: FilingStatus.MFS,
    mfs_lived_apart_all_year: true,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 60_000,
    current_loss: 20_000,
    rental_current_loss: 20_000,
    current_income: 0,
    prior_unallowed: 0,
  });
  assertEquals(
    findOutput(result, "schedule1")?.fields.line5_schedule_e,
    -7_500,
  );
  const ineligible = compute({
    filing_status: FilingStatus.MFS,
    mfs_lived_apart_all_year: false,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 60_000,
    current_loss: 20_000,
    rental_current_loss: 20_000,
    current_income: 0,
    prior_unallowed: 0,
  });
  assertEquals(findOutput(ineligible, "schedule1"), undefined);
});

// ─── 4. Hard Validation Rules ─────────────────────────────────────────────────

Deno.test("mfs_ineligible_for_special_allowance: MFS gets $0 allowance, only income offsets → schedule1=-5000", () => {
  // MFS → allowance = 0. pal = 20000 - 5000 = 15000. allowed = min(15000, 5000 + 0) = 5000
  const result = compute({
    filing_status: FilingStatus.MFS,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 0,
    current_loss: 20_000,
    rental_current_loss: 20_000,
    current_income: 5_000,
    rental_current_income: 0,
    prior_unallowed: 0,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line5_schedule_e, -5_000);
});

Deno.test("no_active_rental_skips_part_ii: has_active_rental=false, pal=25000, income=5000 → allowed=5000 → schedule1=-5000", () => {
  // allowance = 0 (no active rental). allowed = min(25000, 5000 + 0) = 5000
  const result = compute({
    has_active_rental: false,
    active_participation: true,
    modified_agi: 80_000,
    current_loss: 30_000,
    current_income: 5_000,
    prior_unallowed: 0,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line5_schedule_e, -5_000);
});

Deno.test("no_active_participation_skips_allowance: active_rental but no active_participation → allowance=0 → does not route", () => {
  const result = compute({
    has_active_rental: true,
    active_participation: false,
    modified_agi: 80_000,
    current_loss: 30_000,
    rental_current_loss: 30_000,
    current_income: 0,
    prior_unallowed: 0,
  });
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("active rental loss rejects a missing modified AGI when special allowance could apply", () => {
  assertThrows(
    () =>
      compute({
        has_active_rental: true,
        active_participation: true,
        current_loss: 30_000,
        rental_current_loss: 30_000,
        current_income: 5_000,
        rental_current_income: 0,
        prior_unallowed: 0,
      }),
    Error,
    "needs modified AGI",
  );
});

Deno.test("active rental with all losses covered by passive income needs no special-allowance MAGI", () => {
  const result = compute({
    has_active_rental: true,
    active_participation: true,
    current_loss: 5_000,
    rental_current_loss: 5_000,
    current_income: 6_000,
    rental_current_income: 0,
    prior_unallowed: 0,
  });
  assertEquals(
    findOutput(result, "schedule1")?.fields.line5_schedule_e,
    -5_000,
  );
});

// ─── 5. Output Routing ────────────────────────────────────────────────────────

Deno.test("routes_allowed_loss_to_schedule1: pal=30000, MAGI=80000, allowance=25000 → schedule1=-25000", () => {
  // pal = 30000 - 0 = 30000, allowance = min(30000, 25000) = 25000, allowed = min(30000, 0+25000) = 25000
  const result = compute({
    current_loss: 30_000,
    has_active_rental: true,
    rental_current_loss: 30_000,
    active_participation: true,
    modified_agi: 80_000,
  });
  assertEquals(
    findOutput(result, "schedule1")?.fields.line5_schedule_e,
    -25_000,
  );
});

Deno.test("schedule1_line5_is_negative: schedule1.line5_schedule_e is negative", () => {
  const result = compute({
    current_loss: 10_000,
    has_active_rental: true,
    rental_current_loss: 10_000,
    active_participation: true,
    modified_agi: 80_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line5_schedule_e, -10_000);
});

Deno.test("no_output_when_no_activity: all zero inputs → does not route to schedule1", () => {
  const result = compute({
    current_income: 0,
    current_loss: 0,
    prior_unallowed: 0,
  });
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("no_output_when_allowed_loss_zero: pal>0 but income=0 and no allowance → does not route to schedule1", () => {
  const result = compute({
    current_income: 0,
    current_loss: 20_000,
    has_active_rental: false,
  });
  assertEquals(findOutput(result, "schedule1"), undefined);
});

// ─── 6. Edge Cases ────────────────────────────────────────────────────────────

Deno.test("mfs_disqualifies_special_allowance: MFS, active rental, MAGI=40000, loss=20000 → allowance=0 → does not route", () => {
  const result = compute({
    filing_status: FilingStatus.MFS,
    has_active_rental: true,
    active_participation: true,
    modified_agi: 40_000,
    current_loss: 20_000,
    rental_current_loss: 20_000,
    current_income: 0,
  });
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("magi_150k_eliminates_allowance: modified_agi=150000 with active rental → allowance=0 → does not route", () => {
  const result = compute({
    has_active_rental: true,
    active_participation: true,
    modified_agi: 150_000,
    current_loss: 30_000,
    rental_current_loss: 30_000,
    current_income: 0,
  });
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("disallowed_loss_not_routed: pal=30000, income+allowance=10000 → exactly 1 output, no second output for disallowed", () => {
  // pal = 30000, no active rental → allowance = 0
  // income = 10000, allowed = min(30000, 10000) = 10000, disallowed = 20000
  const result = compute({
    current_income: 10_000,
    current_loss: 30_000,
    has_active_rental: false,
  });
  assertEquals(result.outputs.length, 1);
});

// ─── 7. Smoke Tests ───────────────────────────────────────────────────────────

Deno.test("magi_110k_phase_out: MAGI=110000, loss=30000 → allowance reduced by 50%×10000=5000 → allowed=20000 → schedule1=-20000", () => {
  // phase_out = 0.5 * (110000 - 100000) = 5000, phasedAllowance = max(0, 25000 - 5000) = 20000
  // allowed = min(30000, 0 + 20000) = 20000
  const result = compute({
    has_active_rental: true,
    active_participation: true,
    modified_agi: 110_000,
    current_loss: 30_000,
    rental_current_loss: 30_000,
    current_income: 0,
    prior_unallowed: 0,
  });
  assertEquals(
    findOutput(result, "schedule1")?.fields.line5_schedule_e,
    -20_000,
  );
});

Deno.test("passive_loss_15k_income_10k_suspended_5k: $10,000 loss allowed", () => {
  const result = compute({
    current_income: 10_000,
    current_loss: 15_000,
    has_active_rental: false,
  });
  assertEquals(
    findOutput(result, "schedule1")?.fields.line5_schedule_e,
    -10_000,
  );
  assertEquals(result.carryforwards?.suspended_pal_8582, 5_000);
});
