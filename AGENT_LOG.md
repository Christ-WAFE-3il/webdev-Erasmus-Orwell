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



## 2026-11-03 · Build slice 1 (sign-in and events list)
- Goal: build slice 1 of the Club Events app from SPEC.md: database, sign-in, and the upcoming events list.
- Delegated: planning, then building in three steps (SQLite tables with seed rows, sign-in with sessions, list screen), stopping after each step.
- Checkpoints: I read the plan before any code. After step 1 I opened the database. After step 2 I tested with curl: 401 when not signed in, 401 on a wrong password, 200 with the right one. After step 3 I signed in in the browser, deleted an event row in the database and checked that it disappeared after a reload.
- Went wrong: the plan stored free_places in events and talked about a connection pool, so I asked for total places only and a SQLite file. The agent also added a verify-step1.js file I had not asked for. gemini-3.8-flash was out of quota, so a smaller model did the build.
- Changed by hand: nothing.