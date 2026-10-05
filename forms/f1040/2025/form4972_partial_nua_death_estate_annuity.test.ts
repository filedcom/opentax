import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { DistributionCode } from "../nodes/inputs/f1099r/index.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { f1040_2025 } from "./index.ts";
import { registry } from "./registry.ts";
import { FIELD_MAP, form4972 as native } from "./mef/forms/f4972.ts";
import { form4972Pdf } from "./pdf/forms/f4972.ts";

const general = {
  filing_status: "single" as const,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Taxpayer",
  taxpayer_ssn: "123456789",
  taxpayer_dob: "1970-01-01",
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
  digital_assets: false,
  taxpayer_can_be_claimed_as_dependent: false,
};
const source = {
  payer_name: "Qualified Stock Bonus Plan",
  payer_ein: "123456789",
  recipient_ssn: "123456789",
  source_document_reference: "2025-issued-1099-R-beneficiary",
  form4972_plan: {
    participant_name: "Pat Participant",
    participant_ssn: "444556666",
    plan_reference: "stock-bonus-plan-2025",
    full_balance_statement_reference: "full-plan-balance-2025",
    all_qualified_distributions_included: true,
  },
  box1_gross_distribution: 24_000,
  box2a_taxable_amount: 20_000,
  box3_capital_gain: 4_000,
  box6_nua: 4_000,
  box7_distribution_code: DistributionCode.CodeA,
  box8_other: 3_000,
  box8_pct_total: 25,
  box9a_pct_total: 50,
  ts: "T" as const,
  exclude_4972: true,
};
const election = {
  source_document_references: [source.source_document_reference],
  participant_name: source.form4972_plan.participant_name,
  participant_ssn: source.form4972_plan.participant_ssn,
  plan_reference: source.form4972_plan.plan_reference,
  born_before_1936: true,
  entire_balance_distributed: true,
  rolled_over_any: false,
  beneficiary_distribution: true,
  participant_five_year_member: false,
  participant_died_before_1996_08_21: true,
  prior_beneficiary_election_after_1986: false,
  elect_include_nua: true,
  elect_capital_gain: true,
  elect_10yr_averaging: true,
  death_benefit_exclusion: 5_000,
  death_benefit_recipient_allocated_amount: 2_500,
  death_benefit_exclusion_source_reference: "death-benefit-plan-allocation",
  death_benefit_allocation: {
    participant_ssn: source.form4972_plan.participant_ssn,
    elected_recipient_ssn: general.taxpayer_ssn,
    recipients: [
      {
        recipient_ssn: general.taxpayer_ssn,
        share_pct: 50,
        excluded_amount: 2_500,
      },
      { recipient_ssn: "987654321", share_pct: 50, excluded_amount: 2_500 },
    ],
  },
  federal_estate_tax: 2_000,
  partial_estate_tax_source: {
    administrator_statement_reference: "estate-administrator-allocation",
    estate_tax_return_reference: "filed-Form-706-workpaper",
    full_distribution_taxable_amount: 48_000,
    full_distribution_federal_estate_tax: 2_000,
    recipient_allocated_federal_estate_tax: 1_000,
  },
};

