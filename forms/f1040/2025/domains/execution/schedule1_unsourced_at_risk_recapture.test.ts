import { assertRejects } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { buildMefBundle } from "../../mef/builder.ts";
import { buildPdfBytes } from "../../pdf/builder.ts";

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

Deno.test("Schedule 1 line 8z rejects at-risk recapture without activity-level proof", async () => {
  const pending = {
    f1040: {
      filing_status: "single" as const,
      digital_assets: false,
      line8_additional_income: 300,
    },
    schedule1: {
      at_risk_recapture: 300,
      line9_total_other_income: 300,
      line10_total_additional_income: 300,
    },
  };
  await assertRejects(
    () => buildMefBundle(pending, { filer, attachments: [] }),
    Error,
    "Schedule 1 at-risk recapture needs activity-level source facts",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "Schedule 1 at-risk recapture needs activity-level source facts",
  );
});

Deno.test("Schedule 1 line 8z rejects direct at-risk loss add-back without a Schedule C or F activity", async () => {
  const pending = {
    f1040: {
      filing_status: "single" as const,
      digital_assets: false,
      line8_additional_income: 300,
    },
    schedule1: {
      at_risk_disallowed_add_back: 300,
      line9_total_other_income: 300,
      line10_total_additional_income: 300,
    },
  };
  await assertRejects(
    () => buildMefBundle(pending, { filer, attachments: [] }),
    Error,
    "Schedule 1 at-risk loss add-back needs activity-level source facts",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "Schedule 1 at-risk loss add-back needs activity-level source facts",
  );
});
