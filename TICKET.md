# Ticket Pack – Weekly Lunch Menu & Sign-up Page

Oct 30, 2026 · Xuan Ta

A web page that shows the lunch menu and the number of meals per location for one working week (Mon–Fri), switching to the next week every Saturday at 11:00, starting with the week of 2 Nov 2026.

## User stories

- As an **employee**, I want to see this week's lunch menu, so that I know what will be served each day.
- As the **kitchen (cô Thủy)**, I want to see how many meals each location needs per day, so that I can cook and pack the right number of portions.
- As the **person in charge of lunch sign-ups**, I want the menu and meal counts on one page that updates from the existing sheets, so that I don't have to compile and send them by hand.

## Data sources

The page only reads both Google Sheets; it never writes to them. Votes are stored in a separate new sheet owned by the admin.

| | Menu | Meal counts |
| --- | --- | --- |
| File | Menu – ID `1Dw9jGlMDs9iUY_zrgVEfpfaGV8L17B5M1ix1HooRh2g` | [fp] Đăng ký ăn trưa 2026 – ID `1kuW7OIoI1i7xL77jOdcXqijWGkx4ELkI4HEPVjD6T-Q` |
| Tab | One tab per month, named `MM/YYYY` (e.g. `11/2026`) | One tab per month, named `YYYY-MM` (e.g. `2026-11`) |
| Day | Column "NGÀY" (dd/mm/yyyy) | Day number in the header row (row 2) |
| Content | Column "TÊN MÓN" (1–4 dishes per day); column "MÓN CHÍNH" = TRUE marks the main dish | Three total rows, found by the label in column E: **VP 604 NT**, **VP TL18**, **Mang về** |
| Other | Column "NGÀY NGHỈ LỄ" (holiday) | The page does not count "x" marks; WFH staff are already excluded from the totals |

Locations shown on the page: **604 Núi Thành** (VP 604 NT), **Trung Lương 18** (VP TL18), **Mang về / Home** (Mang về).

## Acceptance criteria

### AC1 – Show one working week
- **Given** the menu and sign-up sheets have data for the week of 2–6 Nov 2026
- **When** a user opens the page on Monday 2 Nov 2026
- **Then** the page shows Monday 2 Nov to Friday 6 Nov, one card per day with the weekday number (2 = Monday … 6 = Friday) and the date
- **And** Saturday and Sunday are not shown

### AC2 – Switch to next week on Saturday at 11:00
- **Given** the current week is 2–6 Nov 2026
- **When** a user opens the page on Saturday 7 Nov at 10:59
- **Then** the page still shows 2–6 Nov
- **When** a user opens the page on Saturday 7 Nov at 11:00 or later, or on Sunday 8 Nov
- **Then** the page shows 9–13 Nov; a page left open reloads by itself at 11:00

### AC3 – Menu per day
- **Given** the menu tab `11/2026` lists "Cá chiên mắm xoài" (main dish), "Đậu khuôn chiên xốt cà", "Bầu luộc" and "Canh chua nấu đầu cá" for 02/11/2026
- **When** a user views 2 Nov
- **Then** all four dishes are shown in the order of the sheet
- **And** "Cá chiên mắm xoài" is the main dish, and the day shows an image of it (see AC13)

### AC4 – Main dish is taken from the "MÓN CHÍNH" column
- **Given** on 16/11/2026 the first dish "Bò xào cần" is FALSE and the second dish "Đậu khuôn nhồi thịt" is TRUE
- **When** a user views 16 Nov
- **Then** "Đậu khuôn nhồi thịt" is marked as the main dish, not the first row

### AC5 – Meal counts per location
- **Given** in tab `2026-11` the rows labelled VP 604 NT, VP TL18 and Mang về show 90, 108 and 15 for day 2
- **When** a user views 2 Nov
- **Then** a signed-in admin sees 604 Núi Thành: 90, Trung Lương 18: 108, Mang về: 15 for lunch only (no breakfast column); other users see no counts (admin: see AC18)
- **And** the numbers are taken from those rows as they are, without counting "x" marks

### AC6 – Total row found by label, not by row number
- **Given** a row is added above the VP 604 NT row in tab `2026-11`
- **When** a user reloads the page
- **Then** the counts are unchanged, because rows are found by their label in column E, ignoring extra spaces and upper/lower case

### AC7 – Missing label or count
- **Given** a month tab has no row labelled VP TL18, or the cell for a day is empty
- **When** a user views that day
- **Then** Trung Lương 18 is left blank instead of 0 or a wrong number
- **And** the other locations still show their counts

### AC8 – Week spanning two months
- **Given** the week of 30 Nov – 4 Dec 2026
- **When** a user opens the page from Saturday 28 Nov at 11:00
- **Then** 30 Nov is read from tabs `11/2026` and `2026-11`, and 1–4 Dec from tabs `12/2026` and `2026-12`
- **And** if a December tab does not exist yet, those days show "Menu is coming..." (AC9) and blank counts (AC7)

