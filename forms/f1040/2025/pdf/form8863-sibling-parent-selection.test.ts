import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../index.ts";
import { family } from "./form8863-sibling-parent-selection.fixture.ts";
import { irs1040 } from "../mef/forms/f1040.ts";
import { irs1040Pdf } from "./forms/f1040.ts";
import { form8615 } from "../mef/forms/f8615.ts";
import { form8615Pdf } from "./forms/f8615.ts";
import { form8863 } from "../mef/forms/f8863.ts";
import { form8863Pdf } from "./forms/f8863.ts";
const xsd = new URL(
  "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
for (const cohabiting of [false, true]) {
  Deno.test(`actual sibling source allocation with ${cohabiting ? "greater-income cohabiting parent separate from education claimant" : "custodial education parent"} produces complete independent returns`, async () => {
    const f = family(cohabiting);
    const [alex, pat] = f.parents;
    assertEquals([
      alex.pending.f1040.line11_agi,
      alex.pending.f1040.line16_income_tax,
      alex.pending.f1040.line20_nonrefundable_credits,
      alex.pending.f1040.line19_child_tax_credit,
      alex.pending.f1040.line24_total_tax,
      alex.pending.f1040.line29_refundable_aoc,
    ], [75000, 7955, 3000, 1000, 3955, 2000]);
    if (pat) {
      assertEquals([
        pat.pending.f1040.line11_agi,
        pat.pending.f1040.line15_taxable_income,
        pat.pending.f1040.line16_income_tax,
        pat.pending.f1040.dependent_count,
        pat.pending.f1040.line29_refundable_aoc ?? 0,
      ], [110000, 94250, 15655, 0, 0]);
    }
    for (const [i, p] of f.children.entries()) {
      const t = p.childPending.form8615, c = p.childPending.f1040;
      assertEquals([
        c.line11_agi,
        c.line12a_standard_deduction,
        c.line15_taxable_income,
      ], [i ? 24000 : 22000, 15750, i ? 8250 : 6250]);
      assertEquals([
        t.line1_child_unearned_income,
        t.line5_child_net_unearned_income,
        t.line7_other_children_income,
        t.line12a_children_income,
        t.line12b_allocation_ratio,
      ], [
        i ? 22000 : 12000,
        i ? 8250 : 6250,
        i ? 6250 : 8250,
        14500,
        i ? .569 : .431,
      ]);
      assertEquals([
        t.parent_name,
        t.parent_ssn,
        t.line6_parent_taxable_income,
        t.line9_family_tax,
        t.line10_parent_tax,
        t.line11_children_tax,
      ], [
        cohabiting ? "Pat Example" : "Alex Example",
        cohabiting ? "999887777" : "111223333",
        cohabiting ? 94250 : 59250,
        cohabiting ? 18947 : 11145,
        cohabiting ? 15655 : 7955,
        cohabiting ? 3292 : 3190,
      ]);
      const expected = cohabiting ? (i ? 1873 : 1419) : (i ? 1815 : 1375);
      assertEquals([
        t.line13_allocable_tax,
        t.line18_child_tax,
        c.line16_income_tax,
        c.line24_total_tax,
      ], [expected, expected, expected, expected]);
      assertEquals(p.childPending.f8863, undefined);
      assertEquals(c.line29_refundable_aoc ?? 0, 0);
      const w = p.review.school_sources[0].workpaper;
      assertEquals([
        w.issued_form1098t_source.box1_payments,
        w.issued_form1098t_source.box5_scholarships,
        w.tax_free_assistance_applied_to_expenses,
      ], [4500, i ? 22500 : 20500, 500]);
    }
    const packets = [
      ...f.parents.map((p: any, i: number) => ({
        ...p,
        stem: i ? "selected-parent" : "claimant-parent",
        pages: i ? 2 : 8,
      })),
      ...f.children.map((p: any, i: number) => ({
        pending: p.childPending,
        inputs: p.child,
        filer: p.childFiler,
        stem: i ? "Sam-child" : "Taylor-child",
        pages: 5,
      })),
    ];
    for (const p of packets) {
      const packet = await f1040_2025.prepareReturn(p.pending, p.filer);
      assertEquals(
        packet.bundle.xml.includes("<IRS8615"),
        p.stem.endsWith("child"),
      );
      assertEquals(
        packet.bundle.xml.includes("<IRS8863"),
        p.stem === "claimant-parent",
      );
      if (p.stem.endsWith("child")) {
        assertStringIncludes(
          packet.bundle.xml,
          `<OtherChildrenInvestmentIncmAmt>${p.pending.form8615.line7_other_children_income}</OtherChildrenInvestmentIncmAmt>`,
        );
      }
      const temp = await Deno.makeTempFile({ suffix: ".xml" });
      try {
        await Deno.writeTextFile(temp, packet.bundle.xml);
        const check = await new Deno.Command("xmllint", {
          args: ["--noout", "--schema", xsd, temp],
          stdout: "piped",
          stderr: "piped",
        }).output();
        assertEquals(check.code, 0, new TextDecoder().decode(check.stderr));
      } finally {
        await Deno.remove(temp);
      }
      const pdf = await packet.renderPdf(), doc = await PDFDocument.load(pdf);
      assertEquals(doc.getPageCount(), p.pages);
      assertEquals(doc.getForm().getFields().length, 0);
      const file = await Deno.makeTempFile({ suffix: ".pdf" });
      try {
        await Deno.writeFile(file, pdf);
        const text = await new Deno.Command("pdftotext", {
          args: [file, "-"],
          stdout: "piped",
        }).output();
        assertStringIncludes(
          new TextDecoder().decode(text.stdout).replace(/\s+/g, " "),
          p.filer.fullName,
        );
        if (p.stem.endsWith("child")) {
          assertStringIncludes(
            new TextDecoder().decode(text.stdout),
            p.stem.startsWith("Sam") ? "569" : "431",
          );
        }
      } finally {
        await Deno.remove(file);
      }
      if (Deno.args.includes("--write-review-artifacts")) {
        const dir = "/tmp/opentax-f8863-sibling-parent-selection-evidence",
          stem = `${cohabiting ? "cohabiting" : "custodial"}-${p.stem}`;
        await Deno.mkdir(dir, { recursive: true });
        await Deno.writeTextFile(
          `${dir}/${stem}-source-input.json`,
          JSON.stringify({ inputs: p.inputs, filer: p.filer }, null, 2),
        );
        await Deno.writeTextFile(
          `${dir}/${stem}-full-return.xml`,
          packet.bundle.xml,
        );
        await Deno.writeFile(`${dir}/${stem}-filled-return.pdf`, pdf);
      }
    }
  });
}
Deno.test("sibling exports reject owned source crossjoins, detached line5, reciprocal allocation and child credit leaks", async () => {
  const f = family(true), p = f.children[0];
  const changes: Array<(x: any) => void> = [
    (x) =>
      x.general.dependent_education_income_review.kiddie_tax_review
        .other_children_requiring_form8615 = [],
    (x) =>
      x.general.dependent_education_income_review.kiddie_tax_review
        .other_child_returns = [],
    (x) => x.form8615.line7_other_children_income = 0,
    (x) => x.form8615.line12b_allocation_ratio = .5,
    (x) => x.form8615.line18_child_tax = 1375,
    (x) => x.f1040.line16_income_tax = 1375,
    (x) => x.f8863 = structuredClone(f.parents[0].pending.f8863),
    (x) =>
      x.general.dependent_education_income_review.kiddie_tax_review
        .other_child_returns[0].pending.form8615
        .line5_child_net_unearned_income = 6250,
    (x) =>
      x.general.dependent_education_income_review.kiddie_tax_review
        .other_child_returns[0].pending.form8615.line12b_allocation_ratio = .5,
    (x) =>
      x.general.dependent_education_income_review.kiddie_tax_review
        .other_child_returns[0].pending.f1040.line11_agi = 22000,
    (x) =>
      x.general.dependent_education_income_review.kiddie_tax_review
        .other_child_returns[0].pending.f1040.line16_income_tax = 1815,
    (x) =>
      x.general.dependent_education_income_review.kiddie_tax_review
        .other_child_returns[0].student_claim_review.student_w2_sources[0]
        .source_document_reference =
          x.general.dependent_education_income_review.student_w2_sources[0]
            .source_document_reference,
    (x) =>
      x.general.dependent_education_income_review.kiddie_tax_review
        .other_child_returns[0].student_claim_review.school_sources[0].workpaper
        .issued_form1098t_source.document_id =
          x.general.dependent_education_income_review.school_sources[0]
            .workpaper.issued_form1098t_source.document_id,
    (x) =>
      x.general.dependent_education_income_review.kiddie_tax_review
        .other_child_returns[0].student_claim_review.student_income_sources[0]
        .source_document_reference =
          x.general.dependent_education_income_review.student_income_sources[0]
            .source_document_reference,
    (x) =>
      x.general.dependent_education_income_review.student_income_sources[0]
        .reporting.w2_source_document_reference = "detached-payroll",
  ];
  for (const change of changes) {
    const x = structuredClone(p.childPending);
    change(x);
    assertThrows(() =>
      form8615.build(x.form8615, { filer: p.childFiler, pending: x })
    );
    assertThrows(() => form8615Pdf.instances!(x.form8615, p.childFiler, x));
    assertThrows(() =>
      irs1040.build(x.f1040, { filer: p.childFiler, pending: x })
    );
    assertThrows(() => irs1040Pdf.instances!(x.f1040, p.childFiler, x));
    await assertRejects(() => f1040_2025.prepareReturn(x, p.childFiler));
  }
});
Deno.test("actual cohabiting parent source selection rejects lower parent, candidate conflicts and duplicate dependency", async () => {
  const f = family(true), p = f.children[0];
  const changes: Array<(x: any) => void> = [
    (x) =>
      x.general.dependent_education_income_review.kiddie_tax_review
        .settled_parent_return =
          x.general.dependent_education_income_review.kiddie_tax_review
            .parent_selection.eligible_parent_returns[0],
    (x) =>
      x.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.eligible_parent_returns[1].pending.w2.w2s[0]
        .box1_wages = 75000,
    (x) =>
      x.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.eligible_parent_returns[1].pending.f1040
        .line16_income_tax = 7955,
    (x) =>
      x.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.eligible_parent_returns[1].pending.general
        .dependents = structuredClone(
          x.general.dependent_education_income_review.kiddie_tax_review
            .parent_selection.eligible_parent_returns[0].pending.general
            .dependents,
        ),
    (x) =>
      x.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.eligible_parent_returns.pop(),
    (x) =>
      x.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.parents_never_married = false,
    (x) =>
      x.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.joint_residence_days = 300,
    (x) =>
      x.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.student_ssn = "555667777",
  ];
  for (const change of changes) {
    const x = structuredClone(p.childPending);
    change(x);
    assertThrows(() =>
      form8615.build(x.form8615, { filer: p.childFiler, pending: x })
    );
    assertThrows(() => form8615Pdf.instances!(x.form8615, p.childFiler, x));
    await assertRejects(() => f1040_2025.prepareReturn(x, p.childFiler));
    const input = structuredClone(p.child);
    input.general.dependent_education_income_review =
      x.general.dependent_education_income_review;
    assertEquals(f1040_2025.executeReturn(input).diagnostics.length > 0, true);
  }
});
Deno.test("both exported parents require matching complete family and source-owned child returns", async () => {
  const f = family(true);
  const changes: Array<(x: any) => void> = [
    (x) => delete x.general.dependent_kiddie_tax_family_review,
    (x) => x.general.dependent_kiddie_tax_family_review.child_returns.pop(),
    (x) =>
      x.general.dependent_kiddie_tax_family_review.child_returns.push(
        structuredClone(
          x.general.dependent_kiddie_tax_family_review.child_returns[0],
        ),
      ),
    (x) =>
      x.general.dependent_kiddie_tax_family_review.parent_returns[1].pending
        .f1040.line16_income_tax = 7955,
    (x) =>
      x.general.dependent_kiddie_tax_family_review.child_returns[0].pending
        .form8615.line18_child_tax = 1375,
    (x) =>
      x.general.dependent_kiddie_tax_family_review.child_returns[1].pending
        .education_income.education_incomes[1].taxable_amount = 12000,
    (x) => x.f1040.line11_agi += 22000,
  ];
  for (const p of f.parents) {
    for (const change of changes) {
      const x = structuredClone(p.pending);
      change(x);
      assertThrows(() =>
        irs1040.build(x.f1040, { filer: p.filer, pending: x })
      );
      assertThrows(() => irs1040Pdf.instances!(x.f1040, p.filer, x));
      await assertRejects(() => f1040_2025.prepareReturn(x, p.filer));
    }
  }
  const a = f.parents[0], changed = structuredClone(a.pending.f8863);
  changed.f8863s[0].ownership_review.dependent_student_income_return.pending
    .form8615
    .line18_child_tax = 1375;
  assertThrows(() =>
    form8863.build(changed, { filer: a.filer, pending: a.pending })
  );
  assertThrows(() => form8863Pdf.instances!(changed, a.filer, a.pending));
});
Deno.test("standalone parent and child descriptor fields cannot override unchanged settled family sources", () => {
  const f = family(true), a = f.parents[0], c = f.children[0];
  for (const p of [a, { pending: c.childPending, filer: c.childFiler }]) {
    const fields = { ...p.pending.f1040, line16_income_tax: 628 };
    assertThrows(() =>
      irs1040.build(fields, { filer: p.filer, pending: p.pending })
    );
    assertThrows(() => irs1040Pdf.instances!(fields, p.filer, p.pending));
  }
  const fields = { ...c.childPending.form8615, line12b_allocation_ratio: .5 };
  assertThrows(() =>
    form8615.build(fields, { filer: c.childFiler, pending: c.childPending })
  );
  assertThrows(() =>
    form8615Pdf.instances!(fields, c.childFiler, c.childPending)
  );
});
Deno.test("synchronized sibling source identities still reject reuse across distinct owned children", async () => {
  const f = family(true), p = f.children[0], own = p.review;
  const ids = [
    [
      f.children[1].review.student_w2_sources[0].source_document_reference,
      own.student_w2_sources[0].source_document_reference,
    ],
    [
      f.children[1].review.student_income_sources[0].source_document_reference,
      own.student_income_sources[0].source_document_reference,
    ],
    [
      f.children[1].review.school_sources[0].workpaper.issued_form1098t_source
        .document_id,
      own.school_sources[0].workpaper.issued_form1098t_source.document_id,
    ],
    [
      f.children[1].review.school_sources[0].workpaper.payment_record_ids[0],
      own.school_sources[0].workpaper.payment_record_ids[0],
    ],
  ];
  for (const [oldId, newId] of ids) {
    const x = structuredClone(p.childPending),
      r = x.general.dependent_education_income_review.kiddie_tax_review;
    // Change all corresponding retained rows together: rejection must come from
    // the cross-child source inventory, not a detached copy within one child.
    r.other_child_returns[0] = JSON.parse(
      JSON.stringify(r.other_child_returns[0]).replaceAll(oldId, newId),
    );
    assertThrows(
      () => form8615.build(x.form8615, { filer: p.childFiler, pending: x }),
      Error,
      "cannot reuse another child's owned source identity",
    );
    assertThrows(() => form8615Pdf.instances!(x.form8615, p.childFiler, x));
    await assertRejects(() => f1040_2025.prepareReturn(x, p.childFiler));
  }
});
