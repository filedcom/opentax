import { f1040 } from "../../../../../outputs/general/return-assembly/f1040/index.ts";
import { inputSchema } from "./index.ts";
import { parsePublicForm8839Source } from "./public_source.ts";
import { finalizeStagedForm8839Sink } from "./staged_sink_finalizer.ts";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${
      Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
        .join(",")
    }}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

/** Recompute the direct source against the executor's retained pre-credit sink. */
export function reconcilePublicForm8839Pending(
  pending: Readonly<Record<string, unknown>>,
) {
  const route = pending.form8839_route as
    | {
      public_source?: unknown;
      pre_adoption_sink_input?: unknown;
      pre_adoption_schedule3?: unknown;
    }
    | undefined;
  if (!route) throw new Error("Form 8839 needs its reviewed executor route");
  const { source, publicSource } = parsePublicForm8839Source(
    route.public_source,
  );
  const filedSource = inputSchema.parse(pending.form8839);
  if (canonical(source) !== canonical(filedSource)) {
    throw new Error("Form 8839 filed source differs from reviewed source");
  }
  const preSink = f1040.inputSchema.parse(route.pre_adoption_sink_input);
  const settled = finalizeStagedForm8839Sink(
    source,
    publicSource.reviewed_source,
    preSink,
    publicSource.magi_review,
  );
  const final1040 = pending.f1040 as Record<string, unknown> | undefined;
  const finalSchedule3 = pending.schedule3 as
    | Record<string, unknown>
    | undefined;
  const preSchedule3 = route.pre_adoption_schedule3;
  const settled1040 = {
    ...(route.pre_adoption_sink_input as Record<string, unknown>),
    ...settled.final1040,
  };
  const counterfactual = final1040?.form8621_1294_counterfactual_total_tax;
  const expected1040 = pending.form8621_1294_refigure !== undefined &&
      typeof counterfactual === "number"
    ? {
      ...settled1040,
      ...f1040.compute(
        { taxYear: 2025, formType: "f1040" },
        f1040.inputSchema.parse({
          ...settled1040,
          form8621_1294_counterfactual_total_tax: counterfactual,
        }),
      ).outputs.find((output) => output.nodeType === "f1040")?.fields,
      form8621_1294_counterfactual_total_tax: counterfactual,
    }
    : settled1040;
  if (
    !final1040 || !finalSchedule3 || !preSchedule3 ||
    typeof preSchedule3 !== "object" || Array.isArray(preSchedule3) ||
    canonical(final1040) !== canonical(expected1040) ||
    canonical(finalSchedule3) !== canonical({
        ...preSchedule3,
        ...settled.finalSchedule3,
      })
  ) {
    throw new Error(
      "Form 8839 reviewed source, Schedule 3, and Form 1040 do not reconcile",
    );
  }
  return { source, publicSource, preSink, settled };
}
