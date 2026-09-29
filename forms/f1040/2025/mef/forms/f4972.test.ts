import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { TS } from "../../../nodes/types.ts";
import { form4972 } from "./f4972.ts";
import { DistributionCode } from "../../../nodes/inputs/f1099r/index.ts";
import {
  form4972 as form4972Node,
  inputSchema as form4972InputSchema,
} from "../../../nodes/intermediate/forms/form4972/index.ts";

function partialRecipientCase(capitalGain = 0) {
  const source = {
    ...qualified,
    recipient: TS.T,
    lump_sum_amount: 20_000,
    ...(capitalGain > 0
      ? { capital_gain_amount: capitalGain, elect_capital_gain: true }
      : {}),
    recipient_share_pct: 50,
    elect_10yr_averaging: true,
  };
  const fields = form4972Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form4972InputSchema.parse(source),
  ).outputs[0].fields;
  const pending = {
    f1099r: {
      f1099rs: [{
        payer_name: "Qualified Plan",
        payer_ein: "123456789",
        box1_gross_distribution: 20_000,
        box2a_taxable_amount: 20_000,
        ...(capitalGain > 0 ? { box3_capital_gain: capitalGain } : {}),
        box7_distribution_code: DistributionCode.CodeA,
        box9a_pct_total: 50,
        ts: TS.T,
        exclude_4972: true,
      }],
    },
    f1040: { form4972_tax: fields.line30 },
  };
  return { fields, pending };
}

Deno.test("Form 4972 MeF links partial-recipient line 29 to MRD", () => {
  const { fields, pending } = partialRecipientCase();
  const xml = form4972.build(fields, { filer, pending });
  assertStringIncludes(
    xml,
    "<LumpSumDistriOrdinaryIncmAmt>40000</LumpSumDistriOrdinaryIncmAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpSumRsdlAnnuityAvgTaxAmt>2095</LumpSumRsdlAnnuityAvgTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpSumDistriMultRecipientsCd>MRD</LumpSumDistriMultRecipientsCd>",
  );
});

Deno.test("Form 4972 MeF prints sourced full death-benefit exclusion for a partial beneficiary", () => {
  const source = {
    ...qualified,
    recipient: TS.T,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    prior_beneficiary_election_after_1986: false,
    participant_died_before_1996_08_21: true,
    lump_sum_amount: 20_000,
    recipient_share_pct: 50,
    death_benefit_exclusion: 5_000,
    death_benefit_recipient_allocated_amount: 2_500,
    death_benefit_exclusion_source_reference:
      "Plan administrator beneficiary exclusion allocation",
    elect_10yr_averaging: true,
  };
  const fields = form4972Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form4972InputSchema.parse(source),
  ).outputs[0].fields;
  const pending = {
    f1099r: {
      f1099rs: [{
        payer_name: "Qualified Plan",
        payer_ein: "123456789",
        box1_gross_distribution: 20_000,
        box2a_taxable_amount: 20_000,
        box7_distribution_code: DistributionCode.CodeA,
        box9a_pct_total: 50,
        ts: TS.T,
        exclude_4972: true,
      }],
    },
    f1040: { form4972_tax: fields.line30 },
  };
  const xml = form4972.build(fields, { filer, pending });
  assertStringIncludes(
    xml,
    "<LumpSumDistriOrdinaryIncmAmt>40000</LumpSumDistriOrdinaryIncmAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpSumDistriDeathBnftExclAmt>5000</LumpSumDistriDeathBnftExclAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpSumRsdlAnnuityAvgTaxAmt>1675</LumpSumRsdlAnnuityAvgTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpSumDistriMultRecipientsCd>MRD</LumpSumDistriMultRecipientsCd>",
  );
  assertThrows(
    () => form4972.build({ ...fields, line9: 2_500 }, { filer, pending }),
    Error,
    "sourced 2025 calculation",
  );
  assertThrows(
    () =>
      form4972.build({
        ...fields,
        death_benefit_recipient_allocated_amount: 2_000,
      }, { filer, pending }),
    Error,
    "matching the full exclusion and recipient allocation",
  );
  assertThrows(
    () =>
      form4972.build(fields, {
        filer,
        pending: {
          ...pending,
          f1099r: {
            f1099rs: [{
              ...pending.f1099r.f1099rs[0],
              box9a_pct_total: 40,
            }],
          },
        },
      }),
    Error,
    "partial share differs from Form 1099-R",
  );
});

