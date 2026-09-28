import { assertEquals, assertThrows } from "@std/assert";
import { proveNonexemptPriorReceipts } from "./nonexempt-receipts.ts";
import { stageProvisionalScheduleCInterest } from "./two-stage.ts";

const provisional = stageProvisionalScheduleCInterest({
  schedule_cs: [{
    business_reference: "C-1",
    line_a_principal_business: "Software consulting",
    line_b_business_code: "541510",
    line_f_accounting_method: "cash",
    line_g_material_participation: true,
    line_1_gross_receipts: 200_000,
    line_16b_interest_other: 8_000,
  }],
});

const filed = [2022, 2023, 2024].map((taxYear) => ({
  tax_year: taxYear,
  business_reference: "C-1",
  filed_schedule_c_document_reference: `filed-${taxYear}`,
  filed_tax_period_start: `${taxYear}-01-01`,
  filed_tax_period_end: `${taxYear}-12-31`,
  filed_line1_gross_receipts: 33_000_000,
  filed_line2_returns_and_allowances: 1_000_000,
  filed_line3_net_receipts: 32_000_000,
}));

Deno.test("2025 Form 8990 prior filed Schedule C receipts establish a lower bound above threshold", () => {
  const proof = proveNonexemptPriorReceipts(provisional, filed);
  assertEquals(
    proof.averagePriorThreeYearScheduleCNetReceiptsLowerBound,
    32_000_000,
  );
  assertEquals(
    proof.totalPriorThreeYearScheduleCNetReceiptsLowerBound,
    96_000_000,
  );
});

Deno.test("2025 Form 8990 prior receipts reject incomplete or below-threshold sources", () => {
  assertThrows(
    () => proveNonexemptPriorReceipts(provisional, filed.slice(0, 2)),
    Error,
  );
  assertThrows(
    () =>
      proveNonexemptPriorReceipts(
        provisional,
        filed.map((entry) => ({
          ...entry,
          filed_line2_returns_and_allowances: 2_000_000,
          filed_line3_net_receipts: 31_000_000,
        })),
      ),
    Error,
    "do not establish nonexempt status",
  );
  assertThrows(
    () =>
      proveNonexemptPriorReceipts(
        provisional,
        filed.map((entry) => ({
          ...entry,
          business_reference: "C-2",
        })),
      ),
    Error,
    "not for the identified business",
  );
});

Deno.test("2025 Form 8990 rejects gross line 1 above threshold when line 2 lowers net receipts", () => {
  assertThrows(
    () =>
      proveNonexemptPriorReceipts(
        provisional,
        filed.map((entry) => ({
          ...entry,
          filed_line1_gross_receipts: 34_000_000,
          filed_line2_returns_and_allowances: 4_000_000,
          filed_line3_net_receipts: 30_000_000,
        })),
      ),
    Error,
    "do not establish nonexempt status",
  );
});

Deno.test("2025 Form 8990 requires reconciled filed lines and full prior tax years", () => {
  assertThrows(
    () =>
      proveNonexemptPriorReceipts(
        provisional,
        filed.map((entry) => ({
          ...entry,
          filed_line3_net_receipts: 33_000_000,
        })),
      ),
    Error,
    "line 3 must equal line 1 less line 2",
  );
  assertThrows(
    () =>
      proveNonexemptPriorReceipts(
        provisional,
        filed.map((entry) => ({
          ...entry,
          filed_tax_period_start: `${entry.tax_year}-07-01`,
        })),
      ),
    Error,
    "full calendar-year filed Schedule C",
  );
});
