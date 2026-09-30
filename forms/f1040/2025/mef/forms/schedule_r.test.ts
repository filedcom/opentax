import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../nodes/types.ts";
import { scheduleR } from "./schedule_r.ts";

const source = {
  filing_status: FilingStatus.Single,
  taxpayer_age_65_or_older: true,
  age_65_source_reference: "Taxpayer date of birth on ID",
  agi: 7_000,
  nontaxable_ssa: 0,
  nontaxable_pension: 0,
  nontaxable_va: 0,
};
const pending = {
  schedule_r: source,
  f1040: {
    filing_status: "single",
    taxpayer_age_65_or_older: true,
    line11_agi: 7_000,
    line18_total_tax_before_credits: 900,
    line20_nonrefundable_credits: 750,
  },
  schedule3: { line6d_elderly_disabled_credit: 750 },
};

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Common/IRS1040ScheduleR/IRS1040ScheduleR.xsd",
  import.meta.url,
).pathname;
let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The official IRS schema bundle is local-only.
}

Deno.test("Schedule R emits the bounded 65-plus single-taxpayer form", () => {
  const xml = scheduleR.build({}, { pending });
  assertStringIncludes(xml, "<Primary65OrOlderInd>X</Primary65OrOlderInd>");
  assertStringIncludes(xml, "<FilingStatusAmt>5000</FilingStatusAmt>");
  assertStringIncludes(xml, "<TaxReturnAGIAmt>7000</TaxReturnAGIAmt>");
  assertStringIncludes(
    xml,
    "<TotalTaxLessCreditsAmt>900</TotalTaxLessCreditsAmt>",
  );
  assertStringIncludes(
    xml,
    "<CreditForElderlyOrDisabledAmt>750</CreditForElderlyOrDisabledAmt>",
  );
  assertEquals(
    xml.indexOf("<Primary65OrOlderInd>") < xml.indexOf("<FilingStatusAmt>"),
    true,
  );
});

Deno.test({
  name: "XSD: Schedule R sourced single age-65 credit",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = scheduleR.build({}, { pending }).replace(
    "<IRS1040ScheduleR>",
    '<IRS1040ScheduleR xmlns="http://www.irs.gov/efile" documentId="IRS1040ScheduleR1">',
  );
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
});

Deno.test("Schedule R rejects missing age evidence, wrong AGI, and a tax-limited credit", () => {
  assertThrows(
    () =>
      scheduleR.build({}, {
        pending: {
          ...pending,
          schedule_r: { ...source, age_65_source_reference: undefined },
        },
      }),
    Error,
    "sourced taxpayer/spouse age",
  );
  assertThrows(
    () =>
      scheduleR.build({}, {
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line11_agi: 7_001 },
        },
      }),
    Error,
    "AGI/status",
  );
  assertThrows(
    () =>
      scheduleR.build({}, {
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line18_total_tax_before_credits: 500 },
        },
      }),
    Error,
    "credit and tax limit",
  );
});

Deno.test("Schedule R age-only status boxes retain their distinct bases and thresholds", () => {
  const cases = [
    { status: FilingStatus.HOH, box: "Primary65OrOlderInd", base: 5_000, threshold: 7_500 },
    { status: FilingStatus.QSS, box: "Primary65OrOlderInd", base: 5_000, threshold: 7_500 },
    { status: FilingStatus.MFJ, box: "BothSpouses65OrOlderInd", base: 7_500, threshold: 10_000 },
    { status: FilingStatus.MFJ, box: "One65OrOlderOtherNotRtdInd", base: 5_000, threshold: 10_000 },
    { status: FilingStatus.MFS, box: "Age65OrOldrNotLvngTogetherInd", base: 3_750, threshold: 5_000 },
  ] as const;
  for (const [index, row] of cases.entries()) {
    const spouseAge = index === 2 || index === 3;
    const taxpayerAge = index !== 3;
    const credit = Math.round(row.base * 0.15);
    const sourceCase = {
      ...source,
      filing_status: row.status,
      taxpayer_age_65_or_older: taxpayerAge,
      spouse_age_65_or_older: row.status === FilingStatus.MFJ ? spouseAge : undefined,
      age_65_source_reference: taxpayerAge ? source.age_65_source_reference : undefined,
      spouse_age_65_source_reference: spouseAge ? "Spouse DOB record" : undefined,
      mfs_lived_apart_all_year_source_reference:
        row.status === FilingStatus.MFS ? "Separate residence record" : undefined,
      agi: row.threshold,
    };
    const casePending = {
      schedule_r: sourceCase,
      f1040: {
        filing_status: row.status,
        taxpayer_age_65_or_older: taxpayerAge,
        ...(row.status === FilingStatus.MFJ && { spouse_age_65_or_older: spouseAge }),
        ...(row.status === FilingStatus.MFS && { mfs_spouse_lived_with_taxpayer: false }),
        line11_agi: row.threshold,
        line18_total_tax_before_credits: 1_500,
        line20_nonrefundable_credits: credit,
      },
      schedule3: { line6d_elderly_disabled_credit: credit },
    };
    const xml = scheduleR.build({}, { pending: casePending });
    assertStringIncludes(xml, `<${row.box}>X</${row.box}>`);
    assertStringIncludes(xml, `<FilingStatusAmt>${row.base}</FilingStatusAmt>`);
    assertStringIncludes(xml, `<ExemptionAmt>${row.threshold}</ExemptionAmt>`);
  }
});

