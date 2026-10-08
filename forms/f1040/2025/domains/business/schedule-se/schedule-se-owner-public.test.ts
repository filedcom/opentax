import { ownedScheduleSeInputs } from "../../../pdf/reviews/composed/review-schedule-se-owner.fixture.ts";
import { PDFDocument } from "pdf-lib";
import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { assertOwnedScheduleSE } from "./schedule-se-owner-source.ts";
import { scheduleSE } from "../../../mef/forms/taxes/schedule_se.ts";
import { scheduleSePdf } from "../../../pdf/forms/taxes/schedule_se.ts";
const joint = pdfReviewFixtures.find((f) =>
  f.id === "joint-form8995a-patron-farm"
)!;
const single = pdfReviewFixtures.find((f) => f.id === "single-schedule-c")!;
function inputsFor(profits: number[], wageOwners: ("T" | "S")[]) {
  return ownedScheduleSeInputs(single, joint, profits, wageOwners);
}
Deno.test("public joint owners calculate separate SE and prepare distinct native/PDF copies", () => {
  const result = f1040_2025.executeReturn(inputsFor([60000, 40000], ["S"]));
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  const owned = assertOwnedScheduleSE(pending, joint.filer)!;
  assertEquals(
    owned.instances.map((
      row,
    ) => [row.recipient, row.w2_ss_wages, row.line12, row.line13]),
    [
      ["T", 0, 8478, 4239],
      ["S", 176100, 1071, 536],
    ],
  );
  assertEquals(pending.schedule2.line4_se_tax, 9549);
  assertEquals(pending.schedule1.line15_se_deduction, 4775);
  const xml = scheduleSE.build(pending.schedule_se, {
    pending,
    filer: joint.filer,
  });
  assertEquals(Array.isArray(xml), true);
  assertEquals(xml.length, 2);
  assertStringIncludes(xml[0], "<SSN>111223333</SSN>");
  assertStringIncludes(xml[1], "<SSN>444556666</SSN>");
  const projected = scheduleSePdf.projectFields!(pending.schedule_se, pending);
  const copies = scheduleSePdf.instances!(projected, joint.filer, pending);
  assertEquals(copies.map((copy) => [copy.owner_ssn, copy.line12]), [[
    "111223333",
    8478,
  ], ["444556666", 1071]]);
});
Deno.test("public joint owner loss cannot erase other spouse's SE or small separate business", () => {
  const result = f1040_2025.executeReturn(inputsFor([-100, 500], []));
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  const owned = assertOwnedScheduleSE(pending, joint.filer)!;
  assertEquals(owned.instances.length, 1);
  assertEquals(owned.instances[0].recipient, "S");
  assertEquals(owned.tax, 70);
});
Deno.test("owned SE native/PDF source replay rejects synchronized source-row and identity tampering", () => {
  const result = f1040_2025.executeReturn(inputsFor([60000, 40000], ["S"]));
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  for (
    const mutate of [
      (p: typeof pending) => {
        (p.schedule_se.owner_instances as any[])[0].line12 = 1;
      },
      (p: typeof pending) => {
        (p.schedule_se.owner_business_sources as any[])[0].net_profit += 1;
      },
      (p: typeof pending) => {
        (p.schedule_se.owner_wage_sources as any[])[0].employee_ssn =
          "111223333";
      },
      (p: typeof pending) => {
        p.general.spouse_ssn = "999887777";
      },
    ]
  ) {
    const copy = structuredClone(pending);
    mutate(copy);
    assertThrows(() =>
      scheduleSE.build(copy.schedule_se, { pending: copy, filer: joint.filer })
    );
    assertThrows(() => scheduleSePdf.projectFields!(copy.schedule_se, copy));
  }
});

