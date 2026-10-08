import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../index.ts";
import { inputSchema } from "../../../../nodes/inputs/f8863/index.ts";
import {
  claimantRefundRestriction,
  claimantReviewSchema,
} from "../../../../nodes/inputs/f8863/claimant-review.ts";
import { form8863 } from "../../../mef/forms/credits/f8863.ts";
import { form8863Pdf } from "../../forms/credits/f8863.ts";
import {
  childSsns,
  filer,
  fixture,
  ssn,
  wageReference,
} from "./form8863-claimant-source.fixture.ts";
const xsd = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
for (
  const kind of [
    "parent-limited",
    "parent-two",
    "student-refundable",
    "student-no-refund",
    "student-scholarship",
  ] as const
) {
  Deno.test(`education ${kind} owner/support source reaches 1040, credit ordering, full XSD and PDF`, async () => {
    const source = fixture(kind);
    const result = f1040_2025.executeReturn(source.inputs);
    assertEquals(result.diagnostics, []);
    const pending = result.pending;
    assertEquals(pending.f1040.line18_total_tax_before_credits, source.tax);
    const noRefund = kind === "student-no-refund" ||
      kind === "student-scholarship";
    const two = kind === "parent-two";
    assertEquals(
      pending.f1040.line29_refundable_aoc ?? 0,
      noRefund ? 0 : two ? 2_000 : 1_000,
    );
    assertEquals(
      pending.schedule3.line3_education_credit,
      two ? 3_000 : source.tax,
    );
    assertEquals(pending.f1040.line19_child_tax_credit ?? 0, two ? 1_000 : 0);
    assertEquals(pending.f1040.line24_total_tax, two ? 3_955 : 0);
    assertEquals(
      pending.f1040.line11_agi,
      kind === "parent-two"
        ? 75_000
        : kind === "student-scholarship"
        ? 26000
        : noRefund
        ? 18_000
        : 25_000,
    );
    assertEquals(
      pending.f1040.taxpayer_can_be_claimed_as_dependent,
      kind.startsWith("student"),
    );
    if (kind === "student-scholarship") {
      assertEquals(pending.schedule1.line8r_taxable_scholarships, 8000);
      assertEquals(
        inputSchema.parse(pending.f8863).f8863s[0].filer_magi,
        26000,
      );
    }
    const prepared = await f1040_2025.prepareReturn(pending, filer);
    assertEquals(
      prepared.bundle.xml.includes(
        "<RefundableAmerOppCrUnder24Ind>X</RefundableAmerOppCrUnder24Ind>",
      ),
      noRefund,
    );
    const [projected] = form8863Pdf.instances!(pending.f8863, filer, pending);
    assertEquals(projected.pdf_under24, noRefund);
    assertEquals(projected.line8 ?? 0, noRefund ? 0 : two ? 2_000 : 1_000);
    assertStringIncludes(
      prepared.bundle.xml,
      `<StudentSSN>${source.students[0].student_ssn}</StudentSSN>`,
    );
    const path = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(path, prepared.bundle.xml);
      const checked = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, path],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    } finally {
      await Deno.remove(path);
    }
    const pdf = await prepared.renderPdf();
    const doc = await PDFDocument.load(pdf);
    assertEquals(doc.getForm().getFields().length, 0);
    assertEquals(
      doc.getPageCount(),
      two ? 8 : kind === "student-scholarship" ? 7 : 5,
    );
    if (Deno.args.includes("--write-review-artifacts")) {
      const dir = "/tmp/opentax-f8863-owner-evidence";
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(
        `${dir}/${kind}-source-input.json`,
        JSON.stringify({ inputs: source.inputs, filer }, null, 2),
      );
      await Deno.writeTextFile(
        `${dir}/${kind}-full-return.xml`,
        prepared.bundle.xml,
      );
      await Deno.writeFile(`${dir}/${kind}-filled-return.pdf`, pdf);
    }
  });
}

Deno.test("claimant support restriction follows age, earned/support threshold, full-time enrollment and parents/joint status", () => {
  const source = fixture("student-refundable");
  const review = claimantReviewSchema.parse(source.review);
  assertEquals(claimantRefundRestriction(review, "single"), false);
  assertEquals(
    claimantRefundRestriction(
      claimantReviewSchema.parse(fixture("student-no-refund").review),
      "single",
    ),
    true,
  );
  if (review.kind !== "under_24") throw new Error("test review");
  const below = {
    ...review,
    earned_income_w2_sources: [{
      ...review.earned_income_w2_sources[0],
      box1_wages: 24_999,
    }],
  };
  assertEquals(claimantRefundRestriction(below, "single"), true);
  assertEquals(
    claimantRefundRestriction({
      ...below,
      at_least_one_parent_alive_at_year_end: false,
    }, "single"),
    false,
  );
  assertEquals(claimantRefundRestriction(below, "mfj"), false);
  assertEquals(
    claimantRefundRestriction({
      ...below,
      full_time_student_months: [1, 2, 3, 4],
    }, "single"),
    false,
  );
  assertEquals(
    claimantRefundRestriction({
      ...below,
      claimant_dob: "2007-06-15",
      full_time_student_months: [],
    }, "single"),
    true,
  );
  assertEquals(
    claimantRefundRestriction(
      { ...review, claimant_dob: "2008-06-15" },
      "single",
    ),
    true,
  );
  assertEquals(
    claimantRefundRestriction(
      claimantReviewSchema.parse({
        kind: "age_24_or_older",
        tax_year: 2025,
        claimant_ssn: ssn,
        claimant_dob: "2002-01-01",
        dob_record_reference: "DOB",
        claimant_actually_claimed_as_dependent: false,
        claimant_dependency_record_reference: "dependency",
      }),
      "single",
    ),
    false,
  );
});