Deno.test({
  name: "XSD: Schedule R age-only joint and all-year-apart MFS boxes",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  for (const [status, ageBox, base, threshold] of [
    [FilingStatus.MFJ, "BothSpouses65OrOlderInd", 7_500, 10_000],
    [FilingStatus.MFS, "Age65OrOldrNotLvngTogetherInd", 3_750, 5_000],
  ] as const) {
    const credit = Math.round(base * 0.15);
    const candidate = {
      schedule_r: {
        ...source,
        filing_status: status,
        spouse_age_65_or_older: status === FilingStatus.MFJ,
        spouse_age_65_source_reference:
          status === FilingStatus.MFJ ? "Spouse DOB record" : undefined,
        mfs_lived_apart_all_year_source_reference:
          status === FilingStatus.MFS ? "Separate residence record" : undefined,
        agi: threshold,
      },
      f1040: {
        filing_status: status,
        taxpayer_age_65_or_older: true,
        ...(status === FilingStatus.MFJ && { spouse_age_65_or_older: true }),
        ...(status === FilingStatus.MFS && { mfs_spouse_lived_with_taxpayer: false }),
        line11_agi: threshold,
        line18_total_tax_before_credits: 1_500,
        line20_nonrefundable_credits: credit,
      },
      schedule3: { line6d_elderly_disabled_credit: credit },
    };
    const xml = scheduleR.build({}, { pending: candidate }).replace(
      "<IRS1040ScheduleR>",
      '<IRS1040ScheduleR xmlns="http://www.irs.gov/efile" documentId="IRS1040ScheduleR1">',
    );
    assertStringIncludes(xml, `<${ageBox}>X</${ageBox}>`);
    const path = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(path, xml);
      const result = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", XSD_PATH, path],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
    } finally {
      await Deno.remove(path);
    }
  }
});

Deno.test("Schedule R MFS age route rejects missing all-year separation evidence", () => {
  const separated = {
    ...pending,
    schedule_r: {
      ...source,
      filing_status: FilingStatus.MFS,
      agi: 5_000,
      mfs_lived_apart_all_year_source_reference: "Separate residence record",
    },
    f1040: {
      ...pending.f1040,
      filing_status: "mfs",
      mfs_spouse_lived_with_taxpayer: true,
      line11_agi: 5_000,
      line20_nonrefundable_credits: 563,
    },
    schedule3: { line6d_elderly_disabled_credit: 563 },
  };
  assertThrows(
    () => scheduleR.build({}, { pending: separated }),
    Error,
    "lived apart all year",
  );
});

Deno.test("Schedule R line 13b needs qualifying nontaxable pension classification", () => {
  const withPension = {
    ...pending,
    schedule_r: {
      ...source,
      nontaxable_pension: 100,
      nontaxable_pension_source_reference: "Government pension record",
      nontaxable_pension_line13b_eligible_verified: true as const,
    },
    f1040: { ...pending.f1040, line20_nonrefundable_credits: 735 },
    schedule3: { line6d_elderly_disabled_credit: 735 },
  };
  assertStringIncludes(
    scheduleR.build({}, { pending: withPension }),
    "<NontaxableOtherAmt>100</NontaxableOtherAmt>",
  );
  assertThrows(
    () => scheduleR.build({}, { pending: {
      ...withPension,
      schedule_r: {
        ...withPension.schedule_r,
        nontaxable_pension_line13b_eligible_verified: undefined,
      },
    } }),
    Error,
    "sourced taxpayer/spouse age and benefit facts",
  );
});

Deno.test("Schedule R leaves a zero-credit age-65 source unfiled", () => {
  assertEquals(
    scheduleR.build({}, {
      pending: {
        schedule_r: { ...source, agi: 20_000 },
      },
    }),
    "",
  );
});

Deno.test("Schedule R ties nontaxable Social Security to filed 1040 lines 6a and 6b", () => {
  const withBenefits = {
    ...pending,
    schedule_r: {
      ...source,
      nontaxable_ssa: 100,
      nontaxable_ssa_source_reference: "SSA-1099 benefit statement",
    },
    f1040: {
      ...pending.f1040,
      line6a_ss_gross: 300,
      line6b_ss_taxable: 200,
      line20_nonrefundable_credits: 735,
    },
    schedule3: { line6d_elderly_disabled_credit: 735 },
  };
  assertStringIncludes(
    scheduleR.build({}, { pending: withBenefits }),
    "<NontxSocSecAndRlrdBenefitsAmt>100</NontxSocSecAndRlrdBenefitsAmt>",
  );
  assertThrows(
    () =>
      scheduleR.build({}, {
        pending: {
          ...withBenefits,
          f1040: { ...withBenefits.f1040, line6b_ss_taxable: 201 },
        },
      }),
    Error,
    "must match finalized Form 1040 lines 6a and 6b",
  );
});
