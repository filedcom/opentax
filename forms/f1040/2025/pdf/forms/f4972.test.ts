import { assert, assertEquals, assertMatch, assertThrows } from "@std/assert";
import {
  decodePDFRawStream,
  PDFArray,
  PDFDocument,
  PDFRawStream,
} from "pdf-lib";
import { form4972NuaAnnotations, form4972Pdf } from "./f4972.ts";
import { DistributionCode } from "../../../nodes/inputs/f1099r/index.ts";
import {
  form4972 as form4972Node,
  inputSchema as form4972InputSchema,
} from "../../../nodes/intermediate/forms/form4972/index.ts";

Deno.test("2025 Form 4972 PDF prints a sourced partial-share Part III and MRD", async () => {
  const source = {
    ...eligibility,
    recipient: "T",
    lump_sum_amount: 20_000,
    recipient_share_pct: 50,
    elect_10yr_averaging: true,
  };
  const calculated = form4972Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form4972InputSchema.parse(source),
  ).outputs[0].fields;
  const original = pending("T", 20_000);
  const allPending = {
    ...original,
    f1099r: {
      f1099rs: [{ ...original.f1099r.f1099rs[0], box9a_pct_total: 50 }],
    },
    f1040: { form4972_tax: 2_095 },
  };
  const projected = form4972Pdf.projectFields?.({ ...calculated }, allPending);
  assertEquals(projected?.line8, 40_000);
  assertEquals(projected?.line29, 2_095);
  assertThrows(
    () =>
      form4972Pdf.projectFields?.({ ...calculated, line29: 2_094 }, allPending),
    Error,
    "sourced 2025 calculation",
  );
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  await form4972Pdf.decoratePages?.(
    document,
    [page],
    projected ?? {},
    undefined,
  );
  const saved = await PDFDocument.load(await document.save());
  const contents = saved.getPage(0).node.Contents();
  assert(contents instanceof PDFArray);
  const stream = contents.lookup(contents.size() - 1, PDFRawStream);
  const operators = new TextDecoder().decode(
    decodePDFRawStream(stream).decode(),
  );
  assertMatch(operators, /<4d5244>/i);
});

Deno.test("2025 Form 4972 PDF keeps a partial beneficiary's full death benefit on line 9", () => {
  const source = {
    ...eligibility,
    recipient: "T",
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
  const calculated = form4972Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form4972InputSchema.parse(source),
  ).outputs[0].fields;
  const original = pending("T", 20_000);
  const allPending = {
    ...original,
    f1099r: {
      f1099rs: [{ ...original.f1099r.f1099rs[0], box9a_pct_total: 50 }],
    },
    f1040: { form4972_tax: 1_675 },
  };
  const projected = form4972Pdf.projectFields?.({ ...calculated }, allPending);
  assertEquals(projected?.line8, 40_000);
  assertEquals(projected?.line9, 5_000);
  assertEquals(projected?.line10, 35_000);
  assertEquals(projected?.line29, 1_675);
  assertEquals(projected?.line30, 1_675);
  assertThrows(
    () =>
      form4972Pdf.projectFields?.({ ...calculated, line9: 2_500 }, allPending),
    Error,
    "sourced 2025 calculation",
  );
});

Deno.test("2025 Form 4972 PDF separates partial beneficiary capital and ordinary death-benefit lines", () => {
  const source = {
    ...eligibility,
    recipient: "T",
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
  const calculated = form4972Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form4972InputSchema.parse(source),
  ).outputs[0].fields;
  const original = pending("T", 20_000);
  const allPending = {
    ...original,
    f1099r: {
      f1099rs: [{
        ...original.f1099r.f1099rs[0],
        box3_capital_gain: 4_000,
        box9a_pct_total: 50,
      }],
    },
    f1040: { form4972_tax: 1_815 },
  };
  const projected = form4972Pdf.projectFields?.({ ...calculated }, allPending);
  assertEquals(projected?.line6, 3_500);
  assertEquals(projected?.line9, 4_000);
  assertEquals(projected?.line29, 1_115);
  assertEquals(projected?.line30, 1_815);
  assertThrows(
    () =>
      form4972Pdf.projectFields?.({ ...calculated, line6: 3_000 }, allPending),
    Error,
    "sourced 2025 calculation",
  );
  assertThrows(
    () =>
      form4972Pdf.projectFields?.({ ...calculated }, {
        ...allPending,
        f1040: { form4972_tax: 1_814 },
      }),
    Error,
    "Form 1040 tax source",
  );
});

