import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { DistributionCode } from "../../../nodes/inputs/f1099r/index.ts";
import {
  form4972 as node,
  inputSchema,
} from "../../../nodes/intermediate/forms/form4972/index.ts";
import { TS } from "../../../nodes/types.ts";
import { form4972NuaAnnotations, form4972Pdf } from "../../pdf/forms/f4972.ts";
import { form4972 as mef } from "./f4972.ts";

const eligibility = {
  born_before_1936: true,
  entire_balance_distributed: true,
  rolled_over_any: false,
  beneficiary_distribution: false,
  participant_five_year_member: true,
  prior_election_after_1986: false,
};
const source = {
  ...eligibility,
  recipient: TS.T,
  lump_sum_amount: 30_000,
  capital_gain_amount: 10_000,
  box6_nua: 6_000,
  elect_include_nua: true,
  annuity_actuarial_value: 5_000,
  elect_capital_gain: true,
  elect_10yr_averaging: true,
};
const filer = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  filingStatus: FilingStatus.Single,
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
};

function calculated(input: Record<string, unknown>) {
  return node.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(input),
  ).outputs[0].fields;
}

function pending(tax: number, box8 = 5_000) {
  return {
    general: {
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123456789",
    },
    f1099r: {
      f1099rs: [{
        payer_name: "Qualified Plan",
        payer_ein: "123456789",
        box1_gross_distribution: 36_000,
        box2a_taxable_amount: 30_000,
        box3_capital_gain: 10_000,
        box6_nua: 6_000,
        box8_other: box8,
        box7_distribution_code: DistributionCode.CodeA,
        box9a_pct_total: 100,
        ts: TS.T,
        exclude_4972: true,
      }],
    },
    f1040: { form4972_tax: tax },
  };
}

Deno.test("Form 4972 full-share NUA plus annuity reconciles source, native XML, and PDF", () => {
  const fields = calculated(source);
  assertEquals(fields.line6, 12_000);
  assertEquals(fields.line6_nua_capital_gain, 2_000);
  assertEquals(fields.line8, 24_000);
  assertEquals(fields.line8_nua_included, 4_000);
  assertEquals(fields.line11, 5_000);
  const allPending = pending(fields.line30 as number);
  const xml = mef.build(fields, { filer, pending: allPending });
  assertStringIncludes(
    xml,
    "<AnnuityActuarialValueAmt>5000</AnnuityActuarialValueAmt>",
  );
  assertStringIncludes(xml, 'capitalGainElectionNUAAmt="2000"');
  assertStringIncludes(xml, 'netUnrealizedAppreciationAmt="4000"');
  const projected = form4972Pdf.projectFields?.(fields, allPending);
  assertEquals(projected?.line11, 5_000);
  assertEquals(form4972NuaAnnotations(projected ?? {}), [
    { amount: 2_000, y: 485 },
    { amount: 4_000, y: 390 },
  ]);
});