Deno.test("Form 4972 MeF reconciles a partial beneficiary's Part II and III death-benefit allocation", () => {
  const source = {
    ...qualified,
    recipient: TS.T,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    prior_beneficiary_election_after_1986: false,
    participant_died_before_1996_08_21: true,
    lump_sum_amount: 20_000,
    capital_gain_amount: 4_000,
    recipient_share_pct: 50,
    death_benefit_exclusion: 5_000,
    death_benefit_recipient_allocated_amount: 2_500,
    death_benefit_exclusion_source_reference:
      "Plan administrator beneficiary exclusion allocation",
    elect_capital_gain: true,
    elect_10yr_averaging: true,
  };
  const fields = form4972Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form4972InputSchema.parse(source),
  ).outputs[0].fields;
  const pending = {
    f1099r: {
      f1099rs: [{
        payer_name: "Qualified Plan",
        payer_ein: "123456789",
        box1_gross_distribution: 20_000,
        box2a_taxable_amount: 20_000,
        box3_capital_gain: 4_000,
        box7_distribution_code: DistributionCode.CodeA,
        box9a_pct_total: 50,
        ts: TS.T,
        exclude_4972: true,
      }],
    },
    f1040: { form4972_tax: fields.line30 },
  };
  const xml = form4972.build(fields, { filer, pending });
  assertStringIncludes(
    xml,
    "<CapitalGainElectionAmt>3500</CapitalGainElectionAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpSumDistriDeathBnftExclAmt>4000</LumpSumDistriDeathBnftExclAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpSumRsdlAnnuityAvgTaxAmt>1115</LumpSumRsdlAnnuityAvgTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpSumDistributionTaxAmt>1815</LumpSumDistributionTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpSumDistriMultRecipientsCd>MRD</LumpSumDistriMultRecipientsCd>",
  );
  assertThrows(
    () => form4972.build({ ...fields, line9: 2_000 }, { filer, pending }),
    Error,
    "sourced 2025 calculation",
  );
  assertThrows(
    () =>
      form4972.build(fields, {
        filer,
        pending: {
          ...pending,
          f1099r: {
            f1099rs: [{ ...pending.f1099r.f1099rs[0], box9a_pct_total: 40 }],
          },
        },
      }),
    Error,
    "partial share differs from Form 1099-R",
  );
});

Deno.test("Form 4972 MeF reconciles partial-share Part II plus Part III", () => {
  const { fields, pending } = partialRecipientCase(4_000);
  const xml = form4972.build(fields, { filer, pending });
  assertStringIncludes(
    xml,
    "<CapitalGainElectionAmt>4000</CapitalGainElectionAmt>",
  );
  assertStringIncludes(
    xml,
    "<CapitalGainTimesElectionPctAmt>800</CapitalGainTimesElectionPctAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpSumDistriOrdinaryIncmAmt>32000</LumpSumDistriOrdinaryIncmAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpSumRsdlAnnuityAvgTaxAmt>1420</LumpSumRsdlAnnuityAvgTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpSumDistributionTaxAmt>2220</LumpSumDistributionTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpSumDistriMultRecipientsCd>MRD</LumpSumDistriMultRecipientsCd>",
  );
  assertThrows(
    () => form4972.build({ ...fields, line8: 36_000 }, { filer, pending }),
    Error,
    "sourced 2025 calculation",
  );
});

