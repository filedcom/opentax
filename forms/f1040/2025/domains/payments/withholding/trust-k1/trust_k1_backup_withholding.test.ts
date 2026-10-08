import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { assertOtherFormsWithholding } from "../f8288/f8288-withholding-reconciliation.ts";

const general = {
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  digital_assets: false,
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};

Deno.test("trust K-1 box 13 code B stays retained but cannot silently leave native or PDF export", async () => {
  const result = f1040_2025.executeReturn({
    general,
    k1_trust: [{
      estate_trust_name: "Family Trust",
      estate_trust_ein: "123456789",
      beneficiary_ssn: "111223333",
      source_document_reference: "2025 issued Family Trust K-1",
      box13_code_b_backup_withholding: 125,
    }],
  });
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  const retained = pending.k1_trust as {
    k1_trusts: { box13_code_b_backup_withholding?: number }[];
  };
  assertEquals(
    retained.k1_trusts[0].box13_code_b_backup_withholding,
    125,
  );
  assertEquals(pending.f1040?.line25c_other_withheld, 125);
  assertEquals(pending.f1040?.line25c_total, 125);
  assertEquals(pending.f1040?.line25d_total_withholding, 125);
  assertEquals(pending.f1040?.line33_total_payments, 125);
  assertEquals(pending.f1040?.line34_overpayment, 125);
  const filer = extractFilerIdentity(general);
  assertThrows(
    () => f1040_2025.buildMefXml(pending, filer),
    Error,
    "trust K-1 backup withholding",
  );
  await assertRejects(
    () => f1040_2025.buildPdfBytes(pending, filer),
    Error,
    "trust K-1 backup withholding",
  );
});

Deno.test("joint return graph combines both owners' trust codeB withholding with W-2G and rejects changed source totals", async () => {
  const joint = {
    ...general,
    filing_status: FilingStatus.MFJ,
    spouse_first_name: "Sam",
    spouse_last_name: "Example",
    spouse_ssn: "444-55-6666",
    spouse_dob: "1986-01-01",
  };
  const result = f1040_2025.executeReturn({
    general: joint,
    k1_trust: [
      {
        estate_trust_name: "Primary Trust",
        estate_trust_ein: "123456789",
        beneficiary_ssn: "111223333",
        source_document_reference: "primary-copy",
        box13_code_b_backup_withholding: 125.25,
      },
      {
        estate_trust_name: "Spouse Trust",
        estate_trust_ein: "987654321",
        beneficiary_ssn: "444556666",
        source_document_reference: "spouse-copy",
        box13_code_b_backup_withholding: 200.5,
      },
    ],
    w2g: [{
      payer_name: "Casino",
      payer_ein: "123456780",
      source_document_reference: "casino-copy",
      box1_winnings: 1000,
      box4_federal_withheld: 20.25,
    }],
  });
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  assertEquals(pending.f1040.line25c_total, 346);
  assertEquals(pending.f1040.line25d_total_withholding, 346);
  assertEquals(pending.f1040.line33_total_payments, 346);
  assertEquals(pending.f1040.line34_overpayment, 346);
  assertOtherFormsWithholding(pending.f1040, pending, true);
  const trusts =
    (pending.k1_trust as { k1_trusts: Record<string, unknown>[] }).k1_trusts;
  const changed = {
    ...pending,
    k1_trust: {
      k1_trusts: [trusts[0], {
        ...trusts[1],
        box13_code_b_backup_withholding: 201.5,
      }],
    },
  };
  assertThrows(
    () => assertOtherFormsWithholding(pending.f1040, changed, true),
    Error,
    "less than combined sourced other-form withholding",
  );
  const filer = extractFilerIdentity(joint);
  assertThrows(() => f1040_2025.buildMefXml(pending, filer));
  await assertRejects(() => f1040_2025.buildPdfBytes(pending, filer));
});
