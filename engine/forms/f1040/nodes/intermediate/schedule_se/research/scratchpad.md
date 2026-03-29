# Schedule SE — Scratchpad

## Purpose
Compute self-employment tax (15.3%) on net self-employment earnings and the deductible half (Schedule 1, line 15), routing SE tax to Schedule 2 line 4.

## Inputs received (from upstream nodes)
- `net_profit_schedule_c` — net profit from Schedule C (schedule_c node)
- `net_profit_schedule_f` — net profit from Schedule F (schedule_f node) [future]
- `unreported_tips_4137` — unreported tips subject to SE from Form 4137, line 10 (form4137 node)
- `wages_8919` — wages subject to SE from Form 8919, line 10 (form8919 node)
- `w2_social_security_wages` — combined SS wages from W-2(s) for wage base offset (w2 node)

## Fields / lines identified (from IRS Schedule SE TY2025)

### Part I — Self-Employment Tax
- Line 1a: Net farm profit (Schedule F) — from schedule_f
- Line 1b: Conservation Reserve Program payments — not in scope for MVP
- Line 2: Net profit from Schedule C / K-1 — from schedule_c
- Line 3: Combine lines 1a, 1b, 2
- Line 4a: Line 3 × 92.35% (0.9235) — net earnings from SE
- Line 4c: Combined 4a + 4b; if < $400, stop (no SE tax)
- Line 5a: Church employee income — not in scope for MVP
- Line 5b: Church employee income × 92.35%
- Line 6: Add lines 4c and 5b
- Line 7: SS wage base = $176,100 for 2025
- Line 8a: Total SS wages from W-2s (boxes 3 + 7)
- Line 8b: Unreported tips from Form 4137, line 10
- Line 8c: Wages subject to SE from Form 8919, line 10
- Line 8d: Add 8a + 8b + 8c
- Line 9: Subtract 8d from line 7 (if ≤ 0, enter 0)
- Line 10: Smaller of line 6 or line 9 × 12.4% (social security portion)
- Line 11: Line 6 × 2.9% (medicare portion)
- Line 12: SE tax = line 10 + line 11 → Schedule 2 line 4
- Line 13: SE deduction = line 12 × 50% → Schedule 1 line 15

## Open Questions
- [x] Q: What upstream nodes feed into this form? schedule_c (net_profit_schedule_c), form4137 (unreported_tips_4137), form8919 (wages_8919), W2 node (w2_ss_wages)
- [x] Q: What calculations does this form perform? 92.35% multiplier, SS wage base phaseout, 12.4% SS tax, 2.9% Medicare tax, 50% deduction
- [x] Q: What does this form output to downstream nodes? SE tax → schedule2 line 4; SE deduction → schedule1 line 15
- [x] Q: What are the TY2025 constants? SS wage base $176,100; SE rate 15.3%; SS portion 12.4%; Medicare 2.9%; NE multiplier 92.35%
- [x] Q: What edge cases exist? Net earnings < $400 → no SE tax; SS wage base offset reduces social security portion; schedule_f farm income

## Sources checked
- [x] IRS Schedule SE (Form 1040) 2025 — f1040se.pdf
- [x] IRS Instructions for Schedule SE 2025 — i1040sse.pdf
- [x] Drake KB article for screen SE
- [x] Rev Proc 2024-40 (TY2025 SS wage base $176,100)
