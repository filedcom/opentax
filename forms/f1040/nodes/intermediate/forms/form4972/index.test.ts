import { assertEquals, assertThrows } from "@std/assert";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { income_tax_calculation } from "../../worksheets/income_tax_calculation/index.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { scheduleA } from "../../../inputs/schedule_a/index.ts";
import { form4972, inputSchema } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form4972.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(input),
  );
}

function calculated(input: Record<string, unknown>) {
  const outputs = compute({
    born_before_1936: true,
    recipient: "T",
    entire_balance_distributed: true,
    rolled_over_any: false,
    beneficiary_distribution: false,
    participant_five_year_member: true,
    prior_election_after_1986: false,
    prior_beneficiary_election_after_1986: false,
    ...input,
  }).outputs;
  return {
    tax: fieldsOf(outputs, income_tax_calculation)?.form4972_tax,
    lines: outputs.find((item) => item.nodeType === "form4972")?.fields,
    agi: fieldsOf(outputs, agi_aggregator),
    f1040: fieldsOf(outputs, f1040),
    scheduleA: fieldsOf(outputs, scheduleA),
  };
}

Deno.test("Form 4972 does not silently exclude income without an election", () => {
  assertThrows(
    () => compute({ lump_sum_amount: 100_000, born_before_1936: true }),
    Error,
    "has no 20% or ten-year election",
  );
});

Deno.test("Form 4972 partial box 9a share grosses up Part III and prorates line 29", () => {
  const result = calculated({
    lump_sum_amount: 20_000,
    recipient_share_pct: 50,
    elect_10yr_averaging: true,
  });
  assertEquals(result.lines?.line8, 40_000);
  assertEquals(result.lines?.line25, 4_190);
  assertEquals(result.lines?.line29, 2_095);
  assertEquals(result.lines?.line30, 2_095);
  assertEquals(result.tax, 2_095);
});

Deno.test("Form 4972 shared beneficiary Part III uses full attributable estate tax before prorating", () => {
  const result = calculated({
    lump_sum_amount: 20_000,
    recipient_share_pct: 50,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    prior_beneficiary_election_after_1986: false,
    federal_estate_tax: 2_000,
    elect_10yr_averaging: true,
  });
  assertEquals(result.lines?.line8, 40_000);
  assertEquals(result.lines?.line18, 2_000);
  assertEquals(result.lines?.line19, 32_000);
  assertEquals(result.lines?.line29, 1_955);
  assertEquals(result.lines?.line30, 1_955);
  assertEquals(result.tax, 1_955);
});

Deno.test("Form 4972 shared beneficiary Part III uses the full death-benefit exclusion before line 29 proration", () => {
  const result = calculated({
    lump_sum_amount: 20_000,
    recipient_share_pct: 50,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    participant_died_before_1996_08_21: true,
    prior_beneficiary_election_after_1986: false,
    death_benefit_exclusion: 5_000,
    death_benefit_recipient_allocated_amount: 2_500,
    death_benefit_exclusion_source_reference:
      "Plan administrator beneficiary exclusion allocation",
    elect_10yr_averaging: true,
  });
  assertEquals(result.lines?.line8, 40_000);
  assertEquals(result.lines?.line9, 5_000);
  assertEquals(result.lines?.line10, 35_000);
  assertEquals(result.lines?.line29, 1_675);
  assertEquals(result.lines?.line30, 1_675);
  assertEquals(result.tax, 1_675);
  assertEquals(result.f1040, undefined);
});