Deno.test("Form 4972 full-share beneficiary NUA, annuity, and allocations reconcile", () => {
  const beneficiary = {
    ...source,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    prior_election_after_1986: undefined,
    prior_beneficiary_election_after_1986: false,
    participant_died_before_1996_08_21: true,
    death_benefit_exclusion: 2_000,
    federal_estate_tax: 1_000,
  };
  const fields = calculated(beneficiary);
  assertEquals(fields.line6, 11_000);
  assertEquals(fields.line9, 1_333);
  assertEquals(fields.line11, 5_000);
  assertEquals(fields.line18, 667);
  const allPending = pending(fields.line30 as number);
  const xml = mef.build(fields, { filer, pending: allPending });
  assertStringIncludes(
    xml,
    "<AnnuityActuarialValueAmt>5000</AnnuityActuarialValueAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpSumDistriDeathBnftExclAmt>1333</LumpSumDistriDeathBnftExclAmt>",
  );
  const projected = form4972Pdf.projectFields?.(fields, allPending);
  assertEquals(projected?.line11, 5_000);
  assertEquals(projected?.line18, 667);
  assertEquals(form4972NuaAnnotations(projected ?? {}), [
    { amount: 2_000, y: 485 },
    { amount: 4_000, y: 390 },
  ]);
  assertThrows(
    () => mef.build({ ...fields, line18: 666 }, { filer, pending: allPending }),
    Error,
    "NUA death/estate allocation differs",
  );
  assertThrows(
    () => form4972Pdf.projectFields?.({ ...fields, line11: 4_999 }, allPending),
    Error,
    "Part III lines do not reconcile",
  );
  assertThrows(
    () =>
      mef.build(fields, {
        filer,
        pending: pending(fields.line30 as number, 4_999),
      }),
    Error,
    "death/estate allocation needs a full-share beneficiary",
  );
  assertThrows(
    () =>
      mef.build(fields, {
        filer,
        pending: {
          ...allPending,
          f1040: { form4972_tax: (fields.line30 as number) - 1 },
        },
      }),
    Error,
    "Form 1040",
  );
  assertThrows(
    () =>
      mef.build(calculated({ ...beneficiary, elect_10yr_averaging: false }), {
        filer,
        pending: allPending,
      }),
    Error,
    "Part III when an annuity is present",
  );
  const fractional = calculated({ ...beneficiary, capital_gain_amount: 9_999 });
  const fractionalPending = pending(fractional.line30 as number);
  assertThrows(
    () =>
      mef.build(fractional, {
        filer,
        pending: {
          ...fractionalPending,
          f1099r: {
            f1099rs: [{
              ...fractionalPending.f1099r.f1099rs[0],
              box3_capital_gain: 9_999,
            }],
          },
        },
      }),
    Error,
    "exact NUA capital allocation",
  );
});

Deno.test("Form 4972 NUA plus annuity rejects altered box 8, line 11, tax, or partial share", () => {
  const fields = calculated(source);
  const allPending = pending(fields.line30 as number);
  assertThrows(
    () =>
      mef.build(fields, {
        filer,
        pending: pending(fields.line30 as number, 4_999),
      }),
    Error,
    "sourced Part II or III",
  );
  assertThrows(
    () =>
      mef.build({ ...fields, line11: 4_999 }, { filer, pending: allPending }),
    Error,
    "annuity lines differ",
  );
  assertThrows(
    () =>
      form4972Pdf.projectFields?.(fields, {
        ...allPending,
        f1040: { form4972_tax: (fields.line30 as number) - 1 },
      }),
    Error,
    "Form 1040 tax",
  );
  assertThrows(
    () =>
      node.compute(
        { taxYear: 2025, formType: "f1040" },
        inputSchema.parse({ ...source, recipient_share_pct: 50 }),
      ),
    Error,
    "partial box 9a share",
  );
  const roundedFields = calculated({ ...source, capital_gain_amount: 9_999 });
  const roundedPending = pending(roundedFields.line30 as number);
  assertThrows(
    () =>
      mef.build(roundedFields, {
        filer,
        pending: {
          ...roundedPending,
          f1099r: {
            f1099rs: [{
              ...roundedPending.f1099r.f1099rs[0],
              box3_capital_gain: 9_999,
            }],
          },
        },
      }),
    Error,
    "exact NUA capital allocation",
  );
});

Deno.test("Form 4972 Part-III-only full-share NUA plus annuity omits Part II", () => {
  const fields = calculated({ ...source, elect_capital_gain: false });
  assertEquals(fields.line6, undefined);
  assertEquals(fields.line8, 36_000);
  assertEquals(fields.line8_nua_included, 6_000);
  const xml = mef.build(fields, {
    filer,
    pending: pending(fields.line30 as number),
  });
  assertEquals(xml.includes("CapitalGainElectionAmt"), false);
  assertStringIncludes(
    xml,
    "<AnnuityActuarialValueAmt>5000</AnnuityActuarialValueAmt>",
  );
});