Deno.test("Form 4972 MeF keeps a partial-share Part-II-only election on the recipient's return", () => {
  const source = {
    ...qualified,
    recipient: TS.T,
    lump_sum_amount: 20_000,
    capital_gain_amount: 4_000,
    recipient_share_pct: 50,
    elect_capital_gain: true,
  };
  const fields = form4972Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form4972InputSchema.parse(source),
  ).outputs[0].fields;
  const pending = {
    f1099r: {
      f1099rs: [{
        payer_name: "Qualified Plan",
        payer_ein: "123456789",
        box1_gross_distribution: 20_000,
        box2a_taxable_amount: 20_000,
        box3_capital_gain: 4_000,
        box7_distribution_code: DistributionCode.CodeA,
        box9a_pct_total: 50,
        ts: TS.T,
        exclude_4972: true,
      }],
    },
    f1040: { form4972_tax: 800, line5b_pension_taxable: 16_000 },
  };
  const xml = form4972.build(fields, { filer, pending });
  assertStringIncludes(
    xml,
    "<CapitalGainElectionAmt>4000</CapitalGainElectionAmt>",
  );
  assertStringIncludes(
    xml,
    "<CapitalGainTimesElectionPctAmt>800</CapitalGainTimesElectionPctAmt>",
  );
  assertEquals(xml.includes("<LumpSumDistriOrdinaryIncmAmt"), false);
  assertEquals(xml.includes("<LumpSumDistriMultRecipientsCd>"), false);
  assertThrows(
    () =>
      form4972.build(fields, {
        filer,
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line5b_pension_taxable: 15_999 },
        },
      }),
    Error,
    "ordinary income is missing",
  );
});

Deno.test("Form 4972 MeF writes a shared annuity using box 8 percentage", () => {
  const { fields: noAnnuity, pending } = partialRecipientCase();
  const source = {
    ...noAnnuity,
    annuity_actuarial_value: 2_000,
    annuity_share_pct: 25,
  };
  const fields = form4972Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form4972InputSchema.parse(source),
  ).outputs[0].fields;
  const sourceItem = pending.f1099r.f1099rs[0];
  const sourcedPending = {
    ...pending,
    f1099r: {
      f1099rs: [{ ...sourceItem, box8_other: 2_000, box8_pct_total: 25 }],
    },
    f1040: { form4972_tax: fields.line30 },
  };
  const xml = form4972.build(fields, { filer, pending: sourcedPending });
  assertStringIncludes(
    xml,
    "<AnnuityActuarialValueAmt>8000</AnnuityActuarialValueAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpSumDistriMultRecipientsCd>MRD</LumpSumDistriMultRecipientsCd>",
  );
  assertThrows(
    () =>
      form4972.build(fields, {
        filer,
        pending: {
          ...sourcedPending,
          f1099r: {
            f1099rs: [{ ...sourceItem, box8_other: 2_000, box8_pct_total: 50 }],
          },
        },
      }),
    Error,
    "8 amount/percentage",
  );
});

Deno.test("Form 4972 MeF rejects a mismatched box 9a share or return tax", () => {
  const { fields, pending } = partialRecipientCase();
  assertThrows(
    () =>
      form4972.build({ ...fields, recipient_share_pct: 40 }, {
        filer,
        pending,
      }),
    Error,
    "boxes 2a, 3, 6, 8 amount/percentage, or 9a",
  );
  assertThrows(
    () =>
      form4972.build(fields, {
        filer,
        pending: { ...pending, f1040: { form4972_tax: 2_094 } },
      }),
    Error,
    "Form 1040 tax source",
  );
});

const filer: FilerIdentity = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  filingStatus: FilingStatus.MarriedFilingJointly,
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  spouse: {
    ssn: "987654321",
    firstName: "Sam",
    lastName: "Taxpayer",
    nameControl: "TAXP",
  },
};

const qualified = {
  born_before_1936: true,
  entire_balance_distributed: true,
  rolled_over_any: false,
  beneficiary_distribution: false,
  participant_five_year_member: true,
  prior_election_after_1986: false,
};

