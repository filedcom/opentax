import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../builder.ts";
import { form8863Pdf } from "../../../forms/credits/individual/f8863.ts";
import { schools } from "./form8863-school-sources.fixture.ts";
import { filer, fixture } from "./form8863-claimant-source.fixture.ts";

const cases = [
  { name: "aoc-three", counts: [3], credits: ["aoc"] },
  { name: "aoc-four", counts: [4], credits: ["aoc"] },
  { name: "aoc-five", counts: [5], credits: ["aoc"] },
  { name: "llc-three", counts: [3], credits: ["llc"] },
  { name: "llc-four", counts: [4], credits: ["llc"] },
  { name: "llc-five", counts: [5], credits: ["llc"] },
  { name: "mixed-students", counts: [3, 5], credits: ["aoc", "llc"] },
  { name: "llc-students", counts: [3, 5], credits: ["llc", "llc"] },
] as const;

for (const c of cases) {
  Deno.test(`Form 8863 ${c.name}: owned schools, capped credit, XSD and PDF continuations`, async () => {
    const parent = c.counts.length === 2;
    const base = fixture(parent ? "parent-two" : "student-refundable");
    const students = base.inputs.f8863.map((s, i) =>
      schools(s, c.counts[i], c.credits[i])
    );
    const education = parent
      ? (c.name === "mixed-students" ? 3500 : 2000)
      : 928;
    const refundable = c.credits.some((credit) => credit === "aoc") ? 1000 : 0;
    const tax = parent ? 7955 - education - 1000 : 0;
    const refund = (parent ? 11000 : 3000) + refundable - tax;
    const inputs = {
      ...base.inputs,
      f8863: students,
      f8812: base.inputs.f8812?.map((s) => ({
        ...s,
        credit_limit_worksheet: {
          ...s.credit_limit_worksheet,
          schedule3_line3: education,
        },
      })),
      f8863_claimant_review: {
        claimant_review: {
          ...base.review,
          ...(parent ? {} : {
            support_sources: [
              {
                source_document_reference: "ordinary-support",
                beneficiary_ssn: filer.primarySSN,
                kind: "ordinary_support",
                amount: 50000 - c.counts[0] * 3000,
              },
              {
                source_document_reference: "education-support",
                beneficiary_ssn: filer.primarySSN,
                kind: "ordinary_support",
                amount: c.counts[0] * 3000,
              },
              {
                source_document_reference: "scholarship-support",
                beneficiary_ssn: filer.primarySSN,
                kind: "scholarship_support",
                amount: c.counts[0] * 500,
              },
            ],
          }),
        },
      },
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    const f = pending.f1040!;
    assertEquals([
      pending.schedule3?.line3_education_credit,
      f.line29_refundable_aoc ?? 0,
      f.line19_child_tax_credit ?? 0,
      f.line24_total_tax,
      f.line35a_refund,
    ], [education, refundable, parent ? 1000 : 0, tax, refund]);
    const instances = form8863Pdf.instances!(
      pending.f8863!,
      filer,
      result.pending,
    );
    assertEquals(
      instances.length,
      c.counts.reduce((n, count) => n + Math.ceil(count / 2), 0),
    );
    assertEquals(instances.filter((p) => p.pdf_first_student).length, 1);
    assertEquals(instances.filter((p) => p.line19 !== undefined).length, 1);
    const llcExpenses = students.reduce(
      (n, s) => n + (s.llc_adjusted_expenses ?? 0),
      0,
    );
    assertEquals(instances[0].line10, llcExpenses);
    if (llcExpenses > 0) {
      assertEquals(instances[0].line11, Math.min(llcExpenses, 10000));
      assertEquals(instances[0].line18, Math.min(llcExpenses, 10000) * .2);
    }

    let offset = 0;
    for (const [i, student] of students.entries()) {
      const count = Math.ceil(c.counts[i] / 2);
      for (let page = 0; page < count; page++) {
        const p = instances[offset + page];
        assertEquals(p.pdf_student_name, student.student_name);
        assertEquals(
          p.pdf_institution_0_name,
          student.filing_details!.institutions[page * 2].name,
        );
        assertEquals(
          p.pdf_institution_1_name,
          student.filing_details!.institutions[page * 2 + 1]?.name,
        );
        if (page > 0) {
          for (const line of [23, 24, 25, 26]) {
            assertEquals(p[`pdf_gate_${line}`], undefined);
          }
          for (const line of [27, 28, 29, 30, 31]) {
            assertEquals(p[`pdf_line${line}`], undefined);
          }
          assertEquals(form8863Pdf.pageIndices!(p), [1]);
        } else if (student.credit_type === "aoc") {
          assertEquals([p.pdf_line27, p.pdf_line30, p.pdf_line31], [
            4000,
            2500,
            undefined,
          ]);
        } else {
          assertEquals([p.pdf_line27, p.pdf_line31], [
            undefined,
            c.counts[i] * 2500,
          ]);
        }
      }
      offset += count;
    }
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    assertEquals(
      (bundle.xml.match(/<EducationalInstitutionGroup>/g) ?? []).length,
      c.counts.reduce((a, b) => a + b, 0),
    );
    assertEquals(
      (bundle.xml.match(/<StudentAndEducationalInstnGrp>/g) ?? []).length,
      students.length,
    );
    for (const student of students) {
      for (const school of student.filing_details!.institutions) {
        assertStringIncludes(bundle.xml, school.name);
      }
    }
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    const dir = Deno.args.includes("--write-review-artifacts")
      ? `.state/research/form8863-school-continuations-2026-10-09/${c.name}`
      : await Deno.makeTempDir();
    try {
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(`${dir}/return.xml`, bundle.xml);
      const checked = await new Deno.Command("xmllint", {
        args: [
          "--noout",
          "--schema",
          ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
          `${dir}/return.xml`,
        ],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
      await Deno.writeFile(`${dir}/return.pdf`, pdf);
      for (
        const [name, value] of [
          ["source", inputs],
          ["pending", pending],
          ["origins", origins],
          ["instances", instances],
          ["expected", {
            education,
            refundable,
            tax,
            refund,
            counts: c.counts,
          }],
        ] as const
      ) {
        await Deno.writeTextFile(
          `${dir}/${name}.json`,
          JSON.stringify(value, null, 2),
        );
      }
    } finally {
      if (!Deno.args.includes("--write-review-artifacts")) {
        await Deno.remove(dir, { recursive: true });
      }
    }
    const student = pending.f8863!.f8863s[0];
    const sources = student.institution_expense_workpapers!;
    const variants = [
      { ...student, institution_expense_workpapers: sources.slice(0, -1) },
      { ...student, institution_expense_workpapers: [...sources, sources[0]] },
      {
        ...student,
        filing_details: {
          ...student.filing_details!,
          institutions: student.filing_details!.institutions.slice(0, -1),
        },
      },
      {
        ...student,
        [
          student.credit_type === "aoc"
            ? "aoc_adjusted_expenses"
            : "llc_adjusted_expenses"
        ]: c.counts[0] * 2500 + 1,
      },
      ...["student", "payment", "issued", "assistance"].map((kind) => ({
        ...student,
        institution_expense_workpapers: sources.map((s, i) =>
          i !==
              ((kind === "student" || kind === "issued")
                ? 0
                : sources.length - 1)
            ? s
            : {
              ...s,
              workpaper: {
                ...s.workpaper,
                issued_form1098t_source: kind === "student" || kind === "issued"
                  ? {
                    ...s.workpaper.issued_form1098t_source!,
                    ...(kind === "student"
                      ? { student_ssn: "999887777" }
                      : { box1_payments: 3001 }),
                  }
                  : s.workpaper.issued_form1098t_source,
                payment_sources: s.workpaper.payment_sources!.map((p) => ({
                  ...p,
                  ...(kind === "payment" ? { amount: 3001 } : {}),
                })),
                assistance_sources: s.workpaper.assistance_sources!.map((
                  a,
                ) => ({
                  ...a,
                  ...(kind === "assistance" ? { amount: 501 } : {}),
                })),
              },
            }
        ),
      })),
      ...(c.counts[0] === 3
        ? [{
          ...student,
          institution_expense_workpapers: sources.map((s, i) =>
            i !== 2 ? s : {
              ...s,
              workpaper: { ...s.workpaper, missing_1098t_exception: undefined },
            }
          ),
        }]
        : []),
    ];
    for (const altered of variants) {
      const changed = {
        ...pending,
        f8863: {
          ...pending.f8863!,
          f8863s: [altered, ...pending.f8863!.f8863s.slice(1)],
        },
      };
      await assertRejects(() =>
        buildMefBundle(changed, { filer, attachments: [] })
      );
      await assertRejects(() => buildPdfBytes(changed, filer, ".pdf-cache"));
    }
  });
}
