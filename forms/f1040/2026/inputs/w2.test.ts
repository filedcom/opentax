import { assertEquals, assertThrows } from "@std/assert";
import { w2_2026, w2Item2026Schema } from "./w2.ts";
import { Box12Code, w2 } from "../../nodes/inputs/income/wages/w2/index.ts";
import { FilingStatus } from "../../nodes/types.ts";
const context = { taxYear: 2026, formType: "f1040" };
const identity = {
  filing_status: FilingStatus.Single,
  taxpayer_ssn: "111223333",
};
const source = {
  tax_year: 2026 as const,
  employer_ein: "12-3456789",
  employer_name: "Example Employer",
  employee_ssn: "111-22-3333",
  source_document_reference: "issued-w2-1",
  box1_wages: 150_000.25,
  box2_fed_withheld: 30_000.25,
  box3_ss_wages: 150_000,
  box4_ss_withheld: 9_300,
  box5_medicare_wages: 150_000,
  box6_medicare_withheld: 2_175,
};
function fields(
  outputs: ReturnType<typeof w2_2026.compute>["outputs"],
  node: string,
) {
  return outputs.filter((row) => row.nodeType === node).map((row) =>
    row.fields
  );
}
Deno.test("2026 W-2 reuses ordinary source routes and keeps issued facts", () => {
  const outputs =
    w2_2026.compute(context, { ...identity, w2s: [source] }).outputs;
  assertEquals(fields(outputs, "f1040"), [{
    line25a_w2_withheld: 30_000.25,
    line1a_wages: 150_000.25,
  }]);
  assertEquals(fields(outputs, "agi_aggregator"), [{
    line1a_wages: 150_000.25,
  }]);
  assertEquals(
    (fields(outputs, "form8959")[0].w2_medicare_sources_2026 as Record<
      string,
      unknown
    >[])[0].box5_medicare_wages,
    150_000,
  );
  assertEquals(fields(outputs, "w2")[0].issued_w2_sources, [source]);
});
Deno.test("2026 W-2 accepts its annual SS cap while 2025 retains its cap", () => {
  const item = {
    ...source,
    box1_wages: 184_500,
    box3_ss_wages: 184_500,
    box4_ss_withheld: 11_439,
    box5_medicare_wages: 184_500,
  };
  w2_2026.compute(context, { ...identity, w2s: [item] });
  assertThrows(
    () => w2.compute({ ...context, taxYear: 2025 }, { w2s: [item] }),
    Error,
    "wage base",
  );
});
Deno.test("2026 W-2 new TP/TT/TA codes retain evidence without adding wages twice", () => {
  const item = {
    ...source,
    box7_ss_tips: 20_000,
    box12_entries: [{ code: "TP" as const, amount: 25_000 }, {
      code: "TT" as const,
      amount: 4_000,
    }, { code: "TA" as const, amount: 2_500 }],
    box14b_tipped_codes: ["101", "000"],
  };
  const outputs =
    w2_2026.compute(context, { ...identity, w2s: [item] }).outputs;
  assertEquals(fields(outputs, "f1040")[0].line1a_wages, 150_000.25);
  const sources = fields(outputs, "schedule1a")[0].w2_2026_sources as Record<
    string,
    unknown
  >[];
  assertEquals(sources[0].cash_tips, 25_000);
  assertEquals(sources[0].qualified_overtime, 4_000);
  assertEquals(sources[0].occupation_codes, ["101", "000"]);
  assertEquals(fields(outputs, "schedule1a").length, 1);
  assertThrows(
    () => w2Item2026Schema.parse({ ...item, box14b_tipped_codes: undefined }),
    Error,
    "occupation codes",
  );
  assertThrows(
    () =>
      w2Item2026Schema.parse({ ...item, box14b_tipped_codes: ["101", "101"] }),
    Error,
    "Repeated occupation",
  );
  assertThrows(
    () => w2Item2026Schema.parse({ ...source, flsa_overtime_review: {} }),
    Error,
    "Unrecognized key",
  );
});
Deno.test("2026 W-2 maps uncollected FICA and golden parachute tax to revised Schedule 2", () => {
  const outputs = w2_2026.compute(context, {
    ...identity,
    w2s: [{
      ...source,
      box12_entries: [
        { code: Box12Code.A, amount: 10 },
        { code: Box12Code.B, amount: 20 },
        { code: Box12Code.M, amount: 30 },
        { code: Box12Code.K, amount: 40 },
      ],
    }],
  }).outputs;
  assertEquals(fields(outputs, "schedule2"), [{
    line17c_w2_uncollected_fica: 60,
    line13k_golden_parachute_tax: 40,
  }]);
});
Deno.test("2026 W-2 excess SS uses each owner's wage and tip base", () => {
  const first = {
    ...source,
    box1_wages: 100_000,
    box3_ss_wages: 50_000,
    box7_ss_tips: 50_000,
    box4_ss_withheld: 6_200,
  };
  const second = {
    ...first,
    employer_ein: "98-7654321",
    source_document_reference: "issued-w2-2",
  };
  const outputs =
    w2_2026.compute(context, { ...identity, w2s: [first, second] }).outputs;
  assertEquals(fields(outputs, "schedule3"), [{ line11_excess_ss: 961 }]);
  const joint = w2_2026.compute(context, {
    ...identity,
    filing_status: FilingStatus.MFJ,
    spouse_ssn: "444556666",
    w2s: [first, { ...second, employee_ssn: "444556666" }],
  }).outputs;
  assertEquals(fields(joint, "schedule3"), []);
  assertThrows(
    () =>
      w2_2026.compute(context, {
        ...identity,
        w2s: [first, { ...second, employer_ein: first.employer_ein }],
      }),
    Error,
    "same-employer",
  );
});
Deno.test("2026 W-2 preserves benefit and statutory-employee source routing", () => {
  const outputs = w2_2026.compute(context, {
    ...identity,
    w2s: [{
      ...source,
      box10_dep_care: 3_000,
      box12_entries: [{ code: Box12Code.W, amount: 1_000 }, {
        code: Box12Code.R,
        amount: 2_000,
      }],
      box14a_entries: [{
        description: "SDI",
        amount: 100,
        is_state_sdi_pfml: true,
      }],
      box17_state_withheld: 300,
    }],
  }).outputs;
  assertEquals(fields(outputs, "form2441"), [{ dep_care_benefits: 3_000 }]);
  assertEquals(fields(outputs, "form8889").length, 1);
  assertEquals(fields(outputs, "form8853").length, 1);
  assertEquals(fields(outputs, "schedule_a"), [{
    w2_tax_sources: [{
      source_document_reference: source.source_document_reference,
      employee_ssn: source.employee_ssn,
      employer_ein: source.employer_ein,
      box17_state_withheld: 300,
      box19_local_withheld: 0,
      mandatory_state_contributions: [{ description: "SDI", amount: 100 }],
    }],
  }]);
  const statutory = w2_2026.compute(context, {
    ...identity,
    w2s: [{
      ...source,
      box13_statutory_employee: true,
      schedule_c_business_reference: "business-1",
    }],
  }).outputs;
  assertEquals(fields(statutory, "f1040")[0].line1a_wages, undefined);
  assertEquals(fields(statutory, "schedule_c").length, 1);
});
Deno.test("2026 W-2 rejects wrong owner, duplicate sources and unresolved year-specific tax branches", () => {
  assertThrows(
    () =>
      w2_2026.compute(context, {
        ...identity,
        w2s: [{ ...source, employee_ssn: "999887777" }],
      }),
    Error,
    "does not belong",
  );
  assertThrows(
    () => w2_2026.compute(context, { ...identity, w2s: [source, source] }),
    Error,
  );
  for (const code of [Box12Code.Z, "II" as const]) {
    assertThrows(
      () =>
        w2_2026.compute(context, {
          ...identity,
          w2s: [{ ...source, box12_entries: [{ code, amount: 100 }] }],
        }),
      Error,
      "review before calculation",
    );
  }
  assertThrows(
    () =>
      w2_2026.compute(context, {
        ...identity,
        w2s: [{
          ...source,
          box12_entries: [{ code: Box12Code.D, amount: 24_501 }],
        }],
      }),
    Error,
    "2026 catch-up/Roth",
  );
  assertThrows(
    () => w2Item2026Schema.parse({ ...source, box3_ss_wages: Infinity }),
    Error,
    "finite",
  );
  assertThrows(
    () =>
      w2_2026.compute({ ...context, taxYear: 2025 }, {
        ...identity,
        w2s: [source],
      }),
    Error,
    "f1040:2026",
  );
});

