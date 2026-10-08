import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../index.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import {
  mixedOwnerCases,
  ownedFarmInputs,
} from "../../../pdf/reviews/composed/review-schedule-se-farm-owner.fixture.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { assertOwnedScheduleSE } from "./schedule-se-owner-source.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
const single = pdfReviewFixtures.find((f) => f.id === "single-schedule-c")!;
const joint = pdfReviewFixtures.find((f) =>
  f.id === "joint-form8995a-patron-farm"
)!;
Deno.test("public mixed C/F owners retain separate wage caps, net losses and combined same-owner minimum in full XSD/PDF", async () => {
  const root = ".state/research/2026-10-06-owned-farm-se";
  await Deno.mkdir(root, { recursive: true });
  for (const row of mixedOwnerCases) {
    const inputs = ownedFarmInputs(single, joint, row);
    const r = f1040_2025.executeReturn(inputs);
    assertEquals(r.diagnostics, [], row.id);
    const p = normalizeAllPending(r.pending);
    const owned = assertOwnedScheduleSE(p, joint.filer)!;
    assertEquals(owned.tax, row.tax, row.id);
    const prepared = await f1040_2025.prepareReturn!(r.pending, joint.filer);
    const xml = prepared.bundle.xml;
    assertStringIncludes(xml, "<IRS8995");
    assertStringIncludes(xml, "<IRS1040ScheduleF");
    assertEquals(
      (xml.match(/<IRS1040ScheduleSE\b/g) ?? []).length,
      owned.instances.length,
    );
    const child = new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        "-",
      ],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const w = child.stdin.getWriter();
    await w.write(new TextEncoder().encode(xml));
    await w.close();
    const checked = await child.output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    const bytes = await prepared.renderPdf();
    const pdf = await PDFDocument.load(bytes);
    assertEquals(pdf.getForm().getFields().length, 0);
    assertEquals(
      pdf.getPages().flatMap((page) => page.node.Annots()?.asArray() ?? [])
        .length,
      0,
    );
    await Deno.writeTextFile(
      `${root}/${row.id}-inputs.json`,
      JSON.stringify(inputs, null, 2),
    );
    await Deno.writeTextFile(
      `${root}/${row.id}-pending.json`,
      JSON.stringify(r.pending, null, 2),
    );
    await Deno.writeTextFile(`${root}/${row.id}-return.xml`, xml);
    await Deno.writeFile(`${root}/${row.id}-return.pdf`, bytes);
    console.log(JSON.stringify({
      id: row.id,
      pages: pdf.getPageCount(),
      tax: owned.tax,
      half: owned.deduction,
      agi: p.f1040.line11_agi,
      qbi: p.f1040.line13_qbi_deduction,
      rows: p.form8995.joint_owner_filing_rows,
    }));
  }
});
Deno.test("mixed C/F sources reject farm owner, profit, identity, wages and attribution conflicts in both exports", async () => {
  const r = f1040_2025.executeReturn(
    ownedFarmInputs(single, joint, mixedOwnerCases[0]),
  );
  assertEquals(r.diagnostics, []);
  const settled = normalizeAllPending(r.pending);
  const mutations: ((p: typeof settled) => void)[] = [
    (p) => {
      (p.schedule_f.schedule_fs as any[])[0].proprietor_recipient = "T";
    },
    (p) => {
      (p.schedule_f.schedule_fs as any[])[0].line2_sales_products_raised++;
    },
    (p) => {
      (p.schedule_f.schedule_fs as any[])[0].farm_id = "Other-Farm";
    },
    (p) => {
      (p.schedule_f.schedule_fs as any[])[0].line_d_ein = "123456792";
    },
    (p) => {
      (p.schedule_f.schedule_fs as any[])[0]
        .qbi_no_other_adjustments_confirmed = false;
    },
    (p) => {
      (p.schedule_se.owner_instances as any[])[1].line13++;
    },
    (p) => {
      (p.form8995.joint_owner_filing_rows as any[])[1].qbi++;
    },
    (p) => {
      (p.w2.w2s as any[])[0].employee_ssn = "111223333";
    },
    (p) => {
      p.f1040.line11_agi = Number(p.f1040.line11_agi) + 1;
    },
    (p) => {
      p.f1040.line13_qbi_deduction = Number(p.f1040.line13_qbi_deduction) + 1;
    },
  ];
  for (const mutate of mutations) {
    const copy = structuredClone(settled);
    mutate(copy);
    await assertRejects(() => f1040_2025.prepareReturn!(copy, joint.filer));
    await assertRejects(() => buildPdfBytes(copy, joint.filer));
  }
});