Deno.test("2025 Form 4972 PDF reconciles partial-share capital and ordinary lines", () => {
  const source = {
    ...eligibility,
    recipient: "T",
    lump_sum_amount: 20_000,
    capital_gain_amount: 4_000,
    recipient_share_pct: 50,
    elect_capital_gain: true,
    elect_10yr_averaging: true,
  };
  const calculated = form4972Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form4972InputSchema.parse(source),
  ).outputs[0].fields;
  const original = pending("T", 20_000, 4_000);
  const allPending = {
    ...original,
    f1099r: {
      f1099rs: [{ ...original.f1099r.f1099rs[0], box9a_pct_total: 50 }],
    },
    f1040: { form4972_tax: 2_220 },
  };
  const projected = form4972Pdf.projectFields?.({ ...calculated }, allPending);
  assertEquals(projected?.line6, 4_000);
  assertEquals(projected?.line7, 800);
  assertEquals(projected?.line8, 32_000);
  assertEquals(projected?.line29, 1_420);
  assertEquals(projected?.line30, 2_220);
  assertThrows(
    () =>
      form4972Pdf.projectFields?.({ ...calculated, line8: 36_000 }, allPending),
    Error,
    "sourced 2025 calculation",
  );
});

Deno.test("2025 Form 4972 PDF projects a shared annuity from box 8 percentage", () => {
  const source = {
    ...eligibility,
    recipient: "T",
    lump_sum_amount: 20_000,
    annuity_actuarial_value: 2_000,
    annuity_share_pct: 25,
    recipient_share_pct: 50,
    elect_10yr_averaging: true,
  };
  const calculated = form4972Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form4972InputSchema.parse(source),
  ).outputs[0].fields;
  const original = pending("T", 20_000, 0, 0, 2_000);
  const allPending = {
    ...original,
    f1099r: {
      f1099rs: [{
        ...original.f1099r.f1099rs[0],
        box8_pct_total: 25,
        box9a_pct_total: 50,
      }],
    },
    f1040: { form4972_tax: calculated.line30 },
  };
  const projected = form4972Pdf.projectFields?.({ ...calculated }, allPending);
  assertEquals(projected?.line11, 8_000);
  assertEquals(projected?.line29, 2_365);
  assertThrows(
    () =>
      form4972Pdf.projectFields?.({ ...calculated }, {
        ...allPending,
        f1099r: {
          f1099rs: [{
            ...original.f1099r.f1099rs[0],
            box8_pct_total: 50,
            box9a_pct_total: 50,
          }],
        },
      }),
    Error,
    "partial share differs from Form 1099-R boxes",
  );
});

Deno.test("2025 Form 4972 PDF reconciles partial-share NUA, MRD, and the grossed-up note", async () => {
  const source = {
    ...eligibility,
    recipient: "T",
    lump_sum_amount: 100_000,
    capital_gain_amount: 30_000,
    box6_nua: 20_000,
    recipient_share_pct: 50,
    elect_include_nua: true,
    elect_capital_gain: true,
    elect_10yr_averaging: true,
  };
  const calculated = form4972Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form4972InputSchema.parse(source),
  ).outputs[0].fields;
  const original = pending("T", 100_000, 30_000, 20_000);
  const allPending = {
    ...original,
    f1099r: {
      f1099rs: [{ ...original.f1099r.f1099rs[0], box9a_pct_total: 50 }],
    },
    f1040: { form4972_tax: calculated.line30 },
  };
  const projected = form4972Pdf.projectFields?.({ ...calculated }, allPending);
  assertEquals(projected?.line6, 36_000);
  assertEquals(projected?.line6_nua_capital_gain, 6_000);
  assertEquals(projected?.line8, 168_000);
  assertEquals(projected?.line8_nua_included, 28_000);
  assertEquals(projected?.recipient_share_pct, 50);
  assertThrows(
    () =>
      form4972Pdf.projectFields?.({ ...calculated, line8: 84_000 }, allPending),
    Error,
    "sourced 2025 calculation",
  );
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  await form4972Pdf.decoratePages?.(
    document,
    [page],
    projected ?? {},
    undefined,
  );
  const saved = await PDFDocument.load(await document.save());
  const contents = saved.getPage(0).node.Contents();
  assert(contents instanceof PDFArray);
  const stream = contents.lookup(contents.size() - 1, PDFRawStream);
  const operators = new TextDecoder().decode(
    decodePDFRawStream(stream).decode(),
  );
  assertMatch(operators, /<4e55412036303030>/i);
  assertMatch(operators, /<4e5541203238303030>/i);
  assertMatch(operators, /<4d5244>/i);
});

