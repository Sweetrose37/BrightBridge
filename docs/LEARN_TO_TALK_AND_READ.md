# Learn to Talk & Read

LumiTalk Mobile includes an offline-first child section with two entrances:

- Let’s Practice Talking
- My Reading Library

The feature supports listening, tapping, pointing, AAC choices, picture responses, skipping, and optional speech practice. Speaking is never required, and the feature does not diagnose or replace professional speech or language services.

## Content locations

- `mobile/talk-read-data.js` contains the ten learning levels and original starter books.
- `mobile/talk-read.js` renders child activities and parent controls.
- `mobile/talk-read-storage.js` stores settings, progress, custom books, and optional child practice recordings.

To add a built-in lesson prompt, add a unique prompt object to the appropriate level in `mobile/talk-read-data.js`. To add a built-in book, add a unique book ID and unique page IDs to the `books` collection. Run `BB_TALK_READ_DATA.validate()` after content changes.

## Parent narration

Open Grown-up Area, enter the existing parent PIN, then choose **Learn to Talk & Read Settings**. A parent can record or upload:

- individual talking models;
- individual book pages;
- a custom welcome;
- a custom ending;
- a full-book narration.

Narration uses the existing local Parent Voice system. Audio is assigned per child profile or to all profiles and remains on the device. Parent audio has playback priority, followed by the app’s existing recorded voice and text-to-speech fallback.

## Child practice recordings

Child recording is off by default. A parent must enable it and select the permitted child profiles. Temporary mode is the default: a practice clip is removed when the prompt changes or the activity closes. In saved mode, a clip is stored only after **Save This Turn** is tapped. Saved clips are private IndexedDB records and never appear in exported daily reports.

## Custom books

The parent settings screen supports private custom books with a title, category, age recommendation, profile assignment, page text, repeat prompt, question, communication choices, and an optional family image. Custom books and images remain in local IndexedDB storage.

## Reporting

Daily Reports include participation-only information such as lessons opened, sounds/words/phrases practiced, Repeat After Me turns, picture/AAC responses, books opened and completed, pages viewed, reading time, and parent-narrated pages. Reports do not include audio or performance scores.

## Dependencies and offline behavior

No new dependency, account, analytics, tracking, or network service was added. Built-in content and code are included in the current `service-worker.js` cache. Parent voices, saved child attempts, and custom books are device-local data.

## Manual device checks

For microphone features, use HTTPS or an installed PWA and grant microphone access only after tapping Record. Confirm parent narration and child practice on the target mobile browser because supported recording formats vary by browser and operating system.
