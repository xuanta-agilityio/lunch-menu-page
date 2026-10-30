# Lunch Menu Page

A Google Apps Script web app that shows one working week (Mon–Fri) of the lunch menu, with like/dislike votes, and per-location meal counts for the admin. The requirements are in [TICKET.md](TICKET.md).

- **Standalone Apps Script project.** It isn't bound to any sheet. It runs as the owner and only @asnet.com.vn accounts can open it.
- **Source sheets are read-only.** The menu (`MM/YYYY` tabs) and sign-up (`YYYY-MM` tabs) sheets are only read, in [src/SourceSheets.js](src/SourceSheets.js). `npm test` fails if that file contains a write call or if another file refers to a source sheet.
- **Votes** are stored in a separate sheet, "Lunch Menu Votes", which is created in the owner's My Drive on first use. Its ID is kept in the Script Property `VOTES_SHEET_ID`.
- **Admin:** `xuan.tathanh@asnet.com.vn`. Meal counts and totals are only added to the server response for the admin, so other users' browsers never receive them.
- **Time zone:** all times are Asia/Ho_Chi_Minh (UTC+7).

## Layout

| File | Purpose |
| --- | --- |
| `src/Logic.js` | Pure logic: week choice, voting windows, sheet parsing. Shared with the Node tests. |
| `src/Config.js` | Sheet IDs, admin, domain, and the image URL maps. |
| `src/SourceSheets.js` | Read-only access to the two source sheets. |
| `src/Votes.js` | The votes sheet: create, read, toggle a vote (under a script lock). |
| `src/Api.js` | `doGet`, `getWeek`, `vote`, and the admin check. |
| `src/Index.html`, `Styles.html`, `Script.html` | The page. |
| `test/` | Node tests for `Logic.js` (`npm test`). |

## Development

```bash
npm test
```

```bash
clasp push
```

`npm run push` runs the tests first and pushes only if they pass. To release a new version, update the existing deployment so the URL stays the same:

```bash
clasp deploy -i <deploymentId> -d "describe the change"
```

## Images

Each main dish and holiday has an image slot. Until an image is added, the slot shows a placeholder. To add images, fill `IMAGES.dishes` / `IMAGES.holidays` in [src/Config.js](src/Config.js). The keys are the dish or holiday name in lower case with single spaces, and the values are image URLs.

## Testing the 11:00 boundaries

The admin can add `?now=YYYY-MM-DDTHH:mm[:ss]` (Vietnam time) to the web app URL, for example `…/exec?now=2026-11-07T10:59:50`. The clock starts at that time and keeps running, so a page left open refreshes itself when it reaches 11:00. Votes cast in this mode are saved with `isTest = TRUE` and only counted while in test mode. Non-admins' `?now=` values are ignored. See [QA.md](QA.md).

## Known limits

- **Several Google accounts in one browser:** Apps Script web apps can fail when someone is signed in to several Google accounts and the default one isn't their @asnet.com.vn account. Use a separate browser profile, or sign out of the other accounts.
- **Reading the votes sheet:** each page load reads the whole votes sheet. That's fine for a few years of data (about 60k rows a year); archive old rows if it gets slow.