function fullShareCase(
  recipient: TS,
  taxable: number,
  capitalGain: number,
  averaging: boolean,
  beneficiary = false,
) {
  const source = {
    ...qualified,
    recipient,
    lump_sum_amount: taxable,
    capital_gain_amount: capitalGain,
    elect_capital_gain: capitalGain > 0,
    elect_10yr_averaging: averaging,
    ...(beneficiary
      ? {
        beneficiary_distribution: true,
        participant_five_year_member: false,
        prior_election_after_1986: true,
        prior_beneficiary_election_after_1986: false,
      }
      : {}),
  };
  const fields = form4972Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form4972InputSchema.parse(source),
  ).outputs[0].fields;
  const pending = {
    f1099r: {
      f1099rs: [{
        payer_name: "Qualified Plan",
        payer_ein: "123456789",
        box1_gross_distribution: taxable,
        box2a_taxable_amount: taxable,
        ...(capitalGain > 0 ? { box3_capital_gain: capitalGain } : {}),
        box7_distribution_code: DistributionCode.CodeA,
        ts: recipient,
        exclude_4972: true,
      }],
    },
    f1040: {
      form4972_tax: averaging ? fields.line30 : fields.line7,
      ...(averaging ? {} : { line5b_pension_taxable: taxable - capitalGain }),
    },
  };
  return { fields, pending };
}

const electedNua1099r = {
  f1099rs: [{
    payer_name: "Qualified Plan",
    payer_ein: "123456789",
    box1_gross_distribution: 100_000,
    box2a_taxable_amount: 100_000,
    box3_capital_gain: 30_000,
    box6_nua: 20_000,
    box7_distribution_code: DistributionCode.CodeA,
    box9a_pct_total: 100,
    ts: TS.T,
    exclude_4972: true,
  }],
};

const electedNuaFields = {
  ...qualified,
  recipient: TS.T,
  lump_sum_amount: 100_000,
  capital_gain_amount: 30_000,
  box6_nua: 20_000,
  elect_include_nua: true,
  elect_capital_gain: true,
  elect_10yr_averaging: true,
  line6: 36_000,
  line6_nua_capital_gain: 6_000,
  line7: 7_200,
  line8: 84_000,
  line8_nua_included: 14_000,
  line30: 20_000,
};

Deno.test("Form 4972 rejects source facts without calculated form lines", () => {
  assertThrows(
    () => form4972.build({ lump_sum_amount: 100_000 }),
    Error,
    "source facts but no calculated form lines",
  );
  assertEquals(form4972.build({}), "");
});

Deno.test("Form 4972 emits recipient identity and the 2025 Part II element names", () => {
  const { fields, pending } = fullShareCase(TS.T, 100_000, 10_000, false);
  const xml = form4972.build(
    fields,
    { filer, pending },
  );
  assertStringIncludes(xml, "<PersonNm>Alex Taxpayer</PersonNm>");
  assertStringIncludes(xml, "<SSN>123456789</SSN>");
  assertStringIncludes(
    xml,
    "<CapitalGainElectionAmt>10000</CapitalGainElectionAmt>",
  );
  assertStringIncludes(
    xml,
    "<CapitalGainTimesElectionPctAmt>2000</CapitalGainTimesElectionPctAmt>",
  );
  assertEquals(xml.includes("<LumpSumDistriAmt>"), false);
});

Deno.test("Form 4972 spouse recipient is distinct from the taxpayer", () => {
  const { fields, pending } = fullShareCase(TS.S, 90_000, 0, true);
  const xml = form4972.build(
    fields,
    { filer, pending },
  );
  assertStringIncludes(xml, "<PersonNm>Sam Taxpayer</PersonNm>");
  assertStringIncludes(xml, "<SSN>987654321</SSN>");
  assertStringIncludes(
    xml,
    "<LumpSumDistriOrdinaryIncmAmt>90000</LumpSumDistriOrdinaryIncmAmt>",
  );
  assertStringIncludes(
    xml,
    `<LumpSumDistributionTaxAmt>${fields.line30}</LumpSumDistributionTaxAmt>`,
  );
});

