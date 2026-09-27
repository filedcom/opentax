import {
  sourceAllocationSchema,
} from "../../../nodes/intermediate/forms/form8582cr/source.ts";

/** Compare the filed Form 8582-CR allocations with the Form 3800 handoff. */
export function sameForm3800PassiveAllocations(
  left: readonly unknown[],
  right: readonly unknown[],
): boolean {
  const canonical = (allocations: readonly unknown[]) =>
    JSON.stringify(
      allocations.map((source) => sourceAllocationSchema.parse(source)),
    );
  return canonical(left) === canonical(right);
}
