import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../index.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import { buildMefXml } from "../../../mef/builder.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { inputSchema as scheduleCSchema } from "../../../../nodes/inputs/income/business/schedule_c/model.ts";
import { inputSchema as scheduleFSchema } from "../../../../nodes/intermediate/forms/income/business/schedule_f/index.ts";

const scheduleC = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-schedule-c"
)!;
const scheduleF = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-schedule-f-raised-products-qbi"
)!;
const xsdPath = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

async function assertValidXsd(xml: string): Promise<void> {
  try {
    await Deno.stat(xsdPath);
  } catch {
    throw new Error(`Missing verification prerequisite: ${xsdPath}`);
  }
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsdPath, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
}

function zeroNetReturn(farm: boolean) {
  const fixture = farm ? scheduleF : scheduleC;
  const c = farm
    ? undefined
    : scheduleCSchema.parse({ schedule_cs: fixture.inputs.schedule_c });
  const f = farm ? scheduleFSchema.parse(fixture.inputs.schedule_f) : undefined;
  const inputs = farm
    ? {
      ...fixture.inputs,
      schedule_f: {
        ...f,
        schedule_fs: [{
          ...f!.schedule_fs[0],
          line16_feed: 80_000,
          line_f_made_1099_payments: false,
        }],
      },
    }
    : {
      ...fixture.inputs,
      schedule_c: [{ ...c!.schedule_cs[0], line_8_advertising: 80_000 }],
    };
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  return { pending: result.pending, filer: fixture.filer };
}

for (const farm of [false, true]) {
  const label = farm ? "Schedule F" : "Schedule C";
  const key = farm ? "line6_schedule_f" : "line3_schedule_c";

  Deno.test(`${label} zero-net source stays at zero on Schedule 1 in native and PDF`, async () => {
    const { pending, filer } = zeroNetReturn(farm);
    assertEquals(pending.schedule1?.[key], 0);
    const xml = buildMefXml(pending, filer);
    assertStringIncludes(xml, farm ? "<IRS1040ScheduleF" : "<IRS1040ScheduleC");
    await assertValidXsd(xml);
    const pdf = await buildPdfBytes(pending, filer);
    if ((await PDFDocument.load(pdf)).getPageCount() < 3) {
      throw new Error(
        "Expected Form 1040, business schedule, and Schedule 1 pages",
      );
    }
  });

  Deno.test(`${label} rejects a changed source or detached Schedule 1 amount`, async () => {
    const { pending, filer } = zeroNetReturn(farm);
    const c = farm ? undefined : scheduleCSchema.parse(pending.schedule_c);
    const f = farm ? scheduleFSchema.parse(pending.schedule_f) : undefined;
    const changedSource = farm
      ? {
        ...pending,
        schedule_f: {
          ...f,
          schedule_fs: [{ ...f!.schedule_fs[0], line16_feed: 79_999 }],
        },
      }
      : {
        ...pending,
        schedule_c: {
          ...c,
          schedule_cs: [{ ...c!.schedule_cs[0], line_8_advertising: 79_999 }],
        },
      };
    const changedSchedule1 = {
      ...pending,
      schedule1: { ...pending.schedule1, [key]: 1 },
    };
    for (const changed of [changedSource, changedSchedule1]) {
      assertThrows(
        () => buildMefXml(changed, filer),
        Error,
        `Schedule 1 line ${farm ? "6" : "3"} differs`,
      );
      await assertRejects(
        () => buildPdfBytes(changed, filer),
        Error,
        `Schedule 1 line ${farm ? "6" : "3"} differs`,
      );
    }
  });
}