Deno.test("Form 4972 MeF keeps own-plan and beneficiary prior elections separate", () => {
  const { fields, pending } = fullShareCase(TS.T, 10_000, 0, true, true);
  const xml = form4972.build(
    fields,
    { filer, pending },
  );
  assertEquals(xml.includes("<PriorYearDistributionInd>"), false);
  assertStringIncludes(
    xml,
    "<BeneficiaryDistributionInd>false</BeneficiaryDistributionInd>",
  );
});

Deno.test("Form 4972 full-share ordinary election needs elected source, computed lines, and Form 1040 tax", () => {
  const { fields, pending } = fullShareCase(TS.T, 30_000, 5_000, true);
  assertStringIncludes(
    form4972.build(fields, { filer, pending }),
    `<LumpSumDistributionTaxAmt>${fields.line30}</LumpSumDistributionTaxAmt>`,
  );
  assertThrows(
    () => form4972.build(fields, { filer }),
    Error,
    "one matching elected Form 1099-R",
  );
  assertThrows(
    () =>
      form4972.build({ ...fields, line24: (fields.line24 as number) + 1 }, {
        filer,
        pending,
      }),
    Error,
    "full-share lines differ",
  );
  assertThrows(
    () =>
      form4972.build(fields, {
        filer,
        pending: {
          ...pending,
          f1040: { form4972_tax: (fields.line30 as number) + 1 },
        },
      }),
    Error,
    "special tax differs from the finalized Form 1040",
  );
  const partII = fullShareCase(TS.T, 100_000, 10_000, false);
  assertThrows(
    () =>
      form4972.build(partII.fields, {
        filer,
        pending: {
          ...partII.pending,
          f1040: { form4972_tax: partII.fields.line7 },
        },
      }),
    Error,
    "Part-II ordinary income is missing",
  );
});

Deno.test("Form 4972 MeF reconciles a beneficiary's Part-II-only estate election", () => {
  const source = {
    ...qualified,
    recipient: TS.T,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    prior_election_after_1986: true,
    prior_beneficiary_election_after_1986: false,
    lump_sum_amount: 100_000,
    capital_gain_amount: 30_000,
    federal_estate_tax: 4_000,
    death_benefit_exclusion: 5_000,
    participant_died_before_1996_08_21: true,
    elect_capital_gain: true,
  };
  const fields = form4972Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form4972InputSchema.parse(source),
  ).outputs[0].fields;
  const pending = {
    f1099r: {
      f1099rs: [{
        payer_name: "Qualified Plan",
        payer_ein: "123456789",
        box1_gross_distribution: 100_000,
        box2a_taxable_amount: 100_000,
        box3_capital_gain: 30_000,
        box7_distribution_code: DistributionCode.CodeA,
        ts: TS.T,
        exclude_4972: true,
      }],
    },
    f1040: { form4972_tax: 5_460 },
  };
  const xml = form4972.build(fields, { filer, pending });
  assertStringIncludes(
    xml,
    "<CapitalGainElectionAmt>27300</CapitalGainElectionAmt>",
  );
  assertStringIncludes(
    xml,
    "<CapitalGainTimesElectionPctAmt>5460</CapitalGainTimesElectionPctAmt>",
  );
  assertStringIncludes(
    xml,
    "<BeneficiaryDistributionInd>false</BeneficiaryDistributionInd>",
  );
  assertEquals(xml.includes("<PriorYearDistributionInd>"), false);
  assertEquals(xml.includes("<LumpDistribFederalEstateTaxAmt>"), false);
  assertThrows(
    () =>
      form4972.build({ ...fields, line6: 28_500, line7: 5_700 }, {
        filer,
        pending,
      }),
    Error,
    "estate lines or Form 1040 tax differ",
  );
  assertThrows(
    () =>
      form4972.build(fields, {
        filer,
        pending: { ...pending, f1040: { form4972_tax: 5_700 } },
      }),
    Error,
    "estate lines or Form 1040 tax differ",
  );
});

