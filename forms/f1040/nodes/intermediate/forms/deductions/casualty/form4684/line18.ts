// Section A, line 17: 10% of Form 1040 line 11b (IRC §165(h)(2)). Kept apart
// from the node so Schedule A, which holds AGI, can apply it.
const AGI_FLOOR_PCT = 0.10;

/** Form 4684 lines 17 and 18; line 18 is Schedule A line 15. */
export function personalLine18(line16: number, agi: number) {
  const line17 = Math.round(Math.round(agi) * AGI_FLOOR_PCT);
  return { line17, line18: Math.max(0, line16 - line17) };
}
