import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { assertSocialSecurityBenefitSource } from "./ssa-benefits-reconciliation.ts";

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

Deno.test("SSA line 6a replay includes railroad and lump-sum source nodes", () => {
  const pending = {
    ssa1099,
    rrb1099r: {
      rrb1099rs: [{ payer_name: "RRB", box3_sseb_gross: 3_000 }],
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

Deno.test("negative SSA aggregate remains review-blocked even with railroad benefits", () => {
  assertThrows(
    () =>
      assertSocialSecurityBenefitSource({
        ssa1099: {
          ssas: [{
            box3_gross_benefits: 1_000,
            box4_repaid: 2_000,
            box5_net_benefits: -1_000,
          }],
        },
        rrb1099r: {
          rrb1099rs: [{ payer_name: "RRB", box3_sseb_gross: 5_000 }],
        },
        f1040: filed(5_000),
      }),
    Error,
    "Negative total SSA-1099 benefits need repayment deduction or credit review",
  );
});
