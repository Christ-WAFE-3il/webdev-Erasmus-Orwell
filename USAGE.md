# Usage

One row per agent session. In Gemini CLI, type `/stats` before you quit and copy the input and output tokens. Copilot shows credits instead of tokens: write those in the credits column. The free tier charges nothing, so record what the session **would cost at the provider's published list price**, and note once below the table which price list you used. Leave the cost empty for rows that only show credits.

| Date | Tool | Input tokens | Output tokens | Credits (if no tokens) | List-price cost |
|---|---|---|---|---|---|
| 2026-10-19 | Gemini CLI (precise description) | 24 035 | 83 | | $0.0183 |
| 2026-10-19 | Gemini CLI (vague description) | 26 636 | 88 | | $0.0203 |
| 2026-10-26 | Gemini CLI (review of Goals and Constraints, quota reached) | 14 265 | 71 | | $0.0110 |
| 2026-10-26 | Gemini CLI, gemini-3-flash-preview (AGENTS.md reading test) | 12 706 | 127 | | $0.0067 |
| 2026-11-03 | Gemini CLI, gemini-3.5-flash-lite (plan and build of slice 1) | 2 210 559 | 21 276 | | $0.78 |
| 2026-11-10 | Gemini CLI, gemini-3-flash-preview (questions on failure cases, slice 2) | 41 353 | 933 | | $0.03 |
| 2026-11-14 | Gemini CLI, gemini-3.5-flash-lite and gemini-3-flash-preview (MCP tools and model feature) | 2 342 381 | 11 293 | | $1.14 |
| 2026-11-10 to 2026-11-11 | Gemini CLI (plan, service, routes, UI of exercise 3) | not recorded | not recorded | | |
| 2026-11 (exercise 4) | Gemini CLI (Postgres move, /health, Docker, CI, tests) | not recorded | not recorded | | |

List-price cost uses the Gemini API published pricing (per 1M tokens): gemini-3.8-flash $0.75 in / $3.75 out (introductory price until 2026-12-31), gemini-3-flash-preview $0.50 in / $3.00 out, gemini-3.5-flash-lite $0.30 in / $0.03 cached / $2.50 out. The rows before 2026-11-03 price all tokens at the main model's rate with no cache discount. The 2026-11-03 and 2026-11-14 rows assume that "Input Tokens" excludes cache reads, and price each model at its own rate.