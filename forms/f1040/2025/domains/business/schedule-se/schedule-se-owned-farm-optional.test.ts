import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../index.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import {
  optionalFarmCases,
  optionalFarmInputs,
} from "../../../pdf/reviews/composed/review-schedule-se-farm-optional.fixture.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { assertOwnedScheduleSE } from "./schedule-se-owner-source.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
const single = pdfReviewFixtures.find((f) => f.id === "single-schedule-c")!;
const joint = pdfReviewFixtures.find((f) =>
  f.id === "joint-form8995a-patron-farm"
)!;
Deno.test("optional farm sources retain actual profits and owner gross-income QBI allocation in full XSD/PDF", async () => {
  const root = ".state/research/2026-10-06-owned-farm-optional";
  await Deno.mkdir(root, { recursive: true });
  for (const row of optionalFarmCases) {
    const inputs = optionalFarmInputs(single, joint, row);
    const r = f1040_2025.executeReturn(inputs);
    assertEquals(r.diagnostics, [], row.id);
    const p = normalizeAllPending(r.pending);
    const owned = assertOwnedScheduleSE(p, joint.filer)!;
    assertEquals(owned.tax, row.tax, row.id);
    assertEquals(owned.deduction, row.half, row.id);
    assertEquals(p.f1040.line11_agi, row.agi, row.id);
    assertEquals(p.f1040.line13_qbi_deduction, row.qbi, row.id);
    const shares: Record<string, number[]> = {
      "optional-spouse-cap-profit": [29, 4239],
      "optional-spouse-cap-loss": [9, 4239],
      "optional-same-owner": [168, 56],
      "optional-nonfarm-loss": [111.43, 18.57],
      "optional-combined-below-minimum": [0, 0],
      "optional-two-farms-loss": [159, 318, 53],
      "optional-exact-gross-boundary": [572.3, 52.7],
      "optional-net-boundary": [572.31, 52.69],
      "optional-two-farm-owners": [168, 58, 56],
    };
    assertEquals(
      (p.form8995.joint_owner_filing_rows as Record<string, unknown>[]).map(
        (b) => b.se_tax_deduction,
      ),
      shares[row.id],
      row.id,
    );
    assertEquals(
      p.form8995.line16,
      row.id === "optional-nonfarm-loss"
        ? 130
        : row.id === "optional-combined-below-minimum"
        ? 1500
        : 0,
      row.id,
    );
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

Deno.test("optional farm source and allocation conflicts reject native and direct PDF", async () => {
  const result = f1040_2025.executeReturn(
    optionalFarmInputs(single, joint, optionalFarmCases[2]),
  );
  assertEquals(result.diagnostics, []);
  const p = normalizeAllPending(result.pending);
  const mutations: ((copy: typeof p) => void)[] = [
    (copy) => {
      (copy.schedule_c.schedule_cs as any[])[0].line_1_gross_receipts += 100;
      (copy.schedule_c.schedule_cs as any[])[0].line_8_advertising += 100;
    },
    (copy) => {
      (copy.schedule_f.schedule_fs as any[])[0].line2_sales_products_raised +=
        100;
      (copy.schedule_f.schedule_fs as any[])[0].line16_feed += 100;
    },
    (copy) => {
      copy.schedule_f.farm_optional_method_elected = false;
    },
    (copy) => {
      (copy.schedule_se.owner_business_sources as any[]).find((b) =>
        b.kind === "schedule_c"
      ).gross_business_income++;
    },
    (copy) => {
      (copy.schedule_se.owner_business_sources as any[]).find((b) =>
        b.kind === "schedule_f"
      ).gross_farm_income++;
    },
    (copy) => {
      (copy.schedule_se.owner_instances as any[])[0].line15++;
    },
    (copy) => {
      (copy.form8995.joint_owner_filing_rows as any[])[0].se_tax_deduction++;
    },
    (copy) => {
      (copy.form8995.joint_owner_filing_rows as any[])[0].qbi++;
    },
    (copy) => {
      (copy.schedule_f.schedule_fs as any[])[0].proprietor_recipient = "S";
    },
    (copy) => {
      (copy.schedule_f.schedule_fs as any[])[0].farm_id = "Other-Optional-Farm";
    },
    (copy) => {
      (copy.w2.w2s as any[])[0].employee_ssn = "111223333";
    },
    (copy) => {
      copy.f1040.line11_agi = Number(copy.f1040.line11_agi) + 1;
    },
  ];
  for (const mutate of mutations) {
    const copy = structuredClone(p);
    mutate(copy);
    await assertRejects(() => f1040_2025.prepareReturn!(copy, joint.filer));
    await assertRejects(() => buildPdfBytes(copy, joint.filer));
  }
});
Deno.test("optional farm gross and net eligibility use combined source farms, not source-provided earnings", async () => {
  const inputs = optionalFarmInputs(single, joint, optionalFarmCases[7]);
  inputs.schedule_f.schedule_fs[0].line16_feed = 10861 - 7840;
  const result = f1040_2025.executeReturn(inputs);
  if (result.diagnostics.length === 0) {
    await assertRejects(() =>
      f1040_2025.prepareReturn!(result.pending, joint.filer)
    );
  } else assertStringIncludes(JSON.stringify(result.diagnostics), "optional");
});
