# Developer guide

LumiTalk is a framework-free single-page PWA. Scripts are loaded as classic
scripts so the core experience also works when `index.html` is opened directly.
Every module attaches its public API to `window.BB`.

## Runtime order

1. `storage.js` loads local state and defaults.
2. `voice-library.js` opens the private device-local audio library.
3. Speech, audio, rewards, and accessibility services attach.
4. Game modules register their cards, rounds, routines, and scenes.
5. Settings and navigation attach.
6. `mobile-tools.js` registers the phone-only personalization layer.
7. `app.js` renders routes and registers delegated input handlers.

## Adding a lesson

Add a game object under `BB.games` with an ID, title, icon, color, description,
cards, and rounds. Cards require `symbol`, `word`, `detail`, and `emoji`.
Rounds require a prompt, visual, three `[symbol, label]` choices, the intended
answer index, and a specific teaching fact.

## Interaction rules

- Never add countdowns, lives, red error screens, or lost rewards.
- A different selection should remain recoverable and reveal a clue.
- Do not require motion, color, or sound to understand an activity.
- Keep touch targets at least 48 CSS pixels, preferably 56 or larger.
- All core activities must work offline without external assets.

## Data

`BB.store.data` is the single local state object. Call `BB.store.save()` after a
mutation. Settings changes dispatch `bb:state`; reward changes dispatch
`bb:reward`.

Audio blobs use IndexedDB through `BB.voiceLibrary`. Keys are normalized,
case-insensitive versions of the exact word or phrase. A family recording is
played only when the requested text matches that key. There is intentionally no
synthetic-voice fallback.

Personal photo blobs use the `brightbridge-personal-photos` IndexedDB database.
All mobile-only presentation rules are inside the `max-width: 720px` responsive
block. The sole desktop rule for these controls is `.mobile-only { display:
none }`, preserving the existing desktop layout.