Deno.test("2025 Form 4972 PDF projects Part-III-only partial-share NUA without line 6", () => {
  const source = {
    ...eligibility,
    recipient: "T",
    lump_sum_amount: 100_000,
    capital_gain_amount: 30_000,
    box6_nua: 20_000,
    recipient_share_pct: 50,
    elect_include_nua: true,
    elect_10yr_averaging: true,
  };
  const calculated = form4972Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form4972InputSchema.parse(source),
  ).outputs[0].fields;
  const original = pending("T", 100_000, 30_000, 20_000);
  const allPending = {
    ...original,
    f1099r: {
      f1099rs: [{ ...original.f1099r.f1099rs[0], box9a_pct_total: 50 }],
    },
    f1040: { form4972_tax: calculated.line30 },
  };
  const projected = form4972Pdf.projectFields?.({ ...calculated }, allPending);
  assertEquals(projected?.line6, undefined);
  assertEquals(projected?.line8, 240_000);
  assertEquals(projected?.line8_nua_included, 40_000);
  assertEquals(projected?.recipient_share_pct, 50);
  assertThrows(
    () =>
      form4972Pdf.projectFields?.(
        { ...calculated, line8: 200_000 },
        allPending,
      ),
    Error,
    "sourced 2025 calculation",
  );
});

const eligibility = {
  born_before_1936: true,
  entire_balance_distributed: true,
  rolled_over_any: false,
  beneficiary_distribution: false,
  participant_five_year_member: true,
  prior_election_after_1986: false,
};

const partII = {
  ...eligibility,
  recipient: "T",
  lump_sum_amount: 100_000,
  capital_gain_amount: 30_000,
  elect_capital_gain: true,
  elect_10yr_averaging: false,
  line6: 30_000,
  line7: 6_000,
};

const partIII = {
  ...eligibility,
  recipient: "T",
  lump_sum_amount: 10_000,
  elect_capital_gain: false,
  elect_10yr_averaging: true,
  line8: 10_000,
  line9: 0,
  line10: 10_000,
  line11: 0,
  line12: 10_000,
  line13: 5_000,
  line14: 0,
  line15: 0,
  line16: 5_000,
  line17: 5_000,
  line18: 0,
  line19: 5_000,
  line23: 500,
  line24: 55,
  line25: 550,
  line29: 550,
  line30: 550,
};

const estatePartII = {
  ...partII,
  beneficiary_distribution: true,
  participant_five_year_member: false,
  prior_election_after_1986: true,
  prior_beneficiary_election_after_1986: false,
  federal_estate_tax: 4_000,
  death_benefit_exclusion: 5_000,
  participant_died_before_1996_08_21: true,
  line6: 27_300,
  line7: 5_460,
};

function pending(
  recipient: "T" | "S",
  taxable: number,
  capitalGain = 0,
  nua = 0,
  annuity = 0,
) {
  return {
    general: {
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123456789",
      spouse_first_name: "Sam",
      spouse_last_name: "Taxpayer",
      spouse_ssn: "987654321",
    },
    f1099r: {
      f1099rs: [{
        payer_name: "Qualified Plan",
        payer_ein: "123456789",
        box1_gross_distribution: taxable,
        box2a_taxable_amount: taxable,
        box3_capital_gain: capitalGain,
        box6_nua: nua,
        box8_other: annuity,
        box7_distribution_code: DistributionCode.CodeA,
        ts: recipient,
        exclude_4972: true,
      }],
    },
  };
}

