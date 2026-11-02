# Test Matrix – Weekly Lunch Menu & Sign-up Page

Oct 30, 2026 · @Xuan Ta

Test cases for the ticket Doc, grouped by area and traced to AC1–AC20. Result is filled in during execution: Not run / Pass / Fail / Blocked.

## Approach

**Roles used in testing**

| Role | Account |
| --- | --- |
| Signed out | No account |
| Normal user | Any other @asnet.com.vn account |
| Admin | xuan.tathanh@asnet.com.vn |
| Outside account | A non-company Google account |

**Test data:** November 2026 menu tab `11/2026` and sign-up tab `2026-11`, read on 30 Oct 2026 (e.g. 2 Nov: 90 / 108 / 15). Cases that change sheet data use a copy of the sheets, never the live ones.

**Needed from dev:** a way to set the page's current date and time (e.g. a test-only setting), so the 11:00 boundaries can be tested without waiting. Without it, Group 1, 5 and 6 cases are Blocked.

## Group 1 – Week display and switch

| TC | Scenario | Time (VN) | Expected | AC | Result |
| --- | --- | --- | --- | --- | --- |
| W01 | Open page mid-week | Mon 2 Nov 09:00 | Cards for 2–6 Nov only; numbers 2–6 with dates; no Sat/Sun | AC1 | Pass |
| W02 | Just before the switch | Sat 7 Nov 10:59 | Still shows 2–6 Nov | AC2 | Pass |
| W03 | Exactly at the switch | Sat 7 Nov 11:00 | Shows 9–13 Nov | AC2 | Pass |
| W04 | Sunday | Sun 8 Nov 15:00 | Shows 9–13 Nov | AC2 | Not run |
| W05 | Week across two months, December tabs exist | Sat 28 Nov 11:00 | 30 Nov from Nov tabs; 1–4 Dec from Dec tabs | AC8 | Blocked – December tabs not created yet |
| W06 | Week across two months, December tabs missing | Sat 28 Nov 11:00 | 30 Nov shown; 1–4 Dec show "Menu is coming..." and blank counts | AC8 | Pass |
| W07 | Page left open across the switch | Open Sat 7 Nov 10:58, wait past 11:00 | Page refreshes its data by itself at 11:00 and shows 9–13 Nov | AC2 | Not run |

## Group 2 – Menu and images

| TC | Scenario | Data | Expected | AC | Result |
| --- | --- | --- | --- | --- | --- |
| M01 | Day with 4 dishes | 2 Nov | 4 dishes in sheet order; image of "Cá chiên mắm xoài" | AC3, AC13 | Pass (v4) |
| M02 | Day with 1 dish | 4 Nov "Bún cá" | One dish with its image | AC3, AC13 | Pass (v4) |
| M03 | Main dish is not the first row | 16 Nov | Image is "Đậu khuôn nhồi thịt", not "Bò xào cần" | AC4 | Pass |
| M04 | Fixed data on 11 Nov | 11 Nov | One main dish, "Cá kho thơm" | AC4 | Pass |
| M05 | Day with no dish | 30 Nov | "Menu is coming..."; counts still shown for admin | AC9 | Pass |
| M06 | Holiday | Copy sheet: mark a weekday as a holiday | Holiday name and image, not a dish image; vote icons disabled | AC14 | Blocked – needs a sheet copy |
| M07 | Dish name with extra spaces or special characters | "Mì quảng cá " (trailing space), "Xà lách, dưa leo" | Name shown correctly; image still matches | AC3, AC13 | Not run |
| M08 | Image approval | All main dishes in November | Every image approved by the admin before release | AC13 | Pass with known issue – 19/20 approved on 2 Nov; 03/11 "Thit rang tom" image shows no shrimp, to be replaced later (accepted by admin) |
| M09 | Labels and language | Any day | English labels (MENU, Monday…), Vietnamese dish names | — | Pass |

## Group 3 – Meal counts (signed in as admin)

| TC | Scenario | Data | Expected | AC | Result |
| --- | --- | --- | --- | --- | --- |
| C01 | Counts per location | 2 Nov: 90 / 108 / 15 | 604 Núi Thành 90, Trung Lương 18 108, Mang về 15; lunch only, no breakfast column | AC5 | Pass (2–20 Nov and 30 Nov checked against the sheet) |
| C02 | Daily total | 2 Nov | Total 213 | AC12 | Pass |
| C03 | Counts not from "x" marks | Copy sheet: add an "x" for one person without changing the total row | Page still shows the total row value | AC5 | Not run |
| C04 | Row inserted above VP 604 NT | Copy sheet | Counts unchanged | AC6 | Not run |
| C05 | Label missing | Copy sheet: rename "VP TL18" | Trung Lương 18 blank; others shown; total blank | AC7, AC12 | Not run |
| C06 | Empty cell for one day | Copy sheet: clear Mang về for 3 Nov | Mang về blank on 3 Nov; total blank on 3 Nov | AC7, AC12 | Not run |
| C07 | Count is 0 | Copy sheet: set 0 | Shows 0, not blank | AC5 | Not run |
| C08 | Sheet changed | Copy sheet: change 90 to 91 | New value after reload, no delay | AC10 | Not run |
| C09 | Menu changed | Copy sheet: rename a dish | New name after reload, no delay | AC10 | Not run |
| C10 | Label with extra spaces or different case | Copy sheet: "VP TL18 " or "vp tl18" | Label still recognised; counts shown | AC6 | Not run |

