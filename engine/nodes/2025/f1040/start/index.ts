import { z } from "zod";
import type { NodeResult } from "../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import { inputSchema as divInputSchema } from "../inputs/DIV/index.ts";
import { inputSchema as intInputSchema } from "../inputs/INT/index.ts";
import { inputSchema as necInputSchema } from "../inputs/NEC/index.ts";
import { inputSchema as g99InputSchema } from "../inputs/99G/index.ts";
import { inputSchema as m99InputSchema } from "../inputs/99M/index.ts";
import { inputSchema as c99InputSchema } from "../inputs/99C/index.ts";
import { inputSchema as k99InputSchema } from "../inputs/99K/index.ts";
import { inputSchema as b99InputSchema } from "../inputs/99B/index.ts";
import { inputSchema as r1099InputSchema } from "../inputs/1099/index.ts";
import { inputSchema as f1098InputSchema } from "../inputs/1098/index.ts";
import { inputSchema as f2441InputSchema } from "../inputs/2441/index.ts";
import { inputSchema as f8812InputSchema } from "../inputs/8812/index.ts";
import { inputSchema as f8863InputSchema } from "../inputs/8863/index.ts";
import { inputSchema as f8949InputSchema } from "../inputs/8949/index.ts";
import { inputSchema as scheduleAInputSchema } from "../inputs/A/index.ts";
import { inputSchema as scheduleCInputSchema } from "../inputs/C/index.ts";
import { inputSchema as scheduleDInputSchema } from "../inputs/D/index.ts";
import { inputSchema as scheduleEInputSchema } from "../inputs/E/index.ts";
import { inputSchema as extInputSchema } from "../inputs/EXT/index.ts";
import { inputSchema as w2InputSchema } from "../inputs/W2/index.ts";

const inputSchema = z.object({
  // Original inputs
  w2s: z.array(w2InputSchema).optional(),
  int1099s: z.array(intInputSchema).optional(),
  div1099s: z.array(divInputSchema).optional(),
  // New inputs
  necs: z.array(necInputSchema).optional(),
  g99s: z.array(g99InputSchema).optional(),
  m99s: z.array(m99InputSchema).optional(),
  c99s: z.array(c99InputSchema).optional(),
  k99s: z.array(k99InputSchema).optional(),
  b99s: z.array(b99InputSchema).optional(),
  r1099s: z.array(r1099InputSchema).optional(),
  f1098s: z.array(f1098InputSchema).optional(),
  f2441s: z.array(f2441InputSchema).optional(),
  f8812s: z.array(f8812InputSchema).optional(),
  f8863s: z.array(f8863InputSchema).optional(),
  f8949s: z.array(f8949InputSchema).optional(),
  schedule_a: scheduleAInputSchema.optional(),
  schedule_cs: z.array(scheduleCInputSchema).optional(),
  d_screen: scheduleDInputSchema.optional(),
  schedule_es: z.array(scheduleEInputSchema).optional(),
  ext: extInputSchema.optional(),
});

type StartInput = z.infer<typeof inputSchema>;

function emitArray(
  outputs: Array<{ nodeType: string; input: Record<string, unknown> }>,
  items: Array<Record<string, unknown>> | undefined,
  nodeType: string,
): void {
  if (!items || items.length === 0) return;
  if (items.length === 1) {
    outputs.push({ nodeType, input: items[0] });
  } else {
    for (let i = 0; i < items.length; i++) {
      const suffix = String(i + 1).padStart(2, "0");
      outputs.push({ nodeType: `${nodeType}_${suffix}`, input: items[i] });
    }
  }
}

class StartNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "start";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = [
    "w2",
    "int",
    "div",
    "nec",
    "g99",
    "m99",
    "c99",
    "k99",
    "b99",
    "r1099",
    "f1098",
    "f2441",
    "f8812",
    "f8863",
    "f8949",
    "schedule_a",
    "schedule_c",
    "d_screen",
    "schedule_e",
    "ext",
  ] as const;

  compute(input: StartInput): NodeResult {
    const outputs: Array<{ nodeType: string; input: Record<string, unknown> }> =
      [];

    emitArray(outputs, input.w2s as Array<Record<string, unknown>> | undefined, "w2");
    emitArray(outputs, input.int1099s as Array<Record<string, unknown>> | undefined, "int");
    emitArray(outputs, input.div1099s as Array<Record<string, unknown>> | undefined, "div");
    emitArray(outputs, input.necs as Array<Record<string, unknown>> | undefined, "nec");
    emitArray(outputs, input.g99s as Array<Record<string, unknown>> | undefined, "g99");
    emitArray(outputs, input.m99s as Array<Record<string, unknown>> | undefined, "m99");
    emitArray(outputs, input.c99s as Array<Record<string, unknown>> | undefined, "c99");
    emitArray(outputs, input.k99s as Array<Record<string, unknown>> | undefined, "k99");
    emitArray(outputs, input.b99s as Array<Record<string, unknown>> | undefined, "b99");
    emitArray(outputs, input.r1099s as Array<Record<string, unknown>> | undefined, "r1099");
    emitArray(outputs, input.f1098s as Array<Record<string, unknown>> | undefined, "f1098");
    emitArray(outputs, input.f2441s as Array<Record<string, unknown>> | undefined, "f2441");
    emitArray(outputs, input.f8812s as Array<Record<string, unknown>> | undefined, "f8812");
    emitArray(outputs, input.f8863s as Array<Record<string, unknown>> | undefined, "f8863");
    emitArray(outputs, input.f8949s as Array<Record<string, unknown>> | undefined, "f8949");
    emitArray(outputs, input.schedule_cs as Array<Record<string, unknown>> | undefined, "schedule_c");
    emitArray(outputs, input.schedule_es as Array<Record<string, unknown>> | undefined, "schedule_e");

    // Singletons (one per return)
    if (input.schedule_a) {
      outputs.push({ nodeType: "schedule_a", input: input.schedule_a as Record<string, unknown> });
    }
    if (input.d_screen) {
      outputs.push({ nodeType: "d_screen", input: input.d_screen as Record<string, unknown> });
    }
    if (input.ext) {
      outputs.push({ nodeType: "ext", input: input.ext as Record<string, unknown> });
    }

    return { outputs };
  }
}

export const start = new StartNode();
