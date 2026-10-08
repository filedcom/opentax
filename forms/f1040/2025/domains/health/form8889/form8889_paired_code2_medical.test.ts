import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import {
  CoverageType,
  inputSchema,
} from "../../../../nodes/intermediate/forms/form8889/index.ts";
import { f1040_2025 } from "../../../index.ts";
import { form8889 } from "../../../mef/forms/health/f8889.ts";
import { form8889Pdf } from "../../../pdf/forms/health/f8889.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";

type Form8889Owner = Extract<
  Parameters<typeof form8889.build>[0],
  { forms: unknown }
>["forms"][number];

const base = pdfReviewFixtures.find((item) =>
  item.id === "joint-two-hsa-owners"
)!;

function source() {
  return inputSchema.parse({
    beneficiary_identity: {
      owner: "T",
      name: "Alex Example",
      ssn: "111223333",
    },
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
    age_55_or_older: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    last_month_rule_elected: false,
    taxpayer_hsa_contributions: 5_200,
    hsa_distributions: 1_000,
    form1099_sa_distributions: [{
      tax_year: 2025,
      recipient_ssn: "111223333",
      box1_gross_distribution: 1_000,
      box2_earnings_on_excess: 100,
      box3_distribution_code: "2",
      source_reference: "alex-code2-1099-sa",
    }],
    hsa_excluded_distributions: {
      timely_excess_withdrawal: {
        source: "current_year_personal",
        amount_including_earnings: 1_000,
        included_earnings: 100,
        form1099_sa_source_reference: "alex-code2-1099-sa",
        withdrawn_by_return_due_date: true,
      },
    },
    spouse_hsa: {
      beneficiary_identity: {
        owner: "S",
        name: "Sam Example",
        ssn: "444556666",
      },
      eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
      age_55_or_older: true,
      married_at_year_end: true,
      spouse_has_separate_hsa: true,
      last_month_rule_elected: false,
      taxpayer_hsa_contributions: 2_000,
      hsa_distributions: 500,
      form1099_sa_distributions: [{
        tax_year: 2025,
        recipient_ssn: "444556666",
        box1_gross_distribution: 500,
        box3_distribution_code: "1",
        source_reference: "sam-normal-1099-sa",
      }],
      qualified_medical_expenses: 200,
      qualified_medical_expense_evidence: [{
        amount: 200,
        source_reference: "sam-medical-receipt",
        incurred_after_hsa_established: true,
        not_reimbursed_by_other_coverage: true,
        eligible_person: "owner",
      }],
      exception_qualified_taxable_amount: 0,
    },
  });
}

Deno.test("paired code-2 return and other owner's partly medical distribution reach return, MeF, and PDF", async () => {
  const hsa = source();
  const result = f1040_2025.executeReturn({
    ...base.inputs,
    form8889: hsa,
  });
  assertEquals(result.diagnostics, []);
  const forms = result.pending.form8889.forms as Form8889Owner[];
  assertEquals(forms.length, 2);
  assertEquals(forms[0].print_line14b_excluded_distributions, 1_000);
  assertEquals(forms[0].print_line16_taxable ?? 0, 0);
  assertEquals(forms[1].print_line14a_distributions, 500);
  assertEquals(forms[1].print_line15_qualified, 200);
  assertEquals(forms[1].print_line16_taxable, 300);
  assertEquals(forms[1].print_line17b_penalty, 60);
  assertEquals(result.pending.schedule1.line13_hsa_deduction, 6_300);
  assertEquals(result.pending.schedule1.line8f_hsa_income, 300);
  assertEquals(result.pending.schedule1.line8z_hsa_excess_earnings, 100);
  assertEquals(result.pending.schedule1.line10_total_additional_income, 400);
  assertEquals(result.pending.schedule2?.line17c_hsa_penalty, 60);
  assertEquals(result.pending.f1040.line8_additional_income, 400);
  assertEquals(result.pending.f1040.line10_adjustments, 6_300);
  assertEquals(result.pending.f1040.line23_other_taxes, 60);

  const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
  assertStringIncludes(
    prepared.bundle.xml,
    "<HSADistributionRolloverAmt>1000</HSADistributionRolloverAmt>",
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<TotalHSADistributionAmt>500</TotalHSADistributionAmt>",
  );
  const printed = form8889Pdf.instances?.(
    { forms },
    base.filer,
    result.pending,
  );
  assertEquals(printed?.length, 2);
  assertEquals(printed?.[0]?.print_line14b_excluded_distributions, 1_000);
  assertEquals(printed?.[1]?.print_line15_qualified, 200);
  assert((await prepared.renderPdf()).length > 0);

  const changedReturn = {
    ...result.pending,
    f1040: { ...result.pending.f1040, line23_other_taxes: 0 },
  };
  assertThrows(
    () =>
      form8889.build({ forms }, {
        filer: base.filer,
        pending: changedReturn,
      }),
    Error,
    "code-2 and medical distribution totals",
  );
  assertThrows(
    () => form8889Pdf.instances?.({ forms }, base.filer, changedReturn),
    Error,
    "code-2 and medical distribution totals",
  );
  const changedReceipt = {
    ...result.pending,
    form8889: {
      ...hsa,
      forms,
      spouse_hsa: {
        ...hsa.spouse_hsa!,
        qualified_medical_expense_evidence: [{
          ...hsa.spouse_hsa!.qualified_medical_expense_evidence![0],
          amount: 100,
        }],
      },
    },
  };
  assertThrows(
    () =>
      form8889.build({ forms }, {
        filer: base.filer,
        pending: changedReceipt,
      }),
    Error,
  );
  assertThrows(
    () => form8889Pdf.instances?.({ forms }, base.filer, changedReceipt),
    Error,
  );
  const wrongRecipient = {
    ...result.pending,
    form8889: {
      ...hsa,
      forms,
      spouse_hsa: {
        ...hsa.spouse_hsa!,
        form1099_sa_distributions: [{
          ...hsa.spouse_hsa!.form1099_sa_distributions![0],
          recipient_ssn: "111223333",
        }],
      },
    },
  };
  assertThrows(
    () =>
      form8889.build({ forms }, {
        filer: base.filer,
        pending: wrongRecipient,
      }),
    Error,
  );
  assertThrows(
    () => form8889Pdf.instances?.({ forms }, base.filer, wrongRecipient),
    Error,
  );
  await assertRejects(() =>
    f1040_2025.prepareReturn(changedReturn, base.filer)
  );
});
