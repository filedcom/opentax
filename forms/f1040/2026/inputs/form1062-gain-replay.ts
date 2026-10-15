import { form4797 } from "../../nodes/intermediate/forms/income/business/form4797/index.ts";
import { schedule_d } from "../../nodes/intermediate/aggregation/income/investments/schedule_d/index.ts";
import type { NodeResult } from "../../../../core/types/tax-node.ts";
import {
  calculateCapitalGains2026,
  type CapitalGainInput2026,
} from "../nodes/capital-gains.ts";
import {
  type Form1062Election2026,
  resolveForm1062Sources2026,
} from "./form1062-source.ts";

const value = (result: NodeResult, node: string, field: string) =>
  result.outputs.reduce(
    (sum, output) =>
      sum +
      (output.nodeType === node && typeof output.fields[field] === "number"
        ? Number(output.fields[field])
        : 0),
    0,
  );

/** Hypothetical tax character only; never changes the filed history or carryovers. */
export function refigureForm1062Gain2026(
  raw: CapitalGainInput2026,
  election: Form1062Election2026,
) {
  const actual = calculateCapitalGains2026(raw);
  if (!actual.land) {
    throw new Error(
      "Form 1062 needs the actual linked land and capital sources",
    );
  }
  const qualification = resolveForm1062Sources2026(
    actual.land.source_input.source,
    election,
  );
  const elected = new Set(
    qualification.schedules.map((s) => s.sale.source.sale_reference),
  );
  const retained = actual.land.calculation.rows.filter((r) =>
    !elected.has(r.source.sale_reference)
  );
  const section1231 = retained.filter((r) => r.part === "I").reduce(
    (n, r) => n + r.printed.gain,
    0,
  );
  const shortOrdinary = retained.filter((r) => r.part === "II").reduce(
    (n, r) => n + r.printed.gain,
    0,
  );
  const land = form4797.compute({ taxYear: 2026, formType: "f1040" }, {
    section_1231_gain: section1231,
    nonrecaptured_1231_loss:
      actual.land.calculation.opening_history.opening_nonrecaptured_loss,
    ordinary_gain: shortOrdinary,
  });
  const capitalGain = value(land, "schedule_d", "line_11_form2439");
  const ordinary = value(land, "schedule1", "line4_other_gains");
  if (capitalGain + ordinary !== section1231 + shortOrdinary) {
    throw new Error("Form 1062 hypothetical land character does not reconcile");
  }
  const sharedInput = { ...actual.shared_input, line_11_form2439: capitalGain };
  const capital = schedule_d.compute(
    { taxYear: 2026, formType: "f1040" },
    sharedInput,
  );
  return {
    qualification,
    actual,
    without_elected_gain: {
      retained_sale_references: retained.map((r) => r.source.sale_reference),
      section1231_gain_loss: section1231,
      opening_nonrecaptured_loss:
        actual.land.calculation.opening_history.opening_nonrecaptured_loss,
      land_capital_gain: capitalGain,
      land_ordinary_gain_loss: ordinary,
      shared_capital_input: sharedInput,
      preferential_gain: value(
        capital,
        "income_tax_calculation",
        "net_capital_gain",
      ),
      return_capital_gain: value(capital, "f1040", "line7_capital_gain") +
        value(capital, "f1040", "line7a_cap_gain_distrib"),
    },
  };
}
