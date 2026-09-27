import { assertEquals, assertThrows } from "@std/assert";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { income_tax_calculation } from "../../worksheets/income_tax_calculation/index.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
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
    participant_five_year_member: true,
    prior_election_after_1986: false,
    ...input,
  }).outputs;
  return {
    tax: fieldsOf(outputs, income_tax_calculation)?.form4972_tax,
    lines: outputs.find((item) => item.nodeType === "form4972")?.fields,
    agi: fieldsOf(outputs, agi_aggregator),
    f1040: fieldsOf(outputs, f1040),
  };
}

Deno.test("Form 4972 does not silently exclude income without an election", () => {
  assertThrows(
    () => compute({ lump_sum_amount: 100_000, born_before_1936: true }),
    Error,
    "has no 20% or ten-year election",
  );
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

Deno.test("Form 4972 Part II rejects an election without box 3 capital gain", () => {
  assertThrows(
    () => calculated({ lump_sum_amount: 10_000, elect_capital_gain: true }),
    Error,
    "Part II election needs a positive box 3 capital gain",
  );
});

Deno.test("Form 4972 Part II retains ordinary income when the special tax rounds to zero", () => {
  const result = calculated({
    lump_sum_amount: 101,
    capital_gain_amount: 1,
    elect_capital_gain: true,
  });
  assertEquals(result.tax, 0);
  assertEquals(result.agi?.line5b_form4972_ordinary, 100);
  assertEquals(result.f1040?.line5b_form4972_ordinary, 100);
});

Deno.test("Form 4972 Part II allocates a death benefit between capital gain and ordinary income", () => {
  const result = calculated({
    lump_sum_amount: 20_000,
    capital_gain_amount: 5_000,
    death_benefit_exclusion: 5_000,
    beneficiary_distribution: true,
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
    participant_died_before_1996_08_21: true,
    elect_capital_gain: true,
    elect_10yr_averaging: true,
  });
  assertEquals(result.lines?.line6, 27_300);
  assertEquals(result.lines?.line9, 3_500);
  assertEquals(result.lines?.line18, 2_800);
});

Deno.test("Form 4972 Part II-only estate tax remains stopped", () => {
  assertThrows(
    () =>
      calculated({
        lump_sum_amount: 100_000,
        capital_gain_amount: 30_000,
        federal_estate_tax: 4_000,
        beneficiary_distribution: true,
        elect_capital_gain: true,
      }),
    Error,
    "Part II-only estate tax needs ordinary-income reporting review",
  );
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
        participant_died_before_1996_08_21: true,
        elect_capital_gain: true,
      }),
    Error,
    "death benefit exclusion cannot exceed the taxable distribution",
  );
});