function returnCase(changedElection = election, changedSource = source) {
  const result = execute(buildExecutionPlan(registry), registry, {
    general,
    f1099r: [changedSource],
    form4972: { elections: [changedElection] },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  return { pending: result.pending, filer: extractFilerIdentity(general) };
}

Deno.test("partial beneficiary combines NUA, death, estate tax, and annuity", async () => {
  const { pending, filer } = returnCase();
  const form = (pending.form4972?.forms as Record<string, unknown>[])[0];
  assertEquals(form.line6_nua_capital_gain, 800);
  assertEquals(form.line6, 4_100);
  assertEquals(form.line7, 820);
  assertEquals(form.line8, 38_400);
  assertEquals(form.line9, 4_000);
  assertEquals(form.line18, 1_600);
  assertEquals(form.line11, 12_000);
  assertEquals(form.line20, 0.25862);
  // Official multiple-recipient Steps 3-5: use box 8's own percentage,
  // deduct the annuity tax first, then multiply by the box 9a cash share.
  const expected = {
    line10: 34_400,
    line11: 12_000,
    line12: 46_400,
    line13: 10_000,
    line14: 26_400,
    line15: 5_280,
    line16: 4_720,
    line17: 41_680,
    line18: 1_600,
    line19: 40_080,
    line20: 0.25862,
    line21: 1_221,
    line22: 10_779,
    line23: 4_008,
    line24: 504,
    line25: 5_040,
    line26: 1_078,
    line27: 119,
    line28: 1_190,
    line29: 1_925,
    line30: 2_745,
  };
  for (const [key, value] of Object.entries(expected)) {
    assertEquals(form[key], value, key);
  }
  assertEquals(pending.f1040?.line5b_pension_taxable ?? 0, 0);
  assertEquals(pending.f1040?.form4972_tax, form.line30);
  assertEquals(pending.f1040?.line16_income_tax, form.line30);
  const xml = native.build(pending.form4972!, { filer, pending })[0];
  assertStringIncludes(xml, ">4100</CapitalGainElectionAmt>");
  assertStringIncludes(
    xml,
    "<LumpSumDistriDeathBnftExclAmt>4000</LumpSumDistriDeathBnftExclAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpDistribFederalEstateTaxAmt>1600</LumpDistribFederalEstateTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<AnnuityActuarialValueAmt>12000</AnnuityActuarialValueAmt>",
  );
  for (const [key, tag] of FIELD_MAP) {
    if (expected[key as keyof typeof expected] === undefined) continue;
    assertStringIncludes(xml, `>${form[key]}</${tag}>`);
  }
  assertStringIncludes(
    xml,
    "<LumpSumDistriMultRecipientsCd>MRD</LumpSumDistriMultRecipientsCd>",
  );
  const projected = form4972Pdf.instances?.(pending.form4972!, filer, pending)
    ?.[0];
  assertEquals(projected?.line6, 4_100);
  for (const [key, value] of Object.entries(expected)) {
    if (key === "line20") continue; // Printed as separate whole/fraction fields.
    assertEquals(projected?.[key], value, key);
  }
  assertEquals(projected?.line20_whole, "0");
  assertEquals(projected?.line20_fraction, "25862");
  const prepared = await f1040_2025.prepareReturn(pending, filer);
  assertEquals((prepared.bundle.xml.match(/<IRS4972\b/g) ?? []).length, 1);
  const pdf = await prepared.renderPdf();
  assertEquals(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");
  const document = await PDFDocument.load(pdf);
  assertEquals(document.getPageCount(), 3);
  assertEquals(document.getForm().getFields().length, 0); // Filing packet is flattened.
  const pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(pdfPath, pdf);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(extracted.code, 0, new TextDecoder().decode(extracted.stderr));
    const text = new TextDecoder().decode(extracted.stdout);
    assertStringIncludes(text, "0 . 25862");
    for (const [line, value] of Object.entries(expected)) {
      if (line === "line20") continue;
      assertEquals(
        new RegExp(`\\b${line.slice(4)}\\s+${value}\\b`).test(text),
        true,
        line,
      );
    }
    assertEquals(/2\s+✔\s+4972[\s\S]*?16\s+2745/.test(text), true);
  } finally {
    await Deno.remove(pdfPath);
  }
  const evidenceDir = Deno.env.get("FORM4972_EVIDENCE_DIR");
  if (evidenceDir) {
    await Deno.mkdir(evidenceDir, { recursive: true });
    await Deno.writeTextFile(
      `${evidenceDir}/full-return.xml`,
      prepared.bundle.xml,
    );
    await Deno.writeFile(`${evidenceDir}/filled-return.pdf`, pdf);
  }
});

Deno.test("annuity beneficiary route rejects allocation, issued-copy, and tax changes", () => {
  const { pending, filer } = returnCase();
  assertThrows(() =>
    returnCase({
      ...election,
      death_benefit_recipient_allocated_amount: 2_499,
    })
  );
  assertThrows(() =>
    returnCase({
      ...election,
      partial_estate_tax_source: {
        ...election.partial_estate_tax_source,
        recipient_allocated_federal_estate_tax: 999,
      },
    })
  );
  assertThrows(() =>
    returnCase({
      ...election,
      partial_estate_tax_source: {
        ...election.partial_estate_tax_source,
        administrator_statement_reference:
          election.death_benefit_exclusion_source_reference,
      },
    })
  );
  const rejected = (changed: typeof pending) => {
    assertThrows(() =>
      native.build(changed.form4972!, { filer, pending: changed })
    );
    assertThrows(() =>
      form4972Pdf.instances?.(changed.form4972!, filer, changed)
    );
  };
  for (
    const sourceChanges of [
      { box8_other: 2_999 },
      { box8_pct_total: 50 },
      { box8_pct_total: undefined },
      { box9a_pct_total: 25 },
      { recipient_ssn: "987654321" },
      { source_document_reference: "changed-issued-copy" },
      {
        form4972_plan: {
          ...source.form4972_plan,
          participant_ssn: "555667777",
        },
      },
    ]
  ) {
    rejected({
      ...pending,
      f1099r: { f1099rs: [{ ...source, ...sourceChanges }] },
    });
  }
  for (
    const line of [
      "line11",
      ...Array.from({ length: 10 }, (_, n) => `line${20 + n}`),
    ]
  ) {
    const forms = pending.form4972!.forms as Record<string, unknown>[];
    rejected({
      ...pending,
      form4972: {
        ...pending.form4972,
        forms: [{ ...forms[0], [line]: Number(forms[0][line]) + 1 }],
      },
    });
  }
  for (
    const changed of [
      { ...pending, f1099r: { f1099rs: [{ ...source, box6_nua: 3_999 }] } },
      { ...pending, f1040: { ...pending.f1040, form4972_tax: 1 } },
    ]
  ) {
    assertThrows(() =>
      native.build(pending.form4972!, { filer, pending: changed })
    );
    assertThrows(() =>
      form4972Pdf.instances?.(pending.form4972!, filer, changed)
    );
  }
});

Deno.test("beneficiary annuity rejects missing source share and lost elections", () => {
  for (
    const [sourceChanges, electionChanges] of [
      [{ box8_pct_total: undefined }, {}],
      [{}, { elect_10yr_averaging: false }],
      [{}, { elect_capital_gain: false }],
      [{}, { elect_include_nua: false }],
    ]
  ) {
    const result = execute(buildExecutionPlan(registry), registry, {
      general,
      f1099r: [{ ...source, ...sourceChanges }],
      form4972: { elections: [{ ...election, ...electionChanges }] },
    }, { taxYear: 2025, formType: "f1040" });
    assertEquals(
      result.diagnostics.some((diagnostic) => diagnostic.severity === "error"),
      true,
      JSON.stringify([sourceChanges, electionChanges]),
    );
  }
});

Deno.test("beneficiary annuity preserves box 8 cents and rounds filed lines", async () => {
  const centsSource = { ...source, box8_other: 3_000.13 };
  const { pending, filer } = returnCase(election, centsSource);
  const form = (pending.form4972!.forms as Record<string, unknown>[])[0];
  assertEquals(form.annuity_actuarial_value, 3_000.13);
  const expected = {
    line11: 12_001,
    line12: 46_401,
    line17: 41_681,
    line19: 40_081,
    line20: 0.25864,
    line21: 1_221,
    line22: 10_780,
    line23: 4_008,
    line24: 504,
    line25: 5_040,
    line26: 1_078,
    line27: 119,
    line28: 1_190,
    line29: 1_925,
    line30: 2_745,
  };
  const xml = native.build(pending.form4972!, { filer, pending })[0];
  const projected = form4972Pdf.instances?.(pending.form4972!, filer, pending)
    ?.[0];
  for (const [key, value] of Object.entries(expected)) {
    assertEquals(form[key], value, key);
    const tag = FIELD_MAP.find(([line]) => line === key)![1];
    assertStringIncludes(xml, `>${value}</${tag}>`);
    if (key !== "line20") assertEquals(projected?.[key], value, key);
  }
  assertEquals(projected?.line20_fraction, "25864");
  // A source edit still fails even when it rounds to the same filed line 11.
  const changed = {
    ...pending,
    f1099r: {
      f1099rs: [{ ...centsSource, box8_other: 3_000.14 }],
    },
  };
  assertThrows(() =>
    native.build(pending.form4972!, { filer, pending: changed })
  );
  assertThrows(() =>
    form4972Pdf.instances?.(pending.form4972!, filer, changed)
  );
  assertEquals(pending.f1040?.line16_income_tax, 2_745);
  const prepared = await f1040_2025.prepareReturn(pending, filer);
  if (xsdAvailable) await validateXml(prepared.bundle.xml);
  const pdf = await prepared.renderPdf();
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), 3);
  const evidenceDir = Deno.env.get("FORM4972_EVIDENCE_DIR");
  if (evidenceDir) {
    await Deno.writeTextFile(
      `${evidenceDir}/cents-full-return.xml`,
      prepared.bundle.xml,
    );
    await Deno.writeFile(`${evidenceDir}/cents-filled-return.pdf`, pdf);
  }
});

const xsd = new URL(
  "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
let xsdAvailable = false;
try {
  Deno.statSync(xsd);
  xsdAvailable = true;
} catch { /* Local IRS bundle. */ }
Deno.test({
  name: "XSD: sourced beneficiary NUA/death/estate/annuity full return",
  ignore: !xsdAvailable,
}, async () => {
  const { pending, filer } = returnCase();
  const prepared = await f1040_2025.prepareReturn(pending, filer);
  await validateXml(prepared.bundle.xml);
});

async function validateXml(xml: string) {
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stdout: "piped",
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
}
