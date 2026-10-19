import type { NodeContext } from "../../../../../../../../core/types/node-context.ts";
import type { ProvisionalScheduleCInterestPass, FinalizedScheduleCInterestPass } from "./two-stage.ts";

type Form8990ScheduleCPass =
  | { readonly phase: "provisional"; readonly source: ProvisionalScheduleCInterestPass["source"] }
  | { readonly phase: "finalized"; readonly source: FinalizedScheduleCInterestPass["source"] };

const passes = new WeakMap<NodeContext, Form8990ScheduleCPass>();

function contextFor(
  pass: Form8990ScheduleCPass,
  base: NodeContext,
): NodeContext {
  const ctx: NodeContext = Object.freeze({ ...base });
  passes.set(ctx, pass);
  return ctx;
}

/** Internal first-pass permit; never represented in public tax input JSON. */
export function provisionalScheduleCContext(
  pass: ProvisionalScheduleCInterestPass,
  base: NodeContext,
): NodeContext {
  return contextFor({ phase: "provisional", source: pass.source }, base);
}

/** Internal final-pass permit, after a calculated allowance has been applied. */
export function finalizedScheduleCContext(
  pass: FinalizedScheduleCInterestPass,
  base: NodeContext,
): NodeContext {
  return contextFor({ phase: "finalized", source: pass.source }, base);
}

export function internalForm8990ScheduleCPass(
  ctx: NodeContext,
): Form8990ScheduleCPass | undefined {
  return passes.get(ctx);
}
