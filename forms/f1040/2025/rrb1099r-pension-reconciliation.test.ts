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

const issuedPension = {
  f1099rs: [{
    payer_name: "Other Pension",
    payer_ein: "98-7654321",
    recipient_ssn: filer.primarySSN,
    source_document_reference: "other-pension-2025",
    box1_gross_distribution: 3_000,
    box2a_taxable_amount: 2_000,
    box7_distribution_code: "7",
    box7_ira_simple_indicator: false,
    ts: "T",
  }],
};

const substitutePension = {
  f4852s: [{
    form_type: "R_1099",
    payer_name: "Missing Pension",
    gross_distribution: 2_000,
    taxable_amount: 1_500,
  }],
};

Deno.test("RRB with issued and substitute pensions replays both filed amounts exactly", async () => {
  const pending = {
    rrb1099r,
    f1099r: issuedPension,
    f4852: substitutePension,
    f1040: { ...filed(10_500, 9_000), line25b_withheld_1099: 550 },
  };
  assertRrb1099rPensionSource(pending, filer);
  for (
    const wrong of [
      { ...pending, f1040: { ...pending.f1040, line5a_pension_gross: 10_501 } },
      {
        ...pending,
        f1040: { ...pending.f1040, line5b_pension_taxable: 9_001 },
      },
    ]
  ) {
    assertThrows(
      () => buildMefXml(wrong as Parameters<typeof buildMefXml>[0], filer),
      Error,
      "lines 5a and 5b differ",
    );
    await assertRejects(
      () => buildPdfBytes(wrong, filer),
      Error,
      "lines 5a and 5b differ",
    );
  }
});

Deno.test("a substitute W-2 cannot justify inflated RRB pension lines", () => {
  const pending = {
    rrb1099r,
    f4852: {
      f4852s: [{ form_type: "W2", payer_name: "Employer", wages: 2_000 }],
    },
    f1040: filed(7_500),
  };
  assertThrows(
    () => assertRrb1099rPensionSource(pending, filer),
    Error,
    "lines 5a and 5b differ",
  );
});

Deno.test("an issued IRA cannot justify inflated RRB pension lines", () => {
  const pending = {
    rrb1099r,
    f1099r: {
      f1099rs: [{
        ...issuedPension.f1099rs[0],
        box7_ira_simple_indicator: true,
      }],
    },
    f1040: filed(8_500),
  };
  assertThrows(
    () => assertRrb1099rPensionSource(pending, filer),
    Error,
    "lines 5a and 5b differ",
  );
});

Deno.test("same-payer issued and substitute 1099-R needs source overlap review", () => {
  const pending = {
    rrb1099r,
    f1099r: issuedPension,
    f4852: {
      f4852s: [{ ...substitutePension.f4852s[0], payer_tin: "98-7654321" }],
    },
    f1040: filed(10_500, 9_000),
  };
  assertThrows(
    () => assertRrb1099rPensionSource(pending, filer),
    Error,
    "source overlap needs review",
  );
});

Deno.test("Form 4972 ordinary cannot inflate pension without its source", () => {
  assertThrows(
    () =>
      assertRrb1099rPensionSource({
        rrb1099r,
        f1040: {
          ...filed(6_000),
          line5b_form4972_ordinary: 500,
        },
      }, filer),
    Error,
    "needs its source",
  );
});

Deno.test("mixed RRB and issued pensions reach full-graph pension and AGI totals", () => {
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
    f1099r: issuedPension.f1099rs,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line5a_pension_gross, 8_500);
  assertEquals(result.pending.f1040?.line5b_pension_taxable, 7_500);
  assertEquals(result.pending.f1040?.line11_agi, 7_500);
  assertRrb1099rPensionSource(result.pending, filer);
});

Deno.test("mixed RRB and substitute pensions reach full-graph pension and AGI totals", () => {
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
    f4852: substitutePension.f4852s,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line5a_pension_gross, 7_500);
  assertEquals(result.pending.f1040?.line5b_pension_taxable, 7_000);
  assertEquals(result.pending.f1040?.line11_agi, 7_000);
  assertRrb1099rPensionSource(result.pending, filer);
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
