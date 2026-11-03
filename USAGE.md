# Usage

One row per agent session. In Gemini CLI, type `/stats` before you quit and copy the input and output tokens. Copilot shows credits instead of tokens: write those in the credits column. The free tier charges nothing, so record what the session **would cost at the provider's published list price**, and note once below the table which price list you used. Leave the cost empty for rows that only show credits.


| Date | Tool | Input tokens | Output tokens | Credits (if no tokens) | List-price cost |
|---|---|---|---|---|---|
| 2026-10-19 | Gemini CLI (precise description) | 24 035 | 83 | | |
| 2026-10-19 | Gemini CLI (vague description) | 26 636 | 88 | | |
| 2026-10-26 | Gemini CLI (review of Goals and Constraints, quota reached) | 14 265 | 71 | | |
| 2026-10-26 | Gemini CLI, gemini-3-flash-preview (AGENTS.md reading test) | 12 706 | 127 | | |
|2026-11-03| Gemini CLI, gemini-3.5-flash-lite (plan and build of slice 1)	|2 210 559 | 21 276

List-price cost uses the Gemini API published pricing (paid tier, per 1M tokens): gemini-3.8-flash $0.75 in / $3.75 out (introductory price until 2026-12-31), gemini-3-flash-preview $0.50 in / $3.00 out. All tokens of a row are priced at the main model's rate; cached reads are not discounted.