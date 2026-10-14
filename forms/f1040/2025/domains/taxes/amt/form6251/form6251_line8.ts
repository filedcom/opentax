/** 2025 Form 6251 instructions: leave line 8 blank when line 10 >= line 7. */
export function assertForm6251Line8(
  fields: Readonly<Record<string, unknown>>,
): void {
  const line7 = fields.tentative_tax;
  const line10 = fields.regular_tax;
  if (
    typeof line7 !== "number" || typeof line10 !== "number" ||
    line7 > line10
  ) return;
  if (typeof fields.amtftc === "number") {
    throw new Error(
      "Form 6251 line 8 must be blank when line 10 is at least line 7",
    );
  }
  if (
    typeof fields.net_tmt === "number" && fields.net_tmt !== line7
  ) {
    throw new Error(
      "Form 6251 line 9 must equal line 7 when line 8 is blank",
    );
  }
}
