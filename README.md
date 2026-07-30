# LumiTalk™

**Every voice matters. Every word is a step.**

LumiTalk is an offline-first educational and communication Progressive Web
App designed with nonverbal autistic children in mind. It uses only HTML, CSS,
and vanilla JavaScript. There are no advertisements, accounts, analytics,
external content, or required network services.

## Included experiences

- AAC communication board with categories, favorites, recent words, an editable
  sentence box, and exact family-voice playback.
- Family Voice Library where a parent can upload or record familiar words,
  phrases, flashcards, prompts, and encouragement.
- Family-voiced flashcards and no-fail challenges for alphabet, phonics, numbers,
  counting, colors, shapes, patterns, matching, and feelings.
- Tracing, memory matching, and sorting activities.
- Unlimited sensory bubbles, magic drawing, water ripples, balloons, leaves,
  stars, fireflies, snow, and ocean play.
- Piano, drums, bells, xylophone, and nature tones generated with Web Audio.
- Interactive nature scenes and facts.
- Feeling vocabulary, slow breathing, and five-senses grounding.
- Visual daily routines and positive social stories.
- Stars, flowers, butterflies, stickers, badges, and a growing reward garden.
- PIN-protected local parent dashboard with progress, screen time, difficulty,
  profile name, parent-friendly reports, private backups, and reset.
- PIN-protected **Voice Journey™** with private local audio recording,
  caregiver-entered titles, dates, ages, notes, tags, favorites, milestones,
  search, comparison, and audio/PDF/ZIP export.
- **Look How Far I’ve Come™** timeline, birthday keepsakes, and caregiver-chosen
  **Journey Through Time** anniversary slideshows.
- **Letters to My Future Self™** with rich text, photos, linked voice memories,
  achievements, Reward Garden snapshots, future-reading choices, PDF output,
  and a printable keepsake book.
- **LumiTalk Growth Paths™** with four caregiver-controlled stages,
  optional age progression, stage locking, previews, feature controls,
  stage-aware AAC vocabulary, and complete history preservation.
- Dark mode, high contrast, large text, reduced motion, simple mode,
  color-friendly palette, voice controls, and independent audio controls.

## Mobile-only personalized tools

At phone and small-tablet widths, a sixth **My Tools** destination appears.
Desktop presentation remains unchanged. Mobile tools include:

- Visual schedule builder with ordered, tappable completion steps.
- First–Then board with family-voice playback.
- Two- or three-choice focused mode.
- Personal photo cards captured with the camera or uploaded from the device.
- Family voice coverage meter and a guided recording checklist.
- Prompt fading from full clues to independent tries.
- Personalized `Great job!` and `Try again` family recordings.
- A persistent `I need a break` button with breathing, quiet play, and AAC.
- PIN-protected guided child mode that stays inside one selected activity.
- Private communication insights and suggested next recordings.
- Complete backup and restore for profiles, progress, exact-card parent voices,
  child practice recordings, custom books, custom cards, video approvals,
  photos, letters, and Voice Journey memories.

Incorrect choices never remove rewards. Pip gives a visual clue, names the
intended answer, and invites the child to try again.

## Run locally

Opening `index.html` directly runs the core game. PWA installation and offline
caching require a local web server because browsers do not register service
workers from `file://` URLs.

With Python:

```sh
python -m http.server 8080
```

Then open `http://localhost:8080`.

Any static host can deploy the project. No build command is required.

## Parent access

The starter parent PIN is `2468`. Change it in the Grown-up Area before regular
use. This is an accidental-access guard, not a substitute for device security.

## Privacy and storage

Progress, settings, profiles, favorites, AAC history, rewards, and aggregate
screen time are saved in browser `localStorage`. Family voice recordings are
stored separately in the browser’s local IndexedDB because audio files are too
large for settings storage. Personal photo cards use a separate local IndexedDB.
Voice Journey recordings, private letters, and letter photos use their own local
IndexedDB. LumiTalk does not translate, decode, interpret, diagnose, or
infer thoughts or emotions from a child’s vocalizations; all Voice Journey
organization comes from information entered by a caregiver.
The mobile complete-backup tool can package settings, progress, recordings,
custom content, video approvals, and photos into one parent-protected download
workflow. The Grown-up Area also
offers an AES-GCM encrypted private-memory backup protected by a caregiver
passphrase. Nothing is sent to a server.

## Project guide

- `index.html` — semantic PWA shell
- `css/` — visual system, themes, motion, and responsive layouts
- `js/` — application, storage, navigation, speech, audio, settings, and rewards
- `games/` — educational content and activity definitions
- `data/` — reusable vocabulary and lesson datasets
- `pages/` — readable page-level content fallbacks
- `assets/` — app icon and future offline media
- `docs/` — development, testing, assets, and deployment guidance

See `docs/DEVELOPER.md`, `docs/TESTING.md`, `docs/ASSETS.md`, and
`docs/DEPLOYMENT.md` for detailed guidance.