Deno.test("Form 4972 partial beneficiary Part II and III allocate the death benefit separately on lines 6 and 9", () => {
  const source = {
    lump_sum_amount: 20_000,
    capital_gain_amount: 4_000,
    recipient_share_pct: 50,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    participant_died_before_1996_08_21: true,
    prior_beneficiary_election_after_1986: false,
    death_benefit_exclusion: 5_000,
    death_benefit_recipient_allocated_amount: 2_500,
    death_benefit_exclusion_source_reference:
      "Plan administrator beneficiary exclusion allocation",
    elect_capital_gain: true,
    elect_10yr_averaging: true,
  };
  const result = calculated(source);
  assertEquals(result.lines?.line6, 3_500);
  assertEquals(result.lines?.line7, 700);
  assertEquals(result.lines?.line8, 32_000);
  assertEquals(result.lines?.line9, 4_000);
  assertEquals(result.lines?.line10, 28_000);
  assertEquals(
    result.lines?.line10,
    Number(result.lines?.line8) - Number(result.lines?.line9),
  );
  assertEquals(result.lines?.line29, 1_115);
  assertEquals(result.lines?.line30, 1_815);
  assertEquals(result.tax, 1_815);
  assertEquals(result.f1040, undefined);
  assertThrows(
    () =>
      calculated({
        ...source,
        death_benefit_recipient_allocated_amount: 2_000,
      }),
    Error,
    "matching the full exclusion and recipient allocation",
  );
  assertThrows(
    () => calculated({ ...source, recipient_share_pct: 40 }),
    Error,
    "matching the full exclusion and recipient allocation",
  );
  for (
    const unsupported of [
      { box6_nua: 1_000, elect_include_nua: true },
      { annuity_actuarial_value: 1_000, annuity_share_pct: 50 },
      { federal_estate_tax: 1_000 },
    ]
  ) {
    assertThrows(
      () => calculated({ ...source, ...unsupported }),
      Error,
      "partial-share death benefit needs Part III",
    );
  }
});

Deno.test("Form 4972 partial death benefit can exceed this recipient's box 2a but not the grossed-up distribution", () => {
  const base = {
    lump_sum_amount: 3_000,
    recipient_share_pct: 50,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    participant_died_before_1996_08_21: true,
    prior_beneficiary_election_after_1986: false,
    death_benefit_exclusion: 5_000,
    death_benefit_recipient_allocated_amount: 2_500,
    death_benefit_exclusion_source_reference:
      "Plan administrator beneficiary exclusion allocation",
    elect_10yr_averaging: true,
  };
  const result = calculated(base);
  assertEquals(result.lines?.line8, 6_000);
  assertEquals(result.lines?.line9, 5_000);
  assertEquals(result.lines?.line29, 30);
  assertThrows(
    () => calculated({ ...base, recipient_share_pct: 80 }),
    Error,
    "matching the full exclusion and recipient allocation",
  );
});

Deno.test("Form 4972 partial death benefit rejects unsourced allocation and other recipient combinations", () => {
  const base = {
    lump_sum_amount: 20_000,
    recipient_share_pct: 50,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    participant_died_before_1996_08_21: true,
    prior_beneficiary_election_after_1986: false,
    death_benefit_exclusion: 5_000,
    death_benefit_recipient_allocated_amount: 2_500,
    death_benefit_exclusion_source_reference:
      "Plan administrator beneficiary exclusion allocation",
    elect_10yr_averaging: true,
  };
  for (
    const changed of [
      { death_benefit_exclusion_source_reference: undefined },
      { death_benefit_recipient_allocated_amount: 2_000 },
      { box6_nua: 1_000, elect_include_nua: true },
      { annuity_actuarial_value: 1_000, annuity_share_pct: 50 },
      { federal_estate_tax: 1_000 },
    ]
  ) {
    assertThrows(
      () => calculated({ ...base, ...changed }),
      Error,
      "partial-share death benefit needs Part III",
    );
  }
});

Deno.test("Form 4972 shared estate tax still rejects an unsupported capital or annuity mix", () => {
  for (
    const additional of [
      { capital_gain_amount: 4_000, elect_capital_gain: true },
      { annuity_actuarial_value: 2_000, annuity_share_pct: 25 },
    ]
  ) {
    assertThrows(
      () =>
        calculated({
          lump_sum_amount: 20_000,
          recipient_share_pct: 50,
          beneficiary_distribution: true,
          participant_five_year_member: false,
          prior_beneficiary_election_after_1986: false,
          federal_estate_tax: 2_000,
          elect_10yr_averaging: true,
          ...additional,
        }),
      Error,
      "partial box 9a share supports",
    );
  }
});

Deno.test("Form 4972 partial box 9a Part II keeps recipient gain and grosses up ordinary income", () => {
  const result = calculated({
    lump_sum_amount: 20_000,
    capital_gain_amount: 4_000,
    recipient_share_pct: 50,
    elect_capital_gain: true,
    elect_10yr_averaging: true,
  });
  assertEquals(result.lines?.line6, 4_000);
  assertEquals(result.lines?.line7, 800);
  assertEquals(result.lines?.line8, 32_000);
  assertEquals(result.lines?.line25, 2_840);
  assertEquals(result.lines?.line29, 1_420);
  assertEquals(result.lines?.line30, 2_220);
  assertEquals(result.tax, 2_220);
});

