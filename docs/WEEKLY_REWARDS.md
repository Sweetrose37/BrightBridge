# Weekly and Weekend Rewards

LumiTalk Mobile displays a profile-specific reward-star bank while keeping
permanent gardens, stickers, achievements, and earlier reward history intact.

## Monday through Friday

Stars earned from Monday through Friday are collected in the weekday bank.
Friday is the celebration day and displays the completed weekday total. At the
first local-calendar check on Saturday, the visible counter changes to a fresh
weekend bank. The completed weekday total remains in weekly history.

## Weekend incentive

Saturday and Sunday use a separate weekend bank. Earning at least one regular
activity star on both days completes the weekend goal and awards three bonus
stars. The bonus is awarded once per weekend and is recorded in that day’s
parent report.

At the first local-calendar check on Monday, the weekend bank closes and a
fresh Monday–Friday bank begins. Previous weekday and weekend totals remain
stored locally in `weeklyRewards.profiles`.

## Parent reports

Every daily report includes:

- stars collected that calendar day;
- weekend incentive bonus stars, when earned;
- readable text, printable/PDF, and CSV export values.

The CSV columns are named **Stars Collected** and **Weekend Bonus Stars**.

## Privacy and preservation

The program uses the device’s local date and the existing local LumiTalk
storage. It adds no accounts, cloud upload, advertising, or tracking. Existing
stars are carried into the first active reward bank during migration instead
of being discarded.
