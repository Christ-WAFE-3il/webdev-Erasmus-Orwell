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
- Went wrong: in the always-ask test I answered Yes to "Install the package dayjs" by mistake, so it was installed; I removed it with npm uninstall dayjs. The first plan also had flaws (see below).
- Changed by hand: nothing in the code, I only corrected the plan through prompts.

Plan
1. migrations/002_registrations.sql and `npm run migrate`, which records the files already applied
2. server/services/eventService.js: signUpForEvent (one transaction: event exists, not past, not already registered, free places left) and cancelRegistration; named errors; tests first
3. Routes: POST /api/events/:id/registrations (201, 401, 404, 409, 422), DELETE /api/registrations/:id (204, 401, 403, 404, 422), GET /api/events with free places and my registration id
4. Authorization: 401 before the service is called, 403 NotOwner raised by the service; API tests
5. UI: loading, empty and error states; Sign up, Cancel and Full

Changed in review: the first plan used DELETE /api/events/:id/sign-up, so the 403 could never happen; I moved to DELETE /api/registrations/:id. I asked for a real migration file instead of editing db.js, named errors in the service instead of HTTP codes, a transaction for the free-places check, and tests before code. In the second review I asked for one migration runner, the registration id in the events list, and tests per step instead of failing stubs.

## What the agent did that I did not ask for
- server/db.js: it changed the seed logic to check one specific user and event; I made it revert it and use an in-memory database when NODE_ENV=test.
- server/slice1.test.js: it changed an existing test (initDb replaced by runMigrations, getUpcomingEvents(null)); I kept it because the function signature changed.
- server/index.js: it now exports the app and only calls listen when run directly; I kept it because the API tests need it.
- Errors: it used generic ConflictError, NotFoundError and ForbiddenError instead of the named errors of the plan, so 409 covers full, already registered and past.
- Extra tests beyond the one I asked for in step 3, and it ran checks/ex2.mjs and checks/ex3.mjs by itself.
- The service has two cancel functions: cancelRegistration (by event id) and cancelRegistrationById (by registration id). The routes only call cancelRegistrationById; cancelRegistration is only called by the tests in slice2.test.js. I kept it for now, but those rule tests do not cover the function the app really uses, which the API tests in slice3.test.js do.
- Dependencies: none added (dayjs was installed by my own mistake and removed).
## 2026-11-14 · Usage recording
- Went wrong: I did not run /stats at the end of the sessions where the plan, service, routes and UI were built, so their tokens are not recorded in USAGE.md. The last session shows four models with 0 tokens: their quota was used up and the CLI kept switching between them.

## 2026-11-11 · Build slice 2 (sign up, cancel, UI)
- Goal: build the sign-up feature in small steps: migration, service rules, routes, authorization tests, UI.
- Autonomy: alone inside one step; I stopped it after each step, read the diff and committed.
- Delegated: the migration and its runner, signUpForEvent and cancelRegistration, the three routes, the API tests, client/index.html.
- Checkpoints: the failing test before the code (AC-14 returned 404 before it returned 409); npm test and git diff --staged before every commit; curl checks by hand (201, 409, 401, 403, 204); sign up and cancel in the browser.
- Went wrong: the tests ran on the real database file until I made them use an in-memory database; it changed the seed logic in db.js outside the plan; the first versions of the tests were not in the npm test script.
- Changed by hand: added slice3.test.js to the test script and the AC ids to test titles; recreated the database.

## 2026-11-13 · MCP tools
- Goal: three MCP tools (list_events, find_event, register_for_event) that call the services, with the user read from MCP_USER_EMAIL.
- Delegated: the plan, the test, the tools, findUserByEmail.
- Checkpoints: plan review (no SQL in the MCP source, nothing on stdout but the protocol); the test written first and seen failing; node mcp-server/check.mjs at 12/12; grep for SQL in mcp-server/server.js.
- Went wrong: its conversion to ES modules crashed the server; it then ran the same test about ten times, changed db.js three times (WAL, DATABASE_PATH, initDb) and added debug logging. migrate.js wrote to stdout, which breaks the protocol. The WAL mode stays in the database file, so my real database filled with test events and -wal files.
- Changed by hand: I stopped it, gave it the probable cause (imports run before the environment variable is set), deleted the polluted databases and added them to .gitignore.

