import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { FilingStatus } from "../nodes/types.ts";
import { normalizeAllPending } from "./pending.ts";
import { form8582 } from "./mef/forms/f8582.ts";
import { form8582Pdf } from "./pdf/forms/f8582.ts";
import { scheduleE } from "./mef/forms/schedule_e.ts";
import { scheduleEPdf } from "./pdf/forms/schedule_e.ts";
import { assertAttachmentCoverage } from "./attachment-coverage.ts";
import { buildForm8582Ledger } from "../nodes/intermediate/forms/form8582/ledger.ts";
import { reconcileForm8582NextYearOpening } from "../nodes/intermediate/forms/form8582/next_year_import.ts";

const priorSource = {
  tax_year: 2024 as const,
  activity_id: "passive-rental-part-ix",
  filed_part_vii_column_c: 10_000,
  source_document_reference: "reviewed 2024 Form 8582 Part IX",
  filed_part_ix_rows: [
    { reporting_form: "schedule_e" as const, filed_unallowed_loss: 2_000 },
    { reporting_form: "form4797_part1" as const, filed_unallowed_loss: 6_000 },
    { reporting_form: "form4797_part2" as const, filed_unallowed_loss: 2_000 },
  ],
};
const filed2024 = {
  tax_year: 2024 as const,
  accepted_return_reference: "synthetic 2024 acceptance reference",
  source_document_reference: priorSource.source_document_reference,
  activities: [{
    activity_id: priorSource.activity_id,
    filed_part_vii_column_c: 10_000,
    reporting_part: "ix" as const,
    rows: priorSource.filed_part_ix_rows.map((row) => ({ ...row })),
  }],
};
const rental = {
  tsj: "T",
  activity_id: priorSource.activity_id,
  property_description: "Passive rental",
  property_type: 1,
  activity_type: "B",
  street_address: "10 North St",
  city: "Austin",
  state: "TX",
  zip: "78701",
  fair_rental_days: 365,
  personal_use_days: 0,
  rent_income: 4_000,
  expense_repairs: 4_000,
  form_1099_payments_made: false,
  prior_unallowed_passive_operating: 2_000,
  prior_unallowed_passive_4797_part1: 6_000,
  prior_unallowed_passive_4797_part2: 2_000,
  prior_year_8582_source: priorSource,
};
const general = {
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Owner",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};

function preparedReturn() {
  const result = f1040_2025.executeReturn({
    general,
    w2: [{ box1_wages: 50_000, box2_fed_withheld: 8_000 }],
    schedule_e: [rental],
    form8582_prior_year_record: { record: filed2024 },
  });
  assertEquals(result.diagnostics, []);
  return result;
}

Deno.test("Form 8582 Part IX carries three reporting characters through the return and PDF", () => {
  const result = preparedReturn();
  assertEquals(result.pending.form8582.prior_unallowed, 10_000);
  assertEquals(result.pending.form8582.current_income ?? 0, 0);
  assertEquals(result.pending.schedule1.line5_schedule_e ?? 0, 0);
  assertEquals(result.pending.f1040.line11_agi, 50_000);
  assertEquals(result.carryforwards.suspended_pal_8582, 10_000);
  const pending = normalizeAllPending(result.pending);
  const native = form8582.build(pending.form8582, { pending });
  assertStringIncludes(
    native,
    "<PriorYearUnallowedOtherLossAmt>10000</PriorYearUnallowedOtherLossAmt>",
  );
  assertStringIncludes(
    native,
    "<MultipleLossActivityNm>Passive rental</MultipleLossActivityNm>",
  );
  assertStringIncludes(native, "Form 4797, Part I");
  assertStringIncludes(native, "Form 4797, Part II");
  const pdf = form8582Pdf.projectFields!(pending.form8582, pending);
  assertEquals(pdf.line2c, "10000");
  assertEquals(pdf.part9_1_form, "Sch E, line 22");
  assertEquals(pdf.part9_2_form, "Form 4797, Part I");
  assertEquals(pdf.part9_3_form, "Form 4797, Part II");
  assertEquals(pdf.part9_total_unallowed, "10000");
  assertStringIncludes(
    scheduleE.build(pending.schedule_e, { pending }),
    "<TotalIncomeOrLossAmt>0</TotalIncomeOrLossAmt>",
  );
  assertEquals(
    scheduleEPdf.projectFields!(pending.schedule_e, pending).property_0_line22,
    undefined,
  );
  const acceptedReference = "synthetic accepted 2025 Part IX return";
  const ledger = buildForm8582Ledger(pending.form8582, acceptedReference);
  assertEquals(ledger.ending_unallowed_loss, 10_000);
  assertEquals(ledger.activities[0].reporting_part, "ix");
  assertEquals(
    ledger.activities[0].lines.map((line) => [
      line.reporting_form,
      line.ending_unallowed_loss,
    ]),
    [["schedule_e", 2_000], ["form4797_part1", 6_000], [
      "form4797_part2",
      2_000,
    ]],
  );
  const opening = {
    tax_year: 2026,
    prior_accepted_return_reference: acceptedReference,
    rows: ledger.activities[0].lines.map((line) => ({
      activity_id: priorSource.activity_id,
      reporting_part: "ix",
      reporting_form: line.reporting_form,
      prior_unallowed_loss: line.ending_unallowed_loss,
    })),
  };
  assertEquals(
    reconcileForm8582NextYearOpening(
      opening,
      ledger,
      pending.form8582,
      acceptedReference,
    ),
    opening,
  );
  for (const kind of ["mef", "pdf"] as const) {
    assertThrows(
      () => assertAttachmentCoverage(pending, kind),
      Error,
      "authenticated accepted-2024 return",
    );
  }
});

Deno.test("Form 8582 Part IX packet rejects changed character, final return, and next-year row", () => {
  const pending = normalizeAllPending(preparedReturn().pending);
  for (
    const changed of [{
      ...pending,
      schedule_e: {
        ...pending.schedule_e,
        schedule_es: [{
          ...rental,
          prior_unallowed_passive_4797_part1: 5_999,
        }],
      },
    }, {
      ...pending,
      f1040: { ...pending.f1040, line11_agi: 49_999 },
    }, {
      ...pending,
      schedule1: { ...pending.schedule1, line5_schedule_e: 1 },
    }]
  ) {
    assertThrows(
      () => form8582.build(pending.form8582, { pending: changed }),
      Error,
    );
    assertThrows(
      () => form8582Pdf.projectFields!(pending.form8582, changed),
      Error,
    );
  }
  const acceptedReference = "synthetic accepted 2025 Part IX return";
  const ledger = buildForm8582Ledger(pending.form8582, acceptedReference);
  assertThrows(
    () =>
      reconcileForm8582NextYearOpening(
        {
          tax_year: 2026,
          prior_accepted_return_reference: acceptedReference,
          rows: [{
            activity_id: priorSource.activity_id,
            reporting_part: "ix",
            reporting_form: "form4797_part1",
            prior_unallowed_loss: 10_000,
          }],
        },
        ledger,
        pending.form8582,
        acceptedReference,
      ),
    Error,
    "activity, character, and loss ledger",
  );
});
