import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../index.ts";
import { paired } from "./form8863-parent-child-scholarship.fixture.ts";
import { filer } from "./form8863-claimant-source.fixture.ts";
import { form8615 } from "../mef/forms/f8615.ts";
import { form8615Pdf } from "./forms/f8615.ts";
import { irs1040 } from "../mef/forms/f1040.ts";
import { irs1040Pdf } from "./forms/f1040.ts";
import { form8863 } from "../mef/forms/f8863.ts";
import { form8863Pdf } from "./forms/f8863.ts";
import {
  dependentKiddieTaxFacts,
  parentTaxProjection,
} from "../../nodes/inputs/f8615/dependent-source-review.ts";
import {
  dependentScholarshipEarned,
  dependentScholarshipReviewSchema,
} from "../../nodes/inputs/education_income/dependent-scholarship-review.ts";
const xsd = new URL(
  "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
function taxablePair(issued: boolean, exactHalf = false): any {
  const p: any = paired(issued);
  const scholarship = p.review.student_income_sources[1];
  scholarship.taxable_amount = scholarship.nonqualified_expenses_paid = 12000;
  scholarship.scholarship_disbursement_sources[0].amount = 12000;
  scholarship.nonqualified_expense_payment_sources[0].amount = 12000;
  scholarship.taxable_allocation_record_id =
    "2025-Taylor-12000-taxable-room-board-allocation";
  p.review.support_sources[3].amount = 12000;
  if (exactHalf) p.review.support_sources[0].amount = 7500;
  const w = p.student.education_expense_workpaper;
  w.form1098t_box5_scholarships =
    w.issued_form1098t_source.box5_scholarships =
      20500;
  w.assistance_sources[2].amount = 12000;
  w.assistance_sources[2].taxable_allocation_record_reference =
    scholarship.taxable_allocation_record_id;
  // Settle the actual public parent source rows first. Its line 16 precedes
  // education/dependent credits and does not depend on the child's tax.
  const parentResult = f1040_2025.executeReturn(p.parent);
  assertEquals(parentResult.diagnostics, []);
  p.review.kiddie_tax_review = {
    source_document_reference:
      "2025-Taylor-required-kiddie-tax-family-source-review",
    tax_year: 2025,
    parent_alive_record_reference: "2025-parent-year-end-life-record",
    parent_alive_on_2025_12_31: true,
    parent_selection: {
      kind: "divorced_custodial_unremarried",
      divorce_decree_record_reference: "2022-parent-final-divorce-decree",
      residence_calendar_record_reference:
        "2025-Taylor-parent-residence-calendar",
      marital_status_record_reference:
        "2025-parent-not-remarried-status-review",
      student_ssn: p.review.student_ssn,
      custodial_parent_ssn: p.review.education_claimant_ssn,
      other_parent_ssn: "555667777",
      custodial_parent_nights: 300,
      other_parent_nights: 65,
      custodial_parent_remarried: false,
    },
    family_children_record_reference:
      "2025-parent-complete-child-kiddie-income-inventory",
    other_children_requiring_form8615: [],
    settled_parent_return: {
      source_document_reference: "2025-parent-actual-settled-public-return",
      filer,
      pending: parentTaxProjection(parentResult.pending),
    },
  };
  const childResult = f1040_2025.executeReturn(p.child);
  assertEquals(childResult.diagnostics, []);
  p.childPending = childResult.pending;
  p.student.ownership_review.dependent_student_income_return.pending =
    p.childPending;
  const finalParent = f1040_2025.executeReturn(p.parent);
  assertEquals(finalParent.diagnostics, []);
  p.parentPending = finalParent.pending;
  return p;
}
for (
  const [issued, exactHalf] of [[true, false], [false, false], [false, true]]
) {
  Deno.test(`source-owned ${issued ? "W2" : "8r"}${exactHalf ? " exact-half-support" : ""} scholarship child requires positive Form 8615 from its settled parent return`, async () => {
    const p = taxablePair(issued, exactHalf);
    const review = dependentScholarshipReviewSchema.parse(p.review);
    const facts = dependentKiddieTaxFacts(
      review,
      dependentScholarshipEarned(review),
    );
    assertEquals([
      facts.age,
      facts.requiredToFile,
      facts.required,
      facts.supportEarned,
      facts.support,
    ], [20, true, true, 10000, exactHalf ? 20000 : 32500]);
    const c = p.childPending;
    assertEquals(c.f1040.line11_agi, 22000);
    assertEquals(c.f1040.line12a_standard_deduction, 15750);
    assertEquals(c.f1040.line15_taxable_income, 6250);
    assertEquals(c.f1040.line16_income_tax, 1375);
    assertEquals(c.f1040.line24_total_tax, 1375);
    assertEquals(
      c.form8615.line1_child_unearned_income,
      issued ? 12000 : 20000,
    );
    assertEquals(c.form8615.line5_child_net_unearned_income, 6250);
    assertEquals(c.form8615.line6_parent_taxable_income, 59250);
    assertEquals(c.form8615.line9_family_tax, 9330);
    assertEquals(c.form8615.line10_parent_tax, 7955);
    assertEquals(c.form8615.line18_child_tax, 1375);
    assertEquals(p.parentPending.f1040.line11_agi, 75000);
    assertEquals(p.parentPending.f1040.line24_total_tax, 5955);
    assertEquals(p.parentPending.schedule3.line3_education_credit, 1500);
    assertEquals(p.parentPending.f1040.line29_refundable_aoc, 1000);
    assertEquals(c.f8863, undefined);
    assertEquals(p.childFiler.fullName, "Taylor Example");
    assertEquals(c.f1040.line29_refundable_aoc ?? 0, 0);
    for (
      const [owner, pending, identity, inputs, pages] of [[
        "parent",
        p.parentPending,
        filer,
        p.parent,
        7,
      ], ["child", c, p.childFiler, p.child, 5]] as const
    ) {
      const packet = await f1040_2025.prepareReturn(pending, identity);
      assertEquals(packet.bundle.xml.includes("<IRS8615"), owner === "child");
      assertEquals(packet.bundle.xml.includes("<IRS8863"), owner === "parent");
      if (owner === "child") {
        assertStringIncludes(
          packet.bundle.xml,
          "<KiddieTaxAmt>1375</KiddieTaxAmt>",
        );
        assertStringIncludes(
          packet.bundle.xml,
          "<ParentTentativeTaxAmt>7955</ParentTentativeTaxAmt>",
        );
      }
      const path = await Deno.makeTempFile({ suffix: ".xml" });
      try {
        await Deno.writeTextFile(path, packet.bundle.xml);
        const checked = await new Deno.Command("xmllint", {
          args: ["--noout", "--schema", xsd, path],
          stderr: "piped",
          stdout: "piped",
        }).output();
        assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
      } finally {
        await Deno.remove(path);
      }
      const pdf = await packet.renderPdf();
      const doc = await PDFDocument.load(pdf);
      if (owner === "child") {
        const tmpPdf = await Deno.makeTempFile({ suffix: ".pdf" });
        try {
          await Deno.writeFile(tmpPdf, pdf);
          const text = await new Deno.Command("pdftotext", {
            args: [tmpPdf, "-"],
            stdout: "piped",
          }).output();
          assertStringIncludes(
            new TextDecoder().decode(text.stdout),
            "Taylor Example",
          );
        } finally {
          await Deno.remove(tmpPdf);
        }
      }
      assertEquals(doc.getPageCount(), pages);
      assertEquals(doc.getForm().getFields().length, 0);
      if (Deno.args.includes("--write-review-artifacts")) {
        const dir = "/tmp/opentax-f8863-parent-child-kiddie-tax-evidence";
        const stem = `${
          issued ? "w2" : exactHalf ? "line8r-half" : "line8r"
        }-${owner}`;
        await Deno.mkdir(dir, { recursive: true });
        await Deno.writeTextFile(
          `${dir}/${stem}-source-input.json`,
          JSON.stringify({ inputs, filer: identity }, null, 2),
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
Deno.test("dependent child and parent exports reject detached kiddie tax eligibility, tax and settled sources", async () => {
  const p = taxablePair(true);
  const changes: Array<(p: any) => void> = [
    (p) => delete p.form8615,
    (p) => delete p.general.dependent_education_income_review.kiddie_tax_review,
    (p) => p.form8615.line18_child_tax = 628,
    (p) => p.form8615.line1_child_unearned_income = 0,
    (p) => p.form8615.line10_parent_tax = 5955,
    (p) =>
      p.income_tax_calculation.form8615_reviewed_source.parent_income_tax =
        5955,
    (p) => p.income_tax_calculation.form8615_computed_unearned_income = 0,
    (p) => p.f1040.line16_income_tax = 628,
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.custodial_parent_ssn = "555667777",
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.custodial_parent_nights = 65,
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_selection.custodial_parent_remarried = true,
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .other_children_requiring_form8615 = ["777889999"],
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .parent_alive_on_2025_12_31 = false,
    (p) =>
      p.general.dependent_education_income_review.student_dob = "2001-06-15",
    (p) =>
      p.general.dependent_education_income_review.support_sources[0].amount =
        7000,
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .settled_parent_return.pending.w2.w2s[0].employee_ssn =
          p.general.taxpayer_ssn,
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .settled_parent_return.pending.w2.w2s[0].box1_wages = 74000,
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .settled_parent_return.pending.f1040.line15_taxable_income = 58250,
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .settled_parent_return.pending.f1040.line16_income_tax = 5955,
    (p) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .settled_parent_return.filer.primarySSN = "555667777",
    (p) => p.f1040.line29_refundable_aoc = 1000,
  ];
  const changed8615 = { ...p.childPending.form8615, line18_child_tax: 628 };
  assertThrows(() =>
    form8615.build(changed8615, {
      filer: p.childFiler,
      pending: p.childPending,
    })
  );
  assertThrows(() =>
    form8615Pdf.instances!(changed8615, p.childFiler, p.childPending)
  );
  const changed1040 = { ...p.childPending.f1040, line16_income_tax: 628 };
  assertThrows(() =>
    irs1040.build(changed1040, { filer: p.childFiler, pending: p.childPending })
  );
  assertThrows(() =>
    irs1040Pdf.instances!(changed1040, p.childFiler, p.childPending)
  );
  for (const change of changes) {
    const bad = structuredClone(p.childPending);
    change(bad);
    assertThrows(() =>
      irs1040.build(bad.f1040, { filer: p.childFiler, pending: bad })
    );
    assertThrows(() => irs1040Pdf.instances!(bad.f1040, p.childFiler, bad));
    assertThrows(() =>
      form8615.build(bad.form8615 ?? {}, { filer: p.childFiler, pending: bad })
    );
    assertThrows(() =>
      form8615Pdf.instances!(bad.form8615 ?? {}, p.childFiler, bad)
    );
    await assertRejects(() => f1040_2025.prepareReturn(bad, p.childFiler));
    const parent = structuredClone(p.parentPending);
    parent.f8863.f8863s[0].ownership_review.dependent_student_income_return
      .pending = bad;
    assertThrows(() =>
      form8863.build(parent.f8863, { filer, pending: parent })
    );
    assertThrows(() => form8863Pdf.instances!(parent.f8863, filer, parent));
    await assertRejects(() => f1040_2025.prepareReturn(parent, filer));
  }
  for (
    const change of [
      (p: any) => p.w2.w2s[0].box1_wages = 76000,
      (p: any) => p.f1040.line16_income_tax = 5955,
      (p: any) => p.general.taxpayer_ssn = "555667777",
    ]
  ) {
    const parent = structuredClone(p.parentPending);
    change(parent);
    assertThrows(() =>
      form8863.build(parent.f8863, { filer, pending: parent })
    );
    assertThrows(() => form8863Pdf.instances!(parent.f8863, filer, parent));
    await assertRejects(() => f1040_2025.prepareReturn(parent, filer));
  }
});
Deno.test("Form 8615 source eligibility includes exact half earned support and excludes full-time scholarships", () => {
  const p = taxablePair(true);
  const review = dependentScholarshipReviewSchema.parse(p.review);
  review.support_sources[0].amount = 7500; // 7500 + 4500 + 8000 = 20000.
  let facts = dependentKiddieTaxFacts(
    review,
    dependentScholarshipEarned(review),
  );
  assertEquals([facts.supportEarned, facts.support, facts.required], [
    10000,
    20000,
    true,
  ]);
  review.support_sources[0].amount = 7499;
  facts = dependentKiddieTaxFacts(review, dependentScholarshipEarned(review));
  assertEquals([facts.supportEarned, facts.support, facts.required], [
    10000,
    19999,
    false,
  ]);
  assertEquals(review.support_sources[3].amount, 12000);
  assertEquals(facts.support, 19999); // 12000 actual scholarship costs remain excluded.
  review.support_sources[3].amount = 50000;
  assertThrows(() =>
    dependentKiddieTaxFacts(review, dependentScholarshipEarned(review))
  );
});

Deno.test("public child calculation rejects manual parent facts and omitted positive-tax source eligibility", () => {
  const p = taxablePair(true);
  const without = structuredClone(p.child);
  delete without.general.dependent_education_income_review.kiddie_tax_review;
  assertEquals(f1040_2025.executeReturn(without).diagnostics.length > 0, true);
  const conflict = structuredClone(p.child);
  conflict.f8615 = structuredClone(
    p.childPending.income_tax_calculation.form8615_reviewed_source,
  );
  conflict.f8615.parent_income_tax = 5955;
  assertEquals(f1040_2025.executeReturn(conflict).diagnostics.length > 0, true);
});