Deno.test("2025 Form 4972 PDF uses calculated line fields instead of 1099-R source boxes", () => {
  const byKey = new Map(
    form4972Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(byKey.get("line6"), "topmostSubform[0].Page1[0].f1_03[0]");
  assertEquals(
    byKey.get("recipient_name"),
    "topmostSubform[0].Page1[0].f1_01[0]",
  );
  assertEquals(byKey.get("line9"), "topmostSubform[0].Page1[0].f1_06[0]");
  assertEquals(
    byKey.get("line20_fraction"),
    "topmostSubform[0].Page1[0].Line20_ReadOrder[0].f1_18[0]",
  );
  assertEquals(byKey.get("line30"), "topmostSubform[0].Page1[0].f1_28[0]");
  assertEquals(byKey.has("lump_sum_amount"), false);
  const beneficiaryPrior = form4972Pdf.fields.filter((entry) =>
    entry.domainKey === "prior_beneficiary_election_after_1986"
  );
  assertEquals(beneficiaryPrior.length, 2);
  assertEquals(
    beneficiaryPrior.map((entry) => entry.pdfField),
    [
      "topmostSubform[0].Page1[0].c1_6[0]",
      "topmostSubform[0].Page1[0].c1_6[1]",
    ],
  );
  assertEquals(form4972Pdf.pageIndices?.({}), [0]);
});

Deno.test("2025 Form 4972 PDF splits line 20 at its printed decimal point", () => {
  const projected = form4972Pdf.projectFields?.(
    {
      ...partIII,
      line11: 1_000,
      line12: 11_000,
      line13: 5_500,
      line16: 5_500,
      line17: 5_500,
      line19: 5_500,
      line20: 0.09091,
      line21: 500,
      line22: 500,
      line23: 550,
      line24: 61,
      line25: 610,
      line26: 50,
      line27: 6,
      line28: 60,
      line29: 550,
      line30: 550,
      annuity_actuarial_value: 1_000,
    },
    {
      ...pending("T", 10_000, 0, 0, 1_000),
      f1040: { form4972_tax: 550 },
    },
  );
  assertEquals(projected?.recipient_name, "Alex Taxpayer");
  assertEquals(projected?.recipient_ssn, "123456789");
  assertEquals(projected?.line20_whole, "0");
  assertEquals(projected?.line20_fraction, "09091");
});

Deno.test("2025 Form 4972 PDF selects the spouse recipient without using taxpayer identity", () => {
  const projected = form4972Pdf.projectFields?.(
    { ...partII, recipient: "S" },
    {
      ...pending("S", 100_000, 30_000),
      f1040: {
        form4972_tax: 6_000,
        line5b_pension_taxable: 70_000,
      },
    },
  );
  assertEquals(projected?.recipient_name, "Sam Taxpayer");
  assertEquals(projected?.recipient_ssn, "987654321");
  assertEquals(form4972Pdf.includeWhen?.(projected ?? {}), true);
  assertEquals(form4972Pdf.includeWhen?.({ lump_sum_amount: 20_000 }), false);
});

Deno.test("2025 Form 4972 PDF full-share ordinary path rejects missing final tax and altered calculated lines", () => {
  const source = {
    ...eligibility,
    recipient: "T",
    lump_sum_amount: 30_000,
    capital_gain_amount: 5_000,
    elect_capital_gain: true,
    elect_10yr_averaging: true,
  };
  const calculated = form4972Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form4972InputSchema.parse(source),
  ).outputs[0].fields;
  const allPending = {
    ...pending("T", 30_000, 5_000),
    f1040: { form4972_tax: calculated.line30 },
  };
  assertEquals(
    form4972Pdf.projectFields?.(calculated, allPending)?.line30,
    calculated.line30,
  );
  assertThrows(
    () => form4972Pdf.projectFields?.(calculated, pending("T", 30_000, 5_000)),
    Error,
    "special tax differs from the finalized Form 1040",
  );
  assertThrows(
    () =>
      form4972Pdf.projectFields?.({
        ...calculated,
        line24: (calculated.line24 as number) + 1,
        line25: (calculated.line25 as number) + 10,
        line29: (calculated.line29 as number) + 10,
        line30: (calculated.line30 as number) + 10,
      }, {
        ...allPending,
        f1040: { form4972_tax: (calculated.line30 as number) + 10 },
      }),
    Error,
    "full-share lines differ from the elected 2025 calculation",
  );
});