## Group 4 – Roles and sign-in

| TC | Role | Action | Expected | AC | Result |
| --- | --- | --- | --- | --- | --- |
| R01 | Signed out | Open the public page | Menu and like/dislike counts shown, vote icons disabled, no meal counts, Sign in button at top left | AC15 | Not run |
| R02 | Signed out | Click Sign in, sign in with a company account | Page opens with the view for the user's role and voting works | AC15 | Not run |
| R03 | Outside account | Try to sign in | Google shows no access for the company view; the public view still works without voting | AC15 | Not run |
| R04 | Normal user | Sign in, open page | Menu, votes and like/dislike counts; no meal counts, no total | AC18 | Not run |
| R05 | Admin | Sign in, open page | Menu, votes, lunch counts and total | AC18 | Pass |
| R06 | Normal user | Look for counts in the page source or network data | Counts are not sent to the browser | AC18 | Not run |
| R07 | Admin | Click avatar → Sign out | Signed out of Google; reopening the page shows the public view with Sign in | AC15, AC20 | Not run |
| R08 | Signed out | Click a vote icon on the public view; look for counts in the page source | No vote is saved; meal counts are not sent to the browser | AC15, AC18 | Not run |
| R09 | Admin (xuan.tathanh) | Sign in, open page | Avatar "XT" at top left instead of Sign in; no name shown | AC20 | Not run |
| R10 | Normal user (ni.ngo) | Sign in, click avatar | Avatar "NN"; menu opens with Sign out | AC20 | Not run |

## Group 5 – Voting (signed in, day = Mon 2 Nov)

| TC | Scenario | Time (VN) | Expected | AC | Result |
| --- | --- | --- | --- | --- | --- |
| V01 | Before opening | Mon 2 Nov 10:59 | Vote icons disabled | AC16 | Pass |
| V02 | At opening | Mon 2 Nov 11:00 | Like works; like +1 | AC16 | Pass |
| V03 | Remove vote | Click like again | Like −1; no active vote | AC16 | Pass (retest v2; was Fail, #13) |
| V04 | Vote again after removing | Click like again | Like +1 | AC16 | Pass (retest v2) |
| V05 | Switch like → dislike | Click dislike while liked | Like −1, dislike +1 | AC16 | Pass (retest v2; was Fail) |
| V06 | Switch dislike → like | Click like while disliked | Dislike −1, like +1 | AC16 | Not run |
| V07 | Just before closing | Tue 3 Nov 10:59 | Vote works | AC16 | Not run |
| V08 | At closing | Tue 3 Nov 11:00 | Vote icons disabled; counts unchanged | AC16 | Not run |
| V09 | Future day | Mon 2 Nov 12:00, vote on 4 Nov | Disabled | AC16 | Pass |
| V10 | Friday window | Sat 7 Nov 10:59 vs 11:00 | Fri 6 Nov votable at 10:59; at 11:00 the page shows the next week | AC2, AC16 | Not run |
| V11 | Two users vote | Users A and B like 2 Nov | Like count +2; each sees their own vote | AC16 | Not run |
| V12 | Vote persists | Reload or sign in on another device | Same vote and counts shown | AC16 | Pass (retest v2; was Fail, #14) |
| V13 | Fast double click | Double-click like | Counted once (+1 or toggled off), never +2 | AC16 | Not run |
| V14 | Signed-out user | Click like | Not applicable – signed-out users cannot open the page | AC15 | Not run |

## Group 6 – Highlight and fade

| TC | Time (VN) | Expected | AC | Result |
| --- | --- | --- | --- | --- |
| H01 | Wed 4 Nov 10:59 | 4 Nov highlighted; 3 Nov normal; 2 Nov faded | AC19 | Pass |
| H02 | Wed 4 Nov 11:00 | 4 Nov highlighted; 2–3 Nov faded | AC19 | Pass |
| H03 | Mon 2 Nov 09:00 | 2 Nov highlighted; nothing faded | AC19 | Pass |
| H04 | Sat 7 Nov 10:30 | 6 Nov highlighted (still votable); 2–5 Nov faded | AC19 | Pass |

## General checks

| TC | Scenario | Expected | AC | Result |
| --- | --- | --- | --- | --- |
| G01 | Use the page as admin and normal user | Neither sheet's version history shows an edit by the page | AC11 | Not run |
| G02 | Release the new page | New page runs as its own Apps Script web app; agility-kitchen.pages.dev unchanged | AC17 | Not run |
| G03 | Mobile width (375px) | Five cards readable; no horizontal scroll | — | Not run |
| G04 | Comments | No comments section on the new page | — | Pass |
| G05 | Console | No JavaScript errors | — | Not run |
