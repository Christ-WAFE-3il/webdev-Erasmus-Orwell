#  Club Events · Informatics Club

<!-- Exercise 2. Write the non-goals first. Every acceptance criterion must be checkable in under a minute.
     Keep these headings exactly as they are: the self-checks look for them by name.
     The full target is on the course site under Resources → The course project. -->

## Project option
Club events.
<!-- One line: lab booking, study groups, club events, or the own project the lecturer approved. -->

## Goals
- A member signs in, sees upcoming events and signs up for one that has free places.
- An organizer creates an event with a limit on places and sees who signed up for it.

## Non-goals
- No email confirming the registration
- No paid events, given that it is a student club.
- No waiting list when the event is full

## Constraints
- Node with Express, PostgreSQL, plain HTML and JavaScript in the UI.
- Passwords are stored only as a hash, never as readable text.

## The model feature
<!-- Which model, which modality, and what it does for a user.
     Name three things or the check fails: the input it receives, the output it produces,
     and what happens when the model is slow, rate-limited or wrong. -->
- Model: Gemini (gemini-3.5-flash-lite)
- Input: the event title and a few keywords typed by the organizer
- Output: a short description of the event, shown in the form so the organizer can edit it
- When it fails: if the model is slow (over 10 seconds), rate-limited or gives a bad answer, the organizer sees "Suggestion not available, write the description yourself" and the field stays empty and editable.

## Auth
<!-- Local sign-in plus at least one provider. Say how an account signing in both ways stays one account. -->
- Local:email and password; the password is hashed, never stored in clear.
- Provider: Google sign-in.
- Linking: if a person signs in with Google using an email that already has a password account, both are linked to the same user (same email = same account).

## MCP tools
<!-- At least three tools your own MCP server exposes over this project's data.
     Each tool calls the same service functions the HTTP API calls, so the same rules apply.
     A description shorter than 20 characters is not a description. -->
| Tool | What it does | Who may call it |
| list_events | List the upcoming events with title, date and free places. Use it when asked what events are coming. |
| find_event | Return one event by its title, with its date and free places. Use it when asked about a specific event by name. |
| register_for_event | Sign the current member up for an event if it has free places. Use it when asked to register. |

## UI
<!-- Stack, and the three or more screens. The graded checklist lives in docs/UI.md. -->
React for the pages, Express and SQLite on the server, plain CSS. Screens: sign in, upcoming events list (signed-in members only), event detail with Sign up / Cancel, event form (organizer), registrations tab (organizer). The checklist is in `docs/UI.md`.

## Architecture
<!-- Exercise 3. One request traced through every layer, naming the file for each one,
     plus one place where your own code does not match this layering. -->

## Acceptance criteria
<!-- Every criterion carries an id. A test proves it by naming that id in its title, for example
     test('AC-3 a booking that overlaps another is refused with 409', ...).
     Say who acts, what they see, and what must be true in the database. -->
- [AC-1] An organizer fills in the new event form (title, date, places) and submits it; the event appears in the upcoming events list with its free places.
- [AC-2] An organizer opens the registrations tab of their event and sees the list of members signed up, with their names.
- [AC-3] A member opens the upcoming events list and sees, for each event, the title, the date and the free places left, soonest first.
- [AC-4] A member clicks "Sign up" on an event with free places; the button becomes "Cancel" and the free places go down by one.
- [AC-5] A member clicks "Cancel" on an event they signed up for; the button becomes "Sign up" again and the free places go up by one.
- [AC-6] A member opens a full event and sees "Full" instead of a sign-up button, so nobody else can sign up.
- [AC-7] A member already registered for an event cannot register twice: that event shows only a "Cancel" button.
- [AC-8] A member who is not the organizer opens the edit page of an event and sees "Not allowed" instead of the form.


### Slice 1: sign-in and the upcoming events list
- [AC-9] A visitor who is not signed in opens the events page and is sent to the sign-in page.
- [AC-10] A user enters a valid email and password and sees the upcoming events list with their name in the header.
- [AC-11] A user enters a wrong password and sees "Wrong email or password" and stays on the sign-in page.
- [AC-12] An event row deleted from the database no longer appears in the events list after a reload.

### Slice 2: sign up for an event
- [AC-13] A signed-in member signs up for an event with free places and gets 201; one row appears in registrations and the free places go down by one.
- [AC-14] Signing up for a full event is refused with 409 and "This event is full"; no row is added.
- [AC-15] Signing up twice for the same event is refused with 409; the member still has one row.
- [AC-16] A sign-up request without a session is refused with 401.
- [AC-17] A member cancels their own sign-up and gets 204; the row is removed and the place is free again.
- [AC-18] A member who cancels another member's sign-up gets 403; the row stays.
- [AC-19] A sign-up request for an event id that does not exist (for example an event deleted a moment ago) gets 404; no row is added to registrations.
- [AC-20] A sign-up request for an event whose date has passed gets 409 and "This event has already happened"; no row is added.
- [AC-21] A member who cancels a sign-up they never made gets 404; the registrations table is unchanged.
- [AC-22] A sign-up request with a missing or non-numeric event id gets 422; no row is added.

## Traceability
<!-- Filled in from Exercise 3 onward: each AC id, and the test that names it. -->
| Criterion | Test |
| --- | --- |
| AC-9 | server/slice1.test.js |
| AC-10 | server/slice1.test.js |
| AC-11 | server/slice1.test.js |
| AC-13 | |
| AC-14 | |
| AC-15 | |
| AC-16 | |
| AC-17 | |
| AC-18 | |
| AC-19 | |
| AC-20 | |
| AC-21 | |
| AC-22 | |
## Spec vs result
<!-- After the agent builds the slice: which criteria passed, which it missed or reinterpreted, and what you changed in this spec because of it. -->

- Passed: AC-9 (no session gives 401), AC-10 (sign-in shows the list and my name), AC-11 (a wrong password shows "Wrong email or password"). Deleting an event row in the database and reloading removed it from the screen.
- Missed: the plan stored free_places in events and used a connection pool, so I asked for total places only and a SQLite file. The agent also added a verify-step1.js file nobody asked for.
- Changed: added a criterion saying the list comes from the database, because no criterion covered it.