## 2026-11-14 · Model feature (description suggestion)
- Goal: suggest an event description from a title and keywords, with a timeout, a fallback and a fake client in the tests.
- Delegated: the plan, descriptionService.js, its tests, the route POST /api/events/suggest-description.
- Checkpoints: plan review with five changes (injected client, key in a header, 422 on bad input, fallback cut to 300 characters, tests first); grep for key= and console in the service; the provider named in one file only; npm test count after each step.
- Went wrong: the new test file was not in npm test until I added it; the timeout timer is probably never cleared, so the tests take longer.
- Changed by hand: added description.test.js to the test script.
## 2026-11-26 · Exercise 4: deployment and readiness
- Goal: put the Club Events app on Render with a Neon Postgres database, with /health, an error handler, a Docker image, a CI that gates coverage, and READINESS.md.
- Autonomy: Gemini CLI worked alone inside one step; I read each diff and ran the tests before every commit. Claude (the chat assistant) guided me step by step and reviewed the plans.
- Delegated: Gemini CLI: the move from SQLite to Postgres (db.js, a data layer in server/data/, async services, migrations), /health, the 404 and error handler, the Dockerfile, ci.yml, the tests. Claude: the CSS and the model-feature screen in client/index.html (applied by scripts I ran), and the text of READINESS.md and docs/UI.md.
- Checkpoints: plan review before any code; npm test (40 tests) and git diff before every commit; a separate Neon branch for the tests; curl on the live site (/health, bad JSON, 404, the 403/401/404 ownership test with a second account); breaking the database on purpose; a rollback on Render; a search of the git history for secrets; node checks/ex4.mjs at 34/34.
- Went wrong (agent claims that were false or weak):
  - Its plan ran the tests on the production database. I made it use a second Neon branch (TEST_DATABASE_URL) and refuse to start if it equals DATABASE_URL.
  - It used TIMESTAMPTZ for dates, although the app stores text dates; it also set ssl rejectUnauthorized:false, which turns off certificate checks. I changed the type to TEXT and removed the option.
  - db.js threw an error when the module was imported; COUNT(*) came back as a string; an unhandled initDb rejection crashed the container with a bad database URL.
  - The test for AC-18 (forbidden branch) passed without ever reaching the Forbidden error, so it proved nothing; the mocks in the description tests leaked between tests and its assertions were weak. I had them rewritten with mock.method and an afterEach restore.
  - The MCP job in CI would have failed without a database, because the server looked the user up at startup; I had the lookup moved into a function called only by the tools that need it.
  - Quota errors many times: I used /clear, one file per prompt, another model, and waited.
  - Mistakes of mine and of the assistant: a real key and a session secret were visible in screenshots or chat, so I regenerated the secret and will delete the exposed API keys; the first security test used a wrong route (/api/auth/login gives 404; the real one is /api/auth/signin).
- Changed by hand: I fixed the ci.yml indentation; I re-enabled Auto-Deploy after the rollback; I decided the Neon branches and the environment variables; I copied my screenshots into docs/ui/.
- Not written by me: the render-modes table in SPEC.md (section Architecture) and the texts of READINESS.md and docs/UI.md were drafted by Claude from the grep and curl output I pasted, and I pasted them in. I checked the results myself (curl, DevTools, keyboard test, contrast script).
- Usage: I did not run /stats at the end of the Gemini sessions of this exercise, and when I ran it later the counters were at 0 because it was a new session. So the tokens of these sessions are marked "not recorded" in USAGE.md. I did not invent numbers.