Deno.test("Form 4972 uses box 8's own percentage for a shared annuity", () => {
  const result = calculated({
    lump_sum_amount: 20_000,
    annuity_actuarial_value: 2_000,
    recipient_share_pct: 50,
    annuity_share_pct: 25,
    elect_10yr_averaging: true,
  });
  assertEquals(result.lines?.line8, 40_000);
  assertEquals(result.lines?.line11, 8_000);
  assertEquals(result.lines?.line12, 48_000);
  assertEquals(result.lines?.line29, 2_365);
  assertEquals(result.tax, 2_365);
});

Deno.test("Form 4972 shared annuity needs its own box 8 percentage", () => {
  for (const annuityShare of [undefined, 0, 101]) {
    assertThrows(() =>
      calculated({
        lump_sum_amount: 20_000,
        annuity_actuarial_value: 2_000,
        recipient_share_pct: 50,
        annuity_share_pct: annuityShare,
        elect_10yr_averaging: true,
      })
    );
  }
});

Deno.test("Form 4972 partial share combines NUA and a separately shared annuity", () => {
  const result = calculated({
    lump_sum_amount: 30_000,
    capital_gain_amount: 10_000,
    box6_nua: 6_000,
    elect_include_nua: true,
    annuity_actuarial_value: 2_000,
    annuity_share_pct: 25,
    recipient_share_pct: 50,
    elect_capital_gain: true,
    elect_10yr_averaging: true,
  });
  assertEquals(result.lines?.line6, 12_000);
  assertEquals(result.lines?.line6_nua_capital_gain, 2_000);
  assertEquals(result.lines?.line8, 48_000);
  assertEquals(result.lines?.line8_nua_included, 8_000);
  assertEquals(result.lines?.line11, 8_000);
  assertEquals(result.lines?.line12, 56_000);
  assertEquals(
    result.lines?.line29,
    Math.round(
      ((result.lines?.line25 as number) - (result.lines?.line28 as number)) *
        0.5,
    ),
  );
  assertEquals(result.lines?.line30, (result.lines?.line29 as number) + 2_400);
  assertEquals(result.tax, result.lines?.line30);
});

Deno.test("Form 4972 partial-share NUA grosses up only line 8 and its NUA note", () => {
  const result = calculated({
    lump_sum_amount: 100_000,
    capital_gain_amount: 30_000,
    box6_nua: 20_000,
    recipient_share_pct: 50,
    elect_include_nua: true,
    elect_capital_gain: true,
    elect_10yr_averaging: true,
  });
  assertEquals(result.lines?.line6, 36_000);
  assertEquals(result.lines?.line6_nua_capital_gain, 6_000);
  assertEquals(result.lines?.line7, 7_200);
  assertEquals(result.lines?.line8, 168_000);
  assertEquals(result.lines?.line8_nua_included, 28_000);
  assertEquals(
    result.lines?.line29,
    Math.round(
      ((result.lines?.line25 as number) -
        ((result.lines?.line28 as number | undefined) ?? 0)) * 0.5,
    ),
  );
  assertEquals(result.lines?.line30, 7_200 + (result.lines?.line29 as number));
});

Deno.test("Form 4972 partial-share Part III-only NUA includes all box 6 on line 8", () => {
  const result = calculated({
    lump_sum_amount: 100_000,
    capital_gain_amount: 30_000,
    box6_nua: 20_000,
    recipient_share_pct: 50,
    elect_include_nua: true,
    elect_10yr_averaging: true,
  });
  assertEquals(result.lines?.line6, undefined);
  assertEquals(result.lines?.line7, undefined);
  assertEquals(result.lines?.line8, 240_000);
  assertEquals(result.lines?.line8_nua_included, 40_000);
  assertEquals(
    result.lines?.line29,
    Math.round((result.lines?.line25 as number) * 0.5),
  );
  assertEquals(result.tax, result.lines?.line29);
});

