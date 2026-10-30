# QA checklist

Open the web app as the admin and add `?now=` (Vietnam time). Do the role checks (AC5, AC15, AC18) once with a normal @asnet.com.vn account and once with an account from outside the domain.

| # | URL suffix | Expected | AC |
| --- | --- | --- | --- |
| 1 | `?now=2026-11-02T09:00` | Week 02.11 – 06.11 with five cards (weekday numbers 2–6). Monday is highlighted and its votes are disabled. | AC1, AC16 |
| 2 | `?now=2026-11-02T11:00` | Monday votes are enabled. Like → count +1; like again → −1; like then dislike → like −1, dislike +1. | AC16 |
| 3 | `?now=2026-11-02T11:00` | 2 Nov lists the 4 dishes in sheet order with "Cá chiên mắm xoài" in bold, and has an image slot. As admin: 90 / 108 / 15, total 213. | AC3, AC5, AC12, AC13 |
| 4 | `?now=2026-11-03T10:59:50` | Wait 10 s. The page refreshes by itself: 2 Nov fades and its votes are disabled; 3 Nov becomes votable. | AC16, AC19 |
| 5 | `?now=2026-11-04T10:00` | 4 Nov is highlighted and 3 Nov looks normal. | AC19 |
| 6 | `?now=2026-11-04T11:00` | 2 Nov and 3 Nov are faded; 4 Nov stays highlighted. | AC19 |
| 7 | `?now=2026-11-07T10:59:50` | Still 02–06.11 and Friday is highlighted and votable. Wait 10 s → the page switches to 09.11 – 13.11. | AC2, AC19 |
| 8 | `?now=2026-11-08T09:00` | 09.11 – 13.11. | AC2 |
| 9 | `?now=2026-11-16T12:00` | "Đậu khuôn nhồi thịt" is the main dish, not "Bò xào cần". | AC4 |
| 10 | `?now=2026-11-28T11:00` | 30.11 – 04.12. 30 Nov shows "Menu is coming...". If the December tabs don't exist yet, 1–4 Dec show "Menu is coming..." with blank counts and blank totals. | AC7, AC8, AC9 |
| 11 | Real time, as a normal user | No "Lunch counts" table. In DevTools → Network, the page response and the `getWeek` responses contain no `counts` or `total`. | AC5, AC18 |
| 12 | Normal user with `?now=2026-11-02T11:00` | The `?now=` is ignored (no test banner) and the real date is used. | test hook |
| 13 | Outside-domain account | Google blocks access to the page. | AC15 |
| 14 | Change a count or a dish in a source sheet, then reload | The new value appears. | AC10 |
| 15 | Mark a weekday in "NGÀY NGHỈ LỄ" (in a copy, or ask the sheet owner) | The card shows the holiday name and holiday image slot, with no voting. | AC14 |
| 16 | Check both source sheets' version history after testing | No edits were made by the app. | AC11 |

Test votes are saved in "Lunch Menu Votes" with `isTest = TRUE` and are ignored in real counts. Delete those rows after QA if you like.
