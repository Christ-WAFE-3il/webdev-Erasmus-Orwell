# Agent log

One entry per agent session, newest at the bottom. Be honest: what went wrong is the useful part.

<!-- Copy this block for each session:

## YYYY-MM-DD · <short title>
- Goal:
- Delegated:
- Checkpoints:
- Went wrong:
- Changed by hand:

-->
## 2026-10-19 · Description experiment (Exercise 1)
- Goal: see whether the description of find_lecture changes which tool Gemini picks.
- Delegated: answering "What does lecture 7 cover?" with my MCP server connected, twice.
- Checkpoints: I read each tool call in the terminal and compared the tokens from /stats.
- Went wrong: signing in with Google no longer worked in the CLI, so I used an API key. My vague description ("Get info.") also failed the self-check (under 20 characters), so I restored a precise one.
- Changed by hand: all the server code and the descriptions.
## 2026-10-26 · Review of Goals and Constraints (no answer)
- Goal: check the Goals against the Non-goals and the stack against Node 22 and Python 3.12.
- Delegated: reading SPEC.md and answering; no edits.
- Checkpoints: none, there was no answer.
- Went wrong: a network error ("fetch failed"), then the daily quota error. The session lasted 13 minutes without an answer.
- Changed by hand: nothing
## 2026-10-26 · Review of the acceptance criteria
- Goal: ask the agent whether each criterion can be checked in under a minute.
- Delegated: reading SPEC.md and judging the criteria; no edits.
- Checkpoints: I read its verdict on each of the 11 criteria and decided myself what to change.
- Went wrong: the daily quota of gemini-3.8-flash was used up, so I had to pick another model with /model. It judged every criterion checkable, so it found no weakness.
- Changed by hand: nothing from this session.

## 2026-10-26 · AGENTS.md reading test
- Goal: check that the agent reads AGENTS.md, by asking for the "Always ask before" list and the commands.
- Delegated: answering from its instructions only, with no other file opened, no web search and no file changed.
- Checkpoints: I compared its answer with AGENTS.md. It listed all 9 items, from "deleting files or folders" to "sending user data to a third-party model", and gave npm install, npm start and npm test.
- Went wrong: the first two attempts returned nothing, because the daily quota of gemini-3.8-flash was used up (0 tokens). I had to pick another model with /model (gemini-3-flash-preview).
- Changed by hand: nothing. The agent changed no file.



## 2026-11-10 · Exercise 3 plan (sign up for an event)
- Goal: a written plan for the sign-up feature (slice 2), no code yet.
- Autonomy: the agent works alone inside one step of the plan; I read the diff before every commit.
- Checkpoints: plan review before any code; npm test green before each commit; a permission prompt for everything in "Always ask before"; I stop it if it touches migrations that already ran, authentication rules or dependencies.
- Went wrong: (to fill in after the session)
- Changed by hand: (to fill in after the session)
