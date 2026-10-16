import * as fs from "node:fs/promises";
import {
  aggregationPhaseInCases,
  aggregationPhaseInFixture,
} from "./form8995a_aggregation_phasein_fixture.ts";
import {
  aggregationStatusCases,
  aggregationStatusFixture,
} from "./form8995a_aggregation_status_fixture.ts";
import {
  jointRpeCases,
  jointRpeFixture,
} from "./form8995a_joint_rpe_fixture.ts";
import { groupDividendFixture } from "./form8995a_group_dividend_fixture.ts";
import { groupLossCases } from "./form8995a_group_loss_fixture.ts";

export const aggregationInvestmentCases = [
  "single-direct-three",
  "joint-spouse-direct-four",
  "hoh-direct-four",
  "mfs-direct-three",
  "qss-direct-three",
  "joint-primary-rpe-phase",
  "joint-spouse-rpe-full",
  "single-rpe-income-cap",
] as const;
export async function aggregationInvestmentFixture(
  name: typeof aggregationInvestmentCases[number],
) {
  let input;
  if (name === "single-direct-three" || name === "joint-spouse-direct-four") {
    input = aggregationPhaseInFixture(
      aggregationPhaseInCases.find((c) =>
        name === "single-direct-three"
          ? c.name === "single-three"
          : c.joint && c.owner === "S" && c.count === 4
      )!,
    ).input;
  } else if (name.includes("-direct-")) {
    input = await aggregationStatusFixture(
      aggregationStatusCases.find((c) =>
        c.kind === "direct" && c.status === name.split("-")[0] &&
        c.count === (c.status === "hoh" ? 4 : 3)
      )!,
    );
  } else if (name === "single-rpe-income-cap") {
    input = JSON.parse(
      await fs.readFile(
        new URL("./form8995a-rpe-3-business-source.json", import.meta.url), "utf8",
      ),
    );
    delete input.w2;
  } else {
    input = await jointRpeFixture(
      jointRpeCases.find((c) =>
        c.name ===
          (name === "joint-primary-rpe-phase"
            ? "primary-four-phase"
            : "spouse-four-full")
      )!,
    );
  }
  const investments = groupDividendFixture(groupLossCases[0]).input;
  for (const key of ["f1099int", "f1099div"] as const) {
    input[key] = structuredClone(investments[key]);
    for (const item of input[key]) {
      item.recipient_tin = input.general.taxpayer_ssn.replaceAll("-", "");
      item.source_document_reference =
        `Synthetic ${name} ${item.source_document_reference}`;
    }
  }
  input.schedule_b_part_iii = structuredClone(investments.schedule_b_part_iii);
  return input;
}
