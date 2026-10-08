import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../../domains/execution/pending.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { buildPdfBytes } from "../../builder.ts";
import {
  ownerHealthSeniorInputs,
  ownerHealthSeniorModes,
} from "./owner-health-senior.fixture.ts";
const expected = {
  "one-full": [
    103302,
    8478,
    8220,
    6000,
    33100,
    103302,
    64202,
    12840,
    51362,
    5688,
    22644,
  ],
  "both-full": [
    103302,
    8478,
    8220,
    12000,
    34700,
    103302,
    56602,
    11320,
    45282,
    4956,
    21912,
  ],
  "one-phase": [
    182392,
    488,
    8220,
    4056,
    33100,
    6292,
    145236,
    1258,
    143978,
    21503,
    22478,
  ],
  "both-phase": [
    182392,
    488,
    8220,
    8112,
    34700,
    6292,
    139580,
    1258,
    138322,
    20259,
    21234,
  ],
  "tips-phase": [
    178526,
    488,
    12086,
    5288,
    33100,
    1426,
    140138,
    285,
    139853,
    20596,
    21571,
  ],
};
const xsd = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
const root = "/tmp/opentax-owner-health-senior-source-evidence";
for (const mode of ownerHealthSeniorModes) {
  Deno.test(`actual owner health ${mode} senior eligibility and QBI cap source/native/XSD/PDF`, async () => {
    const inputs = ownerHealthSeniorInputs(mode),
      r = f1040_2025.executeReturn(inputs);
    assertEquals(r.diagnostics, []);
    const p = normalizeAllPending(r.pending),
      f = p.f1040,
      q = p.form8995,
      filer = extractFilerIdentity(f)!;
    assertEquals([
      f.line11_agi,
      p.schedule1.line15_se_deduction,
      p.schedule1.line17_se_health_insurance,
      f.line13b_additional_deductions,
      f.line12a_standard_deduction,
      q.line2,
      q.line11,
      q.line15,
      f.line15_taxable_income,
      f.line16_income_tax,
      f.line24_total_tax,
    ], expected[mode]);
    // Independent source equations: own premium payments, own halfSE and the actual age-adjusted standard deduction.
    const seniorPerOwner = Math.max(
      0,
      6000 - Math.round(Math.max(0, Number(f.line11_agi) - 150000) * .06),
    );
    const senior = seniorPerOwner * (mode.startsWith("both") ? 2 : 1),
      tips = mode === "tips-phase" ? 1000 : 0;
    assertEquals(f.line13b_additional_deductions, senior + tips);
    assertEquals(
      q.line11,
      Math.max(
        0,
        Number(f.line11_agi) - Number(f.line12a_standard_deduction) - senior -
          tips,
      ),
    );
    assertEquals(
      q.line15,
      Math.min(
        Math.round(Number(q.line2) * .2),
        Math.round(Number(q.line11) * .2),
      ),
    );
    const midpoint = Math.floor(Number(f.line15_taxable_income) / 50) * 50 + 25;
    const ordinary = Number(f.line15_taxable_income) < 100000
      ? Math.round(2385 + (midpoint - 23850) * .12)
      : Math.round(Number(f.line15_taxable_income) * .22 - 10172);
    assertEquals(f.line16_income_tax, ordinary);
    assertEquals(
      f.line24_total_tax,
      ordinary + Number(p.schedule2.line4_se_tax),
    );
    const prepared = await f1040_2025.prepareReturn(p, filer),
      xml = prepared.bundle.xml;
    assertEquals((xml.match(/<IRS7206 /g) ?? []).length, 2);
    assertStringIncludes(xml, "IRS1040Schedule1A");
    assertStringIncludes(
      xml,
      `<EnhancedSeniorDeductionAmt>${senior}</EnhancedSeniorDeductionAmt>`,
    );
    const path = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(path, xml);
      const check = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, path],
        stderr: "piped",
      }).output();
      assertEquals(check.code, 0, new TextDecoder().decode(check.stderr));
    } finally {
      await Deno.remove(path);
    }
    const pdf = await prepared.renderPdf(), doc = await PDFDocument.load(pdf);
    assertEquals(doc.getForm().getFields().length, 0);
    if (Deno.args.includes("--write-review-artifacts")) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeTextFile(
        `${root}/${mode}-source-input.json`,
        JSON.stringify({ inputs, pending: p }, null, 2),
      );
      await Deno.writeTextFile(`${root}/${mode}-full-return.xml`, xml);
      await Deno.writeFile(`${root}/${mode}-filled-return.pdf`, pdf);
    }
    console.log(mode, doc.getPageCount(), "review pages");
  });
}
Deno.test("owner health senior claims reject missing eligibility, changed source plans and actual QBI cap", async () => {
  // Official day-before-birthday rule derives both deductions from the public DOB.
  for (
    const [dob, senior, standard] of [["1961-01-01", 6000, 33100], [
      "1961-01-02",
      0,
      31500,
    ]] as const
  ) {
    const boundary = ownerHealthSeniorInputs("one-full");
    boundary.general.taxpayer_dob = dob;
    const result = f1040_2025.executeReturn(boundary);
    assertEquals(result.diagnostics, []);
    assertEquals(
      result.pending.f1040.line13b_additional_deductions ?? 0,
      senior,
    );
    assertEquals(result.pending.f1040.line12a_standard_deduction, standard);
  }
  for (const mode of ["one-full", "both-full", "tips-phase"] as const) {
    const r = f1040_2025.executeReturn(ownerHealthSeniorInputs(mode)),
      original = normalizeAllPending(r.pending),
      filer = extractFilerIdentity(original.f1040)!;
    const mutations: [string, (p: any) => void][] = [
      [
        "missing zero-exclusion evidence",
        (p) => delete p.schedule1a.senior_zero_exclusions_review,
      ],
      [
        "derived valid-SSN flag",
        (p) => p.schedule1a.taxpayer_has_valid_ssn = false,
      ],
      [
        "derived senior age flag",
        (p) => p.schedule1a.taxpayer_age_65_or_older = false,
      ],
      [
        "filed additional deduction",
        (p) => p.f1040.line13b_additional_deductions += 1,
      ],
      ["actual taxpayer DOB", (p) => p.general.taxpayer_dob = "1970-01-01"],
      ["missing actual taxpayer DOB", (p) => delete p.general.taxpayer_dob],
      ["actual taxpayer SSN", (p) => p.general.taxpayer_ssn = "999-88-7777"],
      [
        "source employment-valid SSN",
        (p) => p.general.taxpayer_ssn_valid_for_employment = false,
      ],
      [
        "source SSN issuance timing",
        (p) => p.general.taxpayer_ssn_issued_before_due_date = false,
      ],
      [
        "source TIN issuance timing",
        (p) => p.general.taxpayer_tin_issued_by_due_date = false,
      ],
      ["missing general source", (p) => delete p.general],
      ["filed QBI income cap", (p) => p.form8995.line11 += 1],
      [
        "detached S1A health premium",
        (p) =>
          p.schedule1a.qualified_tips_health_plans_source.plans[0]
            .premium_months[0].paid_premium += 1,
      ],
      [
        "changed actual health premium",
        (p) =>
          p.form7206.independent_schedule_c_plans.plans[0].premium_months[0]
            .paid_premium += 1,
      ],
    ];
    if (mode === "both-full") {
      mutations.push(
        ["actual spouse DOB", (p) => p.general.spouse_dob = "1970-01-01"],
        [
          "source spouse SSN issuance",
          (p) => p.general.spouse_ssn_issued_before_due_date = false,
        ],
        ["source spouse SSN", (p) => p.general.spouse_ssn = "999-88-7777"],
      );
    }
    for (const [label, mutate] of mutations) {
      console.log("senior mutation", mode, label);
      const p = JSON.parse(JSON.stringify(original));
      mutate(p);
      await assertRejects(() => f1040_2025.prepareReturn(p, filer));
      await assertRejects(() => buildPdfBytes(p, filer));
    }
  }
});