### AC9 – Day with no menu
- **Given** 30/11/2026 has no dish in the menu sheet
- **When** a user views 30 Nov
- **Then** the page shows "Menu is coming..." and still shows the meal counts

### AC10 – Data stays in sync with the sheets
- **Given** the person in charge changes a count or a dish in the sheets
- **When** a user reloads the page
- **Then** the page shows the new value immediately

### AC11 – Sheets are never changed
- **Given** a user opens and uses the page
- **When** the page loads its data
- **Then** neither sheet is modified

### AC12 – Daily total
- **Given** on 2 Nov the counts are 604 Núi Thành 90, Trung Lương 18 108, Mang về 15
- **When** a user views 2 Nov
- **Then** an admin also sees a total of 213 meals for that day
- **And** if a location count is blank, the total is left blank

### AC13 – Image of the main dish
- **Given** "Cá chiên mắm xoài" is ticked as the main dish on 02/11/2026
- **When** a user views 2 Nov
- **Then** the day shows an image that matches "Cá chiên mắm xoài" (images are generated by the dev team; approved by the admin before release)

### AC14 – Holiday
- **Given** a weekday is marked in the column "NGÀY NGHỈ LỄ"
- **When** a user views that day
- **Then** the day shows an image that fits that specific holiday instead of a dish image (image generated by the dev team)

### AC15 – Company sign-in
- **Given** a user is not signed in
- **When** they open the page
- **Then** they are sent to the company Google sign-in and cannot see the page until they sign in
- **When** they sign in with a company Google account (@asnet.com.vn)
- **Then** they see the page for their role (AC18)
- **And** an account outside the company domain cannot open the page

### AC16 – Like / dislike vote per day
- **Given** a signed-in user (normal or admin) views Monday 2 Nov
- **When** they click the heart (like) between Monday 2 Nov 11:00 and Tuesday 3 Nov 11:00
- **Then** their like is saved and the like count goes up by 1
- **When** they click the heart again
- **Then** their like is removed and the like count goes down by 1; they can vote again later in the window
- **When** they click the dislike icon while they have a like
- **Then** the like is removed automatically and the dislike is saved (like −1, dislike +1)
- **And** each user has at most one active vote per day
- **When** a user tries to vote for 2 Nov before Monday 2 Nov 11:00 or after Tuesday 3 Nov 11:00
- **Then** the vote icons are disabled and the counts stay the same
- **And** Friday can be voted on until Saturday 11:00, when the page switches to the next week (AC2)

### AC17 – Separate Google Apps Script web app
- **Given** the code is kept in the GitHub repo `lunch-menu-page`
- **When** the page is released
- **Then** it runs as a Google Apps Script web app owned by the admin, open only to @asnet.com.vn accounts (address: script.google.com/…)
- **And** the current page at agility-kitchen.pages.dev is not changed
- **And** no Google Cloud project or Cloudflare account is needed

### AC18 – Admin role
- **Given** the only admin is xuan.tathanh@asnet.com.vn
- **When** the admin signs in
- **Then** they see the menu, the votes and the lunch counts with the daily total
- **When** any other company account signs in
- **Then** they see the menu and can vote, but see no counts

### AC19 – Highlight today, fade past days
- **Given** today is Wednesday 4 Nov
- **When** a user opens the page before 11:00
- **Then** 4 Nov is highlighted and 3 Nov is still shown normally
- **When** a user opens the page at 11:00 or later
- **Then** 3 Nov (and 2 Nov) are faded, and 4 Nov stays highlighted; on Saturday before 11:00, Friday stays highlighted because it can still be voted on

## Scope
- Page showing one week (Mon–Fri) of menu and meal counts
- Automatic switch to the next week every Saturday at 11:00
- Meal counts for three locations, read from the labelled total rows
- Weeks that span two months
- Daily total, main-dish and holiday images, company sign-in, like/dislike votes; starts with the week of 2–6 Nov 2026

## Non-scope
- The October 2026 tab (skipped; its labels were not updated)
- Signing up or cancelling lunch on the page
- Counting "x" marks or applying the WFH rule (done in the sheet)
- Counts per floor or room (1B, 3A, TL18 - 1, …)
- Images for side dishes (only the main dish and holidays get an image)
- Editing either source sheet; breakfast counts; comments ("View all comments")

## Design reference
- Layout follows the current page at agility-kitchen.pages.dev: "MENU" + date range header, five day cards with a round main-dish image, the weekday number and dish list, like/dislike icons with counts, the full date under each card, admin counts below.
- Language: English labels (MENU, Monday…), Vietnamese dish names.

## Assumptions
- All times (11:00 week switch, voting and fading) are Vietnam time (UTC+7).
- Every new month gets a menu tab `MM/YYYY` and a sign-up tab `YYYY-MM` with the three labels VP 604 NT, VP TL18 and Mang về.

## Decisions confirmed by the client
- Counts come from the labelled total rows; the page does not count "x" marks.
- WFH staff are not counted (already handled in the sheet).
- Three locations: 604 Núi Thành, Trung Lương 18, Mang về.
- The October 2026 tab is out of scope.
