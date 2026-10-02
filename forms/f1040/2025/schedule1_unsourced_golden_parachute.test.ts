import { assertRejects } from "@std/assert";
import { FilingStatus } from "../mef/header.ts";
import { buildMefBundle } from "./mef/builder.ts";
import { buildPdfBytes } from "./pdf/builder.ts";

const filer = {
  primarySSN: "111223333",
  firstNameWithInitial: "Alex",
  lastName: "Example",
  nameLine1: "ALEX EXAMPLE",
  nameControl: "EXAM",
  address: {
    line1: "1 Example Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  filingStatus: FilingStatus.Single,
};

Deno.test("Schedule 1 line 8z cannot state excess golden parachute income without a source", async () => {
  const pending = {
    f1040: {
      filing_status: "single" as const,
      digital_assets: false,
      line8_additional_income: 500,
    },
    schedule1: {
      line8z_golden_parachute: 500,
      line9_total_other_income: 500,
      line10_total_additional_income: 500,
    },
  };
  await assertRejects(
    () => buildMefBundle(pending, { filer, attachments: [] }),
    Error,
    "Schedule 1 excess golden parachute income needs a retained source",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "Schedule 1 excess golden parachute income needs a retained source",
  );
});
