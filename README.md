# Lunch Menu Page

A Google Apps Script web app that shows one working week (Mon–Fri) of the lunch menu, with like/dislike votes, and per-location meal counts for the admin. The requirements are in [TICKET.md](TICKET.md).

- **Standalone Apps Script project.** It isn't bound to any sheet and runs as the owner. Two deployments run the same code:
  - **Company view:** only @asnet.com.vn accounts can open it. Users vote, and the admin sees meal counts.
  - **Public view:** anyone can open it without signing in. It shows the menu, dish photos and like/dislike counts, with voting disabled and a Sign in button.
- **The view depends on the deployment, not the visitor.** `isCompanyView_` in [src/Api.js](src/Api.js) gives the company view only to the deployment IDs in [src/Config.js](src/Config.js). Anything else is public, the email is ignored, the sign-up sheet isn't read, and `vote` refuses. Every top-level function can be called from the public page, so keep this check in any new function that returns private data.
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
| `src/Images.js` | Reads main-dish images from the private Drive folder, as cached data URIs. |
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

On Windows PowerShell, call clasp as `clasp.cmd`: the script policy blocks the `clasp.ps1` wrapper. `npm run push` runs the tests first and pushes only if they pass. Pushing updates the editor copy only. Users see the change after a release, which keeps both URLs the same. The access level is stored in each Apps Script version, so each deployment needs its own version. The script handles that, runs the tests first, and leaves the editor on the committed `DOMAIN` manifest:

```bash
node scripts/release.js "describe the change"
```

To release only one view, add `company` or `public` after the description.

- Script project: https://script.google.com/d/1Srn5pfcQcqbUBJD2wT7983YSJlNWPWUZ4gSVM2cyfH_z6N1Xialu9bRM/edit
- Company view: https://script.google.com/a/macros/asnet.com.vn/s/AKfycbyZF5Mp6olm3c0PCO553KsXiSxxJ4bXAz4kmLdGdv1L0ExIIZsc49x3cUNl-2NakmFX/exec
- Public view: https://script.google.com/macros/s/AKfycbwPPbsGrmrM8IiNSHOMxcEx9ki7bPbY0WtTfV8Vu94sortVl6Xo7Q84Ht1PUD-3sgbh/exec

## Images

Each main dish and holiday has an image slot, which shows a placeholder when there is no image.

- **Main dishes:** add a JPG, PNG or WebP to the private Drive folder `CONFIG.DISH_IMAGES_FOLDER_ID`, named `DD-MM_Dish-name.jpg`. Files match the main dish by name, ignoring the date prefix, accents and case, so a repeated dish reuses its image. If two files match, the first by file name is used. No redeploy is needed: a new file appears within about 10 minutes, and a changed file gets picked up the same way.
- **How they reach the page:** [src/Images.js](src/Images.js) asks Drive for a 256 px thumbnail of each image and sends it as a data URI. Nothing is made public. If there's no thumbnail, it uses the original file if that's 120 KB or less; a larger one keeps the placeholder. Both cases are logged as warnings. Thumbnails are cached for up to 6 hours; an original used as a stopgap is cached for 10 minutes, so the thumbnail is retried soon. Failed or empty Drive reads are never cached. If Drive fails, the page still loads with placeholders and the error goes to the Apps Script executions log, where the run still shows "Completed", so expand it to see the error.
- **Permissions:** Google lets the owner approve only some permissions, and neither a page load nor a normal Run asks again for the rest. If the log says `You do not have permission to call…`, run `checkDishImages` from the Apps Script editor and tick every box in the prompt. It requests any missing permissions, then logs the granted permissions, how many thumbnails it could read and their total size.
- **Adding a permission safely:** run `clasp push` first (this doesn't change the live page), approve with `checkDishImages`, test on the `/dev` URL, and only then update the deployment.
- **Measured on the live page (2 Nov 2026, admin, week of 02–06.11):** 220 KB of HTML and 155 KB transferred, against 459 KB and 335 KB with the original files. Each thumbnail is 35–41 KB in the page, and the largest of the 19 is 35 KB before encoding.
- **Holidays:** fill `IMAGES.holidays` in [src/Config.js](src/Config.js). The keys are the holiday name in lower case with single spaces, and the values are image URLs.

## Testing the 11:00 boundaries

The admin can add `?now=YYYY-MM-DDTHH:mm[:ss]` (Vietnam time) to the web app URL, for example `…/exec?now=2026-11-07T10:59:50`. The clock starts at that time and keeps running, so a page left open refreshes itself when it reaches 11:00. Votes cast in this mode are saved with `isTest = TRUE` and only counted while in test mode. Non-admins' `?now=` values are ignored. See [QA.md](QA.md).

## Known limits

- **Sign out:** Apps Script has no session of its own, so Sign out signs the person out of every Google account in that browser (AC20).
- **Quota:** public visits run under the owner's Apps Script quota, and each load reads the sheets with no cache. Add a short cache on the public view if limits are hit.
- **Google's banner:** Google shows "This application was created by a Google Apps Script user" on the public view. It can't be removed, and the client accepted it.
- **Several Google accounts in one browser:** Apps Script web apps can fail when someone is signed in to several Google accounts and the default one isn't their @asnet.com.vn account. Use a separate browser profile, or sign out of the other accounts.
- **Reading the votes sheet:** each page load reads the whole votes sheet. That's fine for a few years of data (about 60k rows a year); archive old rows if it gets slow.