Deno.test("2025 Form 4972 PDF reconciles beneficiary estate tax and prints question 5b", () => {
  const allPending = {
    ...pending("T", 100_000, 30_000),
    f1040: { form4972_tax: 5_460 },
  };
  const projected = form4972Pdf.projectFields?.(estatePartII, allPending);
  assertEquals(projected?.line6, 27_300);
  assertEquals(projected?.line7, 5_460);
  assertEquals(projected?.prior_election_after_1986, undefined);
  assertEquals(projected?.prior_beneficiary_election_after_1986, false);
  assertEquals(projected?.line18, undefined);
  assertThrows(
    () =>
      form4972Pdf.projectFields?.(
        { ...estatePartII, line6: 28_500, line7: 5_700 },
        allPending,
      ),
    Error,
    "estate lines or Form 1040 tax differ",
  );
});

Deno.test("2025 Form 4972 PDF refuses a calculated form without selected recipient identity", () => {
  assertThrows(
    () =>
      form4972Pdf.projectFields?.({ ...partII, recipient: "S" }, {
        ...pending("S", 100_000, 30_000),
        general: {},
        f1040: { form4972_tax: 6_000, line5b_pension_taxable: 70_000 },
      }),
    Error,
    "needs the selected recipient name and SSN",
  );
});

Deno.test("2025 Form 4972 PDF rejects incomplete or unsourced elected parts", () => {
  assertThrows(
    () => form4972Pdf.projectFields?.({ lump_sum_amount: 10_000 }, {}),
    Error,
    "source facts but no elected printed part",
  );
  assertThrows(
    () =>
      form4972Pdf.projectFields?.(
        { ...partII, line7: undefined },
        pending("T", 100_000, 30_000),
      ),
    Error,
    "needs line7",
  );
  assertThrows(
    () => form4972Pdf.projectFields?.(partII, {}),
    Error,
    "one matching Form 1099-R source and recipient share",
  );
  assertThrows(
    () => form4972Pdf.projectFields?.(partII, pending("T", 100_000, 31_000)),
    Error,
    "one matching Form 1099-R source and recipient share",
  );
  assertThrows(
    () =>
      form4972Pdf.projectFields?.(
        { ...partIII, line30: 551 },
        pending("T", 10_000),
      ),
    Error,
    "Part III lines do not reconcile",
  );
  assertEquals(
    form4972Pdf.projectFields?.(partIII, {
      ...pending("T", 10_000),
      f1040: { form4972_tax: 550 },
    })?.line30,
    550,
  );
});

Deno.test("2025 Form 4972 PDF reconciles NUA notes to the elected 1099-R", () => {
  const fields = {
    ...eligibility,
    recipient: "T",
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
    line9: 0,
    line10: 84_000,
    line11: 0,
    line12: 84_000,
    line17: 84_000,
    line18: 0,
    line19: 84_000,
    line23: 8_400,
    line24: 1_175,
    line25: 11_750,
    line29: 11_750,
    line30: 18_950,
  };
  const source = pending("T", 100_000, 30_000, 20_000);
  assertEquals(
    form4972Pdf.projectFields?.(fields, source)?.recipient_name,
    "Alex Taxpayer",
  );
  assertThrows(
    () =>
      form4972Pdf.projectFields?.(
        { ...fields, line6_nua_capital_gain: 5_000 },
        source,
      ),
    Error,
    "worksheet does not reconcile",
  );
});

Deno.test("2025 Form 4972 PDF projects sourced Part-II-only NUA without Part III", () => {
  const source = {
    ...eligibility,
    recipient: "T",
    lump_sum_amount: 100_000,
    capital_gain_amount: 30_000,
    box6_nua: 20_000,
    elect_include_nua: true,
    elect_capital_gain: true,
  };
  const fields = form4972Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form4972InputSchema.parse(source),
  ).outputs[0].fields;
  const allPending = {
    ...pending("T", 100_000, 30_000, 20_000),
    f1040: { form4972_tax: 7_200, line5b_pension_taxable: 84_000 },
  };
  const projected = form4972Pdf.projectFields?.(fields, allPending);
  assertEquals(projected?.line6, 36_000);
  assertEquals(projected?.line7, 7_200);
  assertEquals(projected?.line8, undefined);
  assertEquals(projected?.line30, undefined);
  assertEquals(form4972NuaAnnotations(projected ?? {}), [
    { amount: 6_000, y: 485 },
  ]);
});

