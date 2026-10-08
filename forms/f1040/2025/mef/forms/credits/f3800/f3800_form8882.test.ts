import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form8882PreparedFixture } from "../f8882.fixture.ts";
import { form3800, prepareForm3800DocumentParts } from "./f3800.ts";
import { form8882 } from "../f8882.ts";
import { form3800Pdf } from "../../../../pdf/forms/credits/f3800/f3800.ts";
import { form3800PartIIIFields } from "../../../../pdf/forms/credits/f3800/f3800_fields.ts";
import { testFiler } from "../../../execution/test-filer.ts";

function filed() {
  const { source, pending } = form8882PreparedFixture();
  return {
    source,
    pending: {
      ...pending,
      f1040: {
        ...pending.f1040,
        line16_income_tax: 40_000,
        line20_nonrefundable_credits: 11_000,
      },
      form6251: { line11_amt: 0, net_tmt: 20_000 },
      schedule3: {
        line6a_total: 11_000,
        line7_total: 11_000,
        line8_total: 11_000,
      },
    },
    documentIdsByPendingKey: {
      f8882: ["IRS8882_1"],
      f3800: ["IRS3800_1"],
      form6251: ["IRS6251_1"],
      f8835: [],
    },
  };
}

Deno.test("Form 8882 line 7 joins Form 3800 line 1k and final Schedule 3", () => {
  const { source, pending, documentIdsByPendingKey } = filed();
  const context = { pending, documentIdsByPendingKey };
  const prepared = prepareForm3800DocumentParts(pending.f3800, context);
  if (!prepared) throw new Error("Expected sourced Form 3800");
  assertEquals(prepared.lines.line38, 11_000);
  assertStringIncludes(
    form3800.build(pending.f3800, context),
    "<Form8882CYCreditsGrp",
  );
  assertStringIncludes(
    form3800.build(pending.f3800, context),
    'referenceDocumentId="IRS8882_1"',
  );
  assertStringIncludes(
    form8882.build(source, {
      ...context,
      filer: { ...testFiler(), primarySSN: "111223333" },
    }),
    "<SmllrOfEntitiesSumOr150000Amt>11000</SmllrOfEntitiesSumOr150000Amt>",
  );
  const [pdf] = form3800Pdf.instances!(
    pending.f3800,
    { ...testFiler(), primarySSN: "111223333" },
    pending,
    prepared,
  );
  assertEquals(pdf[form3800PartIIIFields("1k").e], 11_000);
  assertEquals(pdf[form3800PartIIIFields("1k").i], 11_000);
});

Deno.test("Form 8882 line 1k rejects altered amount, business, deduction, and document", () => {
  const { pending, documentIdsByPendingKey } = filed();
  const context = { pending, documentIdsByPendingKey };
  assertThrows(() =>
    prepareForm3800DocumentParts({
      ...pending.f3800,
      f8882_direct_employer_credit: {
        ...pending.f3800.f8882_direct_employer_credit,
        credit_amount: 10_999,
      },
    }, context)
  );
  assertThrows(() =>
    prepareForm3800DocumentParts({
      ...pending.f3800,
      f8882_direct_employer_credit: {
        ...pending.f3800.f8882_direct_employer_credit,
        schedule_c_business_reference: "OTHER-SHOP",
      },
    }, context)
  );
  assertThrows(() =>
    prepareForm3800DocumentParts(pending.f3800, {
      ...context,
      pending: {
        ...pending,
        schedule_c: {
          schedule_cs: [{
            ...pending.schedule_c.schedule_cs[0],
            part_v_other_expenses: [{
              description: "Childcare facility net of 45F credit",
              amount: 40_000,
            }],
          }],
        },
      },
    })
  );
  assertThrows(() =>
    prepareForm3800DocumentParts(pending.f3800, {
      ...context,
      documentIdsByPendingKey: {
        ...documentIdsByPendingKey,
        f8882: [],
      },
    })
  );
});
