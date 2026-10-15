/** IRC 221(b)(1): one $2,500 cap per return, before the MAGI phaseout. */
export function cappedStudentLoanInterest(eligibleInterest: number): number {
  return Math.min(eligibleInterest, 2_500);
}
