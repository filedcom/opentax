import { test } from "bun:test";
import { assertRejects, assertThrows } from "@std/assert";
import { buildMefXml } from "../../../../../2025/mef/builder.ts";
import { buildPdfBytes } from "../../../../../2025/pdf/builder.ts";
import { form8994DirectEmployer } from "./fixture.ts";

test("Form 8994 direct XML export requires the validated attachment bundle", () => {
  assertThrows(
    () => buildMefXml({ f8994: form8994DirectEmployer }),
    Error,
    "use buildMefBundle",
  );
});

test("Form 8994 standalone PDF export requires the prepared attachment bundle", async () => {
  await assertRejects(
    () => buildPdfBytes({ f8994: form8994DirectEmployer }, undefined),
    Error,
    "prepared MeF bundle",
  );
});