Deno.test("education claimant rejects competing owners, dependency releases, detached income and filed-row tampering", async () => {
  for (const kind of ["parent-two", "student-refundable"] as const) {
    const source = fixture(kind);
    const calculated = f1040_2025.executeReturn(source.inputs);
    assertEquals(calculated.diagnostics, []);
    const pending = calculated.pending;
    const mutations: Array<(value: any) => void> = [
      (p) => {
        p.f8863.claimant_review.claimant_ssn = "999887777";
      },
      (p) => {
        p.f8863.claimant_review.claimant_dob = "2006-06-15";
      },
      (p) => {
        p.f8863.claimant_review.claimant_actually_claimed_as_dependent = true;
      },
      (p) => {
        p.general.taxpayer_claimed_as_dependent = true;
      },
      (p) => {
        delete p.f8863.claimant_review;
      },
      (p) => {
        p.f8863.f8863s[0].ownership_review.claimant_ssn = "999887777";
      },
      (p) => {
        p.f8863.f8863s[0].ownership_review.student_ssn = "999887777";
      },
      (p) => {
        p.f8863.f8863s[0].ownership_review.dependency_claim_state =
          "claimed_on_another_return";
      },
      (p) => {
        p.f8863.f8863s[0].taxpayer_under_24_no_refundable_aoc = true;
      },
      (p) => {
        p.f8863.f8863s.push(structuredClone(p.f8863.f8863s[0]));
      },
      ...(kind === "parent-two"
        ? [
          (p: any) => {
            delete p.f8812;
          },
          (p: any) => {
            delete p.f8812.f8812s[0].credit_limit_worksheet;
          },
          (p: any) => {
            p.general.dependents[0].dependent_on_another_return = true;
          },
          (p: any) => {
            p.general.dependents[0].provided_over_half_own_support = true;
          },
          (p: any) => {
            p.general.dependents[0].education_dependency_record_reference =
              "detached-review";
          },
          (p: any) => {
            p.f1040.dependent_details.splice(0, 1);
          },
          (p: any) => {
            p.f1040.dependent_details[0].education_dependency_record_reference =
              "detached-filed-review";
          },
        ]
        : [
          (p: any) => {
            delete p.f8863.f8863s[0].ownership_review
              .parent_nonclaim_record_reference;
          },
          (p: any) => {
            p.general.taxpayer_can_be_claimed_as_dependent = false;
          },
          (p: any) => {
            p.f1040.taxpayer_can_be_claimed_as_dependent = false;
          },
          (p: any) => {
            p.f8863.claimant_review.earned_income_w2_sources[0].box1_wages =
              25001;
          },
          (p: any) => {
            p.w2.w2s[0].source_document_reference = "detached-W2";
          },
          (p: any) => {
            p.w2.w2s[0].box1_wages = 24999;
          },
          (p: any) => {
            p.w2.w2s[0].box12_entries = [{ code: "D", amount: 4000 }];
          },
          (p: any) => {
            p.f1040.line1a_wages = 24999;
          },
          (p: any) => {
            p.f8863.claimant_review.support_sources[0].beneficiary_ssn =
              "999887777";
          },
          (p: any) => {
            p.f1040.line1c_unreported_tips = 100;
          },
        ]),
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(pending);
      mutate(changed);
      assertThrows(() =>
        form8863.build(inputSchema.parse(changed.f8863), {
          pending: changed,
          filer,
        })
      );
      assertThrows(() => form8863Pdf.instances!(changed.f8863, filer, changed));
      await assertRejects(() => f1040_2025.prepareReturn(changed, filer));
    }
  }
});

Deno.test("dependent scholarship income stays on student return and Schedule 8812 checks filed credit ordering", async () => {
  const source = fixture("parent-two");
  const result = f1040_2025.executeReturn(source.inputs);
  assertEquals(result.diagnostics, []);
  const scholarshipFixture = JSON.parse(
    await Deno.readTextFile(
      new URL("../composed/review-8863-scholarship-source.json", import.meta.url),
    ),
  );
  const scholarship = {
    ...scholarshipFixture.inputs.education_income[0],
    student_ssn: childSsns[0],
  };
  const crossed: Record<string, any> = {
    ...result.pending,
    education_income: { education_incomes: [scholarship] },
  };
  assertThrows(
    () =>
      form8863.build(inputSchema.parse(crossed.f8863), {
        pending: crossed,
        filer,
      }),
    Error,
    "recipient must match",
  );
  assertThrows(() => form8863Pdf.instances!(crossed.f8863, filer, crossed));
  await assertRejects(() => f1040_2025.prepareReturn(crossed, filer));
  for (
    const mutate of [
      (p: any) => {
        p.f1040.line19_child_tax_credit = 999;
      },
      (p: any) => {
        p.f8812.f8812s[0].credit_limit_worksheet.schedule3_line3 = 2999;
      },
    ]
  ) {
    const changed = structuredClone(result.pending);
    mutate(changed);
    await assertRejects(() => f1040_2025.prepareReturn(changed, filer));
  }
});
