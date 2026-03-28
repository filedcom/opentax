import { z } from "zod";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import type { NodeResult } from "../../../../core/types/tax-node.ts";
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
    const out = this.outputNodes.builder();

    if (input.w2s?.length) out.add(w2, { w2s: input.w2s });
    if (input.int1099s?.length) out.add(int, { int1099s: input.int1099s });
    if (input.div1099s?.length) out.add(div, { div1099s: input.div1099s });
    if (input.necs?.length) out.add(nec, { necs: input.necs });
    if (input.g99s?.length) out.add(g99, { g99s: input.g99s });
    if (input.m99s?.length) out.add(m99, { m99s: input.m99s });
    if (input.c99s?.length) out.add(c99, { c99s: input.c99s });
    if (input.k99s?.length) out.add(k99, { k99s: input.k99s });
    if (input.b99s?.length) out.add(b99, { b99s: input.b99s });
    if (input.r1099s?.length) out.add(r1099, { r1099s: input.r1099s });
    if (input.f1098s?.length) out.add(f1098, { f1098s: input.f1098s });
    if (input.f2441s?.length) out.add(f2441, { f2441s: input.f2441s });
    if (input.f8812s?.length) out.add(f8812, { f8812s: input.f8812s });
    if (input.f8863s?.length) out.add(f8863, { f8863s: input.f8863s });
    if (input.f8949s?.length) out.add(f8949, { f8949s: input.f8949s });
    if (input.schedule_cs?.length) {
      out.add(scheduleC, { schedule_cs: input.schedule_cs });
    }
    if (input.schedule_es?.length) {
      out.add(scheduleE, { schedule_es: input.schedule_es });
    }
    if (input.schedule_a) out.add(scheduleA, input.schedule_a);
    if (input.d_screen) out.add(scheduleD, input.d_screen);
    if (input.ext) out.add(ext, input.ext);

    return out.build();
  }
}

export const start = new StartNode();