Deno.test("public joint owner SE and attributable QBI file complete XSD/PDF returns", async () => {
  const root = ".state/research/2026-10-06-owned-schedule-se";
  await Deno.mkdir(root, { recursive: true });
  for (
    const scenario of [
      {
        id: "primary-with-spouse-wage-cap",
        profits: [60000],
        wages: ["S"] as ("T" | "S")[],
        spouseOnly: false,
      },
      {
        id: "spouse-with-primary-wage-cap",
        profits: [60000],
        wages: ["T"] as ("T" | "S")[],
        spouseOnly: true,
      },
      {
        id: "both-owners-spouse-wage-cap",
        profits: [60000, 40000],
        wages: ["S"] as ("T" | "S")[],
        spouseOnly: false,
      },
      {
        id: "loss-and-separate-small-business",
        profits: [-100, 500],
        wages: [] as ("T" | "S")[],
        spouseOnly: false,
      },
    ]
  ) {
    const inputs = inputsFor(scenario.profits, scenario.wages);
    if (scenario.spouseOnly) inputs.schedule_c[0].proprietor_recipient = "S";
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, [], scenario.id);
    const pending = normalizeAllPending(result.pending);
    const owned = assertOwnedScheduleSE(pending, joint.filer)!;
    const prepared = await f1040_2025.prepareReturn!(
      result.pending,
      joint.filer,
    );
    const xml = prepared.bundle.xml;
    assertEquals(
      (xml.match(/<IRS1040ScheduleSE\b/g) ?? []).length,
      owned.instances.length,
      scenario.id,
    );
    assertStringIncludes(xml, "<IRS8995");
    const schema = new URL(
      "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      import.meta.url,
    ).pathname;
    const child = new Deno.Command("xmllint", {
      args: ["--noout", "--schema", schema, "-"],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(xml));
    await writer.close();
    const checked = await child.output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    const bytes = await prepared.renderPdf();
    const pdf = await PDFDocument.load(bytes);
    assertEquals(pdf.getForm().getFields().length, 0);
    assertEquals(
      pdf.getPages().flatMap((p) => p.node.Annots()?.asArray() ?? []).length,
      0,
    );
    await Deno.writeTextFile(
      `${root}/${scenario.id}-inputs.json`,
      JSON.stringify(inputs, null, 2),
    );
    await Deno.writeTextFile(
      `${root}/${scenario.id}-pending.json`,
      JSON.stringify(result.pending, null, 2),
    );
    await Deno.writeTextFile(`${root}/${scenario.id}-return.xml`, xml);
    await Deno.writeFile(`${root}/${scenario.id}-return.pdf`, bytes);
    console.log(
      `${scenario.id}: ${pdf.getPageCount()} pages, SE ${owned.tax}, halfSE ${owned.deduction}, QBI ${
        pending.f1040.line13_qbi_deduction ?? 0
      }`,
    );
  }
});

Deno.test("joint owner QBI rejects source, attributed deduction, rows and filed total conflicts in both exports", async () => {
  const result = f1040_2025.executeReturn(inputsFor([60000, 40000], ["S"]));
  assertEquals(result.diagnostics, []);
  const settled = normalizeAllPending(result.pending);
  const mutations: ((p: typeof settled) => void)[] = [
    (p) => {
      (p.form8995.joint_owner_filing_rows as any[])[0].qbi += 1;
    },
    (p) => {
      (p.form8995.joint_se_source as any).businesses[0].net_profit += 1;
    },
    (p) => {
      p.form8995.line15 = Number(p.form8995.line15) + 1;
      p.form8995.qbi_deduction = Number(p.form8995.qbi_deduction) + 1;
      p.f1040.line13_qbi_deduction = Number(p.f1040.line13_qbi_deduction) + 1;
    },
    (p) => {
      p.schedule1.line15_se_deduction =
        Number(p.schedule1.line15_se_deduction) + 1;
      p.f1040.line10_adjustments = Number(p.f1040.line10_adjustments) + 1;
      p.f1040.line11_agi = Number(p.f1040.line11_agi) - 1;
    },
    (p) => {
      (p.schedule_c.schedule_cs as any[])[0].proprietor_recipient = "S";
    },
    (p) => {
      p.general.qbi_no_prior_loss_or_suspended_loss_confirmed = false;
    },
    (p) => {
      p.f1040.line1a_wages = Number(p.f1040.line1a_wages) + 1;
    },
    (p) => {
      p.f1040.line15_taxable_income = Number(p.f1040.line15_taxable_income) + 1;
    },
  ];
  for (const mutate of mutations) {
    const copy = structuredClone(settled);
    mutate(copy);
    await assertRejects(async () => {
      await f1040_2025.prepareReturn!(copy, joint.filer);
    });
    // The direct PDF builder uses the same complete mutated source return.
    await assertRejects(async () => {
      const { buildPdfBytes } = await import("../../../pdf/builder.ts");
      await buildPdfBytes(copy, joint.filer);
    });
  }
});

Deno.test("joint owner source cents cross filed rounding boundaries consistently", async () => {
  for (const cents of [.49, .50]) {
    const result = f1040_2025.executeReturn(
      inputsFor([60000 + cents, 40000 + cents], ["S"]),
    );
    assertEquals(result.diagnostics, []);
    const p = normalizeAllPending(result.pending);
    const prepared = await f1040_2025.prepareReturn!(
      result.pending,
      joint.filer,
    );
    assertStringIncludes(prepared.bundle.xml, "<IRS8995");
    console.log(
      JSON.stringify({
        cents,
        agi: p.f1040.line11_agi,
        profit: p.schedule1.line3_business_income,
        qbi: p.f1040.line13_qbi_deduction,
      }),
    );
  }
});