Deno.test("Form 4972 partial-share Part-II-only NUA taxes the recipient gain and routes only recipient ordinary income", () => {
  const result = calculated({
    lump_sum_amount: 100_000,
    capital_gain_amount: 30_000,
    box6_nua: 20_000,
    recipient_share_pct: 50,
    elect_include_nua: true,
    elect_capital_gain: true,
  });
  assertEquals(result.lines?.line6_nua_capital_gain, 6_000);
  assertEquals(result.lines?.line6, 36_000);
  assertEquals(result.lines?.line7, 7_200);
  assertEquals(result.lines?.line8, undefined);
  assertEquals(result.lines?.line29, undefined);
  assertEquals(result.lines?.line30, undefined);
  assertEquals(result.tax, 7_200);
  assertEquals(result.agi?.line5b_form4972_ordinary, 84_000);
  assertEquals(result.f1040?.line5b_form4972_ordinary, 84_000);
});

Deno.test("Form 4972 partial-share Part-II-only without NUA keeps recipient ordinary income", () => {
  const result = calculated({
    lump_sum_amount: 20_000,
    capital_gain_amount: 4_000,
    recipient_share_pct: 50,
    elect_capital_gain: true,
  });
  assertEquals(result.lines?.line6, 4_000);
  assertEquals(result.lines?.line7, 800);
  assertEquals(result.lines?.line8, undefined);
  assertEquals(result.tax, 800);
  assertEquals(result.agi?.line5b_form4972_ordinary, 16_000);
});

Deno.test("Form 4972 partial box 9a share rejects unsupported allocations", () => {
  assertThrows(
    () =>
      calculated({
        lump_sum_amount: 20_000,
        recipient_share_pct: 50,
        elect_10yr_averaging: true,
        box6_nua: 1_000,
      }),
    Error,
    "partial box 9a share supports Part II or III",
  );
  assertThrows(
    () =>
      calculated({
        lump_sum_amount: 20_000,
        recipient_share_pct: 50,
        elect_10yr_averaging: true,
        death_benefit_exclusion: 1_000,
      }),
    Error,
    "partial-share death benefit needs Part III",
  );
  assertThrows(
    () =>
      calculated({
        lump_sum_amount: 20_000,
        capital_gain_amount: 4_000,
        annuity_actuarial_value: 2_000,
        annuity_share_pct: 25,
        recipient_share_pct: 50,
        elect_capital_gain: true,
      }),
    Error,
    "partial box 9a share supports Part II or III",
  );
});

Deno.test("Form 4972 shared beneficiary rejects Part II estate-tax combinations pending allocation evidence", () => {
  for (
    const extra of [
      { elect_capital_gain: true },
      { elect_include_nua: true, box6_nua: 2_000 },
      { annuity_actuarial_value: 2_000, annuity_share_pct: 25 },
    ]
  ) {
    assertThrows(
      () =>
        calculated({
          lump_sum_amount: 20_000,
          capital_gain_amount: 4_000,
          recipient_share_pct: 50,
          beneficiary_distribution: true,
          participant_five_year_member: false,
          prior_beneficiary_election_after_1986: false,
          elect_10yr_averaging: true,
          federal_estate_tax: 1_000,
          ...extra,
        }),
      Error,
      "partial box 9a share supports Part II or III",
    );
  }
});

Deno.test("Form 4972 rejects an ineligible birth year", () => {
  assertThrows(() =>
    calculated({
      lump_sum_amount: 100_000,
      born_before_1936: false,
      elect_10yr_averaging: true,
    })
  );
});

Deno.test("Form 4972 beneficiary eligibility uses question 5b, not their own-plan question 5a", () => {
  const result = calculated({
    lump_sum_amount: 10_000,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    prior_election_after_1986: true,
    prior_beneficiary_election_after_1986: false,
    elect_10yr_averaging: true,
  });
  assertEquals(result.lines?.line8, 10_000);
  assertThrows(
    () =>
      calculated({
        lump_sum_amount: 10_000,
        beneficiary_distribution: true,
        participant_five_year_member: false,
        prior_beneficiary_election_after_1986: undefined,
        elect_10yr_averaging: true,
      }),
    Error,
    "lacks qualifying plan",
  );
});

Deno.test("Form 4972 keeps beneficiary and own-plan recipient roles distinct", () => {
  assertThrows(
    () =>
      calculated({
        lump_sum_amount: 100_000,
        capital_gain_amount: 30_000,
        beneficiary_distribution: true,
        participant_five_year_member: true,
        prior_beneficiary_election_after_1986: false,
        federal_estate_tax: 4_000,
        elect_capital_gain: true,
      }),
    Error,
    "lacks qualifying plan",
  );
  assertThrows(
    () =>
      calculated({
        lump_sum_amount: 100_000,
        capital_gain_amount: 30_000,
        beneficiary_distribution: true,
        participant_five_year_member: false,
        prior_beneficiary_election_after_1986: true,
        federal_estate_tax: 4_000,
        elect_capital_gain: true,
      }),
    Error,
    "lacks qualifying plan",
  );
});

