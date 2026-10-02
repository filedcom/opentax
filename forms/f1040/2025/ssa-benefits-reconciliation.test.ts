import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { assertSocialSecurityBenefitSource } from "./ssa-benefits-reconciliation.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "./registry.ts";

const filer: FilerIdentity = {
  primarySSN: "111223333",
  firstNameWithInitial: "Taxpayer",
  lastName: "Test",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TEST",
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
};

const filed = (line6a_ss_gross: number) => ({
  filing_status: "single",
  digital_assets: false,
  taxpayer_ssn: filer.primarySSN,
  line6a_ss_gross,
});

const ssa1099 = {
  ssas: [
    {
      box3_gross_benefits: 1_000,
      box4_repaid: 2_000,
      box5_net_benefits: -1_000,
    },
    {
      box3_gross_benefits: 5_000,
      box5_net_benefits: 5_000,
    },
  ],
};

Deno.test("SSA-1099 signed box 5 offsets another statement in final line 6a replay", () => {
  assertSocialSecurityBenefitSource({
    ssa1099,
    f1040: filed(4_000),
  });
  assertThrows(
    () =>
      assertSocialSecurityBenefitSource({
        ssa1099,
        f1040: filed(5_000),
      }),
    Error,
    "line 6a differs from retained Social Security benefit sources",
  );
});

Deno.test("native and PDF export reject inflated SSA line 6a", async () => {
  const pending = {
    ssa1099,
    f1040: filed(5_000),
  };
  const message =
    "line 6a differs from retained Social Security benefit sources";
  assertThrows(
    () => buildMefXml(pending as Parameters<typeof buildMefXml>[0], filer),
    Error,
    message,
  );
  await assertRejects(() => buildPdfBytes(pending, filer), Error, message);
});

Deno.test("SSA-1099 contradictory box 5 rejects final native and PDF export", async () => {
  const pending = {
    ssa1099: {
      ssas: [{
        box3_gross_benefits: 10_000,
        box4_repaid: 2_000,
        box5_net_benefits: 9_000,
      }],
    },
    f1040: filed(9_000),
  };
  const message = "SSA-1099 box 5 must equal box 3 minus box 4";
  assertThrows(
    () => buildMefXml(pending as Parameters<typeof buildMefXml>[0], filer),
    Error,
    message,
  );
  await assertRejects(() => buildPdfBytes(pending, filer), Error, message);
});

Deno.test("SSA line 6a replay includes RRB-1099 and lump-sum source rows", () => {
  const pending = {
    ssa1099: {
      ssas: [
        ...ssa1099.ssas,
        { is_rrb: true, box3_gross_benefits: 3_000 },
      ],
    },
    lump_sum_ss: {
      lump_sum_sss: [{
        total_ss_benefits_this_year: 2_000,
        lump_sum_amount: 1_000,
      }],
    },
    f1040: filed(9_000),
  };
  assertSocialSecurityBenefitSource(pending);
  assertEquals(pending.f1040.line6a_ss_gross, 9_000);
});

Deno.test("negative SSA box 5 offsets positive RRB-1099 box 5", () => {
  assertSocialSecurityBenefitSource({
    ssa1099: {
      ssas: [
        {
          box3_gross_benefits: 1_000,
          box4_repaid: 2_000,
          box5_net_benefits: -1_000,
        },
        { is_rrb: true, box3_gross_benefits: 5_000 },
      ],
    },
    f1040: filed(4_000),
  });
});

Deno.test("RRB-1099 box 10 withholding replays at native and PDF export", async () => {
  const source = {
    ssas: [{
      is_rrb: true,
      box3_gross_benefits: 5_000,
      rrb_box10_federal_withheld: 100,
    }],
  };
  const changed = {
    ssa1099: source,
    f1040: { ...filed(5_000), line25b_withheld_1099: 99 },
  };
  const message = "line 25b differs from retained 1099-family withholding";
  assertThrows(
    () => buildMefXml(changed as Parameters<typeof buildMefXml>[0], filer),
    Error,
    message,
  );
  await assertRejects(() => buildPdfBytes(changed, filer), Error, message);
  const wrongBox = {
    ssa1099: {
      ssas: [{
        is_rrb: true,
        box3_gross_benefits: 5_000,
        box6_federal_withheld: 100,
      }],
    },
    f1040: { ...filed(5_000), line25b_withheld_1099: 100 },
  };
  assertThrows(
    () => buildMefXml(wrongBox as Parameters<typeof buildMefXml>[0], filer),
    Error,
    "RRB-1099 withholding belongs in box 10",
  );
  await assertRejects(
    () => buildPdfBytes(wrongBox, filer),
    Error,
    "RRB-1099 withholding belongs in box 10",
  );
});

Deno.test("SSA repayment and RRB-1099 benefits reach full-graph line 6a and taxability", () => {
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
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
    f1099int: [{ payer_name: "Bank", box1: 30_000 }],
    ssa1099: [
      {
        box3_gross_benefits: 1_000,
        box4_repaid: 2_000,
        box5_net_benefits: -1_000,
      },
      {
        is_rrb: true,
        box3_gross_benefits: 5_000,
        box5_net_benefits: 5_000,
        rrb_box10_federal_withheld: 100,
      },
    ],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line6a_ss_gross, 4_000);
  assertEquals(result.pending.f1040?.line6b_ss_taxable, 2_000);
  assertEquals(result.pending.f1040?.line25b_withheld_1099, 100);
  assertSocialSecurityBenefitSource(result.pending);
});