Deno.test("Form 4972 writes elected NUA amounts on lines 6 and 8", () => {
  const xml = form4972.build(
    electedNuaFields,
    { filer, pending: { f1099r: electedNua1099r } },
  );
  assertStringIncludes(
    xml,
    '<CapitalGainElectionAmt capitalGainElectionNUAAmt="6000" capitalGainElectionNUACd="NUA">36000</CapitalGainElectionAmt>',
  );
  assertStringIncludes(
    xml,
    '<LumpSumDistriOrdinaryIncmAmt netUnrealizedAppreciationAmt="14000" netUnrealizedAppreciationCd="NUA">84000</LumpSumDistriOrdinaryIncmAmt>',
  );
});

Deno.test("Form 4972 MeF reconciles full-share beneficiary NUA, death benefit, and estate tax", () => {
  const source = {
    ...qualified,
    recipient: TS.T,
    lump_sum_amount: 100_000,
    capital_gain_amount: 30_000,
    box6_nua: 20_000,
    elect_include_nua: true,
    death_benefit_exclusion: 5_000,
    federal_estate_tax: 4_000,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    prior_beneficiary_election_after_1986: false,
    participant_died_before_1996_08_21: true,
    elect_capital_gain: true,
    elect_10yr_averaging: true,
  };
  const fields = form4972Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form4972InputSchema.parse(source),
  ).outputs[0].fields;
  const pending = {
    f1099r: electedNua1099r,
    f1040: { form4972_tax: fields.line30 },
  };
  const xml = form4972.build(fields, { filer, pending });
  assertStringIncludes(xml, 'capitalGainElectionNUAAmt="6000"');
  assertStringIncludes(xml, ">33300</CapitalGainElectionAmt>");
  assertStringIncludes(xml, ">3500</LumpSumDistriDeathBnftExclAmt>");
  assertStringIncludes(xml, ">2800</LumpDistribFederalEstateTaxAmt>");
  assertThrows(
    () => form4972.build({ ...fields, line6: 33_301 }, { filer, pending }),
    Error,
    "NUA death/estate allocation differs",
  );
  assertThrows(
    () =>
      form4972.build({ ...fields, line6_nua_capital_gain: 5_999 }, {
        filer,
        pending,
      }),
    Error,
    "NUA death/estate allocation differs",
  );
  assertThrows(
    () =>
      form4972.build(fields, {
        filer,
        pending: { ...pending, f1040: { form4972_tax: 1 } },
      }),
    Error,
    "NUA death/estate allocation differs",
  );
  assertThrows(
    () =>
      form4972.build({ ...fields, recipient_share_pct: 50 }, {
        filer,
        pending,
      }),
    Error,
    "box 9a share differs",
  );
  assertThrows(
    () =>
      form4972.build({ ...fields, recipient_share_pct: 50 }, {
        filer,
        pending: {
          ...pending,
          f1099r: {
            f1099rs: [{ ...electedNua1099r.f1099rs[0], box9a_pct_total: 50 }],
          },
        },
      }),
    Error,
    "death/estate allocation needs a full-share beneficiary",
  );
});

Deno.test("Form 4972 MeF keeps full-share Part-II NUA estate deduction off Form 4972 line 18", () => {
  const source = {
    ...qualified,
    recipient: TS.T,
    lump_sum_amount: 100_000,
    capital_gain_amount: 30_000,
    box6_nua: 20_000,
    elect_include_nua: true,
    federal_estate_tax: 4_000,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    prior_beneficiary_election_after_1986: false,
    elect_capital_gain: true,
  };
  const fields = form4972Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form4972InputSchema.parse(source),
  ).outputs[0].fields;
  const pending = {
    f1099r: electedNua1099r,
    f1040: { form4972_tax: fields.line7, line5b_pension_taxable: 84_000 },
  };
  const xml = form4972.build(fields, { filer, pending });
  assertStringIncludes(xml, ">34800</CapitalGainElectionAmt>");
  assertEquals(xml.includes("<LumpDistribFederalEstateTaxAmt>"), false);
  assertThrows(
    () =>
      form4972.build(fields, {
        filer,
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line5b_pension_taxable: 83_999 },
        },
      }),
    Error,
    "NUA death/estate allocation differs",
  );
});

