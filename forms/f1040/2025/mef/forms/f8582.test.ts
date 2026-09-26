import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form8582 } from "./f8582.ts";

Deno.test("Form 8582: absent activity emits no document", () => {
  assertEquals(form8582.build({}), "");
  assertEquals(form8582.build({ modified_agi: 75_000, current_loss: 0 }), "");
});

Deno.test("Form 8582: aggregate losses cannot create invented MeF XML", () => {
  assertThrows(
    () => form8582.build({ current_loss: 8_000 }),
    Error,
    "requires per-activity",
  );
});

Deno.test("Form 8582: rental classification alone is insufficient", () => {
  assertThrows(
    () =>
      form8582.build({ rental_current_loss: 8_000, has_active_rental: true }),
    Error,
    "requires per-activity",
  );
});

Deno.test("Form 8582: prior-year suspended losses require activity allocation", () => {
  assertThrows(
    () => form8582.build({ prior_unallowed: 2_000 }),
    Error,
    "requires per-activity",
  );
});

const singleRental = {
  activities: [{
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

Deno.test("Form 8582: fully allowed active rental reconciles Part I, II and worksheets", () => {
  const xml = form8582.build(singleRental);
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
  const xml = form8582.build({ ...singleRental, modified_agi: 140_000 });
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
  const xml = form8582.build({ ...singleRental, modified_agi: 150_000 });
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
    name: "Second house",
    current_net: -16_000,
  };
  const xml = form8582.build({
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
  const xml = form8582.build({
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
  const xml = form8582.build({
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
  const xml = form8582.build({
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
  const xml = form8582.build({
    ...singleRental,
    activities: [
      {
        ...singleRental.activities[0],
        name: "Rental profit",
        current_net: 10_000,
      },
      {
        ...singleRental.activities[0],
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
  const xml = form8582.build({
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
  const xml = form8582.build(otherPassive);
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
  const xml = form8582.build({
    ...otherPassive,
    activities: [
      {
        ...otherPassive.activities[0],
        name: "Profit rental",
        current_net: 6_000,
      },
      {
        ...otherPassive.activities[0],
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
  const xml = form8582.build({
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
  const xml = form8582.build({
    ...singleRental,
    activities: [
      { ...singleRental.activities[0], current_net: -30_000 },
      {
        ...otherPassive.activities[0],
        name: "Other loss",
        current_net: -20_000,
      },
      {
        ...otherPassive.activities[0],
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
  const xml = form8582.build({
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
  const xml = form8582.build({
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
