import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import {
  assertBenefitStatementOwner,
  assertSocialSecurityBenefitSource,
} from "./ssa-benefits-reconciliation.ts";
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
      recipient_tin: filer.primarySSN,
      source_document_reference: "ssa-2025-copy-a",
    },
    {
      box3_gross_benefits: 5_000,
      box5_net_benefits: 5_000,
      recipient_tin: filer.primarySSN,
      source_document_reference: "ssa-2025-copy-b",
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

Deno.test("line 6b taxable benefits need retained line 6a and matching AGI", async () => {
  const unsupported = { f1040: { ...filed(0), line6b_ss_taxable: 1 } };
  const message = "line 6b and AGI taxable benefits must fit retained line 6a";
  assertThrows(
    () => assertSocialSecurityBenefitSource(unsupported),
    Error,
    message,
  );
  assertThrows(
    () => buildMefXml(unsupported as Parameters<typeof buildMefXml>[0], filer),
    Error,
    message,
  );
  await assertRejects(
    () => buildPdfBytes(unsupported, filer),
    Error,
    message,
  );
  assertSocialSecurityBenefitSource({
    ssa1099,
    f1040: { ...filed(4_000), line6b_ss_taxable: 2_000 },
    agi_aggregator: { line6b_ss_taxable: 2_000 },
  });
  for (
    const changed of [{
      f1040: { ...filed(4_000), line6b_ss_taxable: 4_001 },
    }, {
      f1040: { ...filed(4_000), line6b_ss_taxable: 2_000 },
      agi_aggregator: { line6b_ss_taxable: 2_001 },
    }]
  ) {
    assertThrows(
      () => assertSocialSecurityBenefitSource({ ssa1099, ...changed }),
      Error,
      message,
    );
  }
});

Deno.test("benefit statement owner requires issued-copy identity for each positive SSA or RRB row", () => {
  assertBenefitStatementOwner({ ssa1099 }, filer);
  const wrong = {
    ssas: [{
      ...ssa1099.ssas[0],
      recipient_tin: "999887777",
    }],
  };
  assertThrows(
    () => assertBenefitStatementOwner({ ssa1099: wrong }, filer),
    Error,
    "taxpayer or joint-spouse box 2 recipient",
  );
  const noCopy = {
    ssas: [{
      ...ssa1099.ssas[0],
      source_document_reference: undefined,
    }],
  };
  assertThrows(
    () => assertBenefitStatementOwner({ ssa1099: noCopy }, filer),
    Error,
    "issued-copy reference",
  );
  assertBenefitStatementOwner({
    ssa1099: {
      ssas: [{
        ...ssa1099.ssas[0],
        is_rrb: true,
        recipient_tin: "222334444",
      }],
    },
  }, {
    ...filer,
    filingStatus: FilingStatus.MarriedFilingJointly,
    spouse: {
      ssn: "222334444",
      firstName: "Spouse",
      lastName: "Test",
      nameControl: "TEST",
    },
  });
});

Deno.test("native and PDF export reject a benefit statement owned by another person", async () => {
  const pending = {
    ssa1099: {
      ssas: [{
        box3_gross_benefits: 4_000,
        recipient_tin: "999887777",
        source_document_reference: "issued-ssa-2025",
      }],
    },
    f1040: filed(4_000),
  };
  const message = "taxpayer or joint-spouse box 2 recipient";
  assertThrows(
    () => buildMefXml(pending as Parameters<typeof buildMefXml>[0], filer),
    Error,
    message,
  );
  await assertRejects(() => buildPdfBytes(pending, filer), Error, message);
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

Deno.test("SSA line 6a counts issued SSA/RRB box 5 once alongside lump-sum review", () => {
  const pending = {
    ssa1099: {
      ssas: [
        ...ssa1099.ssas,
        { is_rrb: true, box3_gross_benefits: 3_000 },
      ],
    },
    lump_sum_ss: {
      lump_sum_sss: [{
        total_ss_benefits_this_year: 7_000,
        lump_sum_amount: 1_000,
      }],
    },
    f1040: filed(7_000),
  };
  assertSocialSecurityBenefitSource(pending);
  assertEquals(pending.f1040.line6a_ss_gross, 7_000);
});

Deno.test("lump-sum worksheet cannot supply or inflate line 6a without issued box 5", async () => {
  const worksheet = {
    lump_sum_sss: [{
      total_ss_benefits_this_year: 5_000,
      lump_sum_amount: 2_000,
    }],
  };
  const message =
    "Social Security lump-sum worksheet total must match retained SSA-1099/RRB-1099 box 5 sources";
  const unsupported = {
    lump_sum_ss: worksheet,
    f1040: filed(5_000),
  };
  assertThrows(
    () => assertSocialSecurityBenefitSource(unsupported),
    Error,
    message,
  );
  assertThrows(
    () => buildMefXml(unsupported as Parameters<typeof buildMefXml>[0], filer),
    Error,
    message,
  );
  await assertRejects(() => buildPdfBytes(unsupported, filer), Error, message);

  const changed = {
    ssa1099: {
      ssas: [{
        box3_gross_benefits: 5_000,
        recipient_tin: filer.primarySSN,
        source_document_reference: "SSA-issued-2025",
      }],
    },
    lump_sum_ss: {
      lump_sum_sss: [{
        ...worksheet.lump_sum_sss[0],
        total_ss_benefits_this_year: 6_000,
      }],
    },
    f1040: filed(11_000),
  };
  assertThrows(
    () => assertSocialSecurityBenefitSource(changed),
    Error,
    message,
  );
  assertThrows(
    () => buildMefXml(changed as Parameters<typeof buildMefXml>[0], filer),
    Error,
    message,
  );
  await assertRejects(() => buildPdfBytes(changed, filer), Error, message);
});

Deno.test("two lump-sum worksheets each reconcile the annual issued box 5 total", async () => {
  const issued = {
    ssas: [{
      box3_gross_benefits: 5_000,
      recipient_tin: filer.primarySSN,
      source_document_reference: "SSA-issued-2025",
    }],
  };
  const worksheets = {
    lump_sum_sss: [
      { total_ss_benefits_this_year: 5_000, lump_sum_amount: 1_000 },
      { total_ss_benefits_this_year: 5_000, lump_sum_amount: 2_000 },
    ],
  };
  const pending = {
    ssa1099: issued,
    lump_sum_ss: worksheets,
    f1040: filed(5_000),
  };
  assertSocialSecurityBenefitSource(pending);
  buildMefXml(pending as Parameters<typeof buildMefXml>[0], filer);
  await buildPdfBytes(pending, filer);

  const changed = {
    ...pending,
    lump_sum_ss: {
      lump_sum_sss: [
        worksheets.lump_sum_sss[0],
        { ...worksheets.lump_sum_sss[1], total_ss_benefits_this_year: 6_000 },
      ],
    },
  };
  const message =
    "Social Security lump-sum worksheet total must match retained SSA-1099/RRB-1099 box 5 sources";
  assertThrows(
    () => buildMefXml(changed as Parameters<typeof buildMefXml>[0], filer),
    Error,
    message,
  );
  await assertRejects(() => buildPdfBytes(changed, filer), Error, message);
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
    lump_sum_ss: [{
      total_ss_benefits_this_year: 4_000,
      lump_sum_amount: 1_000,
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line6a_ss_gross, 4_000);
  assertEquals(result.pending.f1040?.line6b_ss_taxable, 2_000);
  assertEquals(result.pending.f1040?.line25b_withheld_1099, 100);
  assertSocialSecurityBenefitSource(result.pending);
});
