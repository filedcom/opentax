import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../index.ts";
import { remarriedFamily } from "./form8863-remarried-mfj-parent.fixture.ts";
import { calculateForm8863Lines } from "../../../../nodes/inputs/f8863/index.ts";
import { irs1040 } from "../../../mef/forms/identity/f1040.ts";
import { irs1040Pdf } from "../../forms/identity/f1040.ts";
import { form8615 } from "../../../mef/forms/investments/f8615.ts";
import { form8615Pdf } from "../../forms/investments/f8615.ts";
import { form8863 } from "../../../mef/forms/credits/f8863.ts";
import { form8863Pdf } from "../../forms/credits/f8863.ts";
const xsd = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
for (const stepFirst of [false, true]) {
  Deno.test(`remarried custodial MFJ ${stepFirst ? "stepparent-first phaseout" : "custodian-first"} owns actual joint wages, education and reciprocal child tax packets`, async () => {
    const f = remarriedFamily(stepFirst),
      parent = f.parents[0],
      p = parent.pending,
      lines = calculateForm8863Lines(p.f8863)!;
    assertEquals([
      p.f1040.line1a_wages,
      p.f1040.line11_agi,
      p.f1040.line12a_standard_deduction,
      p.f1040.line15_taxable_income,
      p.f1040.line16_income_tax,
    ], [
      stepFirst ? 170000 : 125000,
      stepFirst ? 170000 : 125000,
      31500,
      stepFirst ? 138500 : 93500,
      stepFirst ? 20298 : 10746,
    ]);
    assertEquals(
      p.f8863.credit_limit_worksheet.form1040_line18_tax,
      f.incomeReturn.f1040.line18_total_tax_before_credits,
    );
    assertEquals(p.f8863.f8863s.map((s: any) => s.filer_magi), [
      f.incomeReturn.f1040.line11_agi,
      f.incomeReturn.f1040.line11_agi,
    ]);
    assertEquals([
      lines.line1,
      lines.line3,
      lines.line6,
      lines.line8,
      lines.line9,
      lines.line19,
    ], [
      5000,
      stepFirst ? 170000 : 125000,
      stepFirst ? .5 : 1,
      stepFirst ? 1000 : 2000,
      stepFirst ? 1500 : 3000,
      stepFirst ? 1500 : 3000,
    ]);
    assertEquals([
      p.f1040.line19_child_tax_credit,
      p.schedule3.line3_education_credit,
      p.f1040.line24_total_tax,
    ], [1000, stepFirst ? 1500 : 3000, stepFirst ? 17798 : 6746]);
    for (const [i, c] of f.children.entries()) {
      const t = c.childPending.form8615;
      assertEquals([
        c.review.education_claimant_ssn,
        c.review.support_sources[1].payer_ssn,
        c.student.education_expense_workpaper.payment_sources[0].payer_ssn,
      ], ["111223333", "111223333", "111223333"]);
      assertEquals([
        t.parent_name,
        t.parent_ssn,
        t.parent_filing_status,
        t.line6_parent_taxable_income,
        t.line7_other_children_income,
        t.line9_family_tax,
        t.line10_parent_tax,
        t.line12b_allocation_ratio,
        t.line18_child_tax,
      ], [
        stepFirst ? "Pat Example" : "Alex Example",
        stepFirst ? "999887777" : "111223333",
        "mfj",
        stepFirst ? 138500 : 93500,
        i ? 6250 : 8250,
        stepFirst ? 23488 : 13588,
        stepFirst ? 20298 : 10746,
        i ? .569 : .431,
        stepFirst ? (i ? 1815 : 1375) : (i ? 1617 : 1225),
      ]);
      assertEquals([
        c.childPending.f1040.line11_agi,
        c.childPending.f1040.line12a_standard_deduction,
        c.childPending.f1040.line16_income_tax,
      ], [i ? 24000 : 22000, 15750, t.line18_child_tax]);
      assertEquals(c.childPending.f8863, undefined);
      assertEquals(c.childPending.f1040.line29_refundable_aoc ?? 0, 0);
    }
    const rows = [
      { ...parent, stem: "joint-parent", pages: 8 },
      ...f.children.map((c: any, i: number) => ({
        inputs: c.child,
        filer: c.childFiler,
        pending: c.childPending,
        stem: i ? "Sam-child" : "Taylor-child",
        pages: 5,
      })),
    ];
    for (const row of rows) {
      const b = await f1040_2025.prepareReturn(row.pending, row.filer);
      assertEquals(
        b.bundle.xml.includes("<IRS8863"),
        row.stem === "joint-parent",
      );
      assertEquals(
        b.bundle.xml.includes("<IRS8615"),
        row.stem !== "joint-parent",
      );
      if (row.stem !== "joint-parent") {
        assertStringIncludes(
          b.bundle.xml,
          "<IndividualReturnFilingStatusCd>2</IndividualReturnFilingStatusCd>",
        );
        assertStringIncludes(
          b.bundle.xml,
          `<SSN>${stepFirst ? "999887777" : "111223333"}</SSN>`,
        );
      }
      const tmp = await Deno.makeTempFile({ suffix: ".xml" });
      try {
        await Deno.writeTextFile(tmp, b.bundle.xml);
        const r = await new Deno.Command("xmllint", {
          args: ["--noout", "--schema", xsd, tmp],
          stderr: "piped",
          stdout: "piped",
        }).output();
        assertEquals(r.code, 0, new TextDecoder().decode(r.stderr));
      } finally {
        await Deno.remove(tmp);
      }
      const pdf = await b.renderPdf(), doc = await PDFDocument.load(pdf);
      assertEquals(doc.getPageCount(), row.pages);
      assertEquals(doc.getForm().getFields().length, 0);
      const file = await Deno.makeTempFile({ suffix: ".pdf" });
      try {
        await Deno.writeFile(file, pdf);
        const r = await new Deno.Command("pdftotext", {
          args: [file, "-"],
          stdout: "piped",
        }).output();
        const text = new TextDecoder().decode(r.stdout).replace(/\s+/g, " ");
        assertStringIncludes(text, row.filer.fullName);
        if (row.stem !== "joint-parent") {
          assertStringIncludes(
            text,
            stepFirst ? "Pat Example" : "Alex Example",
          );
          assertStringIncludes(
            text,
            row.stem.startsWith("Sam") ? "569" : "431",
          );
        } else {
          assertStringIncludes(text, row.filer.nameLine1);
          assertStringIncludes(text, "Taylor Example");
          assertStringIncludes(text, "Sam Example");
        }
      } finally {
        await Deno.remove(file);
      }
      if (Deno.args.includes("--write-review-artifacts")) {
        const dir = "/tmp/opentax-f8863-remarried-mfj-parent-evidence",
          stem = `${
            stepFirst ? "step-first-phaseout" : "custodial-first"
          }-${row.stem}`;
        await Deno.mkdir(dir, { recursive: true });
        await Deno.writeTextFile(
          `${dir}/${stem}-source-input.json`,
          JSON.stringify({ inputs: row.inputs, filer: row.filer }, null, 2),
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
Deno.test("remarried joint child export rejects wrong tax parent, spouse ownership, custody and reciprocal tax sources", async () => {
  const f = remarriedFamily(true), c = f.children[0];
  const changes: Array<(p: any) => void> = [
    (p) => p.form8615.parent_ssn = "111223333",
    (p) => p.form8615.parent_name = "Alex Example",
    (p) => p.form8615.parent_filing_status = "single",
    (p) => p.form8615.line10_parent_tax = 17798,
    (p) => p.form8615.line18_child_tax = 1225,
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.custodial_parent_remarried = false,
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.custodial_parent_nights = 65,
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.remarriage_date = "2026-01-01",
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.noncustodial_parent_ssn = "999887777",
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.stepparent_ssn = "777889999",
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .settled_parent_return.pending.w2.w2s[0].employee_ssn = "777889999",
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .settled_parent_return.pending.w2.w2s[1].box1_wages = 50000,
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .settled_parent_return.pending.general.spouse_ssn = "777889999",
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .settled_parent_return.filer.spouse.ssn = "777889999",
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .other_child_returns[0].pending.form8615.parent_ssn = "111223333",
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .other_child_returns[0].pending.form8615.line18_child_tax = 1617,
    (p) =>
      p.general.dependent_education_income_review.education_claimant_ssn =
        "999887777",
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
Deno.test("actual joint education export rejects spouse income detachment, wrong MAGI/phaseout and child credit ownership leaks", async () => {
  const f = remarriedFamily(true), r = f.parents[0];
  const changes: Array<(p: any) => void> = [
    (p) => p.w2.w2s[0].employee_ssn = "777889999",
    (p) => p.w2.w2s[1].box1_wages = 50000,
    (p) => p.general.spouse_ssn = "777889999",
    (p) => p.f1040.line11_agi = 75000,
    (p) => p.f8863.f8863s[0].filer_magi = 75000,
    (p) => p.f8863.f8863s[0].filing_status = "single",
    (p) => p.f1040.line29_refundable_aoc = 2000,
    (p) => p.schedule3.line3_education_credit = 3000,
    (p) => p.f8812.f8812s[0].credit_limit_worksheet.schedule3_line3 = 3000,
    (p) =>
      p.f8863.f8863s[0].ownership_review.dependent_student_income_return.pending
        .f8863 = structuredClone(p.f8863),
    (p) => delete p.general.dependent_kiddie_tax_family_review,
  ];
  for (const change of changes) {
    const p = structuredClone(r.pending);
    change(p);
    await assertRejects(() => f1040_2025.prepareReturn(p, r.filer));
    assertThrows(() => form8863.build(p.f8863, { filer: r.filer, pending: p }));
    assertThrows(() => form8863Pdf.instances!(p.f8863, r.filer, p));
  }
});
Deno.test("public remarried child source calculation rejects changed issued owner, filing identity and custody instead of accepting parent scalars", () => {
  const f = remarriedFamily(true), c = f.children[0];
  for (
    const change of [
      (r: any) =>
        r.settled_parent_return.pending.w2.w2s[0].employee_ssn = "777889999",
      (r: any) =>
        r.settled_parent_return.pending.general.filing_status = "single",
      (r: any) => r.parent_selection.stepparent_ssn = "777889999",
      (r: any) => r.parent_selection.custodial_parent_nights = 65,
    ]
  ) {
    const input = structuredClone(c.child);
    change(input.general.dependent_education_income_review.kiddie_tax_review);
    assertEquals(f1040_2025.executeReturn(input).diagnostics.length > 0, true);
  }
});