Deno.test("Form 4972 Part II uses 20% of the taxable pre-1974 capital gain", () => {
  const result = calculated({
    lump_sum_amount: 100_000,
    capital_gain_amount: 30_000,
    elect_capital_gain: true,
  });
  assertEquals(result.tax, 6_000);
  assertEquals(result.lines?.line6, 30_000);
  assertEquals(result.lines?.line7, 6_000);
  assertEquals(result.lines?.line30, undefined);
  assertEquals(result.agi?.line5b_form4972_ordinary, 70_000);
  assertEquals(result.f1040?.line5b_form4972_ordinary, 70_000);
});

Deno.test("Form 4972 Part II-only NUA election splits box 6 into capital and ordinary income", () => {
  const result = calculated({
    lump_sum_amount: 100_000,
    capital_gain_amount: 30_000,
    box6_nua: 20_000,
    elect_include_nua: true,
    elect_capital_gain: true,
  });
  assertEquals(result.lines?.line6, 36_000);
  assertEquals(result.tax, 7_200);
  assertEquals(result.agi?.line5b_form4972_ordinary, 84_000);
  assertEquals(result.f1040?.line5b_form4972_ordinary, 84_000);
});

Deno.test("Form 4972 does not include box 6 NUA without its election", () => {
  const result = calculated({
    lump_sum_amount: 100_000,
    capital_gain_amount: 30_000,
    box6_nua: 20_000,
    elect_capital_gain: true,
  });
  assertEquals(result.lines?.line6, 30_000);
  assertEquals(result.agi?.line5b_form4972_ordinary, 70_000);
});

Deno.test("Form 4972 NUA election requires a positive box 6 source amount", () => {
  assertThrows(
    () =>
      calculated({
        lump_sum_amount: 100_000,
        capital_gain_amount: 30_000,
        elect_include_nua: true,
        elect_capital_gain: true,
      }),
    Error,
    "NUA inclusion election needs a positive Form 1099-R box 6 amount",
  );
});

Deno.test("Form 4972 Part III follows lines 12 through 29, not a tax-on-allowance subtraction", () => {
  const result = calculated({
    lump_sum_amount: 10_000,
    elect_10yr_averaging: true,
  });
  assertEquals(result.lines?.line12, 10_000);
  assertEquals(result.lines?.line16, 5_000);
  assertEquals(result.lines?.line17, 5_000);
  assertEquals(result.lines?.line29, 550);
  assertEquals(result.tax, 550);
});

Deno.test("Form 4972 uses the 2025 instructions tax rate schedule above $70,000", () => {
  const result = calculated({
    lump_sum_amount: 100_000,
    elect_10yr_averaging: true,
  });
  assertEquals(result.lines?.line16, undefined);
  assertEquals(result.tax, 14_470);
});

Deno.test("Form 4972 applies an eligible death benefit before the allowance", () => {
  const result = calculated({
    lump_sum_amount: 20_000,
    death_benefit_exclusion: 5_000,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    participant_died_before_1996_08_21: true,
    elect_10yr_averaging: true,
  });
  assertEquals(result.lines?.line9, 5_000);
  assertEquals(result.lines?.line10, 15_000);
  assertEquals(result.tax, 830);
});

Deno.test("Form 4972 combines capital-gain and ten-year elections on line 30", () => {
  const result = calculated({
    lump_sum_amount: 100_000,
    capital_gain_amount: 10_000,
    elect_capital_gain: true,
    elect_10yr_averaging: true,
  });
  assertEquals(result.lines?.line8, 90_000);
  assertEquals(result.lines?.line7, 2_000);
  assertEquals(result.lines?.line29, 12_710);
  assertEquals(result.tax, 14_710);
  assertEquals(result.lines?.line30, 14_710);
  assertEquals(result.agi, undefined);
  assertEquals(result.f1040, undefined);
});

