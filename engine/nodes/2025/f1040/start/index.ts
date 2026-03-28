import { z } from "zod";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import { f1098, itemSchema as f1098ItemSchema } from "../inputs/f1098/index.ts";
import { itemSchema as f1099rItemSchema, f1099r } from "../inputs/f1099r/index.ts";
import { f2441, itemSchema as f2441ItemSchema } from "../inputs/f2441/index.ts";
import { f8812, itemSchema as f8812ItemSchema } from "../inputs/f8812/index.ts";
import { f8863, itemSchema as f8863ItemSchema } from "../inputs/f8863/index.ts";
import { f8949, itemSchema as f8949ItemSchema } from "../inputs/f8949/index.ts";
import { f1099b, itemSchema as f1099bItemSchema } from "../inputs/f1099b/index.ts";
import { f1099c, itemSchema as f1099cItemSchema } from "../inputs/f1099c/index.ts";
import { f1099g, itemSchema as f1099gItemSchema } from "../inputs/f1099g/index.ts";
import { itemSchema as f1099kItemSchema, f1099k } from "../inputs/f1099k/index.ts";
import { itemSchema as f1099mItemSchema, f1099m } from "../inputs/f1099m/index.ts";
import {
  inputSchema as scheduleAInputSchema,
  scheduleA,
} from "../inputs/schedule_a/index.ts";
import {
  itemSchema as scheduleCItemSchema,
  scheduleC,
} from "../inputs/schedule_c/index.ts";
import {
  inputSchema as scheduleDInputSchema,
} from "../intermediate/schedule_d/index.ts";
import { schedule_d as scheduleD } from "../intermediate/schedule_d/index.ts";
import { f1099div, itemSchema as f1099divItemSchema } from "../inputs/f1099div/index.ts";
import {
  itemSchema as scheduleEItemSchema,
  scheduleE,
} from "../inputs/schedule_e/index.ts";
import { ext, inputSchema as extInputSchema } from "../inputs/ext/index.ts";
import { general, inputSchema as generalInputSchema } from "../inputs/general/index.ts";
import { f1099int, itemSchema as f1099intItemSchema } from "../inputs/f1099int/index.ts";
import { itemSchema as f1099necItemSchema, f1099nec } from "../inputs/f1099nec/index.ts";
import { w2, w2ItemSchema } from "../inputs/w2/index.ts";

const inputSchema = z.object({
  // W-2s: dispatched as full array to w2 node (which aggregates internally)
  w2s: z.array(w2ItemSchema).optional(),
  // All other array input nodes: each node receives full array and processes internally
  f1099ints: z.array(f1099intItemSchema).optional(),
  f1099divs: z.array(f1099divItemSchema).optional(),
  f1099necs: z.array(f1099necItemSchema).optional(),
  f1099gs: z.array(f1099gItemSchema).optional(),
  f1099ms: z.array(f1099mItemSchema).optional(),
  f1099cs: z.array(f1099cItemSchema).optional(),
  f1099ks: z.array(f1099kItemSchema).optional(),
  f1099bs: z.array(f1099bItemSchema).optional(),
  f1099rs: z.array(f1099rItemSchema).optional(),
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
  general: generalInputSchema.optional(),
});

type StartInput = z.infer<typeof inputSchema>;

class StartNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "start";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    w2,
    f1099int,
    f1099div,
    f1099nec,
    f1099g,
    f1099m,
    f1099c,
    f1099k,
    f1099b,
    f1099r,
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
    general,
  ]);

  compute(input: StartInput): NodeResult {
    const outputs: NodeOutput[] = [
      ...(input.w2s?.length ? [{ nodeType: w2.nodeType, input: { w2s: input.w2s } }] : []),
      ...(input.f1099ints?.length ? [{ nodeType: f1099int.nodeType, input: { f1099ints: input.f1099ints } }] : []),
      ...(input.f1099divs?.length ? [{ nodeType: f1099div.nodeType, input: { f1099divs: input.f1099divs } }] : []),
      ...(input.f1099necs?.length ? [{ nodeType: f1099nec.nodeType, input: { f1099necs: input.f1099necs } }] : []),
      ...(input.f1099gs?.length ? [{ nodeType: f1099g.nodeType, input: { f1099gs: input.f1099gs } }] : []),
      ...(input.f1099ms?.length ? [{ nodeType: f1099m.nodeType, input: { f1099ms: input.f1099ms } }] : []),
      ...(input.f1099cs?.length ? [{ nodeType: f1099c.nodeType, input: { f1099cs: input.f1099cs } }] : []),
      ...(input.f1099ks?.length ? [{ nodeType: f1099k.nodeType, input: { f1099ks: input.f1099ks } }] : []),
      ...(input.f1099bs?.length ? [{ nodeType: f1099b.nodeType, input: { f1099bs: input.f1099bs } }] : []),
      ...(input.f1099rs?.length ? [{ nodeType: f1099r.nodeType, input: { f1099rs: input.f1099rs } }] : []),
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
      ...(input.general ? [{ nodeType: general.nodeType, input: input.general }] : []),
    ];
    return { outputs };
  }
}

export const start = new StartNode();
