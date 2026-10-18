import { test } from "bun:test";
import * as fs from "node:fs/promises";
import { fileURLToPath as fromFileUrl } from "node:url";
import { assertEquals, assertStringIncludes } from "@std/assert";
import * as sys from "../../../../scripts/support/sys.ts";
import { ty2026Scenario104005Input } from "./ty2026_scenario_1040_05_input.ts";

test(
  "product CLI creates, computes and exports a TY2026 return without force",
  async () => {
    const cwd = await sys.makeTempDir();
    const main = fromFileUrl(
      new URL("../../../../cli/main.ts", import.meta.url),
    );
    // The export gate checks IND-002 and IND-689-01 against the processing
    // date, so the CLI runs on the 2027 signature date, not the test's day.
    const processingDate = `${cwd}/processing-date.ts`;
    await sys.writeText(
      processingDate,
      'import { setSystemTime } from "bun:test";\n' +
        'setSystemTime(new Date("2027-02-01T17:00:00Z"));\n',
    );
    const run = (...args: string[]) =>
      new sys.Command(process.execPath, {
        args: ["--preload", processingDate, main, ...args],
        cwd,
        stdout: "piped",
        stderr: "piped",
      }).output();
    const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
    try {
      const created = await run("return", "create", "--year", "2026", "--json");
      assertEquals(created.code, 0, text(created.stderr));
      const { returnId } = JSON.parse(text(created.stdout));
      const input = ty2026Scenario104005Input();
      const general = {
        ...(input.general as Record<string, unknown>),
        taxpayer_signature_pin: "12345",
        taxpayer_signature_date: "2027-02-01",
      };
      const forms: [string, unknown][] = [
        ["general", general],
        ...(input.w2 as unknown[]).map((w2): [string, unknown] => ["w2", w2]),
        ["f8888", input.f8888],
      ];
      for (const [nodeType, data] of forms) {
        const added = await run(
          "form",
          "add",
          "--returnId",
          returnId,
          "--node_type",
          nodeType,
          JSON.stringify(data),
        );
        assertEquals(added.code, 0, text(added.stderr));
      }
      const computed = await run("return", "get", "--returnId", returnId);
      assertEquals(computed.code, 0, text(computed.stderr));
      assertStringIncludes(text(computed.stdout), '"line16_income_tax": 3883');
      assertStringIncludes(text(computed.stdout), '"line35a_refund": 6385');
      const xmlPath = `${cwd}/return.xml`;
      const mef = await run(
        "return",
        "export",
        "--returnId",
        returnId,
        "--type",
        "mef",
        "--output",
        xmlPath,
      );
      assertEquals(mef.code, 0, text(mef.stderr));
      const xml = await fs.readFile(xmlPath, "utf8");
      assertStringIncludes(xml, 'returnVersion="2026v1.0"');
      assertStringIncludes(xml, "<TaxYr>2026</TaxYr>");
      const refused = await run(
        "form",
        "add",
        "--returnId",
        returnId,
        "--node_type",
        "schedule_f",
        "{}",
      );
      assertEquals(refused.code === 0, false);
      // TY2026 lists only supported inputs; schedule_f is still refused.
      assertStringIncludes(
        text(refused.stderr),
        "Unknown node type: schedule_f",
      );
    } finally {
      await sys.remove(cwd, { recursive: true });
    }
  },
  60_000,
);
