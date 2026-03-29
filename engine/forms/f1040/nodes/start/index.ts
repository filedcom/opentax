import { z } from "zod";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../core/types/tax-node.ts";
import { type AtLeastOne, TaxNode } from "../../../../core/types/tax-node.ts";
import { ext, inputSchema as extInputSchema } from "../inputs/ext/index.ts";
import { f1098, itemSchema as f1098ItemSchema } from "../inputs/f1098/index.ts";
import {
  f1099b,
  itemSchema as f1099bItemSchema,
} from "../inputs/f1099b/index.ts";
import {
  f1099c,
  itemSchema as f1099cItemSchema,
} from "../inputs/f1099c/index.ts";
import {
  f1099div,
  itemSchema as f1099divItemSchema,
} from "../inputs/f1099div/index.ts";
import {
  f1099g,
  itemSchema as f1099gItemSchema,
} from "../inputs/f1099g/index.ts";
import {
  f1099int,
  itemSchema as f1099intItemSchema,
} from "../inputs/f1099int/index.ts";
import {
  f1099k,
  itemSchema as f1099kItemSchema,
} from "../inputs/f1099k/index.ts";
import {
  f1099m,
  itemSchema as f1099mItemSchema,
} from "../inputs/f1099m/index.ts";
import {
  f1099nec,
  itemSchema as f1099necItemSchema,
} from "../inputs/f1099nec/index.ts";
import {
  f1099r,
  itemSchema as f1099rItemSchema,
} from "../inputs/f1099r/index.ts";
import { f2441, itemSchema as f2441ItemSchema } from "../inputs/f2441/index.ts";
import { f8812, itemSchema as f8812ItemSchema } from "../inputs/f8812/index.ts";
import { f8863, itemSchema as f8863ItemSchema } from "../inputs/f8863/index.ts";
import { f8949, itemSchema as f8949ItemSchema } from "../inputs/f8949/index.ts";
import {
  general,
  inputSchema as generalInputSchema,
} from "../inputs/general/index.ts";
import {
  inputSchema as scheduleAInputSchema,
  scheduleA,
} from "../inputs/schedule_a/index.ts";
import {
  itemSchema as scheduleCItemSchema,
  scheduleC,
} from "../inputs/schedule_c/index.ts";
import {
  itemSchema as scheduleEItemSchema,
  scheduleE,
} from "../inputs/schedule_e/index.ts";
import {
  itemSchema as ssaItemSchema,
  ssa1099,
} from "../inputs/ssa1099/index.ts";
import { w2, w2ItemSchema } from "../inputs/w2/index.ts";
import {
  inputSchema as scheduleDInputSchema,
  schedule_d as scheduleD,
} from "../intermediate/schedule_d/index.ts";

const inputSchema = z.object({
  w2: z.array(w2ItemSchema).optional(),
  f1099int: z.array(f1099intItemSchema).optional(),
  f1099div: z.array(f1099divItemSchema).optional(),
  f1099nec: z.array(f1099necItemSchema).optional(),
  f1099g: z.array(f1099gItemSchema).optional(),
  f1099m: z.array(f1099mItemSchema).optional(),
  f1099c: z.array(f1099cItemSchema).optional(),
  f1099k: z.array(f1099kItemSchema).optional(),
  f1099b: z.array(f1099bItemSchema).optional(),
  f1099r: z.array(f1099rItemSchema).optional(),
  f1098: z.array(f1098ItemSchema).optional(),
  f2441: z.array(f2441ItemSchema).optional(),
  f8812: z.array(f8812ItemSchema).optional(),
  f8863: z.array(f8863ItemSchema).optional(),
  f8949: z.array(f8949ItemSchema).optional(),
  schedule_a: scheduleAInputSchema.optional(),
  schedule_c: z.array(scheduleCItemSchema).optional(),
  schedule_d: scheduleDInputSchema.optional(),
  schedule_e: z.array(scheduleEItemSchema).optional(),
  ssa1099: z.array(ssaItemSchema).optional(),
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
    ssa1099,
    ext,
    general,
  ]);

  compute(input: StartInput): NodeResult {
    const outputs: NodeOutput[] = [
      ...(input.w2?.length
        ? [this.outputNodes.output(w2, { w2s: input.w2 })]
        : []),
      ...(input.f1099int?.length
        ? [this.outputNodes.output(f1099int, { f1099ints: input.f1099int })]
        : []),
      ...(input.f1099div?.length
        ? [this.outputNodes.output(f1099div, { f1099divs: input.f1099div })]
        : []),
      ...(input.f1099nec?.length
        ? [this.outputNodes.output(f1099nec, { f1099necs: input.f1099nec })]
        : []),
      ...(input.f1099g?.length
        ? [this.outputNodes.output(f1099g, { f1099gs: input.f1099g })]
        : []),
      ...(input.f1099m?.length
        ? [this.outputNodes.output(f1099m, { f1099ms: input.f1099m })]
        : []),
      ...(input.f1099c?.length
        ? [this.outputNodes.output(f1099c, { f1099cs: input.f1099c })]
        : []),
      ...(input.f1099k?.length
        ? [this.outputNodes.output(f1099k, { f1099ks: input.f1099k })]
        : []),
      ...(input.f1099b?.length
        ? [this.outputNodes.output(f1099b, { f1099bs: input.f1099b })]
        : []),
      ...(input.f1099r?.length
        ? [this.outputNodes.output(f1099r, { f1099rs: input.f1099r })]
        : []),
      ...(input.f1098?.length
        ? [this.outputNodes.output(f1098, { f1098s: input.f1098 })]
        : []),
      ...(input.f2441?.length
        ? [this.outputNodes.output(f2441, { f2441s: input.f2441 })]
        : []),
      ...(input.f8812?.length
        ? [this.outputNodes.output(f8812, { f8812s: input.f8812 })]
        : []),
      ...(input.f8863?.length
        ? [this.outputNodes.output(f8863, { f8863s: input.f8863 })]
        : []),
      ...(input.f8949?.length
        ? [this.outputNodes.output(f8949, { f8949s: input.f8949 })]
        : []),
      ...(input.schedule_c?.length
        ? [
          this.outputNodes.output(scheduleC, {
            schedule_cs: input.schedule_c,
          }),
        ]
        : []),
      ...(input.schedule_e?.length
        ? [
          this.outputNodes.output(scheduleE, {
            schedule_es: input.schedule_e,
          }),
        ]
        : []),
      ...(input.ssa1099?.length
        ? [this.outputNodes.output(ssa1099, { ssas: input.ssa1099 })]
        : []),
      ...(input.schedule_a
        ? [
          this.outputNodes.output(
            scheduleA,
            input.schedule_a as AtLeastOne<
              z.infer<typeof scheduleAInputSchema>
            >,
          ),
        ]
        : []),
      ...(input.schedule_d
        ? [
          this.outputNodes.output(
            scheduleD,
            input.schedule_d as AtLeastOne<
              z.infer<typeof scheduleDInputSchema>
            >,
          ),
        ]
        : []),
      ...(input.ext
        ? [
          this.outputNodes.output(
            ext,
            input.ext as AtLeastOne<z.infer<typeof extInputSchema>>,
          ),
        ]
        : []),
      ...(input.general
        ? [this.outputNodes.output(general, input.general)]
        : []),
    ];
    return { outputs };
  }
}

export const start = new StartNode();
