# BrightBridge Mobile Communication Library

## Mobile 28 summary

BrightBridge Mobile now contains 416 built-in communication cards across 31
categories. The previous 162 built-in cards remain available. New card packs
cover Quick Talk, needs, pain and body, food and drink, people, places,
activities, sensory and calming, social communication, routines, school and
learning, and safety.

The centralized expansion, normalization, duplicate detection, and structured
card model are in `mobile/communication-cards.js`. The existing catalog remains
in `mobile/mobile.js` and is merged without changing its saved-data keys.

## Category counts

| Category | Cards | Category | Cards |
| --- | ---: | --- | ---: |
| Quick | 38 | Core Words | 12 |
| Questions | 8 | Sensory Needs | 8 |
| Body & Pain | 10 | Consent & Safety | 8 |
| Regulation | 8 | Conversation | 8 |
| Food | 6 | Drinks | 5 |
| Bathroom | 5 | Help | 6 |
| Feelings | 7 | Family | 7 |
| Animals | 6 | School | 14 |
| Medical | 6 | Transportation | 6 |
| Daily Routines | 24 | Places & People | 8 |
| Independence | 8 | Needs | 20 |
| Pain & Body | 24 | Food & Drink | 22 |
| People | 19 | Places | 19 |
| Activities | 21 | Sensory & Calming | 19 |
| Social Communication | 22 | School & Learning | 26 |
| Safety | 16 |  |  |

## Duplicate rules and migration

Phrases are compared within the same category after Unicode normalization,
trimming, lowercase conversion, apostrophe and punctuation removal, and repeated
space cleanup. A small conservative equivalence map covers clear matches such as
“I don't know” and “I do not know,” or “My tummy hurts” and “My stomach hurts.”
The same phrase may remain in different categories when that placement is useful.

Five repeated expansion entries were merged into their original Daily Routines
cards: Brush teeth, Take a shower, Get dressed, Take medicine, and Clean up.
No duplicate remains in the built-in catalog.

The same validator runs whenever custom cards load and whenever a parent creates
or edits a custom card. A migration keeps the oldest saved card, merges its
photo/icon/visibility/order metadata, moves a legacy phrase recording when
needed, preserves favorites and recent history, and combines word-use totals.
Custom cards in different categories remain separate.

## Parent Voices

`mobile/parent-voices.js` is the private, IndexedDB-backed Parent Voice data
layer. Write, list, replace, remove, and clear operations require an in-memory
authorization capability issued only after the existing Parent PIN succeeds.
Child playback can ask for the assigned phrase but cannot open the management
library.

To add a voice:

1. Open **Grown-up Area** and enter the Parent PIN.
2. Choose **Quick Talk Voices**.
3. Choose **Add voice** for a card.
4. Record after the 3-second countdown, or upload an MP3, M4A, WAV, or AAC file.
5. Preview it, assign one, several, or all child profiles, and choose **Save
   Voice**.

Clips are limited to 15 seconds and 12 MB. Recordings remain staged until Save
Voice is selected. Removing a Parent Voice restores the pre-existing family
recording/visual fallback. Parent Voice playback has first priority and stops
other speech before starting.

No dependency, analytics, advertising, account, cloud upload, or AI service was
added. Microphone access is requested only after Record is selected.

## Validation performed

- All 30 JavaScript files parsed successfully.
- All 10 JSON files parsed successfully.
- All 28 local mobile HTML references resolved.
- The 416-card catalog was audited with zero remaining within-category
  duplicates.
- Parent Voice data-layer tests covered unauthorized writes, authorized
  save/list, one-profile assignment, all-profile assignment, replacement,
  removal/restore, and capability invalidation after locking.
- Duplicate tests covered punctuation/case/spacing, contractions, equivalent
  body phrases, category case normalization, and cross-category allowance.
- Local HTTP smoke tests returned 200 for the mobile entry page, main script,
  both new modules, and service worker.

Physical microphone permission prompts, device-specific AAC decoding, and real
speaker output still require a manual test on the target phone because no
interactive browser/device was available in the development environment.
