# Daily Reports

LumiTalk Mobile stores parent-facing daily reports locally in the existing
LumiTalk state under `dailyReporting`.

## Daily rollover

The reporting engine groups activity by the device's local calendar date and
uses one stable record key per child profile and date. It checks at startup,
when the app returns to the foreground, when a page is restored, every 30
seconds while open, and whenever reports are read. On a new date it finalizes
the previous record and creates a fresh current-day record without changing
profiles, custom cards, recordings, approved videos, accessibility settings,
favorites, or permanent progress.

Older cumulative totals are left as permanent progress. Because those totals
do not contain reliable timestamps, the migration does not invent historical
daily entries.

## Parent access and exports

Daily Reports is inside the existing PIN-protected Parent Dashboard. Parents
can filter by profile and date range, search, review weekly or monthly
summaries, add or correct parent notes, mark a day reviewed, and exclude an
accidental phrase from the parent-facing summary without deleting the original
event.

Available parent-friendly exports:

- Print / Save PDF through the browser print dialog
- Readable CSV with plain-language headings
- Plain text

Raw JSON remains available only under **Advanced technical support** as
**Export Raw Data for Technical Support**.

## Privacy

Reports remain on the device in the same local storage used by the existing
app. The feature adds no cloud upload, analytics, advertising, authentication
data, or automatic sharing.

## Development checks

The reporting engine has automated JavaScript checks for:

- calendar-date rollover and previous-day finalization
- fresh current-day counters
- duplicate prevention
- separate records for different child profiles
- parent-voice, feelings, calm, safety, video, goal, and note activity
- correction audit entries
- preservation of unrelated settings and saved markers
- readable text and CSV output without raw object values

The mobile application and service worker are also syntax checked. Final
printing behavior should still be confirmed on each target mobile browser
because print and sharing dialogs are controlled by the browser and operating
system.