Deno.test("Form 4972 Part-II-only NUA links its capital note and ordinary pension income", () => {
  const fields = {
    ...electedNuaFields,
    elect_10yr_averaging: false,
    line8: undefined,
    line8_nua_included: undefined,
    line30: undefined,
  };
  const pending = {
    f1099r: electedNua1099r,
    f1040: {
      form4972_tax: 7_200,
      line5b_pension_taxable: 84_000,
    },
  };
  const xml = form4972.build(fields, { filer, pending });
  assertStringIncludes(
    xml,
    '<CapitalGainElectionAmt capitalGainElectionNUAAmt="6000" capitalGainElectionNUACd="NUA">36000</CapitalGainElectionAmt>',
  );
  assertEquals(xml.includes("<LumpSumDistriOrdinaryIncmAmt"), false);
  assertThrows(
    () =>
      form4972.build(fields, {
        filer,
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line5b_pension_taxable: 70_000 },
        },
      }),
    Error,
    "ordinary income and special tax on Form 1040",
  );
  assertThrows(
    () =>
      form4972.build(fields, {
        filer,
        pending: {
          ...pending,
          f1099r: {
            f1099rs: [{ ...electedNua1099r.f1099rs[0], box9a_pct_total: 50 }],
          },
        },
      }),
    Error,
    "box 9a share",
  );
});

Deno.test("Form 4972 MeF emits partial-share Part-II-only NUA without MRD", () => {
  const source = {
    ...qualified,
    recipient: TS.T,
    lump_sum_amount: 100_000,
    capital_gain_amount: 30_000,
    box6_nua: 20_000,
    recipient_share_pct: 50,
    elect_include_nua: true,
    elect_capital_gain: true,
  };
  const fields = form4972Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form4972InputSchema.parse(source),
  ).outputs[0].fields;
  const pending = {
    f1099r: {
      f1099rs: [{
        ...electedNua1099r.f1099rs[0],
        box9a_pct_total: 50,
      }],
    },
    f1040: { form4972_tax: 7_200, line5b_pension_taxable: 84_000 },
  };
  const xml = form4972.build(fields, { filer, pending });
  assertStringIncludes(
    xml,
    '<CapitalGainElectionAmt capitalGainElectionNUAAmt="6000" capitalGainElectionNUACd="NUA">36000</CapitalGainElectionAmt>',
  );
  assertEquals(xml.includes("<LumpSumDistriOrdinaryIncmAmt"), false);
  assertEquals(xml.includes("<LumpSumDistriMultRecipientsCd>"), false);
  assertThrows(
    () =>
      form4972.build(fields, {
        filer,
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line5b_pension_taxable: 83_999 },
        },
      }),
    Error,
    "recipient ordinary income",
  );
  assertThrows(
    () =>
      form4972.build({ ...fields, line6: 36_001 }, {
        filer,
        pending,
      }),
    Error,
    "worksheet does not reconcile",
  );
});

Deno.test("Form 4972 MeF reconciles partial-share NUA and prints MRD", () => {
  const source = {
    ...qualified,
    recipient: TS.T,
    lump_sum_amount: 100_000,
    capital_gain_amount: 30_000,
    box6_nua: 20_000,
    recipient_share_pct: 50,
    elect_include_nua: true,
    elect_capital_gain: true,
    elect_10yr_averaging: true,
  };
  const fields = form4972Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form4972InputSchema.parse(source),
  ).outputs[0].fields;
  const item = {
    ...electedNua1099r.f1099rs[0],
    box9a_pct_total: 50,
  };
  const pending = {
    f1099r: { f1099rs: [item] },
    f1040: { form4972_tax: fields.line30 },
  };
  const xml = form4972.build(fields, { filer, pending });
  assertStringIncludes(
    xml,
    '<CapitalGainElectionAmt capitalGainElectionNUAAmt="6000" capitalGainElectionNUACd="NUA">36000</CapitalGainElectionAmt>',
  );
  assertStringIncludes(
    xml,
    '<LumpSumDistriOrdinaryIncmAmt netUnrealizedAppreciationAmt="28000" netUnrealizedAppreciationCd="NUA">168000</LumpSumDistriOrdinaryIncmAmt>',
  );
  assertStringIncludes(
    xml,
    "<LumpSumDistriMultRecipientsCd>MRD</LumpSumDistriMultRecipientsCd>",
  );
  assertThrows(
    () =>
      form4972.build({ ...fields, line8_nua_included: 14_000 }, {
        filer,
        pending,
      }),
    Error,
    "NUA worksheet does not reconcile with lines 6 through 8",
  );
});

