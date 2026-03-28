import { z } from "zod";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import { f1098, itemSchema as f1098ItemSchema } from "../inputs/1098/index.ts";
import { itemSchema as r1099ItemSchema, r1099 } from "../inputs/1099/index.ts";
import { f2441, itemSchema as f2441ItemSchema } from "../inputs/2441/index.ts";
import { f8812, itemSchema as f8812ItemSchema } from "../inputs/8812/index.ts";
import { f8863, itemSchema as f8863ItemSchema } from "../inputs/8863/index.ts";
import { f8949, itemSchema as f8949ItemSchema } from "../inputs/8949/index.ts";
import { b99, itemSchema as b99ItemSchema } from "../inputs/99B/index.ts";
import { c99, itemSchema as c99ItemSchema } from "../inputs/99C/index.ts";
import { g99, itemSchema as g99ItemSchema } from "../inputs/99G/index.ts";
import { itemSchema as k99ItemSchema, k99 } from "../inputs/99K/index.ts";
import { itemSchema as m99ItemSchema, m99 } from "../inputs/99M/index.ts";
import {
  inputSchema as scheduleAInputSchema,
  scheduleA,
} from "../inputs/A/index.ts";
import {
  itemSchema as scheduleCItemSchema,
  scheduleC,
} from "../inputs/C/index.ts";
import {
  inputSchema as scheduleDInputSchema,
  scheduleD,
} from "../inputs/D/index.ts";
import { div, itemSchema as divItemSchema } from "../inputs/DIV/index.ts";
import {
  itemSchema as scheduleEItemSchema,
  scheduleE,
} from "../inputs/E/index.ts";
import { ext, inputSchema as extInputSchema } from "../inputs/EXT/index.ts";
import { int, itemSchema as intItemSchema } from "../inputs/INT/index.ts";
import { itemSchema as necItemSchema, nec } from "../inputs/NEC/index.ts";
import { w2, w2ItemSchema } from "../inputs/W2/index.ts";

const inputSchema = z.object({
  // W-2s: dispatched as full array to w2 node (which aggregates internally)
  w2s: z.array(w2ItemSchema).optional(),
  // All other array input nodes: each node receives full array and processes internally
  int1099s: z.array(intItemSchema).optional(),
  div1099s: z.array(divItemSchema).optional(),
  necs: z.array(necItemSchema).optional(),
  g99s: z.array(g99ItemSchema).optional(),
  m99s: z.array(m99ItemSchema).optional(),
  c99s: z.array(c99ItemSchema).optional(),
  k99s: z.array(k99ItemSchema).optional(),
  b99s: z.array(b99ItemSchema).optional(),
  r1099s: z.array(r1099ItemSchema).optional(),
  f1098s: z.array(f1098ItemSchema).optional(),
  f2441s: z.array(f2441ItemSchema).optional(),
  f8812s: z.array(f8812ItemSchema).optional(),
  f8863s: z.array(f8863ItemSchema).optional(),
  f8949s: z.array(f8949ItemSchema).optional(),
  schedule_a: scheduleAInputSchema.optional(),
  schedule_cs: z.array(scheduleCItemSchema).optional(),
  d_screen: scheduleDInputSchema.optional(),
  schedule_es: z.array(scheduleEItemSchema).optional(),
  ext: extInputSchema.optional(),
});

type StartInput = z.infer<typeof inputSchema>;

class StartNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "start";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    w2,
    int,
    div,
    nec,
    g99,
    m99,
    c99,
    k99,
    b99,
    r1099,
    f1098,
    f2441,
    f8812,
    f8863,
    f8949,
    scheduleA,
    scheduleC,
    scheduleD,
    scheduleE,
    ext,
  ]);

  compute(input: StartInput): NodeResult {
    const outputs: NodeOutput[] = [
      ...(input.w2s?.length ? [{ nodeType: w2.nodeType, input: { w2s: input.w2s } }] : []),
      ...(input.int1099s?.length ? [{ nodeType: int.nodeType, input: { int1099s: input.int1099s } }] : []),
      ...(input.div1099s?.length ? [{ nodeType: div.nodeType, input: { div1099s: input.div1099s } }] : []),
      ...(input.necs?.length ? [{ nodeType: nec.nodeType, input: { necs: input.necs } }] : []),
      ...(input.g99s?.length ? [{ nodeType: g99.nodeType, input: { g99s: input.g99s } }] : []),
      ...(input.m99s?.length ? [{ nodeType: m99.nodeType, input: { m99s: input.m99s } }] : []),
      ...(input.c99s?.length ? [{ nodeType: c99.nodeType, input: { c99s: input.c99s } }] : []),
      ...(input.k99s?.length ? [{ nodeType: k99.nodeType, input: { k99s: input.k99s } }] : []),
      ...(input.b99s?.length ? [{ nodeType: b99.nodeType, input: { b99s: input.b99s } }] : []),
      ...(input.r1099s?.length ? [{ nodeType: r1099.nodeType, input: { r1099s: input.r1099s } }] : []),
      ...(input.f1098s?.length ? [{ nodeType: f1098.nodeType, input: { f1098s: input.f1098s } }] : []),
      ...(input.f2441s?.length ? [{ nodeType: f2441.nodeType, input: { f2441s: input.f2441s } }] : []),
      ...(input.f8812s?.length ? [{ nodeType: f8812.nodeType, input: { f8812s: input.f8812s } }] : []),
      ...(input.f8863s?.length ? [{ nodeType: f8863.nodeType, input: { f8863s: input.f8863s } }] : []),
      ...(input.f8949s?.length ? [{ nodeType: f8949.nodeType, input: { f8949s: input.f8949s } }] : []),
      ...(input.schedule_cs?.length ? [{ nodeType: scheduleC.nodeType, input: { schedule_cs: input.schedule_cs } }] : []),
      ...(input.schedule_es?.length ? [{ nodeType: scheduleE.nodeType, input: { schedule_es: input.schedule_es } }] : []),
      ...(input.schedule_a ? [{ nodeType: scheduleA.nodeType, input: input.schedule_a }] : []),
      ...(input.d_screen ? [{ nodeType: scheduleD.nodeType, input: input.d_screen }] : []),
      ...(input.ext ? [{ nodeType: ext.nodeType, input: input.ext }] : []),
    ];
    return { outputs };
  }
}

export const start = new StartNode();
