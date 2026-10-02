import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { scheduleR } from "./mef/forms/schedule_r.ts";
import { schedule_r } from "../nodes/inputs/schedule_r/index.ts";
import { FilingStatus } from "../nodes/types.ts";
import { scheduleRPdf } from "./pdf/forms/schedule_r.ts";
import { sha256Hex } from "./prepared-source.ts";
import { reviewScheduleRDisabilityDocuments } from "./schedule_r_disability_document.ts";

async function document(id: string) {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  const bytes = Uint8Array.from(await pdf.save());
  return {
    source_document_id: id,
    bytes,
    reviewed_sha256: await sha256Hex(bytes),
    reviewed_by: "Reviewer One",
    reviewed_on: "2026-02-01",
  };
}

Deno.test("reviewed disability PDF bytes feed Schedule R native and PDF lines", async () => {
  const physician = await document("signed-physician-2025");
  const income = await document("retirement-income-2025");
  const raw = {
    claimant_name: "Alex Doe",
    return_claimant_name: "Alex Doe",
    physician_statement: "current_year" as const,
    physician_or_va_statement_signed_verified: true as const,
    retired_on_permanent_total_disability: true as const,
    below_mandatory_retirement_age_on_january_1: true as const,
    unable_to_perform_substantial_gainful_activity: true as const,
    condition_expected_to_last_one_year_or_result_in_death_verified:
      true as const,
    disability_income_reported_on: "wages" as const,
    disability_income_amount: 5_000,
    physician_document: physician,
    retirement_and_income_document: income,
  };
  const reviewed = await reviewScheduleRDisabilityDocuments(raw);
  assertStringIncludes(
    reviewed.taxpayer_disability_evidence.physician_statement_source_reference,
    physician.reviewed_sha256,
  );
  const pending = {
    schedule_r: {
      filing_status: FilingStatus.Single,
      taxpayer_age_65_or_older: false,
      ...reviewed,
      agi: 7_500,
    },
    f1040: {
      filing_status: "single",
      taxpayer_age_65_or_older: false,
      line1z_total_wages: 5_000,
      line11_agi: 7_500,
      line18_total_tax_before_credits: 1_000,
      line20_nonrefundable_credits: 750,
    },
    schedule3: { line6d_elderly_disabled_credit: 750 },
  };
  const graph = schedule_r.compute(
    { taxYear: 2025, formType: "f1040" },
    pending.schedule_r,
  );
  assertEquals(
    graph.outputs.some((entry) =>
      entry.fields.line6d_elderly_disabled_credit === 750
    ),
    true,
  );
  const xml = scheduleR.build({}, { pending });
  assertStringIncludes(
    xml,
    "<Und65RtdPermnntTotDsbltyInd>X</Und65RtdPermnntTotDsbltyInd>",
  );
  assertStringIncludes(
    xml,
    "<CreditForElderlyOrDisabledAmt>750</CreditForElderlyOrDisabledAmt>",
  );
  const fields = scheduleRPdf.projectFields?.(pending.schedule_r, pending);
  assertEquals(fields?.box2, "yes");
  assertEquals(fields?.line11, 5_000);
  assertEquals(fields?.line22, 750);

  const altered = Uint8Array.from(physician.bytes);
  altered[altered.length - 1] ^= 1;
  await assertRejects(
    () =>
      reviewScheduleRDisabilityDocuments({
        ...raw,
        physician_document: { ...physician, bytes: altered },
      }),
    Error,
    "bytes differ from reviewed SHA-256",
  );
  await assertRejects(
    () =>
      reviewScheduleRDisabilityDocuments({
        ...raw,
        return_claimant_name: "Someone Else",
      }),
    Error,
    "claimant must match",
  );
  await assertRejects(
    () =>
      reviewScheduleRDisabilityDocuments({
        ...raw,
        physician_statement: "prior_year",
      }),
    Error,
    "prior qualification review",
  );
});