Deno.test("Form 4972 combined elections include NUA ordinary share on Part III line 8", () => {
  const result = calculated({
    lump_sum_amount: 100_000,
    capital_gain_amount: 30_000,
    box6_nua: 20_000,
    elect_include_nua: true,
    elect_capital_gain: true,
    elect_10yr_averaging: true,
  });
  assertEquals(result.lines?.line6, 36_000);
  assertEquals(result.lines?.line8, 84_000);
  assertEquals(result.lines?.line6_nua_capital_gain, 6_000);
  assertEquals(result.lines?.line8_nua_included, 14_000);
  assertEquals(result.agi, undefined);
});

Deno.test("Form 4972 NUA election uses the expanded base for death and estate allocations", () => {
  const result = calculated({
    lump_sum_amount: 100_000,
    capital_gain_amount: 30_000,
    box6_nua: 20_000,
    elect_include_nua: true,
    death_benefit_exclusion: 5_000,
    federal_estate_tax: 4_000,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    participant_died_before_1996_08_21: true,
    elect_capital_gain: true,
    elect_10yr_averaging: true,
  });
  assertEquals(result.lines?.line6, 33_300);
  assertEquals(result.lines?.line6_nua_capital_gain, 6_000);
  assertEquals(result.lines?.line8, 84_000);
  assertEquals(result.lines?.line8_nua_included, 14_000);
  assertEquals(result.lines?.line9, 3_500);
  assertEquals(result.lines?.line18, 2_800);
});

Deno.test("Form 4972 Part-II-only NUA estate allocation leaves ordinary IRD on Form 1040", () => {
  const result = calculated({
    lump_sum_amount: 100_000,
    capital_gain_amount: 30_000,
    box6_nua: 20_000,
    elect_include_nua: true,
    federal_estate_tax: 4_000,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    prior_beneficiary_election_after_1986: false,
    elect_capital_gain: true,
  });
  assertEquals(result.lines?.line6, 34_800);
  assertEquals(result.lines?.line7, 6_960);
  assertEquals(result.lines?.line18, undefined);
  assertEquals(result.f1040?.line5b_form4972_ordinary, 84_000);
  assertEquals(result.scheduleA?.line_16_other_deductions, 2_800);
});

Deno.test("Form 4972 Part III-only NUA election includes all of box 6 on line 8", () => {
  const result = calculated({
    lump_sum_amount: 100_000,
    box6_nua: 20_000,
    elect_include_nua: true,
    elect_10yr_averaging: true,
  });
  assertEquals(result.lines?.line6, undefined);
  assertEquals(result.lines?.line8, 120_000);
  assertEquals(result.lines?.line8_nua_included, 20_000);
});

Deno.test("Form 4972 Part II rejects an election without box 3 capital gain", () => {
  assertThrows(
    () => calculated({ lump_sum_amount: 10_000, elect_capital_gain: true }),
    Error,
    "Part II election needs a positive box 3 capital gain",
  );
});

Deno.test("Form 4972 rejects a rounded-zero Part II election before suppressing 1099-R income", () => {
  assertThrows(
    () =>
      calculated({
        lump_sum_amount: 101,
        capital_gain_amount: 1,
        elect_capital_gain: true,
      }),
    Error,
    "zero special tax",
  );
});

Deno.test("Form 4972 rejects a rounded-zero ten-year election before suppressing 1099-R income", () => {
  assertThrows(
    () => calculated({ lump_sum_amount: 4, elect_10yr_averaging: true }),
    Error,
    "zero special tax",
  );
});

Deno.test("Form 4972 Part II allocates a death benefit between capital gain and ordinary income", () => {
  const result = calculated({
    lump_sum_amount: 20_000,
    capital_gain_amount: 5_000,
    death_benefit_exclusion: 5_000,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    participant_died_before_1996_08_21: true,
    elect_capital_gain: true,
  });
  assertEquals(result.lines?.line6, 3_750);
  assertEquals(result.tax, 750);
  assertEquals(result.agi?.line5b_form4972_ordinary, 11_250);
  assertEquals(result.f1040?.line5b_form4972_ordinary, 11_250);
});

Deno.test("Form 4972 annuity value goes through the actuarial adjustment", () => {
  const result = calculated({
    lump_sum_amount: 20_000,
    annuity_actuarial_value: 2_000,
    elect_10yr_averaging: true,
  });
  assertEquals(result.lines?.line11, 2_000);
  assertEquals(result.lines?.line12, 22_000);
  assertEquals(typeof result.lines?.line22, "number");
});