Deno.test("2025 Form 4972 PDF reconciles full-share NUA and beneficiary allocations", () => {
  const source = {
    ...eligibility,
    recipient: "T",
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
  const allPending = {
    ...pending("T", 100_000, 30_000, 20_000),
    f1040: { form4972_tax: fields.line30 },
  };
  const projected = form4972Pdf.projectFields?.(fields, allPending);
  assertEquals(projected?.line6, 33_300);
  assertEquals(projected?.line9, 3_500);
  assertEquals(projected?.line18, 2_800);
  assertEquals(form4972NuaAnnotations(projected ?? {}), [
    { amount: 6_000, y: 485 },
    { amount: 14_000, y: 390 },
  ]);
  assertThrows(
    () => form4972Pdf.projectFields?.({ ...fields, line18: 2_799 }, allPending),
    Error,
    "PDF elected Part III lines do not reconcile",
  );
});

Deno.test("2025 Form 4972 PDF keeps partial-share Part-II-only NUA but omits MRD", async () => {
  const source = {
    ...eligibility,
    recipient: "T",
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
  const original = pending("T", 100_000, 30_000, 20_000);
  const allPending = {
    ...original,
    f1099r: {
      f1099rs: [{ ...original.f1099r.f1099rs[0], box9a_pct_total: 50 }],
    },
    f1040: { form4972_tax: 7_200, line5b_pension_taxable: 84_000 },
  };
  const projected = form4972Pdf.projectFields?.(fields, allPending);
  assertEquals(projected?.line6, 36_000);
  assertEquals(projected?.line7, 7_200);
  assertEquals(projected?.line29, undefined);
  assertEquals(projected?.line30, undefined);
  assertEquals(form4972NuaAnnotations(projected ?? {}), [
    { amount: 6_000, y: 485 },
  ]);
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  await form4972Pdf.decoratePages?.(
    document,
    [page],
    projected ?? {},
    undefined,
  );
  const saved = await PDFDocument.load(await document.save());
  const contents = saved.getPage(0).node.Contents();
  assert(contents instanceof PDFArray);
  const stream = contents.lookup(contents.size() - 1, PDFRawStream);
  const operators = new TextDecoder().decode(
    decodePDFRawStream(stream).decode(),
  );
  assertMatch(operators, /<4e55412036303030>/i);
  assertEquals(/<4d5244>/i.test(operators), false);
});

Deno.test("2025 Form 4972 prints elected NUA beside each applicable form line", () => {
  assertEquals(
    form4972NuaAnnotations({
      line6: 36_000,
      line6_nua_capital_gain: 6_000,
      line8: 84_000,
      line8_nua_included: 14_000,
    }),
    [
      { amount: 6_000, y: 485 },
      { amount: 14_000, y: 390 },
    ],
  );
  assertEquals(typeof form4972Pdf.decoratePages, "function");
});

Deno.test("2025 Form 4972 gates each NUA notation by its calculated elected line", () => {
  assertEquals(
    form4972NuaAnnotations({
      line6_nua_capital_gain: 6_000,
      line8_nua_included: 14_000,
    }),
    [],
  );
  assertEquals(
    form4972NuaAnnotations({ line8: 100_000, line8_nua_included: 0 }),
    [],
  );
  assertEquals(
    form4972NuaAnnotations({
      line6: 36_000,
      line6_nua_capital_gain: 6_000,
    }),
    [{ amount: 6_000, y: 485 }],
  );
  assertEquals(
    form4972NuaAnnotations({
      line8: 120_000,
      line8_nua_included: 20_000,
    }),
    [{ amount: 20_000, y: 390 }],
  );
});

Deno.test("2025 Form 4972 PDF writes both NUA labels into the filing page", async () => {
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  await form4972Pdf.decoratePages?.(document, [page], {
    line6: 36_000,
    line6_nua_capital_gain: 6_000,
    line8: 84_000,
    line8_nua_included: 14_000,
  }, undefined);

  const saved = await PDFDocument.load(await document.save());
  const contents = saved.getPage(0).node.Contents();
  assert(contents instanceof PDFArray);
  const stream = contents.lookup(contents.size() - 1, PDFRawStream);
  const operators = new TextDecoder().decode(
    decodePDFRawStream(stream).decode(),
  );
  assertMatch(operators, /<4e55412036303030>/i);
  assertMatch(operators, /<4e5541203134303030>/i);
});
