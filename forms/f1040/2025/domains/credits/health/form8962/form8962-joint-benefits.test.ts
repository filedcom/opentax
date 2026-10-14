import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import cases from "./form8962-joint-benefits.fixture.json" with {
  type: "json",
};
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { form8962Pdf } from "../../../../pdf/forms/credits/health/f8962.ts";
import { assertForm8962JointIncomeReview } from "./form8962-joint-income.ts";

for (const [id, c] of Object.entries(cases)) {
  Deno.test(`Joint SSA/RRB source through Form 8962 and final return: ${id}`, async () => {
    const held = structuredClone(c.inputs);
    const result = f1040_2025.executeReturn(c.inputs);
    assertEquals(result.diagnostics, []);
    const p = buildPending(result.pending), f = p.f1040!, ptc = p.form8962!;
    assertEquals(f.line6a_ss_gross, c.expected.ssa);
    assertEquals(f.line6b_ss_taxable ?? 0, c.expected.taxableSsa);
    assertEquals(f.line11_agi, c.expected.agi);
    assertEquals(f.line25b_withheld_1099, 200);
    assertEquals(f.line25d_total_withholding, c.expected.withholding);
    assertEquals(f.line24_total_tax, c.expected.tax);
    assertEquals(f.line35a_refund, c.expected.refund);
    assertEquals(ptc.household_income, c.expected.household);
    assertEquals(ptc.taxpayer_modified_agi, c.expected.household - 32400);
    assertEquals(ptc.applicable_figure, c.expected.figure);
    assertEquals(ptc.monthly_applicable_contribution, c.expected.monthly);
    assertEquals(ptc.total_premium_tax_credit, c.expected.ptc);
    assertEquals(p.schedule3?.line9_premium_tax_credit, c.expected.ptc);
    const filer = extractFilerIdentity(f)!;
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    assertEquals(prepared.bundle.xml.includes("<IRS8962"), true);
    const projected = form8962Pdf.projectFields!(ptc, normalizeAllPending(p));
    assertEquals(projected.household_income, c.expected.household);
    assertEquals(projected.total_premium_tax_credit, c.expected.ptc);
    assertEquals(c.inputs, held);
  });
}

Deno.test("Joint benefit native and PDF exports reject source and final MAGI conflicts", async () => {
  const result = f1040_2025.executeReturn(cases.half.inputs);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(pending.f1040!)!;
  const edits: Array<(p: typeof pending) => void> = [
    (p) => {
      p.f1040!.line6a_ss_gross = 19999;
    },
    (p) => {
      p.f1040!.line6b_ss_taxable = 3999;
    },
    (p) => {
      p.form8962!.taxpayer_modified_agi = 34000;
    },
    (p) => {
      p.form8962!.household_income = 66400;
    },
    (p) => {
      p.general!.ptc_joint_income_review = undefined;
    },
  ];
  for (const edit of edits) {
    const p = structuredClone(pending);
    edit(p);
    await assertRejects(
      () => buildMefBundle(p, { filer, attachments: [] }),
      Error,
    );
    assertThrows(() => {
      const all = normalizeAllPending(p);
      const projected = form8962Pdf.projectFields!(p.form8962!, all);
      form8962Pdf.instances!(projected, filer, all);
    }, Error);
  }
});

Deno.test("Joint benefit review binds recipients, copies, references and pooled taxability", () => {
  const source = cases.half.inputs;
  const result = f1040_2025.executeReturn(source);
  const pending = buildPending(result.pending);
  // Use the fixture's inferred source shapes to exercise retained-source failures.
  const valid = {
    ...pending,
    general: structuredClone(source.general),
    start: structuredClone(source),
    ssa1099: { ssas: structuredClone(source.ssa1099) },
  };
  assertForm8962JointIncomeReview(valid.general, valid);
  const edits: Array<(p: typeof valid) => void> = [
    (p) => {
      p.ssa1099.ssas[1].recipient_tin = "345678901";
    },
    (p) => {
      p.ssa1099.ssas[1].box6_federal_withheld = 99;
    },
    (p) => {
      p.ssa1099.ssas[1].source_document_reference = "other-copy";
    },
    (p) => {
      p.start.ssa1099[1].tax_year = 2024;
    },
    (p) => {
      p.start.ssa1099.pop();
    },
    (p) => {
      p.general.ptc_joint_income_review.owners[1].income_amounts
        .social_security_taxable = 0;
      p.start.general = structuredClone(p.general);
    },
    (p) => {
      p.general.ptc_joint_income_review.owners[1].income_amounts
        .social_security_total = 9999;
      p.start.general = structuredClone(p.general);
    },
    (p) => {
      p.general.ptc_joint_income_review.sources = p.general
        .ptc_joint_income_review.sources.filter((s) =>
          s.input_key !== "ssa1099"
        );
      p.start.general = structuredClone(p.general);
    },
  ];
  for (const edit of edits) {
    const p = structuredClone(valid);
    edit(p);
    assertThrows(() => assertForm8962JointIncomeReview(p.general, p), Error);
  }
});