Deno.test("Form 4972 partial NUA and annuity reconciles both source percentages", () => {
  const selected = {
    ...source,
    annuity_actuarial_value: 2_000,
    annuity_share_pct: 25,
    recipient_share_pct: 50,
  };
  const fields = calculated(selected);
  const original = pending(fields.line30 as number, 2_000);
  const item = original.f1099r.f1099rs[0];
  const sourced = {
    ...original,
    f1099r: { f1099rs: [{ ...item, box8_pct_total: 25, box9a_pct_total: 50 }] },
  };
  assertEquals(fields.line6, 12_000);
  assertEquals(fields.line8, 48_000);
  assertEquals(fields.line8_nua_included, 8_000);
  assertEquals(fields.line11, 8_000);
  assertEquals(
    fields.line29,
    Math.round(
      ((fields.line25 as number) - (fields.line28 as number)) * 0.5,
    ),
  );
  const xml = mef.build(fields, { filer, pending: sourced });
  assertStringIncludes(
    xml,
    "<AnnuityActuarialValueAmt>8000</AnnuityActuarialValueAmt>",
  );
  assertStringIncludes(xml, 'netUnrealizedAppreciationAmt="8000"');
  assertStringIncludes(
    xml,
    "<LumpSumDistriMultRecipientsCd>MRD</LumpSumDistriMultRecipientsCd>",
  );
  const projected = form4972Pdf.projectFields?.(fields, sourced);
  assertEquals(projected?.line11, 8_000);
  assertEquals(form4972NuaAnnotations(projected ?? {}), [
    { amount: 2_000, y: 485 },
    { amount: 8_000, y: 390 },
  ]);
  assertThrows(
    () =>
      mef.build(fields, {
        filer,
        pending: {
          ...sourced,
          f1099r: {
            f1099rs: [{ ...item, box8_pct_total: 50, box9a_pct_total: 50 }],
          },
        },
      }),
    Error,
    "box 8",
  );
  assertThrows(
    () =>
      mef.build(fields, {
        filer,
        pending: {
          ...sourced,
          f1099r: { f1099rs: [{ ...item, box9a_pct_total: 50 }] },
        },
      }),
    Error,
    "box 8",
  );
  assertThrows(
    () =>
      form4972Pdf.projectFields?.(fields, {
        ...sourced,
        f1099r: {
          f1099rs: [{ ...item, box8_pct_total: 25, box9a_pct_total: 40 }],
        },
      }),
    Error,
    "9a",
  );
  assertThrows(
    () => mef.build({ ...fields, line11: 2_000 }, { filer, pending: sourced }),
    Error,
    "lines",
  );
  assertThrows(
    () =>
      form4972Pdf.projectFields?.({
        ...fields,
        line8_nua_included: 6_000,
      }, sourced),
    Error,
    "NUA worksheet",
  );
  assertThrows(
    () =>
      mef.build(fields, {
        filer,
        pending: {
          ...sourced,
          f1040: { form4972_tax: (fields.line30 as number) - 1 },
        },
      }),
    Error,
    "Form 1040 tax",
  );
});

Deno.test("Form 4972 Part-III-only partial NUA and annuity omits Part II", () => {
  const selected = {
    ...source,
    annuity_actuarial_value: 2_000,
    annuity_share_pct: 25,
    recipient_share_pct: 50,
    elect_capital_gain: false,
  };
  const fields = calculated(selected);
  const original = pending(fields.line30 as number, 2_000);
  const item = original.f1099r.f1099rs[0];
  const sourced = {
    ...original,
    f1099r: { f1099rs: [{ ...item, box8_pct_total: 25, box9a_pct_total: 50 }] },
  };
  assertEquals(fields.line6, undefined);
  assertEquals(fields.line8, 72_000);
  assertEquals(fields.line8_nua_included, 12_000);
  assertEquals(fields.line11, 8_000);
  const xml = mef.build(fields, { filer, pending: sourced });
  assertEquals(xml.includes("CapitalGainElectionAmt"), false);
  assertStringIncludes(xml, 'netUnrealizedAppreciationAmt="12000"');
  assertEquals(form4972Pdf.projectFields?.(fields, sourced)?.line11, 8_000);
});
