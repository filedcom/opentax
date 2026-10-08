import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../index.ts";
import { separateFamily } from "./form8863-remarried-mfs-parent.fixture.ts";
import { irs1040 } from "../../../mef/forms/identity/f1040.ts";
import { irs1040Pdf } from "../../forms/identity/f1040.ts";
import { form8615 } from "../../../mef/forms/investments/f8615.ts";
import { form8615Pdf } from "../../forms/investments/f8615.ts";
import { form8863 } from "../../../mef/forms/credits/f8863.ts";
import { form8863Pdf } from "../../forms/credits/f8863.ts";
import { family } from "./form8863-sibling-parent-selection.fixture.ts";
const xsd = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
for (const stepHigher of [false, true]) {
  Deno.test(`actual remarried MFS ${stepHigher ? "step-higher spouse-itemizes" : "custodian-higher standard"} full owned parents and sibling tax packets`, async () => {
    const f = separateFamily(stepHigher);
    const a = f.parents[0].pending, p = f.parents[1].pending;
    assertEquals([
      a.f1040.line11_agi,
      a.f1040.line15_taxable_income,
      a.f1040.line16_income_tax,
      a.f1040.line19_child_tax_credit,
    ], stepHigher ? [75000, 55000, 7020, 1000] : [110000, 94250, 15655, 1000]);
    assertEquals([
      p.f1040.line11_agi,
      p.f1040.line15_taxable_income,
      p.f1040.line16_income_tax,
    ], stepHigher ? [110000, 110000, 19247] : [75000, 59250, 7955]);
    assertEquals([
      a.f1040.line12a_standard_deduction ?? 0,
      a.f1040.line12e_itemized_deductions ?? 0,
      p.f1040.line12a_standard_deduction ?? 0,
      p.f1040.line12e_itemized_deductions ?? 0,
    ], stepHigher ? [0, 20000, 0, 0] : [15750, 0, 15750, 0]);
    assertEquals(p.general.mfs_spouse_itemizing, stepHigher);
    assertEquals(a.general.mfs_spouse_itemizing, false);
    for (const r of f.parents) {
      assertEquals(r.pending.f1040.line29_refundable_aoc ?? 0, 0);
      assertEquals(r.pending.schedule3?.line3_education_credit ?? 0, 0);
      assertEquals(r.pending.f8863?.f8863s, undefined);
      assertEquals(r.pending.general.filing_status, "mfs");
    }
    for (const [i, c] of f.children.entries()) {
      const t = c.childPending.form8615;
      assertEquals(
        [
          t.parent_ssn,
          t.parent_filing_status,
          t.line6_parent_taxable_income,
          t.line10_parent_tax,
          t.line9_family_tax,
          t.line11_children_tax,
        ],
        stepHigher
          ? ["999887777", "mfs", 110000, 19247, 22727, 3480]
          : ["111223333", "mfs", 94250, 15655, 18947, 3292],
      );
      assertEquals(
        [
          c.childPending.f1040.line11_agi,
          c.childPending.f1040.line12a_standard_deduction,
          t.line5_child_net_unearned_income,
          t.line7_other_children_income,
          t.line12b_allocation_ratio,
          t.line18_child_tax,
        ],
        i
          ? [24000, 15750, 8250, 6250, .569, stepHigher ? 1980 : 1873]
          : [22000, 15750, 6250, 8250, .431, stepHigher ? 1500 : 1419],
      );
      assertEquals(c.review.education_claimant_ssn, "111223333");
      assertEquals(c.childPending.f1040.line29_refundable_aoc ?? 0, 0);
    }
    const rows = [
      ...f.parents.map((r: any, i: number) => ({
        ...r,
        stem: i ? "Pat-parent" : "Alex-parent",
        pages: i ? 2 : stepHigher ? 5 : 4,
      })),
      ...f.children.map((c: any, i: number) => ({
        inputs: c.child,
        pending: c.childPending,
        filer: c.childFiler,
        stem: i ? "Sam-child" : "Taylor-child",
        pages: 5,
      })),
    ];
    for (const r of rows) {
      const b = await f1040_2025.prepareReturn(r.pending, r.filer);
      assertEquals(b.bundle.xml.includes("<IRS8863"), false);
      assertEquals(b.bundle.xml.includes("<IRS8615"), r.stem.endsWith("child"));
      if (r.stem.endsWith("child")) {
        assertStringIncludes(
          b.bundle.xml,
          "<IndividualReturnFilingStatusCd>3</IndividualReturnFilingStatusCd>",
        );
        assertStringIncludes(
          b.bundle.xml,
          `<SSN>${stepHigher ? "999887777" : "111223333"}</SSN>`,
        );
      }
      const tmp = await Deno.makeTempFile({ suffix: ".xml" });
      try {
        await Deno.writeTextFile(tmp, b.bundle.xml);
        const q = await new Deno.Command("xmllint", {
          args: ["--noout", "--schema", xsd, tmp],
          stdout: "piped",
          stderr: "piped",
        }).output();
        assertEquals(q.code, 0, new TextDecoder().decode(q.stderr));
      } finally {
        await Deno.remove(tmp);
      }
      const pdf = await b.renderPdf(), doc = await PDFDocument.load(pdf);
      assertEquals(doc.getPageCount(), r.pages);
      assertEquals(doc.getForm().getFields().length, 0);
      const pt = await Deno.makeTempFile({ suffix: ".pdf" });
      try {
        await Deno.writeFile(pt, pdf);
        const q = await new Deno.Command("pdftotext", {
          args: [pt, "-"],
          stdout: "piped",
        }).output();
        const text = new TextDecoder().decode(q.stdout).replace(/\s+/g, " ");
        assertStringIncludes(text, r.filer.fullName);
        if (r.stem.endsWith("child")) {
          assertStringIncludes(
            text,
            stepHigher ? "Pat Example" : "Alex Example",
          );
          assertStringIncludes(text, r.stem.startsWith("Sam") ? "569" : "431");
        }
      } finally {
        await Deno.remove(pt);
      }
      if (Deno.args.includes("--write-review-artifacts")) {
        const dir = "/tmp/opentax-f8863-remarried-mfs-parent-evidence",
          stem = `${
            stepHigher ? "step-higher-itemized" : "custodian-higher-standard"
          }-${r.stem}`;
        await Deno.mkdir(dir, { recursive: true });
        await Deno.writeTextFile(
          `${dir}/${stem}-source-input.json`,
          JSON.stringify({ inputs: r.inputs, filer: r.filer }, null, 2),
        );
        await Deno.writeTextFile(
          `${dir}/${stem}-full-return.xml`,
          b.bundle.xml,
        );
        await Deno.writeFile(`${dir}/${stem}-filled-return.pdf`, pdf);
      }
    }
  });
}
Deno.test("remarried MFS source and child native/PDF reject selected lower parent, deduction owner conflicts and child-credit leaks", async () => {
  const f = separateFamily(true), c = f.children[0];
  const changes: Array<(p: any) => void> = [
    (p) => p.form8615.parent_ssn = "111223333",
    (p) => p.form8615.parent_filing_status = "mfj",
    (p) => p.form8615.line10_parent_tax = 6020,
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .settled_parent_return =
          p.general.dependent_education_income_review.kiddie_tax_review
            .parent_selection.eligible_parent_returns[0],
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.eligible_parent_returns[0].pending.schedule_a
        .line_5b_real_estate_tax = 19000,
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.separate_return_deduction_reviews[0]
        .real_estate_tax_payments[0].payer_ssn = "999887777",
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.separate_return_deduction_reviews[0]
        .real_estate_tax_payments[0].amount = 19000,
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.eligible_parent_returns[1].pending.general
        .mfs_spouse_itemizing = false,
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.eligible_parent_returns[1].pending.w2.w2s[0]
        .employee_ssn = "111223333",
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.noncommunity_property_residence_review.state = "TX",
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.stepparent_ssn = "777889999",
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.noncustodial_parent_ssn = "999887777",
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.eligible_parent_returns[0].pending.f1040
        .line29_refundable_aoc = 1000,
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .other_child_returns[0].pending.f1040.line16_income_tax = 828,
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.eligible_parent_returns[1].pending.w2.w2s[0]
        .source_document_reference =
          p.general.dependent_education_income_review.kiddie_tax_review
            .parent_selection.eligible_parent_returns[0].pending.w2.w2s[0]
            .source_document_reference,
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.eligible_parent_returns[1].pending.general
        .mfs_spouse_lived_with_taxpayer = false,
    (p) => p.f1040.line29_refundable_aoc = 1000,
    (p) => p.f1040.line16_income_tax = 628,
  ];
  for (const change of changes) {
    const p = structuredClone(c.childPending);
    change(p);
    assertThrows(() =>
      form8615.build(p.form8615, { filer: c.childFiler, pending: p })
    );
    assertThrows(() => form8615Pdf.instances!(p.form8615, c.childFiler, p));
    assertThrows(() =>
      irs1040.build(p.f1040, { filer: c.childFiler, pending: p })
    );
    assertThrows(() => irs1040Pdf.instances!(p.f1040, c.childFiler, p));
    await assertRejects(() => f1040_2025.prepareReturn(p, c.childFiler));
  }
});
Deno.test("actual independent MFS parent exports reject detached owned deductions, spouse itemization, family inventory and credits", async () => {
  const f = separateFamily(true), r = f.parents[0];
  const changes: Array<(p: any) => void> = [
    (p) => p.schedule_a.line_5b_real_estate_tax = 19000,
    (p) => p.w2.w2s[0].employee_ssn = "999887777",
    (p) => p.general.spouse_ssn = "777889999",
    (p) => p.general.mfs_spouse_itemizing = true,
    (p) => p.f1040.line12a_standard_deduction = 15750,
    (p) => p.f1040.line29_refundable_aoc = 1000,
    (p) => p.schedule3 = { line3_education_credit: 1500 },
    (p) => delete p.general.dependent_kiddie_tax_family_review,
    (p) =>
      p.general.dependent_kiddie_tax_family_review.child_returns[0].pending
        .f1040.line29_refundable_aoc = 1000,
  ];
  for (const change of changes) {
    const p = structuredClone(r.pending);
    change(p);
    assertThrows(() => irs1040.build(p.f1040, { filer: r.filer, pending: p }));
    assertThrows(() => irs1040Pdf.instances!(p.f1040, r.filer, p));
    await assertRejects(() => f1040_2025.prepareReturn(p, r.filer));
  }
  const step = f.parents[1], p = structuredClone(step.pending);
  p.general.mfs_spouse_itemizing = false;
  await assertRejects(() => f1040_2025.prepareReturn(p, step.filer));
});
Deno.test("actual MFS education eligibility rejects claimed AOC even with valid owned students and parent payment sources", async () => {
  const f = separateFamily(false),
    old = family(false),
    r = f.parents[0],
    inputs = structuredClone(r.inputs);
  inputs.f8863 = structuredClone(old.parents[0].inputs.f8863);
  for (const s of inputs.f8863) s.filing_status = "mfs";
  inputs.f8863_claimant_review = structuredClone(
    old.parents[0].inputs.f8863_claimant_review,
  );
  inputs.f8863_credit_limit_worksheet = structuredClone(
    old.parents[0].inputs.f8863_credit_limit_worksheet,
  );
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.pending.f1040.line29_refundable_aoc ?? 0, 0);
  assertEquals(result.pending.schedule3?.line3_education_credit ?? 0, 0);
  await assertRejects(() => f1040_2025.prepareReturn(result.pending, r.filer));
  const p = structuredClone(r.pending);
  p.f8863 = structuredClone(old.parents[0].pending.f8863);
  for (const s of p.f8863.f8863s) s.filing_status = "mfs";
  assertThrows(() => form8863.build(p.f8863, { filer: r.filer, pending: p }));
  assertThrows(() => form8863Pdf.instances!(p.f8863, r.filer, p));
  await assertRejects(() => f1040_2025.prepareReturn(p, r.filer));
});
Deno.test("public remarried MFS source calculation rejects detached receipt, parent ownership, custody and spouse itemization sources", () => {
  const f = separateFamily(true), c = f.children[0];
  const changes: Array<(p: any) => void> = [
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.separate_return_deduction_reviews[0]
        .real_estate_tax_payments[0].amount = 19000,
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.separate_return_deduction_reviews[0]
        .real_estate_tax_payments[0].payment_date = "2024-12-01",
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.eligible_parent_returns[1].pending.general
        .mfs_spouse_itemizing = false,
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.custodial_parent_nights = 65,
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.eligible_parent_returns[1].filer.filingStatus = 2,
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.eligible_parent_returns[1].pending.w2.w2s[0]
        .employee_ssn = "111223333",
  ];
  for (const change of changes) {
    const p = structuredClone(c.child);
    change(p);
    assertEquals(
      f1040_2025.executeReturn(p).diagnostics.some((d) =>
        d.severity === "error"
      ),
      true,
    );
  }
});
