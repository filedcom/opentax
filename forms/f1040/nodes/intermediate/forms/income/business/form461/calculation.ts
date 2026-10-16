/** Shared Form 461 arithmetic after source classification and earlier limits.
 * The calling year owns its threshold, filing trigger and source validation. */
export function businessLossLimitLines(input: {
  line2: number;
  line3: number;
  line4: number;
  line5: number;
  line6: number;
  line8: number;
  line10: number;
  line11: number;
}, rules: { threshold: number; individualLineFilingTrigger: number }) {
  for (const [key, value] of Object.entries({ ...input, ...rules })) {
    if (
      !Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER ||
      (["line10", "line11", "threshold", "individualLineFilingTrigger"]
        .includes(key) && value < 0)
    ) {
      throw new Error(`Invalid Form 461 ${key}`);
    }
  }
  const parts = [
    input.line2,
    input.line3,
    input.line4,
    input.line5,
    input.line6,
    input.line8,
  ];
  const line9 = parts.reduce((n, v) => n + v, 0);
  const line12 = input.line10 - input.line11;
  const line13 = -line12;
  const line14 = line9 + line13;
  const line15 = rules.threshold;
  const line16 = line14 + line15;
  if (
    [line9, line12, line14, line16].some((v) =>
      !Number.isFinite(v) || Math.abs(v) > Number.MAX_SAFE_INTEGER
    )
  ) {
    throw new Error("Form 461 totals exceed the safe calculation range");
  }
  return {
    ...input,
    line9,
    line12,
    line13,
    line14,
    line15,
    line16,
    excess_business_loss: Math.max(0, -line16),
    must_file: line14 < -rules.threshold ||
      parts.some((v) => v < -rules.individualLineFilingTrigger),
  };
}