Deno.test("Form 4972 estate tax reduces line 19 before averaging", () => {
  const result = calculated({
    lump_sum_amount: 10_000,
    federal_estate_tax: 1_000,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    elect_10yr_averaging: true,
  });
  assertEquals(result.lines?.line19, 4_000);
  assertEquals(result.tax, 440);
});

Deno.test("Form 4972 combined election allocates federal estate tax to lines 6 and 18", () => {
  const result = calculated({
    lump_sum_amount: 100_000,
    capital_gain_amount: 30_000,
    federal_estate_tax: 4_000,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    elect_capital_gain: true,
    elect_10yr_averaging: true,
  });
  assertEquals(result.lines?.line6, 28_800);
  assertEquals(result.lines?.line7, 5_760);
  assertEquals(result.lines?.line18, 2_800);
  assertEquals(result.lines?.line19, 67_200);
  assertEquals(result.agi, undefined);
});

Deno.test("Form 4972 combined election allocates death benefit and estate tax separately", () => {
  const result = calculated({
    lump_sum_amount: 100_000,
    capital_gain_amount: 30_000,
    death_benefit_exclusion: 5_000,
    federal_estate_tax: 4_000,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    participant_died_before_1996_08_21: true,
    elect_capital_gain: true,
    elect_10yr_averaging: true,
  });
  assertEquals(result.lines?.line6, 27_300);
  assertEquals(result.lines?.line9, 3_500);
  assertEquals(result.lines?.line18, 2_800);
});

Deno.test("Form 4972 Part II-only estate tax reduces capital gain and sends ordinary IRD deduction to Schedule A", () => {
  const result = calculated({
    lump_sum_amount: 100_000,
    capital_gain_amount: 30_000,
    federal_estate_tax: 4_000,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    elect_capital_gain: true,
  });
  assertEquals(result.lines?.line6, 28_800);
  assertEquals(result.lines?.line7, 5_760);
  assertEquals(result.lines?.line18, undefined);
  assertEquals(result.tax, 5_760);
  assertEquals(result.agi?.line5b_form4972_ordinary, 70_000);
  assertEquals(result.f1040?.line5b_form4972_ordinary, 70_000);
  assertEquals(result.scheduleA?.line_16_other_deductions, 2_800);
});

Deno.test("Form 4972 Part II-only applies death benefit and estate tax to separate capital and ordinary shares", () => {
  const result = calculated({
    lump_sum_amount: 100_000,
    capital_gain_amount: 30_000,
    death_benefit_exclusion: 5_000,
    federal_estate_tax: 4_000,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    participant_died_before_1996_08_21: true,
    elect_capital_gain: true,
  });
  assertEquals(result.lines?.line6, 27_300);
  assertEquals(result.lines?.line7, 5_460);
  assertEquals(result.lines?.line18, undefined);
  assertEquals(result.agi?.line5b_form4972_ordinary, 66_500);
  assertEquals(result.f1040?.line5b_form4972_ordinary, 66_500);
  assertEquals(result.scheduleA?.line_16_other_deductions, 2_800);
});

Deno.test("Form 4972 combined election keeps ordinary estate tax inside Part III, not Schedule A", () => {
  const result = calculated({
    lump_sum_amount: 100_000,
    capital_gain_amount: 30_000,
    federal_estate_tax: 4_000,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    elect_capital_gain: true,
    elect_10yr_averaging: true,
  });
  assertEquals(result.lines?.line18, 2_800);
  assertEquals(result.scheduleA, undefined);
});

Deno.test("Form 4972 rejects capital gain above taxable distribution", () => {
  assertThrows(() =>
    calculated({
      lump_sum_amount: 10_000,
      capital_gain_amount: 15_000,
      elect_capital_gain: true,
    })
  );
});

Deno.test("Form 4972 rejects a death benefit above $5,000", () => {
  assertThrows(() =>
    calculated({
      lump_sum_amount: 50_000,
      death_benefit_exclusion: 6_000,
      elect_10yr_averaging: true,
    })
  );
});

Deno.test("Form 4972 rejects a death benefit larger than the taxable distribution", () => {
  assertThrows(
    () =>
      calculated({
        lump_sum_amount: 2_000,
        capital_gain_amount: 500,
        death_benefit_exclusion: 3_000,
        beneficiary_distribution: true,
        participant_five_year_member: false,
        participant_died_before_1996_08_21: true,
        elect_capital_gain: true,
      }),
    Error,
    "death benefit exclusion cannot exceed the taxable distribution",
  );
});
