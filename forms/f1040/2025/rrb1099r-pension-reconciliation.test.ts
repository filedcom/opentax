import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { registry } from "./registry.ts";
import { assertRrb1099rPensionSource } from "./rrb1099r-pension-reconciliation.ts";

const filer: FilerIdentity = {
  primarySSN: "111223333",
  firstNameWithInitial: "Taxpayer",
  lastName: "Test",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TEST",
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
};

const rrb1099r = {
  rrb1099rs: [{
    payer_name: "Railroad Retirement Board",
    recipient_tin: filer.primarySSN,
    box4_contributory_amount_paid: 4_000,
    box5_vested_dual_benefit: 500,
    box6_supplemental_annuity: 1_000,
    box7_total_gross_paid: 5_500,
    box9_federal_withheld: 550,
  }],
};

function filed(gross: number, taxable = gross) {
  return {
    filing_status: "single",
    digital_assets: false,
    taxpayer_ssn: filer.primarySSN,
    line5a_pension_gross: gross,
    line5b_pension_taxable: taxable,
    line25b_withheld_1099: 550,
  };
}

Deno.test("RRB-1099-R pension source replays filed lines 5a and 5b", () => {
  assertRrb1099rPensionSource({ rrb1099r, f1040: filed(5_500) }, filer);
  assertThrows(
    () => assertRrb1099rPensionSource({ rrb1099r, f1040: filed(6_000) }, filer),
    Error,
    "lines 5a and 5b differ from retained RRB-1099-R pension sources",
  );
});

Deno.test("native and PDF exports reject an inflated RRB-1099-R pension", async () => {
  const pending = { rrb1099r, f1040: filed(6_000) };
  const message =
    "lines 5a and 5b differ from retained RRB-1099-R pension sources";
  assertThrows(
    () => buildMefXml(pending as Parameters<typeof buildMefXml>[0], filer),
    Error,
    message,
  );
  await assertRejects(() => buildPdfBytes(pending, filer), Error, message);
});

Deno.test("native and PDF exports reject the former SSEB route on RRB-1099-R", async () => {
  const pending = {
    rrb1099r: {
      rrb1099rs: [{
        payer_name: "Railroad Retirement Board",
        box3_sseb_gross: 5_000,
      }],
    },
    f1040: filed(0),
  };
  assertThrows(
    () => buildMefXml(pending as Parameters<typeof buildMefXml>[0], filer),
    Error,
    "Unrecognized key",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "Unrecognized key",
  );
});

Deno.test("RRB-1099-R pension reaches full-graph gross, taxable, and AGI", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Taxpayer",
      taxpayer_last_name: "Test",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1960-01-01",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    rrb1099r: rrb1099r.rrb1099rs,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line5a_pension_gross, 5_500);
  assertEquals(result.pending.f1040?.line5b_pension_taxable, 5_500);
  assertEquals(result.pending.f1040?.line11_agi, 5_500);
  assertRrb1099rPensionSource(result.pending, filer);
});

Deno.test("RRB-1099-R pension recipient must belong to this return", async () => {
  const wrong = {
    rrb1099rs: [{ ...rrb1099r.rrb1099rs[0], recipient_tin: "999887777" }],
  };
  const pending = { rrb1099r: wrong, f1040: filed(5_500) };
  assertThrows(
    () => assertRrb1099rPensionSource(pending, filer),
    Error,
    "recipient must match taxpayer or joint spouse",
  );
  assertThrows(
    () => buildMefXml(pending as Parameters<typeof buildMefXml>[0], filer),
    Error,
    "recipient must match",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "recipient must match",
  );
});
