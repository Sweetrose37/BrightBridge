# LumiTalk rebrand and compatibility notes

The visible product name is **LumiTalk** with the tagline:

> Helping Every Child Find Their Voice.

## Visual system

The logo is an original speech-bubble-and-bridge symbol with a single star. The
central palette is:

- Sky Blue `#4A90E2`
- Mint Green `#6FD6A8`
- Sunshine Yellow `#FFD75E`
- Soft White `#FAFBFC`
- Deep text `#2E3A46`

The main logo assets live in `assets/icons/`. Feature emoji remain in selected
child activity cards because they are functional communication symbols, not
brand marks.

## Data continuity

The rebrand deliberately does not rename existing browser storage or database
identifiers. Renaming them would make saved profiles, parent voices, Voice
Journey recordings, videos, and progress appear to disappear. These legacy
internal identifiers remain supported:

- `brightbridge-pwa-v1`
- `brightbridge-family-voice`
- `brightbridge-parent-card-voices`
- `brightbridge-talk-read-private`
- `brightbridge-private-journey`
- `brightbridge-mobile-custom-aac`
- `brightbridge-personal-photos`
- `brightbridge-approved-videos-v1`
- `brightbridge-video-daily-allowance-v1`
- `brightbridge-video-approvals-v1`

The service-worker cache keeps the established `brightbridge-` prefix for a
clean in-place update. LumiTalk creates newly branded backup packages while
continuing to import earlier BrightBridge backup formats and `.brightbridge`
files. These compatibility strings are implementation details and are not
shown as the product name in the child-facing interface.

## Interface decisions

- The mobile header is compact and keeps Parent access clearly labeled.
- The home greeting is short and activity cards have consistent dimensions.
- `My LumiTalk Growth Path` uses existing progress only; it does not invent a
  completion percentage.
- The encouragement helper is in normal page flow so it cannot cover controls.
  A parent-only Sound & Accessibility setting can hide it.
- Sound and accessibility settings route through the existing parent gate.
- Parent-facing print reports and downloaded keepsakes use LumiTalk branding.
