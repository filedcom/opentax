# Scratchpad — rate_28_gain_worksheet

## Key findings

### Input sources (from codebase grep)
1. `schedule_d` → `{ collectibles_gain_from_8949: gain28Pct }` — LT gains with adjustment codes C or Q
2. `f1099div` → `{ collectibles_gain: totalBox2d }` — box 2d from 1099-DIV

### Output target
- `schedule_d` ← `{ line18_28pct_gain: netGain }` for the Schedule D Tax Worksheet line 18
- The test comment in schedule_d/index.test.ts line 1133 confirms `line18_28pct_gain` as the field name

### IRS 28% Rate Gain Worksheet (Sch D Instructions 2025)
Line 1: Collectibles gains from LT capital gain transactions (net, from 8949)
Line 2: Collectibles gain distributions from 1099-DIV (box 2d)
Line 3: Net 28% rate gain (add lines 1 + 2)
If line 3 > 0 → enter on Schedule D Tax Worksheet line 18

### Architecture pattern
- This is a pure aggregation node
- No complex rate calculation needed — it just sums the gains and passes the net to schedule_d
- The actual rate application (28% vs lower) happens in the Schedule D Tax Worksheet (future node)

### Node design
- inputSchema: collectibles_gain_from_8949 (optional, nonneg), collectibles_gain (optional, nonneg)
- compute: sum both, if > 0 route to schedule_d with line18_28pct_gain
- outputNodes: [schedule_d]
