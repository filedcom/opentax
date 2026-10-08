import { z } from "zod";
import type { ExecuteResult } from "../../../../../../../core/runtime/executor.ts";
import type { FilerIdentity } from "../../../../../mef/header.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { preparedSourceSha256 } from "../../../../return-processing/prepared-source.ts";
import { publicSourceSchema } from "./source.ts";
import { prepareForm8886ReturnPackets } from "./return-packets.ts";

/** Replay retained public inputs rather than manufacture a successful executor
 * result from pending values. Inputs and the full result must agree before any
 * disclosure bytes are prepared. */
export async function preparePublicForm8886Return(
  pendingInput: Readonly<Record<string, unknown>>,
  filerInput: FilerIdentity | undefined,
  executeReturn: (inputs: Record<string, unknown>) => ExecuteResult,
) {
  const pending = structuredClone(pendingInput);
  const filer = filerInput ? structuredClone(filerInput) : undefined;
  const start = pending.start;
  const publicInputs =
    start !== null && typeof start === "object" && !Array.isArray(start)
      ? z.record(z.unknown()).parse(start)
      : undefined;
  if (pending.f8886 === undefined && publicInputs?.f8886 === undefined) {
    return undefined;
  }
  if (
    !filer || !publicInputs || publicInputs.f8886 === undefined ||
    pending.f8886 === undefined
  ) {
    throw new Error(
      "Form 8886 preparation needs retained public inputs, disclosure and filer",
    );
  }
  const source = publicSourceSchema.parse(publicInputs.f8886);
  if (
    JSON.stringify(source) !==
      JSON.stringify(publicSourceSchema.parse(pending.f8886))
  ) {
    throw new Error(
      "Form 8886 disclosure differs from its retained public inputs",
    );
  }
  const result = executeReturn(publicInputs);
  if (result.diagnostics.length !== 0) {
    throw new Error(
      "Form 8886 public input replay has unresolved execution diagnostics",
    );
  }
  if (
    await preparedSourceSha256(buildPending(pending), filer) !==
      await preparedSourceSha256(buildPending(result.pending), filer)
  ) {
    throw new Error(
      "Form 8886 pending return differs from its public input replay",
    );
  }
  const template = await Deno.readFile(
    new URL("./fixtures/f8886-2019.pdf", import.meta.url),
  );
  const prepared = await prepareForm8886ReturnPackets(
    source,
    result,
    filer,
    template,
  );
  return { prepared, source, result };
}