Deno.test("Form 4972 MeF writes Part-III-only partial-share NUA on line 8", () => {
  const source = {
    ...qualified,
    recipient: TS.T,
    lump_sum_amount: 100_000,
    capital_gain_amount: 30_000,
    box6_nua: 20_000,
    recipient_share_pct: 50,
    elect_include_nua: true,
    elect_10yr_averaging: true,
  };
  const fields = form4972Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form4972InputSchema.parse(source),
  ).outputs[0].fields;
  const pending = {
    f1099r: {
      f1099rs: [{ ...electedNua1099r.f1099rs[0], box9a_pct_total: 50 }],
    },
    f1040: { form4972_tax: fields.line30 },
  };
  const xml = form4972.build(fields, { filer, pending });
  assertStringIncludes(
    xml,
    '<LumpSumDistriOrdinaryIncmAmt netUnrealizedAppreciationAmt="40000" netUnrealizedAppreciationCd="NUA">240000</LumpSumDistriOrdinaryIncmAmt>',
  );
  assertEquals(xml.includes("<CapitalGainElectionAmt"), false);
  assertStringIncludes(
    xml,
    "<LumpSumDistriMultRecipientsCd>MRD</LumpSumDistriMultRecipientsCd>",
  );
  assertThrows(
    () =>
      form4972.build({ ...fields, line8_nua_included: 20_000 }, {
        filer,
        pending,
      }),
    Error,
    "NUA worksheet does not reconcile with lines 6 through 8",
  );
});

Deno.test("Form 4972 refuses NUA without a matching source Form 1099-R", () => {
  assertThrows(
    () => form4972.build(electedNuaFields, { filer }),
    Error,
    "needs the source Form 1099-R",
  );
  assertThrows(
    () =>
      form4972.build(electedNuaFields, {
        filer,
        pending: {
          f1099r: {
            f1099rs: [{ ...electedNua1099r.f1099rs[0], box6_nua: 19_000 }],
          },
        },
      }),
    Error,
    "source amounts differ",
  );
});

Deno.test("Form 4972 refuses a mismatched NUA worksheet or partial recipient share", () => {
  assertThrows(
    () =>
      form4972.build({ ...electedNuaFields, line8_nua_included: 13_000 }, {
        filer,
        pending: { f1099r: electedNua1099r },
      }),
    Error,
    "worksheet does not reconcile",
  );
  assertThrows(
    () =>
      form4972.build(electedNuaFields, {
        filer,
        pending: {
          f1099r: {
            f1099rs: [{ ...electedNua1099r.f1099rs[0], box9a_pct_total: 50 }],
          },
        },
      }),
    Error,
    "box 9a share",
  );
});

Deno.test("Form 4972 rejects NUA attributes without their form lines", () => {
  assertThrows(
    () =>
      form4972.build(
        { ...qualified, recipient: TS.T, line7: 1, line6_nua_capital_gain: 1 },
        { filer },
      ),
    Error,
    "capital NUA needs line 6",
  );
});

Deno.test("Form 4972 refuses to guess which recipient owns the distribution", () => {
  assertThrows(
    () => form4972.build({ ...qualified, line7: 2_000 }, { filer }),
    Error,
    "requires the recipient",
  );
});
