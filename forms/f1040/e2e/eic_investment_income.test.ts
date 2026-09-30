import { assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "../2025/registry.ts";
import { buildMefXml } from "../2025/mef/builder.ts";
import { buildPending } from "../2025/mef/pending.ts";
import { buildPdfBytes } from "../2025/pdf/builder.ts";
import { form4835Pdf } from "../2025/pdf/forms/f4835.ts";
import { irs1040Pdf } from "../2025/pdf/forms/f1040.ts";
import { schedule1Pdf } from "../2025/pdf/forms/schedule1.ts";
import { scheduleEPdf } from "../2025/pdf/forms/schedule_e.ts";
import { extractFilerIdentity } from "../mef/filer.ts";

const plan = buildExecutionPlan(registry);
const general = {
  filing_status: "single",
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "111-22-3333",
  taxpayer_ssn_valid_for_employment: true,
  taxpayer_ssn_issued_before_due_date: true,
  taxpayer_tin_issued_by_due_date: true,
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Example Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
  digital_assets: false,
  main_home_in_us_over_half_year: true,
  taxpayer_can_be_claimed_as_dependent: false,
  childless_eic_review: {
    not_qualifying_child_of_another_taxpayer_verified: true,
    qualifying_child_status_record_reference: "Synthetic 2025 family review",
  },
  prior_eic_disallowance_review: {
    status: "none",
    irs_account_record_reference: "Synthetic IRS account review",
    no_nonclerical_disallowance_since_1996_verified: true,
  },
  eic_tax_residency_review: {
    status: "all_year_resident",
    taxpayer_status_record_reference: "Synthetic 2025 resident status review",
  },
};
const w2 = {
  employee_ssn: "111-22-3333",
  employer_ein: "12-3456789",
  employer_name: "Example Employer",
  employer_address_line1: "10 Employer Road",
  employer_address_city: "Austin",
  employer_address_state: "TX",
  employer_address_zip: "78701",
  box1_wages: 5_000,
  box2_fed_withheld: 0,
  box3_ss_wages: 5_000,
  box4_ss_withheld: 310,
  box5_medicare_wages: 5_000,
  box6_medicare_withheld: 72.5,
};

function run(
  taxExemptInterest: number,
  taxableInterest = 0,
  ordinaryDividends = 0,
) {
  return execute(plan, registry, {
    general,
    w2: [w2],
    f1099int: [{
      payer_name: "Example Bank",
      recipient_ssn: "111-22-3333",
      box1: taxableInterest,
      box8: taxExemptInterest,
    }],
    ...(ordinaryDividends > 0
      ? {
        f1099div: [{
          payerName: "Example Broker",
          isNominee: false,
          box11: false,
          box1a: ordinaryDividends,
        }],
      }
      : {}),
  }, { taxYear: 2025, formType: "f1040" });
}

function runCapital(
  capitalGainDistribution: number,
  section1231Gain?: number,
) {
  return execute(plan, registry, {
    general,
    w2: [w2],
    ...(capitalGainDistribution > 0
      ? {
        f1099div: [{
          payerName: "Example Broker",
          isNominee: false,
          box11: false,
          box1a: 0,
          box2a: capitalGainDistribution,
        }],
      }
      : {}),
    ...(section1231Gain !== undefined
      ? {
        k1_s_corp: [{
          corporation_name: "Example S Corp",
          corporation_ein: "123456789",
          source_document_reference: "Synthetic 2025 K-1",
          box9_net_1231: section1231Gain,
        }],
      }
      : {}),
  }, { taxYear: 2025, formType: "f1040" });
}

function runPassiveRental(rent: number, interest = 0, passiveLoss = 0) {
  return execute(plan, registry, {
    general,
    w2: [w2],
    schedule_e: [
      {
        tsj: "T",
        activity_id: "passive-rental",
        property_description: "Reviewed 2025 rental",
        street_address: "123 Rental Road",
        city: "Austin",
        state: "TX",
        zip: "78701",
        property_type: 1,
        activity_type: "B",
        fair_rental_days: 365,
        personal_use_days: 0,
        rent_income: rent,
        form_1099_payments_made: false,
      },
      ...(passiveLoss > 0
        ? [{
          tsj: "T",
          activity_id: "passive-loss",
          property_description: "Reviewed 2025 second rental",
          property_type: 1,
          activity_type: "B",
          fair_rental_days: 365,
          personal_use_days: 0,
          rent_income: 0,
          expense_repairs: passiveLoss,
          form_1099_payments_made: false,
        }]
        : []),
    ],
    ...(interest > 0
      ? {
        f1099int: [{
          payer_name: "Example Bank",
          recipient_ssn: "111-22-3333",
          box8: interest,
        }],
      }
      : {}),
  }, { taxYear: 2025, formType: "f1040" });
}

function runPassiveOrdinarySale(gain: number, taxExemptInterest = 0) {
  return execute(plan, registry, {
    general,
    w2: [w2],
    ...(taxExemptInterest > 0
      ? {
        f1099int: [{
          payer_name: "Example Bank",
          recipient_ssn: "111-22-3333",
          box8: taxExemptInterest,
        }],
      }
      : {}),
    schedule_e: [{
      tsj: "T",
      activity_id: "passive-sale",
      property_description: "Reviewed rental property sale",
      street_address: "500 Sale Road",
      city: "Austin",
      state: "TX",
      zip: "78701",
      property_type: 1,
      activity_type: "B",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 0,
      form_1099_payments_made: false,
      disposed_of: true,
      passive_property_sales: [{
        activity_id: "passive-sale",
        activity_name: "Reviewed rental property sale",
        part: "II",
        property_description: "Rental equipment",
        acquired_on: "2025-01-01",
        sold_on: "2025-06-01",
        gross_sales_price: 5_000 + gain,
        cost_or_other_basis: 5_000,
        depreciation_allowed: 0,
        entire_activity_interest_disposed: false,
        buyer_unrelated: true,
        fully_taxable: true,
        installment_method: false,
        disposition_document_reference: "Synthetic 2025 sale statement",
      }],
    }],
  }, { taxYear: 2025, formType: "f1040" });
}

function runPassiveTrust(income: number) {
  return execute(plan, registry, {
    general,
    w2: [w2],
    k1_trust: [{
      estate_trust_name: "Family Trust",
      estate_trust_ein: "123456789",
      source_document_reference: "Synthetic 2025 trust K-1",
      box6_ordinary_business: income,
      box6_8_activity_statement: [{
        box: "6",
        activity_name: "Trust business",
        statement_reference: "Synthetic K-1 activity statement",
        income,
      }],
    }],
  }, { taxYear: 2025, formType: "f1040" });
}

function runPassiveK1s(
  partnershipRent: number,
  sCorpBusiness: number,
  propertyRent = 0,
  trustIncome = 0,
  farmIncome = 0,
) {
  const reviewReference = {
    activity_statement_reference: "Synthetic 2025 K-1 activity statement",
    participation_workpaper_reference: "Synthetic 2025 participation review",
    recipient_tin: "111223333",
  };
  return execute(plan, registry, {
    general,
    w2: [w2],
    ...(propertyRent > 0
      ? {
        schedule_e: [{
          tsj: "T",
          activity_id: "combined-rental",
          property_description: "Reviewed combined rental",
          street_address: "123 Rental Road",
          city: "Austin",
          state: "TX",
          zip: "78701",
          property_type: 1,
          activity_type: "B",
          fair_rental_days: 365,
          personal_use_days: 0,
          rent_income: propertyRent,
          form_1099_payments_made: false,
        }],
      }
      : {}),
    ...(trustIncome > 0
      ? {
        k1_trust: [{
          estate_trust_name: "Example Family Trust",
          estate_trust_ein: "111222333",
          source_document_reference: "Synthetic 2025 trust K-1",
          box6_ordinary_business: trustIncome,
          box6_8_activity_statement: [{
            box: "6",
            activity_name: "Trust business",
            statement_reference: "Synthetic trust activity statement",
            income: trustIncome,
          }],
        }],
      }
      : {}),
    ...(farmIncome > 0
      ? {
        f4835: [{
          activity_id: "combined-farm-rental",
          activity_name: "Reviewed farm rental",
          livestock_crop_income: farmIncome,
        }],
      }
      : {}),
    k1_partnership: [{
      partnership_name: "Example Rental Partnership",
      partnership_ein: "123456789",
      source_document_reference: "Synthetic 2025 partnership K-1",
      box2_rental_re: partnershipRent,
      eic_passive_activity_review: {
        ...reviewReference,
        box2: "passive",
        partnership_not_publicly_traded_verified: true,
      },
    }],
    k1_s_corp: [{
      corporation_name: "Example Passive S Corp",
      corporation_ein: "987654321",
      source_document_reference: "Synthetic 2025 S corporation K-1",
      box2_rental_re: sCorpBusiness,
      eic_passive_activity_review: {
        ...reviewReference,
        box2: "passive",
      },
    }],
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("EIC Worksheet 1 counts reviewed partnership and S-corporation K-1 income", async () => {
  const atLimit = runPassiveK1s(6_000, 5_950);
  assertEquals(atLimit.diagnostics, []);
  assertEquals(atLimit.pending.eitc.investment_income_floor, 11_950);
  assertEquals(atLimit.pending.f1040.line27_eitc !== undefined, true);
  const overLimit = runPassiveK1s(6_000, 5_951);
  assertEquals(overLimit.pending.eitc.investment_income_floor, 11_951);
  assertEquals(overLimit.pending.f1040.line27_eitc, undefined);
  const filer = extractFilerIdentity(atLimit.pending.f1040);
  const xml = buildMefXml(buildPending(atLimit.pending), filer);
  assertEquals(
    xml.includes("<TotalPassiveIncomeAmt>11950</TotalPassiveIncomeAmt>"),
    true,
  );
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
  const pdfFields = scheduleEPdf.projectFields?.({}, atLimit.pending);
  assertEquals(pdfFields?.k1_0_passive_income, 6_000);
  assertEquals(pdfFields?.k1_1_passive_income, 5_950);
  assertEquals(pdfFields?.k1_line32, 11_950);
  assertEquals(scheduleEPdf.pageIndices?.(pdfFields ?? {}), [1]);
  const forged = {
    ...atLimit.pending,
    k1_partnership: {
      ...atLimit.pending.k1_partnership,
      k1_partnerships: [{
        ...((atLimit.pending.k1_partnership.k1_partnerships as Record<
          string,
          unknown
        >[])[0]),
        box2_rental_re: 6_001,
      }],
    },
  };
  assertThrows(
    () => buildMefXml(buildPending(forged), filer),
    Error,
    "K-1 income differs",
  );
  const missingReview = {
    ...atLimit.pending,
    k1_s_corp: {
      ...atLimit.pending.k1_s_corp,
      k1_s_corps: [{
        ...((atLimit.pending.k1_s_corp.k1_s_corps as Record<string, unknown>[])[
          0
        ]),
        eic_passive_activity_review: undefined,
      }],
    },
  };
  assertThrows(
    () => buildMefXml(buildPending(missingReview), filer),
    Error,
    "reviewed passive classification",
  );
  assertThrows(
    () => scheduleEPdf.projectFields?.({}, missingReview),
    Error,
    "recipient needs the filer or joint spouse",
  );
  const wrongRecipient = {
    ...atLimit.pending,
    k1_partnership: {
      ...atLimit.pending.k1_partnership,
      k1_partnerships: [{
        ...((atLimit.pending.k1_partnership.k1_partnerships as Record<
          string,
          unknown
        >[])[0]),
        eic_passive_activity_review: {
          ...((atLimit.pending.k1_partnership.k1_partnerships as Record<
            string,
            unknown
          >[])[0].eic_passive_activity_review as Record<string, unknown>),
          recipient_tin: "999887777",
        },
      }],
    },
  };
  assertThrows(
    () => buildMefXml(buildPending(wrongRecipient), filer),
    Error,
    "recipient needs the filer or joint spouse",
  );
  assertThrows(
    () => scheduleEPdf.projectFields?.({}, wrongRecipient),
    Error,
    "recipient needs the filer or joint spouse",
  );
});

Deno.test("EIC reconciles Form 4835 with rental and three K-1 sources", async () => {
  const atLimit = runPassiveK1s(3_000, 3_000, 1_950, 2_000, 2_000);
  assertEquals(atLimit.diagnostics, []);
  assertEquals(atLimit.pending.eitc.investment_income_floor, 11_950);
  assertEquals(atLimit.pending.f1040.line27_eitc !== undefined, true);
  const overLimit = runPassiveK1s(3_000, 3_000, 1_950, 2_000, 2_001);
  assertEquals(overLimit.pending.eitc.investment_income_floor, 11_951);
  assertEquals(overLimit.pending.f1040.line27_eitc, undefined);
  const filer = extractFilerIdentity(atLimit.pending.f1040);
  const xml = buildMefXml(buildPending(atLimit.pending), filer);
  assertEquals(
    xml.includes(
      "<NetFarmRentalIncomeOrLossAmt>2000</NetFarmRentalIncomeOrLossAmt>",
    ),
    true,
  );
  assertEquals(
    xml.includes("<TotalSuppIncomeOrLossAmt>11950</TotalSuppIncomeOrLossAmt>"),
    true,
  );
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
  const fields = scheduleEPdf.projectFields?.(
    atLimit.pending.schedule_e,
    atLimit.pending,
  );
  assertEquals(fields?.line26, 1_950);
  assertEquals(fields?.k1_line32, 6_000);
  assertEquals(fields?.trust_line37, 2_000);
  assertEquals(fields?.farm_line40, 2_000);
  assertEquals(fields?.farm_line42, 2_000);
  assertEquals(fields?.trust_line41, 11_950);
  assertEquals(scheduleEPdf.pageIndices?.(fields ?? {}), [0, 1]);
  const pdf = await buildPdfBytes(atLimit.pending, filer);
  assertEquals(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");
  const { f4835: _farm, ...noFarmSource } = atLimit.pending;
  assertThrows(
    () => buildMefXml(buildPending(noFarmSource), filer),
    Error,
    "needs its Form 4835 source",
  );
  assertThrows(
    () =>
      scheduleEPdf.projectFields?.(
        atLimit.pending.schedule_e,
        noFarmSource,
      ),
    Error,
    "needs its Form 4835 source",
  );
  const changedFarmGross = {
    ...atLimit.pending,
    schedule_e: {
      ...atLimit.pending.schedule_e,
      farm_rental_gross: 2_001,
    },
  };
  assertThrows(
    () => buildMefXml(buildPending(changedFarmGross), filer),
    Error,
    "farm rental net and gross do not match",
  );
  const farmOnly = runPassiveK1s(0, 0, 0, 0, 11_950);
  assertEquals(farmOnly.diagnostics, []);
  assertEquals(farmOnly.pending.eitc.investment_income_floor, 11_950);
  const farmOnlyFields = scheduleEPdf.projectFields?.(
    farmOnly.pending.schedule_e,
    farmOnly.pending,
  );
  assertEquals(farmOnlyFields?.farm_line40, 11_950);
  assertEquals(farmOnlyFields?.farm_line42, 11_950);
  assertEquals(farmOnlyFields?.trust_line41, 11_950);
  assertEquals(scheduleEPdf.pageIndices?.(farmOnlyFields ?? {}), [1]);
  const farmOnlyPdf = await buildPdfBytes(
    farmOnly.pending,
    extractFilerIdentity(farmOnly.pending.f1040),
  );
  assertEquals(new TextDecoder().decode(farmOnlyPdf.slice(0, 5)), "%PDF-");
});

function runFarmLossOffsets(rentIncome: number, farmLosses: number[]) {
  return execute(plan, registry, {
    general,
    w2: [w2],
    schedule_e: [{
      tsj: "T",
      activity_id: "income-rental",
      property_description: "Reviewed passive rental",
      street_address: "123 Rental Road",
      city: "Austin",
      state: "TX",
      zip: "78701",
      property_type: 1,
      activity_type: "B",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: rentIncome,
      form_1099_payments_made: false,
    }],
    f4835: farmLosses.map((farmLoss, index) => ({
      activity_id: `loss-farm-${index}`,
      activity_name: `Reviewed passive farm rental ${index + 1}`,
      livestock_crop_income: 0,
      expense_feed: farmLoss,
      actively_participated: false,
      some_investment_not_at_risk: false,
    })),
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("EIC nets an allowed Form 4835 farm loss against passive rental income", async () => {
  const atLimit = runFarmLossOffsets(12_000, [50]);
  assertEquals(atLimit.diagnostics, []);
  assertEquals(atLimit.pending.eitc.investment_income_floor, 11_950);
  assertEquals(atLimit.pending.f1040.line27_eitc !== undefined, true);
  assertEquals(atLimit.carryforwards.suspended_pal_8582 ?? 0, 0);
  const overLimit = runFarmLossOffsets(12_001, [50]);
  assertEquals(overLimit.pending.eitc.investment_income_floor, 11_951);
  assertEquals(overLimit.pending.f1040.line27_eitc, undefined);
  const filer = extractFilerIdentity(atLimit.pending.f1040);
  const xml = buildMefXml(buildPending(atLimit.pending), filer);
  assertEquals(
    xml.includes(
      "<NetFarmRentalIncomeOrLossAmt>-50</NetFarmRentalIncomeOrLossAmt>",
    ),
    true,
  );
  assertEquals(
    xml.includes("<TotalSuppIncomeOrLossAmt>11950</TotalSuppIncomeOrLossAmt>"),
    true,
  );
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
  const fields = scheduleEPdf.projectFields?.(
    atLimit.pending.schedule_e,
    atLimit.pending,
  );
  assertEquals(fields?.line26, 12_000);
  assertEquals(fields?.farm_line40, -50);
  assertEquals(fields?.trust_line41, 11_950);
  assertEquals(scheduleEPdf.pageIndices?.(fields ?? {}), [0, 1]);
  const pdf = await buildPdfBytes(atLimit.pending, filer);
  assertEquals(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");
  const forgedFarm = {
    ...atLimit.pending,
    f4835: {
      ...atLimit.pending.f4835,
      f4835s: [{
        ...((atLimit.pending.f4835.f4835s as Record<string, unknown>[])[0]),
        expense_feed: 51,
      }],
    },
  };
  assertThrows(
    () => buildMefXml(buildPending(forgedFarm), filer),
    Error,
    "Form 4835",
  );
  assertThrows(
    () =>
      scheduleEPdf.projectFields?.(
        atLimit.pending.schedule_e,
        forgedFarm,
      ),
    Error,
    "Form 4835",
  );
});

Deno.test("EIC allocates two Form 4835 farm losses beside passive rent", async () => {
  const atLimit = runFarmLossOffsets(12_025, [50, 25]);
  assertEquals(atLimit.diagnostics, []);
  assertEquals(atLimit.pending.eitc.investment_income_floor, 11_950);
  assertEquals(atLimit.pending.f1040.line27_eitc !== undefined, true);
  assertEquals(atLimit.carryforwards.suspended_pal_8582 ?? 0, 0);
  const overLimit = runFarmLossOffsets(12_026, [50, 25]);
  assertEquals(overLimit.pending.eitc.investment_income_floor, 11_951);
  assertEquals(overLimit.pending.f1040.line27_eitc, undefined);
  const filer = extractFilerIdentity(atLimit.pending.f1040);
  const xml = buildMefXml(buildPending(atLimit.pending), filer);
  assertEquals(
    xml.includes(
      "<NetFarmRentalIncomeOrLossAmt>-75</NetFarmRentalIncomeOrLossAmt>",
    ),
    true,
  );
  assertEquals(
    xml.includes("<TotalSuppIncomeOrLossAmt>11950</TotalSuppIncomeOrLossAmt>"),
    true,
  );
  assertEquals(
    xml.match(/<FarmRentalDeductibleLossAmt>/g)?.length,
    2,
  );
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
  const scheduleFields = scheduleEPdf.projectFields?.(
    atLimit.pending.schedule_e,
    atLimit.pending,
  );
  assertEquals(scheduleFields?.line26, 12_025);
  assertEquals(scheduleFields?.farm_line40, -75);
  assertEquals(scheduleFields?.trust_line41, 11_950);
  const farmFields = form4835Pdf.projectFields?.(
    atLimit.pending.f4835,
    atLimit.pending,
  ) ?? {};
  const copies = form4835Pdf.instances?.(farmFields) ?? [];
  assertEquals(copies.map((copy) => copy.line34c_allowed_loss), [50, 25]);
  const pdf = await buildPdfBytes(atLimit.pending, filer);
  assertEquals(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");
  const changedSecondFarm = {
    ...atLimit.pending,
    f4835: {
      ...atLimit.pending.f4835,
      f4835s: (atLimit.pending.f4835.f4835s as Record<string, unknown>[])
        .map((farm, index) =>
          index === 1 ? { ...farm, expense_feed: 26 } : farm
        ),
    },
  };
  assertThrows(
    () => buildMefXml(buildPending(changedSecondFarm), filer),
    Error,
    "Form 4835",
  );
  assertThrows(
    () =>
      scheduleEPdf.projectFields?.(
        atLimit.pending.schedule_e,
        changedSecondFarm,
      ),
    Error,
    "Form 4835",
  );
});

Deno.test("prior Form 4835 passive loss prints PAL and reconciles EIC", async () => {
  const runPriorFarm = (rent: number) =>
    execute(plan, registry, {
      general,
      w2: [w2],
      schedule_e: [{
        tsj: "T",
        activity_id: "income-rental",
        property_description: "Reviewed passive rental",
        street_address: "123 Rental Road",
        city: "Austin",
        state: "TX",
        zip: "78701",
        property_type: 1,
        activity_type: "B",
        fair_rental_days: 365,
        personal_use_days: 0,
        rent_income: rent,
        form_1099_payments_made: false,
      }],
      f4835: [{
        activity_id: "prior-loss-farm",
        activity_name: "Reviewed prior-loss farm",
        livestock_crop_income: 1_000,
        prior_unallowed_passive_operating: 1_500,
        prior_year_8582_source: {
          tax_year: 2024,
          activity_id: "prior-loss-farm",
          filed_part_vii_column_c: 1_500,
          source_document_reference: "2024 filed Form 8582 Part VII",
        },
      }, {
        activity_id: "profit-farm",
        activity_name: "Reviewed profit farm",
        livestock_crop_income: 500,
      }],
    }, { taxYear: 2025, formType: "f1040" });
  const atLimit = runPriorFarm(11_950);
  assertEquals(atLimit.diagnostics, []);
  assertEquals(atLimit.pending.eitc.investment_income_floor, 11_950);
  assertEquals(atLimit.pending.f1040.line27_eitc !== undefined, true);
  const overLimit = runPriorFarm(11_951);
  assertEquals(overLimit.pending.eitc.investment_income_floor, 11_951);
  assertEquals(overLimit.pending.f1040.line27_eitc, undefined);
  const filer = extractFilerIdentity(atLimit.pending.f1040);
  const xml = buildMefXml(buildPending(atLimit.pending), filer);
  assertEquals(
    xml.includes(
      "<PriorYearUnallowedOtherLossAmt>1500</PriorYearUnallowedOtherLossAmt>",
    ),
    true,
  );
  assertEquals(
    xml.includes(
      "<FarmRentalDeductibleLossAmt>500</FarmRentalDeductibleLossAmt>",
    ),
    true,
  );
  assertEquals(
    xml.includes("<TotalSuppIncomeOrLossAmt>11950</TotalSuppIncomeOrLossAmt>"),
    true,
  );
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
  const farmFields = form4835Pdf.projectFields?.(
    atLimit.pending.f4835,
    atLimit.pending,
  ) ?? {};
  const copies = form4835Pdf.instances?.(farmFields) ?? [];
  assertEquals(copies[0].line32_income, 0);
  assertEquals(copies[0].line32_pal, true);
  assertEquals(copies[0].line34c_allowed_loss, 500);
  assertEquals(copies[1].line32_income, 500);
  assertEquals(copies[1].line32_pal, false);
  const scheduleFields = scheduleEPdf.projectFields?.(
    atLimit.pending.schedule_e,
    atLimit.pending,
  );
  assertEquals(scheduleFields?.farm_line40, 0);
  assertEquals(scheduleFields?.trust_line41, 11_950);
  const pdf = await buildPdfBytes(atLimit.pending, filer);
  assertEquals(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");
});

Deno.test("active rental special allowance nets passive farm income", async () => {
  const runMixed = (wages: number) =>
    execute(plan, registry, {
      general,
      w2: [{
        ...w2,
        box1_wages: wages,
        box3_ss_wages: wages,
        box4_ss_withheld: Math.round(wages * 0.062),
        box5_medicare_wages: wages,
        box6_medicare_withheld: Math.round(wages * 0.0145),
      }],
      schedule_e: [{
        tsj: "T",
        activity_id: "active-rental",
        property_description: "Reviewed active rental",
        street_address: "123 Rental Road",
        city: "Austin",
        state: "TX",
        zip: "78701",
        property_type: 1,
        activity_type: "A",
        fair_rental_days: 365,
        personal_use_days: 0,
        rent_income: 10_000,
        expense_repairs: 40_000,
        form_1099_payments_made: false,
      }],
      f4835: [{
        activity_id: "passive-farm-profit",
        activity_name: "Reviewed passive farm profit",
        livestock_crop_income: 5_000,
        actively_participated: false,
      }],
    }, { taxYear: 2025, formType: "f1040" });
  const phased = runMixed(120_000);
  assertEquals(phased.diagnostics, []);
  assertEquals(phased.pending.form8582.modified_agi, 125_000);
  assertEquals(phased.carryforwards.suspended_pal_8582, 12_500);
  assertEquals(phased.pending.schedule1.line5_schedule_e, -12_500);
  assertEquals(phased.pending.f1040.line11_agi, 107_500);
  const cutoff = runMixed(150_000);
  assertEquals(cutoff.diagnostics, []);
  assertEquals(cutoff.carryforwards.suspended_pal_8582, 25_000);
  assertEquals(cutoff.pending.schedule1.line5_schedule_e, 0);
  const filer = extractFilerIdentity(phased.pending.f1040);
  const xml = buildMefXml(buildPending(phased.pending), filer);
  assertEquals(
    xml.includes("<TotalSuppIncomeOrLossAmt>-12500</TotalSuppIncomeOrLossAmt>"),
    true,
  );
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
  const fields = scheduleEPdf.projectFields?.(
    phased.pending.schedule_e,
    phased.pending,
  );
  assertEquals(fields?.property_0_line21, -30_000);
  assertEquals(fields?.property_0_line22, 17_500);
  assertEquals(fields?.line26, -17_500);
  assertEquals(fields?.farm_line40, 5_000);
  assertEquals(fields?.trust_line41, -12_500);
  const pdf = await buildPdfBytes(phased.pending, filer);
  assertEquals(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");
});

Deno.test("EIC reconciles rental, partnership, S-corporation, and trust income", async () => {
  const atLimit = runPassiveK1s(4_000, 4_000, 1_950, 2_000);
  assertEquals(atLimit.diagnostics, []);
  assertEquals(atLimit.pending.eitc.investment_income_floor, 11_950);
  assertEquals(atLimit.pending.f1040.line27_eitc !== undefined, true);
  const overLimit = runPassiveK1s(4_000, 4_000, 1_951, 2_000);
  assertEquals(overLimit.pending.eitc.investment_income_floor, 11_951);
  assertEquals(overLimit.pending.f1040.line27_eitc, undefined);
  const filer = extractFilerIdentity(atLimit.pending.f1040);
  const xml = buildMefXml(buildPending(atLimit.pending), filer);
  assertEquals(
    xml.includes("<TotalSuppIncomeOrLossAmt>11950</TotalSuppIncomeOrLossAmt>"),
    true,
  );
  assertEquals(
    xml.includes(
      "<TotalEstateOrTrustIncomeAmt>2000</TotalEstateOrTrustIncomeAmt>",
    ),
    true,
  );
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
  const fields = scheduleEPdf.projectFields?.(
    atLimit.pending.schedule_e,
    atLimit.pending,
  );
  assertEquals(fields?.line26, 1_950);
  assertEquals(fields?.k1_line32, 8_000);
  assertEquals(fields?.trust_line37, 2_000);
  assertEquals(fields?.trust_line41, 11_950);
  assertEquals(scheduleEPdf.pageIndices?.(fields ?? {}), [0, 1]);
  const pdf = await buildPdfBytes(atLimit.pending, filer);
  assertEquals(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");
  const trustAndRental = runPassiveK1s(0, 0, 9_950, 2_000);
  assertEquals(trustAndRental.diagnostics, []);
  assertEquals(trustAndRental.pending.eitc.investment_income_floor, 11_950);
  const trustAndRentalFields = scheduleEPdf.projectFields?.(
    trustAndRental.pending.schedule_e,
    trustAndRental.pending,
  );
  assertEquals(trustAndRentalFields?.line26, 9_950);
  assertEquals(trustAndRentalFields?.trust_line37, 2_000);
  assertEquals(trustAndRentalFields?.trust_line41, 11_950);
  assertEquals(scheduleEPdf.pageIndices?.(trustAndRentalFields ?? {}), [0, 1]);
  const trustAndRentalPdf = await buildPdfBytes(
    trustAndRental.pending,
    extractFilerIdentity(trustAndRental.pending.f1040),
  );
  assertEquals(
    new TextDecoder().decode(trustAndRentalPdf.slice(0, 5)),
    "%PDF-",
  );
  const trustAndRentalXml = buildMefXml(
    buildPending(trustAndRental.pending),
    extractFilerIdentity(trustAndRental.pending.f1040),
  );
  const secondXmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(secondXmlPath, trustAndRentalXml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, secondXmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(secondXmlPath);
  }
});

Deno.test("three passive rentals print Schedule E property columns A through C", async () => {
  const runRentals = (lastRent: number) =>
    execute(plan, registry, {
      general,
      w2: [w2],
      schedule_e: [4_000, 3_950, lastRent].map((rent, index) => ({
        tsj: "T",
        activity_id: `rental-${index}`,
        property_description: `Reviewed rental ${index + 1}`,
        street_address: `${100 + index} Rental Road`,
        city: "Austin",
        state: "TX",
        zip: "78701",
        property_type: 1,
        activity_type: "B",
        fair_rental_days: 365,
        personal_use_days: 0,
        rent_income: rent,
        form_1099_payments_made: false,
      })),
    }, { taxYear: 2025, formType: "f1040" });
  const atLimit = runRentals(4_000);
  assertEquals(atLimit.diagnostics, []);
  assertEquals(atLimit.pending.eitc.investment_income_floor, 11_950);
  assertEquals(atLimit.pending.f1040.line27_eitc !== undefined, true);
  const overLimit = runRentals(4_001);
  assertEquals(overLimit.pending.eitc.investment_income_floor, 11_951);
  assertEquals(overLimit.pending.f1040.line27_eitc, undefined);
  const filer = extractFilerIdentity(atLimit.pending.f1040);
  const xml = buildMefXml(buildPending(atLimit.pending), filer);
  assertEquals(
    xml.includes("<TotalSuppIncomeOrLossAmt>11950</TotalSuppIncomeOrLossAmt>"),
    true,
  );
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
  const fields = scheduleEPdf.projectFields?.(
    atLimit.pending.schedule_e,
    atLimit.pending,
  );
  for (const [index, rent] of [4_000, 3_950, 4_000].entries()) {
    assertEquals(
      fields?.[`property_${index}_address`],
      `${100 + index} Rental Road, Austin, TX 78701`,
    );
    assertEquals(fields?.[`property_${index}_line3`], rent);
    assertEquals(fields?.[`property_${index}_line21`], rent);
  }
  assertEquals(fields?.line23a, 11_950);
  assertEquals(fields?.line24, 11_950);
  assertEquals(fields?.line26, 11_950);
  assertEquals(scheduleEPdf.pageIndices?.(fields ?? {}), [0]);
  const pdf = await buildPdfBytes(atLimit.pending, filer);
  assertEquals(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");
});

Deno.test("EIC reconciles passive K-1s with a Schedule E property on both PDF pages", async () => {
  const atLimit = runPassiveK1s(4_000, 4_000, 3_950);
  assertEquals(atLimit.diagnostics, []);
  assertEquals(atLimit.pending.eitc.investment_income_floor, 11_950);
  assertEquals(atLimit.pending.f1040.line27_eitc !== undefined, true);
  const overLimit = runPassiveK1s(4_000, 4_000, 3_951);
  assertEquals(overLimit.pending.eitc.investment_income_floor, 11_951);
  assertEquals(overLimit.pending.f1040.line27_eitc, undefined);
  const filer = extractFilerIdentity(atLimit.pending.f1040);
  const xml = buildMefXml(buildPending(atLimit.pending), filer);
  assertEquals(
    xml.includes("<TotalPassiveIncomeAmt>8000</TotalPassiveIncomeAmt>"),
    true,
  );
  assertEquals(
    xml.includes("<TotalSuppIncomeOrLossAmt>11950</TotalSuppIncomeOrLossAmt>"),
    true,
  );
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
  const fields = scheduleEPdf.projectFields?.(
    atLimit.pending.schedule_e,
    atLimit.pending,
  );
  assertEquals(fields?.line26, 3_950);
  assertEquals(fields?.k1_line32, 8_000);
  assertEquals(fields?.trust_line41, 11_950);
  assertEquals(scheduleEPdf.pageIndices?.(fields ?? {}), [0, 1]);
  const pdf = await buildPdfBytes(atLimit.pending, filer);
  assertEquals(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");
});

Deno.test("EIC Worksheet 1 counts trust K-1 passive Schedule E income", async () => {
  const atLimit = runPassiveTrust(11_950);
  assertEquals(atLimit.diagnostics, []);
  assertEquals(atLimit.pending.eitc.investment_income_floor, 11_950);
  assertEquals(atLimit.pending.f1040.line27_eitc !== undefined, true);
  const overLimit = runPassiveTrust(11_951);
  assertEquals(overLimit.pending.eitc.investment_income_floor, 11_951);
  assertEquals(overLimit.pending.f1040.line27_eitc, undefined);
  const filer = extractFilerIdentity(atLimit.pending.f1040);
  const xml = buildMefXml(buildPending(atLimit.pending), filer);
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
  const forged = {
    ...atLimit.pending,
    k1_trust: {
      ...atLimit.pending.k1_trust,
      k1_trusts: [{
        ...((atLimit.pending.k1_trust.k1_trusts as Record<string, unknown>[])[
          0
        ]),
        box6_ordinary_business: 11_951,
      }],
    },
  };
  assertThrows(
    () => buildMefXml(buildPending(forged), filer),
    Error,
    "per-activity statement",
  );
});

Deno.test("EIC Worksheet 1 counts passive Form 4797 Part II ordinary gains", async () => {
  const atLimit = runPassiveOrdinarySale(11_950);
  assertEquals(atLimit.diagnostics, []);
  assertEquals(atLimit.pending.eitc.investment_income_floor, 11_950);
  assertEquals(atLimit.pending.f1040.line27_eitc !== undefined, true);
  const overLimit = runPassiveOrdinarySale(11_951);
  assertEquals(overLimit.diagnostics, []);
  assertEquals(overLimit.pending.eitc.investment_income_floor, 11_951);
  assertEquals(overLimit.pending.f1040.line27_eitc, undefined);
  const combined = runPassiveOrdinarySale(9_000, 2_951);
  assertEquals(combined.pending.eitc.investment_income_floor, 11_951);
  assertEquals(combined.pending.f1040.line27_eitc, undefined);
  const filer = extractFilerIdentity(atLimit.pending.f1040);
  const xml = buildMefXml(buildPending(atLimit.pending), filer);
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
  const forged = {
    ...atLimit.pending,
    agi_aggregator: {
      ...atLimit.pending.agi_aggregator,
      eic_passive_4797_ordinary: 0,
    },
  };
  assertThrows(
    () => buildMefXml(buildPending(forged), filer),
    Error,
    "passive ordinary gain differs",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(atLimit.pending.f1040, forged),
    Error,
    "passive ordinary gain differs",
  );
});

Deno.test("EIC Worksheet 1 counts passive Schedule E rental profit at the investment limit", async () => {
  const atLimit = runPassiveRental(11_950);
  assertEquals(atLimit.diagnostics, []);
  assertEquals(atLimit.pending.eitc.investment_income_floor, 11_950);
  assertEquals(
    typeof atLimit.pending.eitc.credit_amount === "number" &&
      atLimit.pending.eitc.credit_amount > 0,
    true,
  );
  const overLimit = runPassiveRental(11_951);
  assertEquals(overLimit.pending.eitc.investment_income_floor, 11_951);
  assertEquals(overLimit.pending.eitc.credit_amount, 0);
  const combined = runPassiveRental(9_000, 2_951);
  assertEquals(combined.pending.eitc.investment_income_floor, 11_951);
  assertEquals(combined.pending.eitc.credit_amount, 0);
  const netted = runPassiveRental(12_000, 0, 50);
  assertEquals(netted.diagnostics, []);
  assertEquals(netted.pending.eitc.investment_income_floor, 11_950);
  assertEquals(netted.pending.f1040.line27_eitc !== undefined, true);
  const filer = extractFilerIdentity(atLimit.pending.f1040);
  const xml = buildMefXml(buildPending(atLimit.pending), filer);
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
  const forged = {
    ...atLimit.pending,
    agi_aggregator: {
      ...atLimit.pending.agi_aggregator,
      eic_passive_schedule_e_income: 0,
    },
  };
  assertThrows(
    () => buildMefXml(buildPending(forged), filer),
    Error,
    "passive income differs",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(atLimit.pending.f1040, forged),
    Error,
    "passive income differs",
  );
});

function runForm8814(
  childTaxExemptInterest: number,
  childInterest: number,
  alaskaPfd = 0,
) {
  return execute(plan, registry, {
    general,
    w2: [w2],
    f8814: [{
      child_name: "Jamie Example",
      child_name_control: "EXAM",
      child_ssn: "987654321",
      child_age_eligible: true,
      child_required_to_file: true,
      child_income_only_permitted_types: true,
      child_no_joint_return: true,
      child_no_estimated_payments: true,
      child_no_withholding: true,
      parent_eligible_to_elect: true,
      interest_income: childInterest,
      tax_exempt_interest: childTaxExemptInterest,
      alaska_pfd: alaskaPfd,
    }],
  }, { taxYear: 2025, formType: "f1040" });
}

function runRoyaltyAndRental(royalty: number, rent: number, expenses: number) {
  return execute(plan, registry, {
    general,
    w2: [w2],
    f1099m: [{
      payer_name: "Patent Licensee",
      payer_tin: "123456789",
      recipient_tin: "111223333",
      box2_royalties: royalty,
      box2_royalties_routing: "schedule_e",
      box2_nonpassive_portfolio_investment_for_form4952_verified: true,
    }],
    schedule_e: [{
      tsj: "T",
      property_description: "Patent royalty property",
      property_type: 6,
      activity_type: "D",
      fair_rental_days: 0,
      personal_use_days: 0,
      rent_income: 0,
      royalties_income: royalty,
      form_1099_payments_made: false,
      f1099m_royalty_source: {
        payer_name: "Patent Licensee",
        payer_tin: "123456789",
        recipient_tin: "111223333",
        box2_gross_royalties: royalty,
      },
    }],
    personal_property_rental: [{
      property_description: "Camera rental",
      recipient_tin: "111223333",
      rental_agreement_reference: "Synthetic camera rental agreement",
      payment_record_reference: "Synthetic 2025 rental ledger",
      gross_rent: rent,
      deductible_expenses: expenses,
      expense_workpaper_reference: "Synthetic expense ledger",
      engaged_for_profit_reviewed: true,
      not_trade_or_business_reviewed: true,
      expenses_not_claimed_elsewhere: true,
    }],
  }, { taxYear: 2025, formType: "f1040" });
}

function runMixedScheduleERoyalty(royaltyExpenses: number) {
  return execute(plan, registry, {
    general,
    w2: [w2],
    schedule_e: [{
      tsj: "T",
      property_description: "Mixed licensed property",
      property_type: 6,
      activity_type: "D",
      fair_rental_days: 0,
      personal_use_days: 0,
      rent_income: 5_000,
      royalties_income: 6_000,
      expense_other_lines: [{ description: "Property costs", amount: 5_000 }],
      form_1099_payments_made: false,
      eic_royalty_expense_allocation: {
        amount: royaltyExpenses,
        workpaper_reference: "Synthetic 2025 royalty/rent allocation ledger",
        all_property_expenses_allocated_once: true,
      },
    }],
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("EIC investment limit follows filed interest and dividends through the full graph", async () => {
  const atLimit = run(11_950);
  assertEquals(atLimit.diagnostics, []);
  assertEquals(atLimit.pending.f1040.line2a_tax_exempt, 11_950);
  assertEquals(atLimit.pending.eitc.investment_income_floor, 11_950);
  assertEquals(atLimit.pending.f1040.line27_eitc, 384);
  const filer = extractFilerIdentity(atLimit.pending.f1040);
  const xml = buildMefXml(buildPending(atLimit.pending), filer);
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }

  const overLimit = run(11_951);
  assertEquals(overLimit.diagnostics, []);
  assertEquals(overLimit.pending.eitc.investment_income_floor, 11_951);
  assertEquals(overLimit.pending.f1040.line27_eitc, undefined);

  const mixed = run(9_951, 1_000, 1_000);
  assertEquals(mixed.diagnostics, []);
  assertEquals(mixed.pending.f1040.line2a_tax_exempt, 9_951);
  assertEquals(mixed.pending.f1040.line2b_taxable_interest, 1_000);
  assertEquals(mixed.pending.f1040.line3b_ordinary_dividends, 1_000);
  assertEquals(mixed.pending.eitc.investment_income_floor, 11_951);
  assertEquals(mixed.pending.f1040.line27_eitc, undefined);

  const tampered = {
    ...atLimit.pending,
    eitc: { ...atLimit.pending.eitc, investment_income_floor: 0 },
  };
  assertThrows(
    () => buildMefXml(buildPending(tampered), filer),
    Error,
    "investment income differs",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(atLimit.pending.f1040, tampered),
    Error,
    "investment income differs",
  );
  const changedReturn = {
    ...atLimit.pending,
    f1040: { ...atLimit.pending.f1040, line2a_tax_exempt: 0 },
  };
  assertThrows(
    () => buildMefXml(buildPending(changedReturn), filer),
    Error,
    "investment income differs",
  );
});

Deno.test("EIC investment limit includes capital distributions but subtracts Form 4797 section 1231 gain", async () => {
  const atLimit = runCapital(11_950);
  assertEquals(atLimit.diagnostics, []);
  assertEquals(atLimit.pending.eitc.investment_income_floor, 11_950);
  assertEquals(atLimit.pending.f1040.line7a_cap_gain_distrib, 11_950);
  const credit = atLimit.pending.f1040.line27_eitc;
  if (typeof credit !== "number" || credit <= 0) {
    throw new Error("Expected a positive EIC at the capital-gain limit");
  }
  const filer = extractFilerIdentity(atLimit.pending.f1040);
  const xml = buildMefXml(buildPending(atLimit.pending), filer);
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }

  const overLimit = runCapital(11_951);
  assertEquals(overLimit.diagnostics, []);
  assertEquals(overLimit.pending.eitc.investment_income_floor, 11_951);
  assertEquals(overLimit.pending.f1040.line27_eitc, undefined);

  const businessGain = runCapital(0, 11_951);
  assertEquals(businessGain.diagnostics, []);
  assertEquals(businessGain.pending.eitc.investment_income_floor, 0);
  assertEquals(businessGain.pending.f1040.line7_capital_gain, 11_951);
  const businessCredit = businessGain.pending.f1040.line27_eitc;
  if (typeof businessCredit !== "number" || businessCredit <= 0) {
    throw new Error("Expected positive EIC after the Form 4797 adjustment");
  }
  buildMefXml(
    buildPending(businessGain.pending),
    extractFilerIdentity(businessGain.pending.f1040),
  );
  const changedSource = {
    ...businessGain.pending,
    form4797: { section_1231_gain: 0 },
  };
  assertThrows(
    () =>
      buildMefXml(
        buildPending(changedSource),
        extractFilerIdentity(businessGain.pending.f1040),
      ),
    Error,
    "investment income differs",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(businessGain.pending.f1040, changedSource),
    Error,
    "investment income differs",
  );
});

Deno.test("EIC investment limit includes Form 8814 tax-exempt interest and line 12 after Alaska adjustment", async () => {
  const atLimit = runForm8814(3_000, 11_650);
  assertEquals(atLimit.diagnostics, []);
  const atLimitChild = (atLimit.pending.form8814.items as Array<{
    line12: number;
    item: Record<string, unknown>;
  }>)[0];
  assertEquals(atLimitChild.line12, 8_950);
  assertEquals(atLimit.pending.eitc.investment_income_floor, 11_950);
  const credit = atLimit.pending.f1040.line27_eitc;
  if (typeof credit !== "number" || credit <= 0) {
    throw new Error("Expected positive EIC at the Form 8814 investment limit");
  }
  const filer = extractFilerIdentity(atLimit.pending.f1040);
  const xml = buildMefXml(buildPending(atLimit.pending), filer);
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }

  const overLimit = runForm8814(3_001, 11_650);
  assertEquals(overLimit.diagnostics, []);
  assertEquals(overLimit.pending.eitc.investment_income_floor, 11_951);
  assertEquals(overLimit.pending.f1040.line27_eitc, undefined);

  const alaska = runForm8814(5_159, 9_000, 2_000);
  assertEquals(alaska.diagnostics, []);
  assertEquals(
    (alaska.pending.form8814.items as Array<{ line12: number }>)[0].line12,
    8_300,
  );
  assertEquals(alaska.pending.eitc.investment_income_floor, 11_950);
  const alaskaCredit = alaska.pending.f1040.line27_eitc;
  if (typeof alaskaCredit !== "number" || alaskaCredit <= 0) {
    throw new Error("Expected EIC after excluding the Alaska PFD share");
  }
  const tampered = {
    ...atLimit.pending,
    form8814: {
      ...atLimit.pending.form8814,
      items: [{
        ...atLimitChild,
        item: {
          ...atLimitChild.item,
          tax_exempt_interest: 3_001,
        },
      }],
    },
  };
  assertThrows(
    () => buildMefXml(buildPending(tampered), filer),
    Error,
    "investment income differs",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(atLimit.pending.f1040, tampered),
    Error,
    "investment income differs",
  );
});

Deno.test("EIC investment limit nets filed Schedule E royalties and Schedule 1 personal-property rent", async () => {
  const atLimit = runRoyaltyAndRental(3_000, 9_000, 50);
  assertEquals(atLimit.diagnostics, []);
  assertEquals(atLimit.pending.eitc.investment_income_floor, 11_950);
  assertEquals(atLimit.pending.schedule1.line8l_personal_property_rent, 9_000);
  assertEquals(
    atLimit.pending.schedule1.line24b_personal_property_expenses,
    50,
  );
  const credit = atLimit.pending.f1040.line27_eitc;
  if (typeof credit !== "number" || credit <= 0) {
    throw new Error("Expected positive EIC at the royalty/rental limit");
  }
  const filer = extractFilerIdentity(atLimit.pending.f1040);
  const schedule1Fields = schedule1Pdf.instances?.(
    atLimit.pending.schedule1,
    filer,
    atLimit.pending,
  )?.[0];
  assertEquals(schedule1Fields?.line8l_personal_property_rent, 9_000);
  assertEquals(schedule1Fields?.line24b_personal_property_expenses, 50);
  assertEquals(
    schedule1Pdf.fields.find((field) =>
      field.domainKey === "line8l_personal_property_rent"
    )?.pdfField,
    "topmostSubform[0].Page1[0].f1_24[0]",
  );
  assertEquals(
    schedule1Pdf.fields.find((field) =>
      field.domainKey === "line24b_personal_property_expenses"
    )?.pdfField,
    "topmostSubform[0].Page2[0].f2_17[0]",
  );
  const xml = buildMefXml(buildPending(atLimit.pending), filer);
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }

  const overLimit = runRoyaltyAndRental(3_001, 9_000, 50);
  assertEquals(overLimit.diagnostics, []);
  assertEquals(overLimit.pending.eitc.investment_income_floor, 11_951);
  assertEquals(overLimit.pending.f1040.line27_eitc, undefined);
  const missingRentalSource = { ...overLimit.pending };
  delete missingRentalSource.personal_property_rental;
  const overFiler = extractFilerIdentity(overLimit.pending.f1040);
  assertThrows(
    () => buildMefXml(buildPending(missingRentalSource), overFiler),
    Error,
    "personal-property rental needs reviewed source",
  );
  assertThrows(
    () =>
      schedule1Pdf.instances?.(
        overLimit.pending.schedule1,
        overFiler,
        missingRentalSource,
      ),
    Error,
    "personal-property rental needs reviewed source",
  );

  const tampered = {
    ...atLimit.pending,
    personal_property_rental: {
      personal_property_rentals: [{
        ...((atLimit.pending.personal_property_rental
          .personal_property_rentals as Record<string, unknown>[])[0]),
        gross_rent: 9_001,
      }],
    },
  };
  assertThrows(
    () => buildMefXml(buildPending(tampered), filer),
    Error,
    "personal-property rental differs",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(atLimit.pending.f1040, tampered),
    Error,
    "personal-property rental differs",
  );
});

Deno.test("EIC reconciles a reviewed mixed Schedule E royalty expense allocation", () => {
  const result = runMixedScheduleERoyalty(2_000);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.eitc.investment_income_floor, 4_000);
  const credit = result.pending.f1040.line27_eitc;
  if (typeof credit !== "number" || credit <= 0) {
    throw new Error("Expected EIC with reviewed royalty expense allocation");
  }
  const filer = extractFilerIdentity(result.pending.f1040);
  buildMefXml(buildPending(result.pending), filer);
  const tampered = {
    ...result.pending,
    schedule_e: {
      ...result.pending.schedule_e,
      schedule_es: [{
        ...((result.pending.schedule_e.schedule_es as Record<
          string,
          unknown
        >[])[0]),
        eic_royalty_expense_allocation: {
          amount: 2_001,
          workpaper_reference: "Synthetic 2025 royalty/rent allocation ledger",
          all_property_expenses_allocated_once: true,
        },
      }],
    },
  };
  assertThrows(
    () => buildMefXml(buildPending(tampered), filer),
    Error,
    "investment income differs",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(result.pending.f1040, tampered),
    Error,
    "investment income differs",
  );
});