Deno.test("2026 repeated W-2 public inputs use the shared start router", async () => {
  const { inputNodes } = await import("../inputs.ts");
  const { buildStartNode } = await import("../../start.ts");
  const start = buildStartNode(inputNodes);
  const result = start.compute(context, { w2s: [source] });
  assertEquals(result.outputs, [{ nodeType: "w2", fields: { w2s: [source] } }]);
});

Deno.test("2026 W-2 Medicare sources retain actual boxes and exclude RRTA B/N amounts", () => {
  const fica = {
    ...source,
    box1_wages: 130_000,
    box12_entries: [{ code: Box12Code.B, amount: 50 }, {
      code: Box12Code.N,
      amount: 25,
    }],
  };
  const ficaRows = fields(
    w2_2026.compute(context, { ...identity, w2s: [fica] }).outputs,
    "form8959",
  )[0].w2_medicare_sources_2026 as Record<string, unknown>[];
  assertEquals(ficaRows[0].box5_medicare_wages, 150_000);
  assertEquals(ficaRows[0].box6_medicare_withheld, 2175);
  assertEquals(ficaRows[0].uncollected_fica_medicare, 75);
  const railroad = {
    ...fica,
    box3_ss_wages: 0,
    box4_ss_withheld: 0,
    box5_medicare_wages: 0,
    box6_medicare_withheld: 0,
    box14a_entries: [{
      description: "RRTA compensation",
      amount: 250_000,
      is_state_sdi_pfml: false,
    }, {
      description: "Additional Medicare Tax",
      amount: 450,
      is_state_sdi_pfml: false,
    }],
  };
  const rows = fields(
    w2_2026.compute(context, { ...identity, w2s: [railroad] }).outputs,
    "form8959",
  )[0].w2_medicare_sources_2026 as Record<string, unknown>[];
  assertEquals([
    rows[0].rrta_compensation,
    rows[0].rrta_additional_withheld,
    rows[0].uncollected_fica_medicare,
  ], [250_000, 450, 0]);
  assertThrows(
    () =>
      w2_2026.compute(context, {
        ...identity,
        w2s: [{ ...railroad, box5_medicare_wages: 150_000 }],
      }),
    Error,
    "cannot share FICA",
  );
});
